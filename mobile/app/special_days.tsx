import React, { useState, useMemo } from 'react';
import { getFadeIn, getFadeInDown } from '../src/utils/animations';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../src/hooks/useTheme';
import { typography, spacing, borderRadius } from '../src/theme';
import { importantDaysApi, ImportantDay } from '../src/api/important_days';
import { getAgeInfo } from '../src/utils/important_day';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { calculateDaysRemaining, sortImportantDaysByUpcoming } from '../src/utils/important_day';
import { getThemedShadow } from '../src/components/ThemedComponents';

const FILTER_TYPES = [
  { label: 'All', value: 'All' },
  { label: '🎂 Birthdays', value: 'Birthday' },
  { label: '💍 Anniversaries', value: 'Wedding Anniversary' },
  { label: '💎 Engagements', value: 'Engagement' },
  { label: '🎊 Festivals', value: 'Festival' },
  { label: '🤝 Meetings', value: 'Meeting' },
  { label: '🏆 Achievements', value: 'Achievement' },
  { label: '📸 Memories', value: 'Personal Memory' },
  { label: '✨ Customs', value: 'Custom Event' },
];

export default function SpecialDaysScreen() {
  const { colors, theme, isDark } = useTheme();
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState('All');
  
  const { 
    data: importantDays, 
    isLoading, 
    refetch, 
    isFetching,
    isRefetching
  } = useQuery({ 
    queryKey: ['important-days'], 
    queryFn: async () => {
      console.log("[SPECIAL DAYS API REQUEST] Fetching all special days...");
      return await importantDaysApi.getImportantDays();
    }
  });

  const sortedImportantDays = useMemo(() => {
    if (!importantDays) return [];
    const sorted = sortImportantDaysByUpcoming(importantDays);
    if (selectedFilter === 'All') return sorted;
    return sorted.filter(item => item.type === selectedFilter);
  }, [importantDays, selectedFilter]);

  const renderImportantDayItem = ({ item, index }: { item: ImportantDay; index: number }) => {
    const eventDateStr = item.date || item.birth_date;
    const isRecurring = item.is_recurring !== undefined ? item.is_recurring : true;
    if (!eventDateStr) return null;

    const daysRemaining = calculateDaysRemaining(eventDateStr, isRecurring);
    const isToday = daysRemaining === 0 || (isRecurring && daysRemaining === 365);
    const isVeryClose = daysRemaining > 0 && daysRemaining <= 7;
    const isPassed = !isRecurring && daysRemaining < 0;

    const emojiMap: Record<string, string> = {
      'birthday': '🎂',
      'wedding anniversary': '💍',
      'engagement': '💎',
      'festival': '🎊',
      'meeting': '🤝',
      'achievement': '🏆',
      'personal memory': '📸',
      'custom event': '✨',
    };
    const eventTypeLower = (item.type || 'birthday').toLowerCase();
    const iconEmoji = emojiMap[eventTypeLower] || '✨';

    const getGradientColors = () => {
      if (isToday) return [colors.accent.rose, '#EC4899'];
      if (isVeryClose) return [colors.accent.amber, '#F59E0B'];
      
      // Color code by type for dynamic feel
      if (eventTypeLower.includes('birthday')) return ['#FBBF24', '#F59E0B'];
      if (eventTypeLower.includes('wedding') || eventTypeLower.includes('anniversary')) return ['#F472B6', '#EC4899'];
      if (eventTypeLower.includes('engagement')) return ['#60A5FA', '#3B82F6'];
      if (eventTypeLower.includes('festival')) return ['#FB923C', '#E056FD'];
      if (eventTypeLower.includes('meeting')) return ['#34D399', '#059669'];
      if (eventTypeLower.includes('achievement')) return ['#A78BFA', '#7C3AED'];
      if (eventTypeLower.includes('memory')) return ['#818CF8', '#4F46E5'];
      return [theme.primary, theme.primary];
    };

    const ageInfo = item.type.toLowerCase() === 'birthday' ? getAgeInfo(eventDateStr, item.type) : null;
    
    return (
      <Animated.View 
        entering={getFadeInDown(index * 80)} 
      >
        <TouchableOpacity 
          style={[
            ds.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            }
          ]}
          onPress={() => {
            console.log("[SPECIAL DAY DETAILS OPEN]", item.id);
            router.push(`/special_day/${item.id}`);
          }}
        >
          <View style={ds.avatarContainer}>
            <LinearGradient
              colors={getGradientColors() as [string, string]}
              style={ds.avatarGradient}
            >
              <Text style={ds.avatarText}>{iconEmoji}</Text>
            </LinearGradient>
          </View>
          
          <View style={ds.info}>
            <Text style={[ds.name, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">{item.title || item.person_name}</Text>
            <View style={ds.dateRow}>
              <Ionicons name="calendar-outline" size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[ds.dateText, { color: theme.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                {new Date(eventDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: isRecurring ? undefined : 'numeric' }).toUpperCase()} • {item.type}
              </Text>
            </View>
            {ageInfo && !isPassed && (
              <Text style={[ds.ageText, { color: isToday ? colors.accent.rose : theme.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                {isToday ? `🎉 Turning ${ageInfo.upcomingAge} Today!` : `🎂 Turning ${ageInfo.upcomingAge}`}
              </Text>
            )}
          </View>

          <View style={ds.statusContainer}>
            {isToday ? (
              <Text style={[ds.daysCount, { color: colors.accent.emerald }]}>Today! 🎉</Text>
            ) : isPassed ? (
              <Text style={[ds.daysCount, { color: theme.textSecondary, fontSize: 14 }]}>Passed</Text>
            ) : (
              <>
                <Text style={[
                  ds.daysCount, 
                  isVeryClose ? { color: colors.accent.rose } : { color: theme.primary }
                ]}>
                  {daysRemaining}
                </Text>
                <Text style={[ds.statusLabel, { color: theme.textSecondary }]}>days left</Text>
              </>
            )}
          </View>

          <View style={ds.actionBtn}>
            <Ionicons name="chevron-forward" size={18} color={theme.border} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const ds = styles(theme, isDark, colors);

  return (
    <SafeAreaView style={ds.container}>
      {/* Header */}
      <View style={ds.header}>
        <TouchableOpacity onPress={() => router.back()} style={ds.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={ds.headerTitle}>✨ Special Days</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* horizontal filter bar */}
      <View style={ds.filterWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={ds.filterScroll}
        >
          {FILTER_TYPES.map(filter => {
            const isSelected = selectedFilter === filter.value;
            return (
              <TouchableOpacity
                key={filter.value}
                style={[
                  ds.filterChip, 
                  { backgroundColor: theme.card, borderColor: theme.border },
                  isSelected && ds.filterChipActive
                ]}
                onPress={() => setSelectedFilter(filter.value)}
              >
                <Text style={[
                  ds.filterChipText, 
                  { color: theme.textSecondary },
                  isSelected && ds.filterChipTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={sortedImportantDays}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderImportantDayItem}
        contentContainerStyle={ds.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
        }
        ListHeaderComponent={() => (
          <View style={ds.listHeader}>
            <Text style={[ds.listTitle, { color: theme.text }]}>Upcoming Special Days</Text>
            <Text style={[ds.listSubtitle, { color: theme.textSecondary }]}>Keep track of all your essential events, celebrations, and custom tags</Text>
          </View>
        )}
        ListEmptyComponent={
          (isLoading || isFetching) && !isRefetching ? (
            <View style={ds.loadingState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[ds.loadingText, { color: theme.textSecondary }]}>Syncing your special days...</Text>
            </View>
          ) : (
            <View style={ds.emptyState}>
              <View style={[ds.emptyIconBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="sparkles-outline" size={60} color={theme.textSecondary} />
              </View>
              <Text style={[ds.emptyTitle, { color: theme.text }]}>No events found</Text>
              <Text style={[ds.emptySubtitle, { color: theme.textSecondary }]}>Start adding birthdays, anniversaries, meetings, achievements, and festivals</Text>
            </View>
          )
        }
      />

      {/* FAB */}
      <TouchableOpacity 
        style={ds.fab} 
        onPress={() => router.push('/special_days/create')}
      >
        <LinearGradient colors={colors.gradient.primary} style={ds.fabGradient}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
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
    ...typography.titleLarge,
    color: theme.text,
    fontWeight: '800',
  },
  iconBtn: {
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
  filterWrapper: {
    marginVertical: 10,
  },
  filterScroll: {
    paddingHorizontal: 25,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'soft'),
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 25,
    paddingBottom: 120,
    flexGrow: 1,
  },
  listHeader: {
    marginTop: 10,
    marginBottom: 25,
  },
  listTitle: {
    ...typography.titleMedium,
    fontWeight: '800',
  },
  listSubtitle: {
    ...typography.caption,
    marginTop: 4,
  },
  card: {
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'soft'),
  },
  avatarContainer: {
    marginRight: 18,
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...getThemedShadow(theme, 'soft'),
  },
  avatarText: {
    fontSize: 26,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    ...typography.bodyLarge,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: -0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  dateText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  ageText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 4,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusContainer: {
    alignItems: 'flex-end',
    marginRight: 15,
    justifyContent: 'center',
  },
  daysCount: {
    ...typography.titleMedium,
    fontWeight: '900',
    fontSize: 20,
    lineHeight: 22,
  },
  statusLabel: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  actionBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  loadingText: {
    ...typography.bodySmall,
    marginTop: 15,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: 80,
  },
  emptyIconBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'soft'),
  },
  emptyTitle: {
    ...typography.titleMedium,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    maxWidth: 250,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    ...getThemedShadow(theme, 'strong'),
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
