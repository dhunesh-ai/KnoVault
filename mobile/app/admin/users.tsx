import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { adminClient } from '../../src/api/adminClient';

export default function MobileUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminClient.getUsers(search);
      setUsers(data.users || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const handleBlock = async (user: any) => {
    Alert.alert('Block User', `Are you sure you want to block ${user.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block User',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminClient.blockUser(user.id, 'Spam / Policy Violation');
            Alert.alert('Success', `User ${user.email} blocked.`);
            fetchUsers();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleUnblock = async (user: any) => {
    try {
      await adminClient.unblockUser(user.id);
      Alert.alert('Success', `User ${user.email} unblocked.`);
      fetchUsers();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by Email or Name..."
        placeholderTextColor="#64748b"
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.full_name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userMeta}>
                  {item.notes_count} notes &bull; {item.goals_count} goals &bull; Role: {item.role}
                </Text>
              </View>

              <View style={styles.actions}>
                {item.is_blocked ? (
                  <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={() => handleUnblock(item)}>
                    <Text style={styles.btnText}>Unblock</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.btn, styles.btnRed]} onPress={() => handleBlock(item)}>
                    <Text style={styles.btnText}>Block</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 16,
  },
  searchInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
  userCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
    paddingRight: 8,
  },
  userName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#94a3b8',
    fontSize: 12,
  },
  userMeta: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  btnGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  btnText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
