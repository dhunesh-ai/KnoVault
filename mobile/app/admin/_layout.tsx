import { Stack } from 'expo-router';
import React from 'react';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0f172a',
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 16,
        },
        contentStyle: {
          backgroundColor: '#020617',
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'KnoVault Mobile Admin' }} />
      <Stack.Screen name="login" options={{ title: 'Admin Login', headerShown: false }} />
      <Stack.Screen name="users" options={{ title: 'User Management' }} />
      <Stack.Screen name="user_detail" options={{ title: 'User Profile Metadata' }} />
      <Stack.Screen name="announcements" options={{ title: 'Send Announcement' }} />
      <Stack.Screen name="analytics" options={{ title: 'Analytics Summary' }} />
    </Stack>
  );
}
