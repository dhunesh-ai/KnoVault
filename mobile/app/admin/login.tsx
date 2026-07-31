import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { adminClient } from '../../src/api/adminClient';

export default function MobileAdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter admin email and password');
      return;
    }
    setLoading(true);
    try {
      await adminClient.login(email, password);
      router.replace('/admin');
    } catch (err: any) {
      Alert.alert('Login Failed', err.response?.data?.detail || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>RESTRICTED ACCESS</Text>
        </View>
        <Text style={styles.title}>KnoVault Mobile Admin</Text>
        <Text style={styles.subtitle}>Production System Portal</Text>

        <TextInput
          style={styles.input}
          placeholder="Admin Email"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Sign In to Mobile Admin</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 24,
  },
  input: {
    width: '100%',
    backgroundColor: '#020617',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  button: {
    width: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
