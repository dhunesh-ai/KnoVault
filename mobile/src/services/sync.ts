import client from '../api/client';
import { getDB, getSyncQueue, clearSyncQueue, localInsert, localUpdate, localDelete } from './db';

export const syncWorkspace = async () => {
    const db = getDB();
    console.log('[Sync] Starting workspace synchronization...');

    // 1. PUSH local changes to server
    const queue = await getSyncQueue();
    if (queue.length > 0) {
        console.log(`[Sync] Found ${queue.length} items in sync queue`);
        
        const payload: any = {
            new_notes: [], new_goals: [], new_reminders: [], new_important_days: [],
            updated_notes: [], updated_goals: [], updated_reminders: [], updated_important_days: []
        };

        const idsToDelete: number[] = [];

        for (const item of queue as any[]) {
            idsToDelete.push(item.id);
            const data: any = await db.getFirstAsync(`SELECT * FROM ${item.entity} WHERE id = ?`, [item.record_id]);
            if (!data) continue;

            const entityMap: any = {
                'Notes': 'notes',
                'Goals': 'goals',
                'Reminders': 'reminders',
                'ImportantDays': 'important_days'
            };
            const eKey = entityMap[item.entity];

            if (item.action === 'INSERT') {
                data.temp_id = item.temp_id;
                payload[`new_${eKey}`].push(data);
            } else if (item.action === 'UPDATE' || item.action === 'DELETE') {
                if (data.remote_id) {
                    data.id = data.remote_id;
                    payload[`updated_${eKey}`].push(data);
                } else {
                     // Unsynced but updated/deleted locally
                    if (item.action === 'UPDATE') {
                        payload[`new_${eKey}`].push(data);
                    }
                }
            }
        }

        try {
            const res = await client.post('/api/sync/push', payload);
            const { note_id_map, goal_id_map, reminder_id_map, important_day_id_map } = res.data;

            // Update local DB with new remote IDs
            for (const [temp_id, remote_id] of Object.entries(note_id_map)) {
                await db.runAsync('UPDATE Notes SET remote_id = ? WHERE temp_id = ?', [remote_id as number, temp_id as string]);
            }
            for (const [temp_id, remote_id] of Object.entries(goal_id_map)) {
                await db.runAsync('UPDATE Goals SET remote_id = ? WHERE temp_id = ?', [remote_id as number, temp_id as string]);
            }
            for (const [temp_id, remote_id] of Object.entries(reminder_id_map)) {
                await db.runAsync('UPDATE Reminders SET remote_id = ? WHERE temp_id = ?', [remote_id as number, temp_id as string]);
            }
            for (const [temp_id, remote_id] of Object.entries(important_day_id_map)) {
                await db.runAsync('UPDATE ImportantDays SET remote_id = ? WHERE temp_id = ?', [remote_id as number, temp_id as string]);
            }

            await clearSyncQueue(idsToDelete);
            console.log('[Sync] Push completed');
        } catch (e) {
            console.error('[Sync] Push failed', e);
            return false; // Stop sync if push fails to avoid conflict issues
        }
    }

    // 2. PULL remote changes from server
    try {
        const meta: any = await db.getFirstAsync('SELECT last_sync FROM SyncMetadata LIMIT 1');
        const since = meta?.last_sync || '1970-01-01T00:00:00Z';
        console.log(`[Sync] Pulling changes since ${since}`);

        const res = await client.get(`/api/sync/pull?since=${encodeURIComponent(since)}`);
        const { timestamp, notes, goals, reminders, important_days } = res.data;

        const processPull = async (table: string, records: any[]) => {
            for (const record of records) {
                const existing: any = await db.getFirstAsync(`SELECT id FROM ${table} WHERE remote_id = ?`, [record.id]);
                
                const { id: remoteId, created_at, updated_at, contact_relationship, person_name, birth_date, ...rest } = record as any;
                const dbObj: any = { ...rest, remote_id: remoteId, created_at, updated_at };
                
                if (contact_relationship !== undefined) {
                    dbObj.relationship = contact_relationship;
                }
                
                // Convert booleans to integers for SQLite
                for (const key of Object.keys(dbObj)) {
                    if (typeof dbObj[key] === 'boolean') {
                        dbObj[key] = dbObj[key] ? 1 : 0;
                    }
                }

                if (existing) {
                    // Update existing
                    const keys = Object.keys(dbObj);
                    const values = Object.values(dbObj);
                    const setString = keys.map(k => `${k} = ?`).join(', ');
                    try {
                        await db.runAsync(`UPDATE ${table} SET ${setString} WHERE remote_id = ?`, [...values, remoteId]);
                    } catch (err) {
                        console.error(`[SYNC PULL ERROR] Failed to update ${table}`, err);
                    }
                } else {
                    // Insert new
                    const keys = Object.keys(dbObj);
                    const values = Object.values(dbObj);
                    const placeholders = keys.map(() => '?').join(', ');
                    try {
                        if (table === 'ImportantDays') {
                            console.log(`[SYNC IMPORTANT DAYS RECEIVED] ID: ${remoteId}, Keys:`, keys);
                        }
                        await db.runAsync(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, values as any[]);
                        if (table === 'ImportantDays') {
                            console.log(`[SYNC IMPORTANT DAYS INSERTED] Remote ID: ${remoteId}`);
                        }
                    } catch (err) {
                        console.error(`[SYNC PULL ERROR] Failed to insert ${table}`, err);
                    }
                }
            }
        };

        await processPull('Notes', notes);
        await processPull('Goals', goals);
        await processPull('Reminders', reminders);
        await processPull('ImportantDays', important_days);

        await db.runAsync('UPDATE SyncMetadata SET last_sync = ?', [timestamp]);
        console.log('[Sync] Pull completed. Workspace synchronized.');
        return true;

    } catch (e) {
        console.error('[Sync] Pull failed', e);
        return false;
    }
};
