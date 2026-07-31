import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { adminClient } from '../../src/api/adminClient';

export default function MobileAnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!title || !message) {
      Alert.alert('Error', 'Please fill in both title and message');
      return;
    }
    setLoading(true);
    try {
      await adminClient.sendAnnouncement(title, message);
      Alert.alert('Broadcast Sent', 'Announcement sent to all users');
      setTitle('');
      setMessage('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send Platform Announcement</Text>
      <Text style={styles.subtitle}>Broadcast push alerts to all connected mobile devices</Text>

      <TextInput
        style={styles.input}
        placeholder="Announcement Title"
        placeholderTextColor="#64748b"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
        placeholder="Message Body..."
        placeholderTextColor="#64748b"
        multiline
        value={message}
        onChangeText={setMessage}
      />

      <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Send Push Broadcast</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 20,
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
