import { DeviceEventEmitter } from 'react-native';
import { getDB, localInsert, localUpdate, localDelete } from './db';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';
import * as googleDrive from './googleDrive';
import { logger } from '../utils/logger';

// ── SQL ↔ App Model Translators ──────────────────────────────────────

function sqlToAppNote(row: any) {
  if (!row) return null;
  return {
    ...row,
    id: row.remote_id || row.id,
    local_id: row.id,
    is_secure: row.is_secure === 1,
    is_pinned: row.is_pinned === 1,
    is_completed: row.is_completed === 1,
    is_favorite: row.is_favorite === 1,
    is_deleted: row.is_deleted === 1,
    checklist_items: row.checklist_items ? JSON.parse(row.checklist_items) : [],
    field_notes: row.field_notes ? JSON.parse(row.field_notes) : [],
  };
}

function sqlToAppGoal(row: any) {
  if (!row) return null;
  return {
    ...row,
    id: row.remote_id || row.id,
    local_id: row.id,
    completed: row.completed === 1,
    is_deleted: row.is_deleted === 1,
  };
}

function sqlToAppReminder(row: any) {
  if (!row) return null;
  return {
    ...row,
    id: row.remote_id || row.id,
    local_id: row.id,
    is_completed: row.is_completed === 1,
    is_deleted: row.is_deleted === 1,
  };
}

function sqlToAppImportantDay(row: any) {
  if (!row) return null;
  return {
    ...row,
    id: row.remote_id || row.id,
    local_id: row.id,
    is_recurring: row.is_recurring === 1,
    email_enabled: row.email_enabled === 1,
    auto_send_email: row.auto_send_email === 1,
    reminder_enabled: row.reminder_enabled === 1,
    is_deleted: row.is_deleted === 1,
    reminders: row.reminders_json ? JSON.parse(row.reminders_json) : null,
  };
}

export const storageManager = {
  // ── Quota Verification ─────────────────────────────────────────────
  
  checkCloudQuota: async (): Promise<boolean> => {
    try {
      const res = await client.get('/api/profile/storage');
      const { percent_used } = res.data;
      if (percent_used >= 100) {
        DeviceEventEmitter.emit('CLOUD_STORAGE_FULL_TRIGGER');
        return false;
      }
      return true;
    } catch (e) {
      // If offline, assume quota is OK for now (local SQLite writes will sync later)
      return true;
    }
  },

  // ── Notes Operations ───────────────────────────────────────────────

  getNotes: async (params?: { category?: string; search?: string; pinned_only?: boolean }): Promise<any[]> => {
    const { storageMode } = useSettingsStore.getState();
    const db = getDB();

    // If local/gdrive mode, or offline, read directly from SQLite
    if (storageMode === 'local' || storageMode === 'gdrive') {
      let query = 'SELECT * FROM Notes WHERE is_deleted = 0';
      const args: any[] = [];
      
      if (params?.category) {
        query += ' AND category = ?';
        args.push(params.category);
      }
      if (params?.pinned_only) {
        query += ' AND is_pinned = 1';
      }
      query += ' ORDER BY created_at DESC';
      
      const rows = await db.getAllAsync(query, ...args);
      let results = rows.map(sqlToAppNote);
      
      if (params?.search) {
        const s = params.search.toLowerCase();
        results = results.filter(n => n.title.toLowerCase().includes(s) || (n.content && n.content.toLowerCase().includes(s)));
      }
      return results;
    }

    // Default to Cloud Only / Backup modes: fetch from Neon Cloud API
    try {
      const response = await client.get('/api/notes', { params });
      // Update SQLite Cache
      for (const note of response.data) {
        const existing = await db.getFirstAsync('SELECT id FROM Notes WHERE remote_id = ?', [note.id]);
        const dbData = {
          remote_id: note.id,
          title: note.title,
          content: note.content,
          category: note.category,
          is_secure: note.is_secure ? 1 : 0,
          is_pinned: note.is_pinned ? 1 : 0,
          is_completed: note.is_completed ? 1 : 0,
          note_type: note.note_type,
          is_favorite: note.is_favorite ? 1 : 0,
          checklist_items: note.checklist_items ? JSON.stringify(note.checklist_items) : null,
          field_notes: note.field_notes ? JSON.stringify(note.field_notes) : null,
          user_id: note.user_id,
          created_at: note.created_at,
          updated_at: note.updated_at,
          is_deleted: note.is_deleted ? 1 : 0,
        };
        if (existing) {
          const keys = Object.keys(dbData).filter(k => k !== 'remote_id');
          const values = keys.map(k => (dbData as any)[k]);
          const setStr = keys.map(k => `${k} = ?`).join(', ');
          await db.runAsync(`UPDATE Notes SET ${setStr} WHERE remote_id = ?`, [...values, note.id]);
        } else {
          const keys = Object.keys(dbData);
          const values = keys.map(k => (dbData as any)[k]);
          const placeholders = keys.map(() => '?').join(', ');
          await db.runAsync(`INSERT INTO Notes (${keys.join(', ')}) VALUES (${placeholders})`, values as any[]);
        }
      }
      return response.data;
    } catch (e: any) {
      logger.error('Failed to get notes from Neon, reading cache:', e);
      // Fallback to local SQLite cache
      const rows = await db.getAllAsync('SELECT * FROM Notes WHERE is_deleted = 0 ORDER BY created_at DESC');
      return rows.map(sqlToAppNote);
    }
  },

  getNote: async (id: number): Promise<any> => {
    const { storageMode } = useSettingsStore.getState();
    const db = getDB();
    if (storageMode === 'local' || storageMode === 'gdrive') {
      const row = await db.getFirstAsync('SELECT * FROM Notes WHERE id = ? OR remote_id = ?', [id, id]);
      return sqlToAppNote(row);
    }
    try {
      const response = await client.get(`/api/notes/${id}`);
      return response.data;
    } catch (e) {
      const row = await db.getFirstAsync('SELECT * FROM Notes WHERE id = ? OR remote_id = ?', [id, id]);
      return sqlToAppNote(row);
    }
  },

  createNote: async (data: any): Promise<any> => {
    const { storageMode, googleDriveConnected } = useSettingsStore.getState();
    const db = getDB();

    // 1. Check Cloud Quota first if using cloud
    if (storageMode === 'cloud' || storageMode === 'cloud_gdrive' || storageMode === 'cloud_local') {
      const hasQuota = await storageManager.checkCloudQuota();
      if (!hasQuota) {
        // Quota Dialog will trigger. Fallback to Local/GDrive depending on preference
        if (googleDriveConnected) {
          return storageManager.createNoteGDriveOnly(data);
        } else {
          return storageManager.createNoteLocalOnly(data);
        }
      }
    }

    if (storageMode === 'local') {
      return storageManager.createNoteLocalOnly(data);
    }

    if (storageMode === 'gdrive') {
      return storageManager.createNoteGDriveOnly(data);
    }

    // Default: Cloud Save
    try {
      const response = await client.post('/api/notes', data);
      const note = response.data;
      
      // Save local cache copy
      const dbData = {
        remote_id: note.id,
        title: note.title,
        content: note.content,
        category: note.category,
        is_secure: note.is_secure ? 1 : 0,
        is_pinned: note.is_pinned ? 1 : 0,
        is_completed: note.is_completed ? 1 : 0,
        note_type: note.note_type,
        is_favorite: note.is_favorite ? 1 : 0,
        checklist_items: note.checklist_items ? JSON.stringify(note.checklist_items) : null,
        field_notes: note.field_notes ? JSON.stringify(note.field_notes) : null,
        user_id: note.user_id,
        created_at: note.created_at,
        updated_at: note.updated_at,
        is_deleted: 0,
      };
      await db.runAsync(
        'INSERT INTO Notes (remote_id, title, content, category, is_secure, is_pinned, is_completed, note_type, is_favorite, checklist_items, field_notes, user_id, created_at, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        dbData.remote_id, dbData.title, dbData.content, dbData.category, dbData.is_secure, dbData.is_pinned, dbData.is_completed, dbData.note_type, dbData.is_favorite, dbData.checklist_items, dbData.field_notes, dbData.user_id, dbData.created_at, dbData.updated_at, dbData.is_deleted
      );

      // If GDrive Backup mode is enabled, upload backup
      if (storageMode === 'cloud_gdrive' && googleDriveConnected) {
        try {
          const token = await googleDrive.getGoogleDriveAccessToken();
          const fileId = await googleDrive.uploadJsonFile(token, 'Notes', `note_${note.id}.json`, note);
          await db.runAsync('INSERT OR REPLACE INTO GoogleDriveSync (entity, record_id, drive_file_id) VALUES (?, ?, ?)', 'Notes', note.id, fileId);
        } catch (gErr) {
          logger.error('[StorageManager] GDrive backup upload failed:', gErr);
        }
      }

      return note;
    } catch (e: any) {
      if (e.response?.status === 403 && e.response?.data?.detail === 'CLOUD_STORAGE_FULL') {
        DeviceEventEmitter.emit('CLOUD_STORAGE_FULL_TRIGGER');
        if (googleDriveConnected) {
          return storageManager.createNoteGDriveOnly(data);
        } else {
          return storageManager.createNoteLocalOnly(data);
        }
      }
      logger.error('Failed to create note on Neon, saving locally to sync queue:', e);
      // Network offline - insert locally and add to sync queue
      const localRes = await localInsert('Notes', {
        title: data.title,
        content: data.content,
        category: data.category || 'General',
        is_secure: data.is_secure ? 1 : 0,
        is_pinned: data.is_pinned ? 1 : 0,
        note_type: data.note_type || 'standard',
        is_favorite: data.is_favorite ? 1 : 0,
        checklist_items: data.checklist_items ? JSON.stringify(data.checklist_items) : null,
        field_notes: data.field_notes ? JSON.stringify(data.field_notes) : null,
        user_id: useAuthStore.getState().user?.id,
        is_deleted: 0,
      });
      return {
        id: localRes.id,
        local_id: localRes.id,
        temp_id: localRes.tempId,
        ...data,
      };
    }
  },

  createNoteLocalOnly: async (data: any): Promise<any> => {
    const db = getDB();
    const result = await db.runAsync(
      'INSERT INTO Notes (title, content, category, is_secure, is_pinned, is_completed, note_type, is_favorite, checklist_items, field_notes, user_id, created_at, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
      data.title, data.content, data.category || 'General', data.is_secure ? 1 : 0, data.is_pinned ? 1 : 0, data.is_completed ? 1 : 0, data.note_type || 'standard', data.is_favorite ? 1 : 0, data.checklist_items ? JSON.stringify(data.checklist_items) : null, data.field_notes ? JSON.stringify(data.field_notes) : null, useAuthStore.getState().user?.id || null, new Date().toISOString(), new Date().toISOString()
    );
    return {
      id: result.lastInsertRowId,
      local_id: result.lastInsertRowId,
      ...data,
    };
  },

  createNoteGDriveOnly: async (data: any): Promise<any> => {
    const db = getDB();
    const note = await storageManager.createNoteLocalOnly(data);
    try {
      const token = await googleDrive.getGoogleDriveAccessToken();
      const fileId = await googleDrive.uploadJsonFile(token, 'Notes', `note_local_${note.id}.json`, note);
      await db.runAsync('INSERT OR REPLACE INTO GoogleDriveSync (entity, record_id, drive_file_id) VALUES (?, ?, ?)', 'Notes', note.id, fileId);
    } catch (gErr) {
      logger.error('[StorageManager] GDrive upload failed, saved locally:', gErr);
    }
    return note;
  },

  updateNote: async (id: number, data: any): Promise<any> => {
    const { storageMode, googleDriveConnected } = useSettingsStore.getState();
    const db = getDB();

    if (storageMode === 'local') {
      await localUpdate('Notes', id, {
        title: data.title,
        content: data.content,
        category: data.category,
        is_secure: data.is_secure ? 1 : 0,
        is_pinned: data.is_pinned ? 1 : 0,
        is_completed: data.is_completed ? 1 : 0,
        is_favorite: data.is_favorite ? 1 : 0,
        checklist_items: data.checklist_items ? JSON.stringify(data.checklist_items) : undefined,
        field_notes: data.field_notes ? JSON.stringify(data.field_notes) : undefined,
      });
      return { id, ...data };
    }

    if (storageMode === 'gdrive') {
      await localUpdate('Notes', id, {
        title: data.title,
        content: data.content,
        category: data.category,
        is_secure: data.is_secure ? 1 : 0,
        is_pinned: data.is_pinned ? 1 : 0,
        is_completed: data.is_completed ? 1 : 0,
        is_favorite: data.is_favorite ? 1 : 0,
        checklist_items: data.checklist_items ? JSON.stringify(data.checklist_items) : undefined,
        field_notes: data.field_notes ? JSON.stringify(data.field_notes) : undefined,
      });
      try {
        const token = await googleDrive.getGoogleDriveAccessToken();
        const updatedNote = { id, ...data };
        const fileId = await googleDrive.uploadJsonFile(token, 'Notes', `note_local_${id}.json`, updatedNote);
        await db.runAsync('INSERT OR REPLACE INTO GoogleDriveSync (entity, record_id, drive_file_id) VALUES (?, ?, ?)', 'Notes', id, fileId);
      } catch (gErr) {
        logger.error('[StorageManager] GDrive update failed:', gErr);
      }
      return { id, ...data };
    }

    // Default: Cloud Save
    try {
      const response = await client.put(`/api/notes/${id}`, data);
      const note = response.data;

      // Update SQLite Cache
      const dbData = {
        title: note.title,
        content: note.content,
        category: note.category,
        is_secure: note.is_secure ? 1 : 0,
        is_pinned: note.is_pinned ? 1 : 0,
        is_completed: note.is_completed ? 1 : 0,
        is_favorite: note.is_favorite ? 1 : 0,
        checklist_items: note.checklist_items ? JSON.stringify(note.checklist_items) : null,
        field_notes: note.field_notes ? JSON.stringify(note.field_notes) : null,
        updated_at: note.updated_at,
      };
      const keys = Object.keys(dbData);
      const values = keys.map(k => (dbData as any)[k]);
      const setStr = keys.map(k => `${k} = ?`).join(', ');
      await db.runAsync(`UPDATE Notes SET ${setStr} WHERE remote_id = ?`, [...values, id]);

      // If GDrive Backup mode is enabled, upload backup
      if (storageMode === 'cloud_gdrive' && googleDriveConnected) {
        try {
          const token = await googleDrive.getGoogleDriveAccessToken();
          const fileId = await googleDrive.uploadJsonFile(token, 'Notes', `note_${id}.json`, note);
          await db.runAsync('INSERT OR REPLACE INTO GoogleDriveSync (entity, record_id, drive_file_id) VALUES (?, ?, ?)', 'Notes', id, fileId);
        } catch (gErr) {
          logger.error('[StorageManager] GDrive backup update failed:', gErr);
        }
      }

      return note;
    } catch (e: any) {
      logger.error('Failed to update note on Neon, queuing locally:', e);
      await localUpdate('Notes', id, {
        title: data.title,
        content: data.content,
        category: data.category,
        is_secure: data.is_secure ? 1 : 0,
        is_pinned: data.is_pinned ? 1 : 0,
        is_completed: data.is_completed ? 1 : 0,
        is_favorite: data.is_favorite ? 1 : 0,
        checklist_items: data.checklist_items ? JSON.stringify(data.checklist_items) : undefined,
        field_notes: data.field_notes ? JSON.stringify(data.field_notes) : undefined,
      });
      return { id, ...data };
    }
  },

  deleteNote: async (id: number): Promise<void> => {
    const { storageMode, googleDriveConnected } = useSettingsStore.getState();
    const db = getDB();

    if (storageMode === 'local') {
      await localDelete('Notes', id);
      return;
    }

    if (storageMode === 'gdrive') {
      await localDelete('Notes', id);
      try {
        const mapping: any = await db.getFirstAsync('SELECT drive_file_id FROM GoogleDriveSync WHERE entity = ? AND record_id = ?', ['Notes', id]);
        if (mapping?.drive_file_id) {
          const token = await googleDrive.getGoogleDriveAccessToken();
          await googleDrive.deleteFile(token, mapping.drive_file_id);
          await db.runAsync('DELETE FROM GoogleDriveSync WHERE entity = ? AND record_id = ?', ['Notes', id]);
        }
      } catch (gErr) {
        logger.error('[StorageManager] GDrive delete failed:', gErr);
      }
      return;
    }

    // Default: Cloud Delete
    try {
      await client.delete(`/api/notes/${id}`);
      await db.runAsync('UPDATE Notes SET is_deleted = 1 WHERE remote_id = ?', [id]);

      if (storageMode === 'cloud_gdrive' && googleDriveConnected) {
        try {
          const mapping: any = await db.getFirstAsync('SELECT drive_file_id FROM GoogleDriveSync WHERE entity = ? AND record_id = ?', ['Notes', id]);
          if (mapping?.drive_file_id) {
            const token = await googleDrive.getGoogleDriveAccessToken();
            await googleDrive.deleteFile(token, mapping.drive_file_id);
            await db.runAsync('DELETE FROM GoogleDriveSync WHERE entity = ? AND record_id = ?', ['Notes', id]);
          }
        } catch (gErr) {
          logger.error('[StorageManager] GDrive backup delete failed:', gErr);
        }
      }
    } catch (e: any) {
      logger.error('Failed to delete note on Neon, queuing locally:', e);
      // Soft-delete local cache record
      await localDelete('Notes', id);
    }
  },

  // ── Sync with Google Drive ──────────────────────────────────────────

  syncGoogleDrive: async (): Promise<boolean> => {
    const { googleDriveConnected } = useSettingsStore.getState();
    if (!googleDriveConnected) return false;

    try {
      const token = await googleDrive.getGoogleDriveAccessToken();
      const db = getDB();

      // Sync Notes
      const notes = await db.getAllAsync('SELECT * FROM Notes WHERE is_deleted = 0');
      for (const note of notes as any[]) {
        const fileId = await googleDrive.uploadJsonFile(token, 'Notes', `note_${note.remote_id || note.id}.json`, sqlToAppNote(note));
        await db.runAsync('INSERT OR REPLACE INTO GoogleDriveSync (entity, record_id, drive_file_id) VALUES (?, ?, ?)', 'Notes', note.id, fileId);
      }

      // Sync Goals
      const goals = await db.getAllAsync('SELECT * FROM Goals WHERE is_deleted = 0');
      for (const goal of goals as any[]) {
        const fileId = await googleDrive.uploadJsonFile(token, 'Goals', `goal_${goal.remote_id || goal.id}.json`, sqlToAppGoal(goal));
        await db.runAsync('INSERT OR REPLACE INTO GoogleDriveSync (entity, record_id, drive_file_id) VALUES (?, ?, ?)', 'Goals', goal.id, fileId);
      }

      // Sync Reminders
      const reminders = await db.getAllAsync('SELECT * FROM Reminders WHERE is_deleted = 0');
      for (const rem of reminders as any[]) {
        const fileId = await googleDrive.uploadJsonFile(token, 'Reminders', `reminder_${rem.remote_id || rem.id}.json`, sqlToAppReminder(rem));
        await db.runAsync('INSERT OR REPLACE INTO GoogleDriveSync (entity, record_id, drive_file_id) VALUES (?, ?, ?)', 'Reminders', rem.id, fileId);
      }

      // Sync ImportantDays
      const days = await db.getAllAsync('SELECT * FROM ImportantDays WHERE is_deleted = 0');
      for (const day of days as any[]) {
        const fileId = await googleDrive.uploadJsonFile(token, 'Special Days', `important_day_${day.remote_id || day.id}.json`, sqlToAppImportantDay(day));
        await db.runAsync('INSERT OR REPLACE INTO GoogleDriveSync (entity, record_id, drive_file_id) VALUES (?, ?, ?)', 'ImportantDays', day.id, fileId);
      }

      // Update sync timestamp
      await useSettingsStore.getState().setLastDriveSync(new Date().toLocaleString());
      return true;
    } catch (e) {
      logger.error('[StorageManager] Google Drive sync failed:', e);
      return false;
    }
  },

  // ── Restore from Google Drive ────────────────────────────────────────

  restoreFromGoogleDrive: async (): Promise<boolean> => {
    const { googleDriveConnected } = useSettingsStore.getState();
    if (!googleDriveConnected) return false;

    try {
      const token = await googleDrive.getGoogleDriveAccessToken();
      const db = getDB();

      // Clear local DB tables first
      await db.execAsync('DELETE FROM Notes; DELETE FROM Goals; DELETE FROM Reminders; DELETE FROM ImportantDays; DELETE FROM GoogleDriveSync;');

      const restoreEntity = async (folderName: string, sqlTable: string, translator: Function) => {
        const files = await googleDrive.listFolderFiles(token, folderName);
        for (const file of files) {
          if (file.name.endsWith('.json')) {
            const data = await googleDrive.downloadJsonFile(token, file.id);
            // Insert back to local SQLite database
            if (sqlTable === 'Notes') {
              await db.runAsync(
                'INSERT INTO Notes (remote_id, title, content, category, is_secure, is_pinned, is_completed, note_type, is_favorite, checklist_items, field_notes, user_id, created_at, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
                data.remote_id || null, data.title, data.content || null, data.category || 'General', data.is_secure ? 1 : 0, data.is_pinned ? 1 : 0, data.is_completed ? 1 : 0, data.note_type || 'standard', data.is_favorite ? 1 : 0, data.checklist_items ? JSON.stringify(data.checklist_items) : null, data.field_notes ? JSON.stringify(data.field_notes) : null, data.user_id || null, data.created_at || new Date().toISOString(), data.updated_at || new Date().toISOString()
              );
            } else if (sqlTable === 'Goals') {
              await db.runAsync(
                'INSERT INTO Goals (remote_id, title, completed, user_id, created_at, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, 0)',
                data.remote_id || null, data.title, data.completed ? 1 : 0, data.user_id || null, data.created_at || new Date().toISOString(), data.updated_at || new Date().toISOString()
              );
            } else if (sqlTable === 'Reminders') {
              await db.runAsync(
                'INSERT INTO Reminders (remote_id, title, description, type, custom_type, reminder_date, user_id, created_at, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
                data.remote_id || null, data.title, data.description || null, data.type || 'custom', data.custom_type || null, data.reminder_date, data.user_id || null, data.created_at || new Date().toISOString(), data.updated_at || new Date().toISOString()
              );
            } else if (sqlTable === 'ImportantDays') {
              await db.runAsync(
                'INSERT INTO ImportantDays (remote_id, title, date, type, is_recurring, custom_type, notes, gift_ideas, celebration_plans, reminder_notes, message_draft, user_id, created_at, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
                data.remote_id || null, data.title, data.date, data.type || 'Birthday', data.is_recurring ? 1 : 0, data.custom_type || null, data.notes || null, data.gift_ideas || null, data.celebration_plans || null, data.reminder_notes || null, data.message_draft || null, data.user_id || null, data.created_at || new Date().toISOString(), data.updated_at || new Date().toISOString()
              );
            }
          }
        }
      };

      await restoreEntity('Notes', 'Notes', sqlToAppNote);
      await restoreEntity('Goals', 'Goals', sqlToAppGoal);
      await restoreEntity('Reminders', 'Reminders', sqlToAppReminder);
      await restoreEntity('Special Days', 'ImportantDays', sqlToAppImportantDay);

      return true;
    } catch (e) {
      logger.error('[StorageManager] Google Drive restore failed:', e);
      return false;
    }
  }
};
