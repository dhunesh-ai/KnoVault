import * as SQLite from 'expo-sqlite';
import { DeviceEventEmitter } from 'react-native';
import { logger } from '../utils/logger';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDB = () => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('knovault.db');
  }
  return dbInstance;
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
      recipient_email TEXT,
      phone_number TEXT,
      relationship TEXT,
      email_subject TEXT,
      email_message TEXT,
      email_enabled INTEGER DEFAULT 0,
      delivery_type TEXT DEFAULT 'notification',
      send_time TEXT DEFAULT '09:00',
      reminders_json TEXT,
      reminder_enabled INTEGER DEFAULT 0,
      reminder_type TEXT,
      reminder_value INTEGER,
      reminder_unit TEXT,
      reminder_time TEXT,
      notification_ids TEXT,
      auto_send_email INTEGER DEFAULT 0,
      email_send_time TEXT,
      last_email_sent_at TEXT,
      last_sent_year INTEGER,
      timezone TEXT DEFAULT 'UTC',
      email_status TEXT DEFAULT 'PENDING',
      email_retry_count INTEGER DEFAULT 0,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0
    );
  `);

  // Migrate existing ImportantDays table: add new columns if missing
  const importantDaysMigrations = [
    'ALTER TABLE ImportantDays ADD COLUMN recipient_email TEXT',
    'ALTER TABLE ImportantDays ADD COLUMN phone_number TEXT',
    'ALTER TABLE ImportantDays ADD COLUMN relationship TEXT',
    'ALTER TABLE ImportantDays ADD COLUMN email_subject TEXT',
    'ALTER TABLE ImportantDays ADD COLUMN email_message TEXT',
    'ALTER TABLE ImportantDays ADD COLUMN email_enabled INTEGER DEFAULT 0',
    'ALTER TABLE ImportantDays ADD COLUMN delivery_type TEXT DEFAULT \'notification\'',
    'ALTER TABLE ImportantDays ADD COLUMN send_time TEXT DEFAULT \'09:00\'',
    'ALTER TABLE ImportantDays ADD COLUMN reminders_json TEXT',
    'ALTER TABLE ImportantDays ADD COLUMN reminder_enabled INTEGER DEFAULT 0',
    'ALTER TABLE ImportantDays ADD COLUMN reminder_type TEXT',
    'ALTER TABLE ImportantDays ADD COLUMN reminder_value INTEGER',
    'ALTER TABLE ImportantDays ADD COLUMN reminder_unit TEXT',
    'ALTER TABLE ImportantDays ADD COLUMN reminder_time TEXT',
    'ALTER TABLE ImportantDays ADD COLUMN notification_ids TEXT',
    'ALTER TABLE ImportantDays ADD COLUMN auto_send_email INTEGER DEFAULT 0',
    'ALTER TABLE ImportantDays ADD COLUMN email_send_time TEXT',
    'ALTER TABLE ImportantDays ADD COLUMN last_email_sent_at TEXT',
    'ALTER TABLE ImportantDays ADD COLUMN last_sent_year INTEGER',
    'ALTER TABLE ImportantDays ADD COLUMN timezone TEXT DEFAULT \'UTC\'',
    'ALTER TABLE ImportantDays ADD COLUMN email_status TEXT DEFAULT \'PENDING\'',
    'ALTER TABLE ImportantDays ADD COLUMN email_retry_count INTEGER DEFAULT 0',
  ];

  try {
    for (const migration of importantDaysMigrations) {
      try {
        await db.execAsync(migration);
      } catch (_e: any) {
        // Safe to ignore if column already exists
        const msg = (_e?.message || '').toLowerCase();
        if (!msg.includes('duplicate column name') && !msg.includes('already exists')) {
          throw _e;
        }
      }
    }
  } catch (err) {
    logger.error('Failed to run ImportantDays migrations, recreating table:', err);
    try {
      await db.execAsync('DROP TABLE IF EXISTS ImportantDays;');
      await db.execAsync(`
        CREATE TABLE ImportantDays (
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
          recipient_email TEXT,
          phone_number TEXT,
          relationship TEXT,
          email_subject TEXT,
          email_message TEXT,
          email_enabled INTEGER DEFAULT 0,
          delivery_type TEXT DEFAULT 'notification',
          send_time TEXT DEFAULT '09:00',
          reminders_json TEXT,
          reminder_enabled INTEGER DEFAULT 0,
          reminder_type TEXT,
          reminder_value INTEGER,
          reminder_unit TEXT,
          reminder_time TEXT,
          notification_ids TEXT,
          auto_send_email INTEGER DEFAULT 0,
          email_send_time TEXT,
          last_email_sent_at TEXT,
          last_sent_year INTEGER,
          timezone TEXT DEFAULT 'UTC',
          email_status TEXT DEFAULT 'PENDING',
          email_retry_count INTEGER DEFAULT 0,
          user_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_deleted INTEGER DEFAULT 0
        );
      `);
      await db.execAsync("UPDATE SyncMetadata SET last_sync = '1970-01-01T00:00:00Z';");
      logger.info('Successfully recreated ImportantDays table and reset sync date.');
    } catch (recreateErr) {
      logger.error('Failed to recreate ImportantDays table:', recreateErr);
    }
  }

  // Create SyncMetadata table to store last_sync
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS SyncMetadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_sync DATETIME DEFAULT '1970-01-01T00:00:00Z'
    );
  `);
  
  // Create NotificationHistory table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS NotificationHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT,
      category TEXT,
      payload TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create GoogleDriveSync table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS GoogleDriveSync (
      entity TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      drive_file_id TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (entity, record_id)
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
        DELETE FROM NotificationHistory;
        DELETE FROM GoogleDriveSync;
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
        DROP TABLE IF EXISTS NotificationHistory;
        DROP TABLE IF EXISTS GoogleDriveSync;
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
    action, entity, recordId, tempId
  );
};

export const localInsert = async (table: string, data: any) => {
  const db = getDB();
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  
  const tempId = generateTempId();
  
  const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const result = await db.runAsync(query, ...(values as any[]));
  
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
  await db.runAsync(query, ...[...values, id] as any[]);
  
  await queueSyncAction('UPDATE', table, id);

  // Trigger Auto-Sync in the background safely
  setTimeout(() => DeviceEventEmitter.emit('TRIGGER_AUTO_SYNC'), 1500);
};

export const localDelete = async (table: string, id: number) => {
  const db = getDB();
  const now = new Date().toISOString();
  
  // Soft delete
  await db.runAsync(`UPDATE ${table} SET is_deleted = 1, updated_at = ? WHERE id = ?`, now, id);
  
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
    await db.runAsync(`DELETE FROM SyncQueue WHERE id IN (${placeholders})`, ...ids);
};

