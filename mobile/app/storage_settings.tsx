import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../src/hooks/useTheme';
import { useSettingsStore } from '../src/store/settingsStore';
import { storageManager } from '../src/services/storageManager';
import { exportLocalBackupAsJson, importLocalBackupFromJson } from '../src/services/backup';
import ScreenContainer from '../src/components/ScreenContainer';
import client from '../src/api/client';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signInWithGoogle } from '../src/utils/firebase';

export default function StorageSettingsScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  
  const {
    storageMode,
    setStorageMode,
    autoSwitchWhenFull,
    setAutoSwitchWhenFull,
    googleDriveConnected,
    setGoogleDriveConnected,
    setGoogleDriveAccessToken,
    lastDriveSync,
    setLastDriveSync,
  } = useSettingsStore();

  // Local State
  const [cloudStats, setCloudStats] = useState({ used: 0, limit: 5 * 1024 * 1024, percent: 0 });
  const [localDbSize, setLocalDbSize] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [restoringDrive, setRestoringDrive] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);

  // Fetch Storage Stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      // 1. Cloud Stats
      const res = await client.get('/api/profile/storage');
      const { used_bytes, limit_bytes, percent_used } = res.data;
      setCloudStats({
        used: used_bytes,
        limit: limit_bytes,
        percent: percent_used,
      });

      // 2. SQLite Database File Size
      const dbPath = `${(FileSystem as any).documentDirectory}SQLite/knovault.db`;
      const dbInfo = await FileSystem.getInfoAsync(dbPath);
      if (dbInfo.exists) {
        setLocalDbSize(dbInfo.size || 0);
      }
    } catch (e) {
      console.error('[StorageSettings] Failed to fetch stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Google Drive Handlers
  const handleConnectGDrive = async () => {
    setConnectingDrive(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        const { accessToken } = await GoogleSignin.getTokens();
        await setGoogleDriveAccessToken(accessToken);
        await setGoogleDriveConnected(true);
        Alert.alert('Connected', 'Google Drive successfully connected!');
      }
    } catch (err: any) {
      Alert.alert('Connection Failed', err.message || 'Failed to authenticate Google Drive.');
    } finally {
      setConnectingDrive(false);
    }
  };

  const handleDisconnectGDrive = async () => {
    Alert.alert(
      'Disconnect Google Drive',
      'Are you sure you want to disconnect Google Drive? Auto-backups will stop.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await setGoogleDriveAccessToken(null);
            await setGoogleDriveConnected(false);
            await setLastDriveSync(null);
            Alert.alert('Disconnected', 'Google Drive has been disconnected.');
          },
        },
      ]
    );
  };

  const handleSyncDrive = async () => {
    if (!googleDriveConnected) {
      Alert.alert('Error', 'Please connect Google Drive first.');
      return;
    }
    setSyncingDrive(true);
    try {
      const success = await storageManager.syncGoogleDrive();
      if (success) {
        Alert.alert('Sync Successful', 'Your KnoVault data has been backed up to Google Drive.');
        fetchStats();
      } else {
        Alert.alert('Sync Failed', 'Failed to complete Google Drive sync.');
      }
    } catch (err: any) {
      Alert.alert('Sync Failed', err.message || 'An error occurred during sync.');
    } finally {
      setSyncingDrive(false);
    }
  };

  const handleRestoreDrive = async () => {
    if (!googleDriveConnected) {
      Alert.alert('Error', 'Please connect Google Drive first.');
      return;
    }
    Alert.alert(
      'Restore from Google Drive',
      'Warning: This will overwrite all your current local data with the backup from Google Drive. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Now',
          style: 'destructive',
          onPress: async () => {
            setRestoringDrive(true);
            try {
              const success = await storageManager.restoreFromGoogleDrive();
              if (success) {
                Alert.alert('Restore Complete', 'Your data has been restored from Google Drive.');
                fetchStats();
              } else {
                Alert.alert('Restore Failed', 'Failed to restore data.');
              }
            } catch (err: any) {
              Alert.alert('Restore Failed', err.message || 'An error occurred during restore.');
            } finally {
              setRestoringDrive(false);
            }
          },
        },
      ]
    );
  };

  // Local JSON Backup / Restore Handlers
  const handleExportBackup = async () => {
    try {
      const res = await exportLocalBackupAsJson();
      if (res.success) {
        Alert.alert('Export Successful', `Backup saved successfully!`);
      } else {
        Alert.alert('Export Failed', (res as any).error || 'Could not export backup.');
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Failed to export backup.');
    }
  };

  const handleImportBackup = async () => {
    Alert.alert(
      'Confirm Import',
      'Importing a JSON backup will completely overwrite your current local database contents. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import Now',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await importLocalBackupFromJson();
              if (res.success) {
                Alert.alert('Success', 'Backup imported successfully.');
                fetchStats();
              } else if (!(res as any).canceled) {
                Alert.alert('Error', (res as any).error || 'Invalid backup format or import failed.');
              }
            } catch (e: any) {
              Alert.alert('Import Failed', e.message || 'Failed to import backup.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Storage Center</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchStats}>
          <Ionicons name="refresh" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Real-time Storage stats card */}
        <View style={[styles.statsCard, { backgroundColor: isDark ? '#1F1B2E' : '#F5F3FF', borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Active Storage Quotas</Text>
          
          {loadingStats ? (
            <ActivityIndicator size="small" color="#6C4EFF" style={{ marginVertical: 20 }} />
          ) : (
            <View>
              {/* Neon Cloud Progress */}
              <View style={styles.statRow}>
                <View style={styles.statLabelRow}>
                  <Text style={[styles.statName, { color: theme.text }]}>⚡ Neon Cloud Storage</Text>
                  <Text style={[styles.statValue, { color: theme.textSecondary }]}>
                    {formatBytes(cloudStats.used)} / {formatBytes(cloudStats.limit)}
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#2D2845' : '#E9E3FF' }]}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${Math.min(100, cloudStats.percent)}%`,
                        backgroundColor: cloudStats.percent >= 95 ? '#EF4444' : cloudStats.percent >= 80 ? '#F59E0B' : '#6C4EFF'
                      }
                    ]} 
                  />
                </View>
                {cloudStats.percent >= 100 ? (
                  <Text style={styles.warningText}>⚠️ Cloud Storage Quota is 100% full! Saves will route to secondary storage.</Text>
                ) : cloudStats.percent >= 80 ? (
                  <Text style={styles.warningTextLight}>⚠️ Storage is running low ({cloudStats.percent.toFixed(0)}% used).</Text>
                ) : null}
              </View>

              {/* Local SQLite Cache */}
              <View style={[styles.statRow, { marginTop: 15 }]}>
                <View style={styles.statLabelRow}>
                  <Text style={[styles.statName, { color: theme.text }]}>💾 SQLite Local Cache</Text>
                  <Text style={[styles.statValue, { color: theme.textSecondary }]}>
                    {formatBytes(localDbSize)}
                  </Text>
                </View>
                <Text style={[styles.statSubText, { color: theme.textSecondary }]}>
                  Maintains off-line local database instance on this device.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Primary Storage Logic selector */}
        <Text style={[styles.sectionHeading, { color: theme.text }]}>Primary Storage Strategy</Text>
        <View style={styles.modeGrid}>
          
          {/* Cloud Mode */}
          <TouchableOpacity 
            style={[
              styles.modeOption, 
              { backgroundColor: isDark ? '#1E1A3A' : '#FFFFFF', borderColor: storageMode === 'cloud' ? '#6C4EFF' : theme.border }
            ]}
            onPress={() => setStorageMode('cloud')}
          >
            <View style={styles.modeIconRow}>
              <Ionicons name="cloud-done-outline" size={24} color={storageMode === 'cloud' ? '#6C4EFF' : theme.textSecondary} />
              <View style={[styles.radioOuter, { borderColor: storageMode === 'cloud' ? '#6C4EFF' : theme.textSecondary }]}>
                {storageMode === 'cloud' && <View style={styles.radioInner} />}
              </View>
            </View>
            <Text style={[styles.modeTitle, { color: theme.text }]}>Neon Cloud Only</Text>
            <Text style={[styles.modeDesc, { color: theme.textSecondary }]}>
              Save primary data to Neon cloud databases. Offline mode queues sync.
            </Text>
          </TouchableOpacity>

          {/* Cloud + Google Drive Backup */}
          <TouchableOpacity 
            style={[
              styles.modeOption, 
              { backgroundColor: isDark ? '#1E1A3A' : '#FFFFFF', borderColor: storageMode === 'cloud_gdrive' ? '#6C4EFF' : theme.border }
            ]}
            onPress={() => setStorageMode('cloud_gdrive')}
          >
            <View style={styles.modeIconRow}>
              <Ionicons name="logo-google" size={24} color={storageMode === 'cloud_gdrive' ? '#6C4EFF' : theme.textSecondary} />
              <View style={[styles.radioOuter, { borderColor: storageMode === 'cloud_gdrive' ? '#6C4EFF' : theme.textSecondary }]}>
                {storageMode === 'cloud_gdrive' && <View style={styles.radioInner} />}
              </View>
            </View>
            <Text style={[styles.modeTitle, { color: theme.text }]}>Cloud + Google Drive</Text>
            <Text style={[styles.modeDesc, { color: theme.textSecondary }]}>
              Sync with Neon Cloud and auto-backup files/records to Google Drive.
            </Text>
          </TouchableOpacity>

          {/* Local Only */}
          <TouchableOpacity 
            style={[
              styles.modeOption, 
              { backgroundColor: isDark ? '#1E1A3A' : '#FFFFFF', borderColor: storageMode === 'local' ? '#6C4EFF' : theme.border }
            ]}
            onPress={() => setStorageMode('local')}
          >
            <View style={styles.modeIconRow}>
              <Ionicons name="phone-portrait-outline" size={24} color={storageMode === 'local' ? '#6C4EFF' : theme.textSecondary} />
              <View style={[styles.radioOuter, { borderColor: storageMode === 'local' ? '#6C4EFF' : theme.textSecondary }]}>
                {storageMode === 'local' && <View style={styles.radioInner} />}
              </View>
            </View>
            <Text style={[styles.modeTitle, { color: theme.text }]}>Local Device Only</Text>
            <Text style={[styles.modeDesc, { color: theme.textSecondary }]}>
              Offline storage. Saves remain securely in SQLite on this device.
            </Text>
          </TouchableOpacity>

          {/* Google Drive Only */}
          <TouchableOpacity 
            style={[
              styles.modeOption, 
              { backgroundColor: isDark ? '#1E1A3A' : '#FFFFFF', borderColor: storageMode === 'gdrive' ? '#6C4EFF' : theme.border }
            ]}
            onPress={() => setStorageMode('gdrive')}
          >
            <View style={styles.modeIconRow}>
              <Ionicons name="folder-open-outline" size={24} color={storageMode === 'gdrive' ? '#6C4EFF' : theme.textSecondary} />
              <View style={[styles.radioOuter, { borderColor: storageMode === 'gdrive' ? '#6C4EFF' : theme.textSecondary }]}>
                {storageMode === 'gdrive' && <View style={styles.radioInner} />}
              </View>
            </View>
            <Text style={[styles.modeTitle, { color: theme.text }]}>Google Drive Only</Text>
            <Text style={[styles.modeDesc, { color: theme.textSecondary }]}>
              Bypass cloud database. Save directly to custom GDrive directory.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Auto switch logic toggle */}
        <View style={[styles.toggleRow, { borderColor: theme.border }]}>
          <View style={styles.toggleTextCol}>
            <Text style={[styles.toggleTitle, { color: theme.text }]}>Auto-Switch on Cloud Full</Text>
            <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>
              Automatically fall back to GDrive or Local when Neon hits 100%.
            </Text>
          </View>
          <Switch 
            value={autoSwitchWhenFull} 
            onValueChange={setAutoSwitchWhenFull}
            thumbColor={Platform.OS === 'android' ? '#6C4EFF' : undefined}
            trackColor={{ true: '#B39DFF' }}
          />
        </View>

        {/* Google Drive Account Status */}
        <Text style={[styles.sectionHeading, { color: theme.text }]}>Google Drive Integration</Text>
        <View style={[styles.card, { backgroundColor: isDark ? '#1E1A3A' : '#FFFFFF', borderColor: theme.border }]}>
          <View style={styles.driveStatusHeader}>
            <Ionicons name="cloud-outline" size={24} color="#6C4EFF" />
            <Text style={[styles.driveStatusTitle, { color: theme.text }]}>
              {googleDriveConnected ? 'Connected' : 'Not Connected'}
            </Text>
          </View>

          {googleDriveConnected ? (
            <View>
              {lastDriveSync && (
                <Text style={[styles.syncTimeText, { color: theme.textSecondary }]}>
                  Last Backup Sync: {lastDriveSync}
                </Text>
              )}
              <View style={styles.actionButtonRow}>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#6C4EFF' }]} 
                  onPress={handleSyncDrive}
                  disabled={syncingDrive}
                >
                  {syncingDrive ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.actionBtnText}>Backup Now</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} 
                  onPress={handleRestoreDrive}
                  disabled={restoringDrive}
                >
                  {restoringDrive ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-download-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.actionBtnText}>Restore Data</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.disconnectBtn, { borderColor: '#EF4444' }]} 
                onPress={handleDisconnectGDrive}
              >
                <Text style={styles.disconnectBtnText}>Disconnect Account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.connectBtn, { backgroundColor: '#6C4EFF' }]} 
              onPress={handleConnectGDrive}
              disabled={connectingDrive}
            >
              {connectingDrive ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.connectBtnText}>Connect Google Drive</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Database Maintenance and Manual Backups */}
        <Text style={[styles.sectionHeading, { color: theme.text }]}>Local Database Backups</Text>
        <View style={[styles.card, { backgroundColor: isDark ? '#1E1A3A' : '#FFFFFF', borderColor: theme.border }]}>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
            Safeguard your data locally by importing or exporting full JSON database snapshots.
          </Text>
          <View style={styles.maintenanceRow}>
            <TouchableOpacity style={[styles.maintenanceBtn, { backgroundColor: isDark ? '#2D2845' : '#F5F3FF' }]} onPress={handleExportBackup}>
              <Ionicons name="share-outline" size={20} color="#6C4EFF" />
              <Text style={[styles.maintenanceBtnText, { color: theme.text }]}>Export JSON</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.maintenanceBtn, { backgroundColor: isDark ? '#2D2845' : '#F5F3FF' }]} onPress={handleImportBackup}>
              <Ionicons name="download-outline" size={20} color="#6C4EFF" />
              <Text style={[styles.maintenanceBtnText, { color: theme.text }]}>Import JSON</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statRow: {
    width: '100%',
  },
  statLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statName: {
    fontWeight: '600',
    fontSize: 14,
  },
  statValue: {
    fontSize: 13,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  warningTextLight: {
    color: '#F59E0B',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  statSubText: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modeOption: {
    width: '48%',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
  },
  modeIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6C4EFF',
  },
  modeTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  modeDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginVertical: 10,
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  toggleTitle: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  toggleDesc: {
    fontSize: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  driveStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  driveStatusTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  syncTimeText: {
    fontSize: 12,
    marginBottom: 14,
  },
  actionButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  connectBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disconnectBtn: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  disconnectBtnText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 13,
  },
  maintenanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  maintenanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    paddingVertical: 12,
    borderRadius: 14,
  },
  maintenanceBtnText: {
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
});
