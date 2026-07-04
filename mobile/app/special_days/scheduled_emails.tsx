import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, spacing, borderRadius } from '../../src/theme';
import { scheduledEmailsApi, ScheduledEmail } from '../../src/api/scheduled_emails';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getThemedShadow } from '../../src/components/ThemedComponents';

export default function ScheduledEmailsScreen() {
  const { colors, theme, isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { 
    data: emails, 
    isLoading, 
    refetch, 
    isRefetching 
  } = useQuery({
    queryKey: ['scheduled-emails'],
    queryFn: scheduledEmailsApi.getScheduledEmails
  });

  const deleteMutation = useMutation({
    mutationFn: scheduledEmailsApi.deleteScheduledEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
      Alert.alert('Success', 'Scheduled email successfully cancelled.');
    },
    onError: (err: any) => {
      console.error(err);
      Alert.alert('Error', 'Failed to cancel scheduled email.');
    }
  });

  const handleDelete = (id: number) => {
    Alert.alert(
      'Cancel Email',
      'Are you sure you want to cancel and delete this scheduled email?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => deleteMutation.mutate(id) }
      ]
    );
  };

  const getStatusBadge = (status: ScheduledEmail['status']) => {
    switch (status) {
      case 'scheduled':
        return { label: '🟡 Scheduled', bg: '#FEF3C7', text: '#D97706' };
      case 'sending':
        return { label: '📤 Sending', bg: '#E0F2FE', text: '#0284C7' };
      case 'sent':
        return { label: '🟢 Sent', bg: '#D1FAE5', text: '#059669' };
      case 'failed':
        return { label: '🔴 Failed', bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { label: status, bg: theme.card, text: theme.text };
    }
  };

  const renderEmailItem = ({ item, index }: { item: ScheduledEmail; index: number }) => {
    const badge = getStatusBadge(item.status);
    const dateObj = new Date(item.send_datetime);
    
    const formattedDate = dateObj.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    const formattedTime = dateObj.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return (
      <Animated.View entering={FadeInDown.delay(index * 60)}>
        <View style={[ds.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={ds.cardHeader}>
            <View style={[ds.badge, { backgroundColor: badge.bg }]}>
              <Text style={[ds.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
            {item.status === 'scheduled' && (
              <TouchableOpacity 
                style={ds.deleteBtn} 
                onPress={() => handleDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={18} color={colors.accent.rose} />
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={[ds.subject, { color: theme.text }]} numberOfLines={1}>
            {item.subject}
          </Text>
          
          <Text style={[ds.recipient, { color: theme.textSecondary }]}>
            To: {item.recipient_email}
          </Text>

          <View style={[ds.divider, { backgroundColor: theme.border }]} />

          <View style={ds.metaRow}>
            <View style={ds.metaItem}>
              <Ionicons name="time-outline" size={14} color={theme.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[ds.metaText, { color: theme.textSecondary }]}>
                {formattedDate} at {formattedTime} ({item.timezone})
              </Text>
            </View>
          </View>

          {item.status === 'failed' && item.error_message && (
            <View style={[ds.errorBox, { backgroundColor: '#FFF5F5', borderColor: '#FEB2B2' }]}>
              <Text style={ds.errorTitle}>Error details:</Text>
              <Text style={ds.errorText}>{item.error_message}</Text>
              {item.retry_count > 0 && (
                <Text style={ds.retryText}>Retry count: {item.retry_count}/3</Text>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  const ds = styles(theme, isDark, colors);

  return (
    <SafeAreaView style={ds.container}>
      <View style={ds.header}>
        <TouchableOpacity onPress={() => router.back()} style={ds.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={ds.headerTitle}>📬 Scheduled Emails</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={emails}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEmailItem}
        contentContainerStyle={ds.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={ds.loadingState}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <View style={ds.emptyState}>
              <Ionicons name="mail-open-outline" size={64} color={theme.textSecondary} style={{ marginBottom: 16 }} />
              <Text style={[ds.emptyTitle, { color: theme.text }]}>No scheduled emails</Text>
              <Text style={[ds.emptySubtitle, { color: theme.textSecondary }]}>
                Wishes you schedule for birthdays, anniversaries, and custom events will appear here.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = (theme: any, isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
  },
  headerTitle: {
    ...typography.titleMedium,
    color: theme.text,
    fontWeight: '800',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: theme.border,
    ...getThemedShadow(theme, 'soft'),
  },
  listContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'soft'),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  deleteBtn: {
    padding: 4,
  },
  subject: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  recipient: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9B2C2C',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#C53030',
    fontWeight: '500',
  },
  retryText: {
    fontSize: 10,
    color: '#9B2C2C',
    fontWeight: '700',
    marginTop: 6,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 100,
  },
  emptyTitle: {
    ...typography.titleMedium,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },
});
