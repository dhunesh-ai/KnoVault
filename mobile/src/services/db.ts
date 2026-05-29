import * as SQLite from 'expo-sqlite';
import { DeviceEventEmitter } from 'react-native';
import { logger } from '../utils/logger';

export const getDB = () => {
  return SQLite.openDatabaseSync('knovault.db');
};

export const initDB = async () => {
  const db = getDB();

  // Create SyncQueue table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS SyncQueue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      record_id INTEGER,
      temp_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Notes table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id INTEGER UNIQUE,
      title TEXT NOT NULL,
      content TEXT,
      category TEXT DEFAULT 'General',
      is_secure INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      note_type TEXT DEFAULT 'general',
      is_favorite INTEGER DEFAULT 0,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0,
      checklist_items TEXT,
      field_notes TEXT
    );
  `);

  // Create Goals table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id INTEGER UNIQUE,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0
    );
  `);

  // Create Reminders table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id INTEGER UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'custom',
      custom_type TEXT,
      reminder_date DATETIME NOT NULL,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0,
      start_date DATETIME,
      end_date DATETIME,
      timing_label TEXT,
      dose_index INTEGER,
      course_day INTEGER,
      notification_id TEXT,
      is_completed INTEGER DEFAULT 0,
      series_id TEXT
    );
  `);

  // Create ImportantDays table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ImportantDays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id INTEGER UNIQUE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT DEFAULT 'Birthday',
      is_recurring INTEGER DEFAULT 1,
      custom_type TEXT,
      notes TEXT,
      gift_ideas TEXT,
      celebration_plans TEXT,
      reminder_notes TEXT,
      message_draft TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0
    );
  `);

  // Create SyncMetadata table to store last_sync
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS SyncMetadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_sync DATETIME DEFAULT '1970-01-01T00:00:00Z'
    );
  `);
  
  // Initialize SyncMetadata if empty
  const meta = await db.getFirstAsync('SELECT * FROM SyncMetadata LIMIT 1');
  if (!meta) {
    await db.runAsync("INSERT INTO SyncMetadata (last_sync) VALUES ('1970-01-01T00:00:00Z')");
  }

  logger.info('Local Database Initialized');
};

export const clearDB = async () => {
    const db = getDB();
    await db.execAsync(`
        DELETE FROM Notes;
        DELETE FROM Goals;
        DELETE FROM Reminders;
        DELETE FROM ImportantDays;
        DELETE FROM SyncQueue;
        UPDATE SyncMetadata SET last_sync = '1970-01-01T00:00:00Z';
    `);
};

export const resetLocalDB = async () => {
    const db = getDB();
    logger.warn('Dropping all tables to reset database...');
    await db.execAsync(`
        DROP TABLE IF EXISTS Notes;
        DROP TABLE IF EXISTS Goals;
        DROP TABLE IF EXISTS Reminders;
        DROP TABLE IF EXISTS ImportantDays;
        DROP TABLE IF EXISTS SyncQueue;
        DROP TABLE IF EXISTS SyncMetadata;
    `);
    await initDB();
};

export const generateTempId = () => {
  return 'temp_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
};

export const queueSyncAction = async (action: 'INSERT' | 'UPDATE' | 'DELETE', entity: string, recordId: number | null, tempId: string | null = null) => {
  const db = getDB();
  await db.runAsync(
    'INSERT INTO SyncQueue (action, entity, record_id, temp_id) VALUES (?, ?, ?, ?)',
    [action, entity, recordId, tempId]
  );
};

export const localInsert = async (table: string, data: any) => {
  const db = getDB();
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  
  const tempId = generateTempId();
  
  const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const result = await db.runAsync(query, values as any[]);
  
  await queueSyncAction('INSERT', table, result.lastInsertRowId, tempId);
  
  // Trigger Auto-Sync in the background safely
  setTimeout(() => DeviceEventEmitter.emit('TRIGGER_AUTO_SYNC'), 1500);
  
  return { id: result.lastInsertRowId, tempId };
};

export const localUpdate = async (table: string, id: number, data: any) => {
  const db = getDB();
  data.updated_at = new Date().toISOString();
  
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setString = keys.map(k => `${k} = ?`).join(', ');
  
  const query = `UPDATE ${table} SET ${setString} WHERE id = ?`;
  await db.runAsync(query, [...values, id] as any[]);
  
  await queueSyncAction('UPDATE', table, id);

  // Trigger Auto-Sync in the background safely
  setTimeout(() => DeviceEventEmitter.emit('TRIGGER_AUTO_SYNC'), 1500);
};

export const localDelete = async (table: string, id: number) => {
  const db = getDB();
  const now = new Date().toISOString();
  
  // Soft delete
  await db.runAsync(`UPDATE ${table} SET is_deleted = 1, updated_at = ? WHERE id = ?`, [now, id]);
  
  await queueSyncAction('DELETE', table, id);

  // Trigger Auto-Sync in the background safely
  setTimeout(() => DeviceEventEmitter.emit('TRIGGER_AUTO_SYNC'), 1500);
};

export const getSyncQueue = async () => {
    const db = getDB();
    return await db.getAllAsync('SELECT * FROM SyncQueue ORDER BY created_at ASC');
};

export const clearSyncQueue = async (ids: number[]) => {
    if (ids.length === 0) return;
    const db = getDB();
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM SyncQueue WHERE id IN (${placeholders})`, ids);
};

