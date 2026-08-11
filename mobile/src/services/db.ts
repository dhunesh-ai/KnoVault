import * as SQLite from 'expo-sqlite';
import { DeviceEventEmitter } from 'react-native';
import { logger } from '../utils/logger';

// ── DB QUEUE (MUTEX & TRANSACTION LOCK) ─────────────────────────────
class DBQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;

  public async enqueue<T>(operation: (db: SQLite.SQLiteDatabase) => Promise<T>, dbSupplier: () => SQLite.SQLiteDatabase): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const db = dbSupplier();
          const result = await this.executeWithRetry(() => operation(db));
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }

  public async transaction<T>(operation: (db: SQLite.SQLiteDatabase) => Promise<T>, dbSupplier: () => SQLite.SQLiteDatabase, callerName = 'DBTransaction'): Promise<T> {
    return this.enqueue(async (db) => {
      logger.info(`[DB BEGIN] ${callerName}`);
      try {
        await db.execAsync('BEGIN IMMEDIATE;');
        const res = await operation(db);
        await db.execAsync('COMMIT;');
        logger.info(`[DB COMMIT] ${callerName}`);
        return res;
      } catch (err) {
        logger.warn(`[DB ROLLBACK] ${callerName}:`, err);
        try {
          await db.execAsync('ROLLBACK;');
        } catch (_rollbackErr) {
          // Ignore rollback error if transaction already ended
        }
        throw err;
      } finally {
        logger.info(`[DB RELEASE] ${callerName}`);
      }
    }, dbSupplier);
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const nextOp = this.queue.shift();
    if (nextOp) {
      try {
        await nextOp();
      } catch (e) {
        logger.error('[DBQueue] Error processing queued operation:', e);
      }
    }
    this.isProcessing = false;
    this.processNext();
  }

  private async executeWithRetry<T>(operation: () => Promise<T>, retries = 3, delay = 50): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const errorMsg = (error?.message || '').toLowerCase();
        const isLocked = errorMsg.includes('database is locked') || errorMsg.includes('busy') || errorMsg.includes('statement');
        if (isLocked && attempt < retries) {
          const backoff = delay * Math.pow(2, attempt);
          logger.warn(`[DBQueue] SQLite locked/busy (attempt ${attempt + 1}/${retries + 1}). Retrying in ${backoff}ms...`);
          await new Promise(res => setTimeout(res, backoff));
        } else {
          throw error;
        }
      }
    }
    throw new Error('[DBQueue] Max retries exceeded');
  }
}

// ── SINGLETON DATABASE SERVICE WITH READY BARRIER ───────────────────
class DatabaseService {
  private dbInstance: SQLite.SQLiteDatabase | null = null;
  private isInitStarted = false;
  private isReady = false;
  private readyResolver: (() => void) | null = null;
  private databaseReadyPromise: Promise<void>;
  private dbQueue: DBQueue;

  constructor() {
    this.databaseReadyPromise = new Promise<void>((resolve) => {
      this.readyResolver = resolve;
    });
    this.dbQueue = new DBQueue();
  }

  public getDB(): SQLite.SQLiteDatabase {
    if (!this.dbInstance) {
      this.dbInstance = SQLite.openDatabaseSync('knovault.db');
      // Apply PRAGMAs IMMEDIATELY upon opening instance before ANY query or migration!
      try {
        this.dbInstance.execSync(`
          PRAGMA journal_mode = WAL;
          PRAGMA busy_timeout = 5000;
          PRAGMA foreign_keys = ON;
          PRAGMA synchronous = NORMAL;
        `);
        logger.info('[DatabaseService] PRAGMAs applied immediately on open instance.');
      } catch (e) {
        logger.warn('[DatabaseService] Failed to set PRAGMAs:', e);
      }
    }
    return this.dbInstance;
  }

  public async ready(): Promise<void> {
    if (this.isReady) return;
    return this.databaseReadyPromise;
  }

  public async initialize(): Promise<void> {
    if (this.isInitStarted) return this.ready();
    this.isInitStarted = true;

    logger.info('[DatabaseService] Starting database initialization...');
    const db = this.getDB();

    await this.dbQueue.enqueue(async (targetDb) => {
      // Create SyncQueue table
      await targetDb.execAsync(`
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
      await targetDb.execAsync(`
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
      await targetDb.execAsync(`
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
      await targetDb.execAsync(`
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
      await targetDb.execAsync(`
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
            await targetDb.execAsync(migration);
          } catch (_e: any) {
            const msg = (_e?.message || '').toLowerCase();
            if (!msg.includes('duplicate column name') && !msg.includes('already exists')) {
              throw _e;
            }
          }
        }
      } catch (err) {
        logger.error('Failed to run ImportantDays migrations, recreating table:', err);
        try {
          await targetDb.execAsync('DROP TABLE IF EXISTS ImportantDays;');
          await targetDb.execAsync(`
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
          await targetDb.execAsync("UPDATE SyncMetadata SET last_sync = '1970-01-01T00:00:00Z';");
        } catch (recreateErr) {
          logger.error('Failed to recreate ImportantDays table:', recreateErr);
        }
      }

      // Create SyncMetadata table to store last_sync
      await targetDb.execAsync(`
        CREATE TABLE IF NOT EXISTS SyncMetadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          last_sync DATETIME DEFAULT '1970-01-01T00:00:00Z'
        );
      `);
      
      // Create NotificationHistory table
      await targetDb.execAsync(`
        CREATE TABLE IF NOT EXISTS NotificationHistory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          title TEXT NOT NULL,
          body TEXT,
          category TEXT,
          payload TEXT,
          is_read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      try {
        await targetDb.execAsync("ALTER TABLE NotificationHistory ADD COLUMN user_id INTEGER;");
      } catch {
        // Ignore if user_id column already exists
      }

      // Create GoogleDriveSync table
      await targetDb.execAsync(`
        CREATE TABLE IF NOT EXISTS GoogleDriveSync (
          entity TEXT NOT NULL,
          record_id INTEGER NOT NULL,
          drive_file_id TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (entity, record_id)
        );
      `);

      // Initialize SyncMetadata if empty
      const meta = await targetDb.getFirstAsync('SELECT * FROM SyncMetadata LIMIT 1');
      if (!meta) {
        await targetDb.runAsync("INSERT INTO SyncMetadata (last_sync) VALUES ('1970-01-01T00:00:00Z')");
      }
    }, () => this.getDB());

    this.isReady = true;
    if (this.readyResolver) {
      this.readyResolver();
    }
    logger.info('[DatabaseService] SQLite Initialized, PRAGMAs Applied, Database Ready.');
  }

  public async read<T>(operation: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    await this.ready();
    return this.dbQueue.enqueue(operation, () => this.getDB());
  }

  public async write<T>(operation: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    await this.ready();
    return this.dbQueue.enqueue(operation, () => this.getDB());
  }

  public async transaction<T>(operation: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    await this.ready();
    return this.dbQueue.transaction(operation, () => this.getDB());
  }
}

export const dbService = new DatabaseService();
export const dbQueue = {
  read: <T>(op: (db: SQLite.SQLiteDatabase) => Promise<T>) => dbService.read(op),
  write: <T>(op: (db: SQLite.SQLiteDatabase) => Promise<T>) => dbService.write(op),
  transaction: <T>(op: (db: SQLite.SQLiteDatabase) => Promise<T>) => dbService.transaction(op),
};

export const getDB = (): SQLite.SQLiteDatabase => dbService.getDB();

export const initDB = async (): Promise<void> => {
  return dbService.initialize();
};

export const clearDB = async () => {
  return dbService.write(async (db) => {
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
  });
};

export const resetLocalDB = async () => {
  return dbService.write(async (db) => {
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
    await dbService.initialize();
  });
};

export const generateTempId = () => {
  return 'temp_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
};

export const queueSyncAction = async (action: 'INSERT' | 'UPDATE' | 'DELETE', entity: string, recordId: number | null, tempId: string | null = null) => {
  return dbService.write(async (db) => {
    await db.runAsync(
      'INSERT INTO SyncQueue (action, entity, record_id, temp_id) VALUES (?, ?, ?, ?)',
      action, entity, recordId, tempId
    );
  });
};

export const localInsert = async (table: string, data: any) => {
  return dbService.transaction(async (db) => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const tempId = generateTempId();
    
    const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await db.runAsync(query, ...(values as any[]));
    
    await db.runAsync(
      'INSERT INTO SyncQueue (action, entity, record_id, temp_id) VALUES (?, ?, ?, ?)',
      'INSERT', table, result.lastInsertRowId, tempId
    );

    // Trigger Auto-Sync in the background safely
    setTimeout(() => DeviceEventEmitter.emit('TRIGGER_AUTO_SYNC'), 1500);
    
    return { id: result.lastInsertRowId, tempId };
  });
};

export const localUpdate = async (table: string, id: number, data: any) => {
  return dbService.transaction(async (db) => {
    data.updated_at = new Date().toISOString();
    
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setString = keys.map(k => `${k} = ?`).join(', ');
    
    const query = `UPDATE ${table} SET ${setString} WHERE id = ?`;
    await db.runAsync(query, ...[...values, id] as any[]);
    
    await db.runAsync(
      'INSERT INTO SyncQueue (action, entity, record_id, temp_id) VALUES (?, ?, ?, ?)',
      'UPDATE', table, id, null
    );

    // Trigger Auto-Sync in the background safely
    setTimeout(() => DeviceEventEmitter.emit('TRIGGER_AUTO_SYNC'), 1500);
  });
};

export const localDelete = async (table: string, id: number) => {
  return dbService.transaction(async (db) => {
    const now = new Date().toISOString();
    
    // Soft delete
    await db.runAsync(`UPDATE ${table} SET is_deleted = 1, updated_at = ? WHERE id = ?`, now, id);
    
    await db.runAsync(
      'INSERT INTO SyncQueue (action, entity, record_id, temp_id) VALUES (?, ?, ?, ?)',
      'DELETE', table, id, null
    );

    // Trigger Auto-Sync in the background safely
    setTimeout(() => DeviceEventEmitter.emit('TRIGGER_AUTO_SYNC'), 1500);
  });
};

export const getSyncQueue = async () => {
  return dbService.read(async (db) => {
    return await db.getAllAsync('SELECT * FROM SyncQueue ORDER BY created_at ASC');
  });
};

export const clearSyncQueue = async (ids: number[]) => {
  if (ids.length === 0) return;
  return dbService.write(async (db) => {
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM SyncQueue WHERE id IN (${placeholders})`, ...ids);
  });
};
