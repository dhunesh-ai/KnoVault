import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { adminClient } from '../../src/api/adminClient';

export default function MobileAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminClient.getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Platform Analytics Summary</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>USER ENGAGEMENT</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Total Users</Text>
          <Text style={styles.rowValue}>{stats?.users?.total_users ?? 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Active Today</Text>
          <Text style={[styles.rowValue, { color: '#10b981' }]}>{stats?.users?.active_today ?? 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>New Users Today</Text>
          <Text style={[styles.rowValue, { color: '#818cf8' }]}>{stats?.users?.new_today ?? 0}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>CONTENT TOTALS</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Notes</Text>
          <Text style={styles.rowValue}>{stats?.content?.total_notes ?? 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Reminders</Text>
          <Text style={styles.rowValue}>{stats?.content?.total_reminders ?? 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Goals</Text>
          <Text style={styles.rowValue}>{stats?.content?.total_goals ?? 0}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>AI METRICS</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Conversations</Text>
          <Text style={styles.rowValue}>{stats?.ai?.total_conversations ?? 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Requests Today</Text>
          <Text style={[styles.rowValue, { color: '#c084fc' }]}>{stats?.ai?.total_requests_today ?? 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Active Model</Text>
          <Text style={styles.rowValue}>{stats?.ai?.current_model}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  loading: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  cardTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  rowValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
