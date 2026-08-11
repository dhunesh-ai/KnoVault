import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../src/store/authStore';
import { dbQueue, clearDB } from '../src/services/db';
import { dumpScheduledNotifications } from '../src/utils/localNotifications';

export default function DebugNotificationsScreen() {
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Stats
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [remindersCount, setRemindersCount] = useState<number>(0);
  const [notesCount, setNotesCount] = useState<number>(0);
  const [goalsCount, setGoalsCount] = useState<number>(0);
  const [importantDaysCount, setImportantDaysCount] = useState<number>(0);
  const [expoCount, setExpoCount] = useState<number>(0);

  // Lists
  const [expoNotifications, setExpoNotifications] = useState<any[]>([]);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [remindersRows, setRemindersRows] = useState<any[]>([]);

  const loadDebugData = async () => {
    setLoading(true);
    try {
      // 1. Dump Expo scheduled notifications
      const scheduled = await dumpScheduledNotifications('DebugScreen_load');
      setExpoCount(scheduled.length);
      setExpoNotifications(scheduled);

      // 2. Read SQLite counts and rows
      await dbQueue.read(async (db) => {
        try {
          const hCount: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM NotificationHistory');
          setHistoryCount(hCount?.c ?? 0);
          
          const hRows = await db.getAllAsync('SELECT * FROM NotificationHistory ORDER BY id DESC LIMIT 50');
          setHistoryRows(hRows);
        } catch { setHistoryCount(0); setHistoryRows([]); }

        try {
          const rCount: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM Reminders');
          setRemindersCount(rCount?.c ?? 0);
          
          const rRows = await db.getAllAsync('SELECT * FROM Reminders ORDER BY id DESC LIMIT 50');
          setRemindersRows(rRows);
        } catch { setRemindersCount(0); setRemindersRows([]); }

        try {
          const nCount: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM Notes');
          setNotesCount(nCount?.c ?? 0);
        } catch { setNotesCount(0); }

        try {
          const gCount: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM Goals');
          setGoalsCount(gCount?.c ?? 0);
        } catch { setGoalsCount(0); }

        try {
          const dCount: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM ImportantDays');
          setImportantDaysCount(dCount?.c ?? 0);
        } catch { setImportantDaysCount(0); }
      });
    } catch (err) {
      console.error('[DebugScreen] Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebugData();
  }, []);

  const handlePurgeAll = async () => {
    Alert.alert(
      'Purge Device Data',
      'This will cancel ALL Expo scheduled notifications and wipe local SQLite tables on this physical device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge Now',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
            await clearDB().catch(() => {});
            await loadDebugData();
            Alert.alert('Purged', 'Device scheduled alarms and SQLite tables have been wiped.');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Device-Runtime Debug Panel</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadDebugData}>
          <Ionicons name="refresh" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* 1. AUTHENTICATED USER */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Current Authenticated User</Text>
          <Text style={styles.codeText}>Status: {isAuthenticated ? 'AUTHENTICATED' : 'LOGGED_OUT'}</Text>
          <Text style={styles.codeText}>User ID: {user?.id ?? 'NULL'}</Text>
          <Text style={styles.codeText}>Email: {user?.email ?? 'NULL'}</Text>
          <Text style={styles.codeText}>Name: {user?.full_name ?? 'NULL'}</Text>
        </View>

        {/* 2. SQLITE & EXPO COUNTS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Local Device Counts</Text>
          <Text style={styles.countText}>• NotificationHistory Rows: {historyCount}</Text>
          <Text style={styles.countText}>• Reminders Rows: {remindersCount}</Text>
          <Text style={styles.countText}>• Notes Rows: {notesCount}</Text>
          <Text style={styles.countText}>• Goals Rows: {goalsCount}</Text>
          <Text style={styles.countText}>• ImportantDays Rows: {importantDaysCount}</Text>
          <Text style={styles.countText}>• Expo Scheduled Alarms: {expoCount}</Text>
        </View>

        {/* 3. EXPO SCHEDULED NOTIFICATIONS LIST */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Expo Scheduled Notifications ({expoCount})</Text>
          {expoNotifications.length === 0 ? (
            <Text style={styles.emptyText}>Zero scheduled notifications on device OS.</Text>
          ) : (
            expoNotifications.map((n, idx) => (
              <View key={idx} style={styles.itemBox}>
                <Text style={styles.itemHeader}>ID: {n.id}</Text>
                <Text style={styles.itemBody}>Title: {n.title}</Text>
                <Text style={styles.itemBody}>Body: {n.body}</Text>
                <Text style={styles.itemMeta}>Trigger: {JSON.stringify(n.trigger)}</Text>
                <Text style={styles.itemMeta}>Data: {JSON.stringify(n.data)}</Text>
              </View>
            ))
          )}
        </View>

        {/* 4. NOTIFICATION HISTORY ROWS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>4. NotificationHistory SQLite Rows ({historyRows.length})</Text>
          {historyRows.length === 0 ? (
            <Text style={styles.emptyText}>Zero rows in NotificationHistory.</Text>
          ) : (
            historyRows.map((r, idx) => (
              <View key={idx} style={styles.itemBox}>
                <Text style={styles.itemHeader}>[ID: {r.id}] user_id: {r.user_id ?? 'NULL'}</Text>
                <Text style={styles.itemBody}>Title: {r.title}</Text>
                <Text style={styles.itemBody}>Body: {r.body}</Text>
                <Text style={styles.itemMeta}>Category: {r.category} | Created: {r.created_at}</Text>
                <Text style={styles.itemMeta}>Payload: {r.payload}</Text>
              </View>
            ))
          )}
        </View>

        {/* 5. REMINDERS ROWS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>5. Local Reminders SQLite Rows ({remindersRows.length})</Text>
          {remindersRows.length === 0 ? (
            <Text style={styles.emptyText}>Zero rows in Reminders table.</Text>
          ) : (
            remindersRows.map((r, idx) => (
              <View key={idx} style={styles.itemBox}>
                <Text style={styles.itemHeader}>[ID: {r.id}] remote_id: {r.remote_id ?? 'NULL'}</Text>
                <Text style={styles.itemBody}>Title: {r.title}</Text>
                <Text style={styles.itemBody}>Description: {r.description}</Text>
                <Text style={styles.itemMeta}>Date: {r.reminder_date} | Deleted: {r.is_deleted}</Text>
              </View>
            ))
          )}
        </View>

        {/* PURGE ACTION */}
        <TouchableOpacity style={styles.purgeBtn} onPress={handlePurgeAll}>
          <Ionicons name="trash-bin-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.purgeBtnText}>Purge All Device Scheduled Alarms & SQLite Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' },
  refreshBtn: { padding: 8, backgroundColor: '#3B82F6', borderRadius: 8 },
  content: { padding: 16 },
  card: { backgroundColor: '#1E293B', padding: 14, borderRadius: 10, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#60A5FA', marginBottom: 8 },
  codeText: { fontFamily: 'monospace', color: '#E2E8F0', fontSize: 13, marginBottom: 4 },
  countText: { fontSize: 14, color: '#F1F5F9', marginBottom: 4, fontWeight: '600' },
  emptyText: { color: '#94A3B8', fontStyle: 'italic', fontSize: 13 },
  itemBox: { backgroundColor: '#0F172A', padding: 10, borderRadius: 6, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  itemHeader: { color: '#38BDF8', fontWeight: 'bold', fontSize: 13 },
  itemBody: { color: '#F8FAFC', fontSize: 13, marginVertical: 2 },
  itemMeta: { color: '#94A3B8', fontSize: 11 },
  purgeBtn: { backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, marginBottom: 40 },
  purgeBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});
