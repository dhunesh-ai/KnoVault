import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { adminClient } from '../../src/api/adminClient';

export default function MobileUserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminClient.getUserDetail(Number(id));
      setUser(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load user detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleBlock = () => {
    Alert.alert('Block User', `Are you sure you want to block ${user?.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminClient.blockUser(user.id, 'Mobile Admin Block');
            Alert.alert('Success', 'User blocked');
            fetchDetail();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleUnblock = async () => {
    try {
      await adminClient.unblockUser(user.id);
      Alert.alert('Success', 'User unblocked');
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleSoftDelete = () => {
    Alert.alert('Soft Delete Account', `Set ${user?.email} status to soft-deleted?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Soft Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminClient.softDeleteUser(user.id);
            Alert.alert('Success', 'User soft deleted');
            fetchDetail();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.mutedText}>Loading Profile Metadata...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.mutedText}>User metadata not found.</Text>
      </View>
    );
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Summary Card */}
      <View style={styles.card}>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.badgeRow}>
          <Text style={[styles.badge, user.is_blocked ? styles.blockedBadge : styles.activeBadge]}>
            {user.is_blocked ? 'BLOCKED' : user.is_deleted ? 'DELETED' : 'ACTIVE'}
          </Text>
          <Text style={styles.roleBadge}>{user.role.toUpperCase()}</Text>
          <Text style={styles.platformBadge}>{(user.last_platform || 'web').toUpperCase()}</Text>
        </View>
      </View>

      {/* Account Info */}
      <Text style={styles.sectionHeader}>ACCOUNT METADATA</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>User ID</Text>
          <Text style={styles.infoValue}>#{user.id}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Joined Date</Text>
          <Text style={styles.infoValue}>{new Date(user.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Active</Text>
          <Text style={styles.infoValue}>
            {user.last_active_at ? new Date(user.last_active_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Resource Counters */}
      <Text style={styles.sectionHeader}>PRODUCTIVITY METRICS</Text>
      <View style={styles.grid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Notes Count</Text>
          <Text style={styles.metricVal}>{user.statistics?.notes_count ?? 0}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Reminders Count</Text>
          <Text style={styles.metricVal}>{user.statistics?.reminders_count ?? 0}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Goals Count</Text>
          <Text style={styles.metricVal}>{user.statistics?.goals_count ?? 0}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Workspaces</Text>
          <Text style={styles.metricVal}>{user.statistics?.workspaces_count ?? 0}</Text>
        </View>
      </View>

      {/* Storage */}
      <Text style={styles.sectionHeader}>STORAGE CONSUMPTION</Text>
      <View style={styles.card}>
        <Text style={styles.storageVal}>{formatBytes(user.statistics?.storage_used_bytes || 0)} / 5.00 MB</Text>
        <Text style={styles.privacyNote}>* Content payload excluded as per KnoVault Privacy Policy</Text>
      </View>

      {/* Action Controls */}
      <Text style={styles.sectionHeader}>ADMIN MODERATION CONTROLS</Text>
      <View style={styles.actionRow}>
        {user.is_blocked ? (
          <TouchableOpacity style={[styles.btn, styles.unblockBtn]} onPress={handleUnblock}>
            <Text style={styles.btnText}>UNBLOCK USER</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.blockBtn]} onPress={handleBlock}>
            <Text style={styles.btnText}>BLOCK USER</Text>
          </TouchableOpacity>
        )}

        {!user.is_deleted && (
          <TouchableOpacity style={[styles.btn, styles.deleteBtn]} onPress={handleSoftDelete}>
            <Text style={styles.btnText}>SOFT DELETE</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  mutedText: { color: '#94a3b8', fontSize: 13 },
  card: { backgroundColor: '#0f172a', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1e293b' },
  name: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
  email: { color: '#64748b', fontSize: 13, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: { fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  activeBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' },
  blockedBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' },
  roleBadge: { backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  platformBadge: { backgroundColor: '#1e293b', color: '#94a3b8', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sectionHeader: { color: '#64748b', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginTop: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { color: '#94a3b8', fontSize: 12 },
  infoValue: { color: '#f8fafc', fontSize: 12, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricBox: { width: '48%', backgroundColor: '#0f172a', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1e293b' },
  metricLabel: { color: '#64748b', fontSize: 11 },
  metricVal: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  storageVal: { color: '#818cf8', fontSize: 18, fontWeight: 'bold' },
  privacyNote: { color: '#64748b', fontSize: 10, fontStyle: 'italic', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  blockBtn: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)' },
  unblockBtn: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.4)' },
  deleteBtn: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  btnText: { color: '#f8fafc', fontSize: 11, fontWeight: 'bold' },
});
