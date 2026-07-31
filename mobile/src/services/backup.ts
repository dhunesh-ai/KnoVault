import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { dbQueue, localInsert, clearDB } from './db';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const BACKUP_ENCRYPTION_KEY = 'knovault_backup_encryption_key';

export const getEncryptionKey = async () => {
    let key = await SecureStore.getItemAsync(BACKUP_ENCRYPTION_KEY);
    if (!key) {
        // Generate a random 256-bit key
        key = CryptoJS.lib.WordArray.random(256 / 8).toString();
        await SecureStore.setItemAsync(BACKUP_ENCRYPTION_KEY, key);
    }
    return key;
};

export const generateBackupPayload = async () => {
    return dbQueue.read(async (db) => {
        const notes = await db.getAllAsync('SELECT * FROM Notes');
        const goals = await db.getAllAsync('SELECT * FROM Goals');
        const reminders = await db.getAllAsync('SELECT * FROM Reminders');
        const important_days = await db.getAllAsync('SELECT * FROM ImportantDays');

        return JSON.stringify({
            version: '1.0',
            exported_at: new Date().toISOString(),
            notes,
            goals,
            reminders,
            important_days
        });
    });
};

export const encryptPayload = async (payloadStr: string) => {
    const key = await getEncryptionKey();
    return CryptoJS.AES.encrypt(payloadStr, key).toString();
};

export const decryptPayload = async (encryptedStr: string) => {
    const key = await getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(encryptedStr, key);
    return bytes.toString(CryptoJS.enc.Utf8);
};

export const exportLocalBackup = async () => {
    try {
        const payload = await generateBackupPayload();
        const encrypted = await encryptPayload(payload);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `knovault_secure_backup_${timestamp}.kno`;
        const path = ((FileSystem as any).documentDirectory || '') + filename;
        
        await FileSystem.writeAsStringAsync(path, encrypted);
        
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(path, { mimeType: 'application/octet-stream', dialogTitle: 'Export KnoVault Backup' });
            return { success: true, size: encrypted.length, filename };
        }
        return { success: false, error: 'Sharing not available' };
    } catch (error) {
        console.error('Export failed:', error);
        return { success: false, error: String(error) };
    }
};

export const importLocalBackup = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
        if (result.canceled) return { success: false, canceled: true };
        
        const uri = result.assets?.[0]?.uri;
        if (!uri) return { success: false, error: 'No file selected' };
        
        const encrypted = await FileSystem.readAsStringAsync(uri);
        const decrypted = await decryptPayload(encrypted);
        
        if (!decrypted) {
            return { success: false, error: 'Invalid backup or incorrect encryption key' };
        }
        
        const data = JSON.parse(decrypted);
        if (!data.version || !data.notes) {
            return { success: false, error: 'Invalid backup file format' };
        }
        
        // Restore process (Clear and rebuild)
        await clearDB();
        
        // Disable sync queue temporarily or let it sync as INSERT
        // For simplicity, we just push to local DB. Sync Engine will treat them as new unless we keep remote_id
        for (const note of data.notes) {
            delete note.id; // Let SQLite auto-increment
            await localInsert('Notes', note);
        }
        for (const goal of data.goals) {
            delete goal.id;
            await localInsert('Goals', goal);
        }
        for (const rem of data.reminders) {
            delete rem.id;
            await localInsert('Reminders', rem);
        }
        for (const iday of data.important_days) {
            delete iday.id;
            await localInsert('ImportantDays', iday);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Import failed:', error);
        return { success: false, error: String(error) };
    }
};

export const exportLocalBackupAsJson = async () => {
    try {
        const payload = await generateBackupPayload(); // raw JSON string
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `KnoVault_Export_${timestamp}.json`;
        const path = ((FileSystem as any).documentDirectory || '') + filename;
        
        await FileSystem.writeAsStringAsync(path, payload);
        
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export KnoVault JSON Data' });
            return { success: true, size: payload.length, filename };
        }
        return { success: false, error: 'Sharing not available' };
    } catch (error) {
        console.error('JSON Export failed:', error);
        return { success: false, error: String(error) };
    }
};

export const importLocalBackupFromJson = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
        if (result.canceled) return { success: false, canceled: true };
        
        const uri = result.assets?.[0]?.uri;
        if (!uri) return { success: false, error: 'No file selected' };
        
        const fileString = await FileSystem.readAsStringAsync(uri);
        const data = JSON.parse(fileString);
        
        if (!data.version || !data.notes) {
            return { success: false, error: 'Invalid backup JSON file format' };
        }
        
        // Restore process (Clear and rebuild)
        await clearDB();
        
        // Push directly to local DB via localInsert to trigger syncQueue
        for (const note of data.notes) {
            delete note.id; // Let SQLite auto-increment
            await localInsert('Notes', note);
        }
        for (const goal of data.goals) {
            delete goal.id;
            await localInsert('Goals', goal);
        }
        for (const rem of data.reminders) {
            delete rem.id;
            await localInsert('Reminders', rem);
        }
        for (const iday of data.important_days) {
            delete iday.id;
            await localInsert('ImportantDays', iday);
        }
        
        return { success: true };
    } catch (error) {
        console.error('JSON Import failed:', error);
        return { success: false, error: String(error) };
    }
};
