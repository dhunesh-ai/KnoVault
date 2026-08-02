import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { adminClient } from '../../src/api/adminClient';

export default function MobileAdminStorageScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStorage = async () => {
    setLoading(true);
    try {
      const res = await adminClient.getStorageStats();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorage();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.mutedText}>Calculating Storage Consumption...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Total Storage Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Total Database Storage Consumed</Text>
        <Text style={styles.grandTotal}>{formatBytes(data?.grand_total_bytes || 0)}</Text>
        <Text style={styles.cardSub}>Across {data?.total_users || 0} active accounts</Text>
      </View>

      <Text style={styles.sectionHeader}>TOP STORAGE CONSUMERS</Text>

      {/* User Storage List */}
      <View style={styles.list}>
        {(data?.users || []).map((u: any) => (
          <View key={u.user_id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <View>
                <Text style={styles.userName}>{u.full_name}</Text>
                <Text style={styles.userEmail}>{u.email}</Text>
              </View>
              <Text style={styles.usedBytes}>{formatBytes(u.storage_used_bytes)}</Text>
            </View>

            {/* Usage Progress Bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(u.percent_used, 100)}%`,
                    backgroundColor: u.percent_used > 80 ? '#ef4444' : '#6366f1',
                  },
                ]}
              />
            </View>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressText}>{u.percent_used}% Used</Text>
              <Text style={styles.progressText}>Quota: {formatBytes(u.limit_bytes)}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, gap: 14 },
  center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  mutedText: { color: '#94a3b8', fontSize: 13, marginTop: 8 },
  summaryCard: { backgroundColor: '#0f172a', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#1e293b' },
  cardTitle: { color: '#94a3b8', fontSize: 12 },
  grandTotal: { color: '#818cf8', fontSize: 26, fontWeight: 'bold', marginTop: 6 },
  cardSub: { color: '#64748b', fontSize: 11, marginTop: 4 },
  sectionHeader: { color: '#64748b', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginTop: 4 },
  list: { gap: 10 },
  userCard: { backgroundColor: '#0f172a', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1e293b', gap: 10 },
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold' },
  userEmail: { color: '#64748b', fontSize: 11 },
  usedBytes: { color: '#818cf8', fontSize: 13, fontWeight: 'bold' },
  progressTrack: { height: 6, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { color: '#64748b', fontSize: 10 },
});
