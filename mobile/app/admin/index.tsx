import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { adminClient } from '../../src/api/adminClient';

export default function MobileAdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const user = await adminClient.getStoredAdmin();
    if (!user) {
      router.replace('/admin/login');
      return;
    }
    setAdminUser(user);

    try {
      const s = await adminClient.getDashboardStats();
      setStats(s);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    await adminClient.logout();
    router.replace('/admin/login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Mobile Admin Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Admin Card */}
      <View style={styles.adminCard}>
        <View>
          <Text style={styles.adminName}>{adminUser?.full_name || 'Admin User'}</Text>
          <Text style={styles.adminEmail}>{adminUser?.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Primary Metrics Grid */}
      <Text style={styles.sectionTitle}>PLATFORM STATS OVERVIEW</Text>
      <View style={styles.grid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Total Users</Text>
          <Text style={styles.metricValue}>{stats?.users?.total_users ?? 0}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Active Today</Text>
          <Text style={[styles.metricValue, { color: '#10b981' }]}>{stats?.users?.active_today ?? 0}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Total Notes</Text>
          <Text style={[styles.metricValue, { color: '#818cf8' }]}>{stats?.content?.total_notes ?? 0}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>AI Requests Today</Text>
          <Text style={[styles.metricValue, { color: '#c084fc' }]}>{stats?.ai?.total_requests_today ?? 0}</Text>
        </View>
      </View>

      {/* Quick Navigation Menu */}
      <Text style={styles.sectionTitle}>ADMIN MANAGEMENT CONTROLS</Text>
      <View style={styles.menuList}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/users')}>
          <Text style={styles.menuTitle}>User Search & Moderation</Text>
          <Text style={styles.menuDesc}>Block, unblock, or soft-delete user accounts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/storage')}>
          <Text style={styles.menuTitle}>Storage Management</Text>
          <Text style={styles.menuDesc}>Monitor user database storage consumption & quotas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/announcements')}>
          <Text style={styles.menuTitle}>Broadcast Push Announcement</Text>
          <Text style={styles.menuDesc}>Send updates & alerts to all mobile devices</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/analytics')}>
          <Text style={styles.menuTitle}>Growth Analytics</Text>
          <Text style={styles.menuDesc}>View DAU, signup, and AI token trends</Text>
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  adminCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adminEmail: {
    color: '#64748b',
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricBox: {
    width: '48%',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  menuList: {
    gap: 10,
  },
  menuItem: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  menuTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuDesc: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
});
