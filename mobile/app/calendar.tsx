import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../src/hooks/useTheme';
import { typography, spacing, borderRadius } from '../src/theme';
import { calendarApi } from '../src/api/calendar';
import { getLocalDateString, formatLocalTime, formatTimeStringTo12Hour } from '../src/utils/date';
import { getThemedShadow } from '../src/components/ThemedComponents';
import { getReminderTitle, getReminderSubtitle, getReminderCategory, getMedicineSummary, formatMedicineSubtitle } from '../src/utils';
import ScreenContainer from '../src/components/ScreenContainer';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 50 - 50) / 7;

export default function CalendarScreen() {
  const { colors, theme, isDark } = useTheme();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const month = currentMonth.getMonth() + 1;
  const year = currentMonth.getFullYear();

  const { data: eventsMap, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['calendar-events', month, year],
    queryFn: async () => {
      console.log(`[CALENDAR] Fetching events for ${month}/${year}`);
      const data = await calendarApi.getCalendarEvents(month, year);
      console.log("[CALENDAR EVENTS]", data);
      return data;
    },
  });

  const days = useMemo(() => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const result = [];
    
    const startDay = start.getDay();
    
    for (let i = 0; i < startDay; i++) {
      result.push(null);
    }
    
    for (let i = 1; i <= end.getDate(); i++) {
      result.push(new Date(year, month - 1, i));
    }
    
    return result;
  }, [month, year]);

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(year, month - 1 + offset, 1));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const isToday = (d: Date) => {
    return isSameDay(d, new Date());
  };

  const selectedDateStr = getLocalDateString(selectedDate);
  const selectedEvents = eventsMap?.[selectedDateStr] || [];

  const getMedicinePeriod = (timeStr: string | null | undefined) => {
    if (!timeStr) return 'Morning 🌅';
    try {
      const parts = timeStr.split(':');
      const hour = parseInt(parts[0], 10);
      if (hour >= 5 && hour < 12) return 'Morning 🌅';
      if (hour >= 12 && hour < 17) return 'Afternoon ☀️';
      return 'Night 🌙';
    } catch (e) {
      return 'Morning 🌅';
    }
  };

  const groupedEvents = useMemo(() => {
    const medicineGroup: Record<string, typeof selectedEvents> = {
      'Morning 🌅': [],
      'Afternoon ☀️': [],
      'Night 🌙': []
    };
    const generalGroup: typeof selectedEvents = [];

    const sorted = [...selectedEvents].sort((a, b) => {
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });

    sorted.forEach(e => {
      const isReminder = e.id.toString().startsWith('r-');
      const categoryText = isReminder ? getReminderCategory(e) : e.type;
      
      if (categoryText?.toLowerCase() === 'medicine') {
        const period = getMedicinePeriod(e.time);
        medicineGroup[period].push(e);
      } else {
        generalGroup.push(e);
      }
    });

    return {
      medicine: medicineGroup,
      general: generalGroup
    };
  }, [selectedEvents]);

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const ds = styles(theme, isDark, colors);

  const renderEventCard = (event: any) => {
    const isReminder = event.id.toString().startsWith('r-');
    const titleText = isReminder ? getReminderTitle(event) : event.title;
    const categoryText = isReminder ? getReminderCategory(event) : event.type;
    const isMed = categoryText.toLowerCase() === 'medicine';
    const medicineSummary = isMed ? getMedicineSummary(event) : null;
    const subtitleText = isMed ? formatMedicineSubtitle(event) : (isReminder ? getReminderSubtitle(event) : (event.description || event.notes || ''));
    
    const getCategoryColor = (category: string, defaultColor: string) => {
      switch (category.toLowerCase()) {
        case 'meeting': return '#3B82F6';
        case 'assignment': return '#8B5CF6';
        case 'event': return '#EC4899';
        case 'birthday': return '#F59E0B';
        case 'medicine': return '#10B981';
        case 'custom': return '#6366F1';
        default: return defaultColor;
      }
    };
    
    const badgeColor = getCategoryColor(categoryText, event.color);

    return (
      <TouchableOpacity 
        key={event.id} 
        style={[ds.eventCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => {
            if (event.id.toString().startsWith('s-')) {
              const specialDayId = event.id.toString().replace('s-', '');
              console.log("[SPECIAL DAY DETAILS OPEN] From Calendar", specialDayId);
              router.push(`/special_day/${specialDayId}`);
            } else if (event.id.toString().startsWith('b-')) {
              const birthdayId = event.id.toString().replace('b-', '');
              router.push(`/special_day/${birthdayId}`);
            } else if (event.id.toString().startsWith('r-')) {
              const reminderId = event.id.toString().replace('r-', '');
              console.log("[REMINDER DETAILS OPEN] From Calendar", reminderId);
              router.push(`/reminder/${reminderId}`);
            } else {
              console.warn("[CALENDAR] Unknown event ID format:", event.id);
            }
        }}
      >
        <View style={[ds.eventIndicator, { backgroundColor: badgeColor }]} />
        <View style={ds.eventContent}>
          <View style={ds.eventHeader}>
            <Text style={[ds.eventTitle, { color: theme.text }]} numberOfLines={1}>{titleText}</Text>
            <View style={[ds.miniBadge, { backgroundColor: badgeColor + '15' }]}>
              <Text style={[ds.miniBadgeText, { color: badgeColor }]}>
                {categoryText.toUpperCase()}
              </Text>
            </View>
          </View>
          
          {isMed ? (
            <View style={{ marginTop: 4, gap: 2 }}>
              {medicineSummary ? (
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>
                  {medicineSummary}
                </Text>
              ) : null}
              {subtitleText ? (
                <Text 
                  style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 16 }} 
                  numberOfLines={2} 
                  ellipsizeMode="tail"
                >
                  {subtitleText}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={ds.eventMeta}>
              <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
              <Text style={[ds.eventMetaText, { color: theme.textSecondary }]}>
                {event.time ? formatTimeStringTo12Hour(event.time) : "All Day"}
              </Text>
              {subtitleText ? (
                <>
                  <View style={[ds.metaDivider, { backgroundColor: theme.border }]} />
                  <Text style={[ds.eventMetaText, { color: theme.textSecondary, flex: 1 }]} numberOfLines={2} ellipsizeMode="tail">
                    {subtitleText}
                  </Text>
                </>
              ) : null}
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.border} />
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer style={ds.container}>
      {/* Header */}
      <View style={ds.header}>
        <TouchableOpacity onPress={() => router.back()} style={ds.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[ds.headerTitle, { color: theme.text }]}>Calendar</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={ds.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
        }
      >
        {/* Calendar Card */}
        <Animated.View entering={FadeInDown} style={[ds.calendarCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={ds.monthNav}>
            <Text style={[ds.monthLabel, { color: theme.text }]}>
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <View style={ds.navBtns}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={[ds.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeMonth(1)} style={[ds.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', marginLeft: 10 }]}>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={ds.weekRow}>
            {weekDays.map((d, i) => (
              <Text key={i} style={[ds.weekDayText, { color: theme.textSecondary }]}>{d}</Text>
            ))}
          </View>

          <View style={ds.daysGrid}>
            {days.map((date, i) => {
              const isSel = date && isSameDay(date, selectedDate);
              const isTod = date && isToday(date);
              const dateStr = date ? getLocalDateString(date) : null;
              const dayEvents = dateStr ? eventsMap?.[dateStr] || [] : [];
              const dotsCount = Math.min(dayEvents.length, 4);
              const eventDots = dayEvents.slice(0, dotsCount);

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    ds.dayCell,
                    isSel && ds.dayCellSelected,
                    !date && ds.dayCellEmpty
                  ]}
                  onPress={() => {
                    if (date) {
                        setSelectedDate(date);
                    }
                  }}
                  disabled={!date}
                >
                  {date && (
                    <>
                      <View style={[ds.todayIndicator, isTod && !isSel && ds.todayIndicatorActive]} />
                      <Text style={[
                        ds.dayText,
                        { color: theme.text },
                        isSel && ds.dayTextSelected,
                        isTod && !isSel && ds.dayTextToday
                      ]}>
                        {date.getDate()}
                      </Text>
                      <View style={ds.dotsContainer}>
                        {eventDots.map((e, idx) => (
                          <View 
                            key={idx} 
                            style={[
                              ds.dot, 
                              { backgroundColor: isSel ? '#FFFFFF' : (e.color || theme.primary) }
                            ]} 
                          />
                        ))}
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Events List */}
        <View style={ds.eventsSection}>
          <View style={ds.sectionHeader}>
            <Text style={[ds.sectionTitle, { color: theme.text }]}>
              {isToday(selectedDate) ? "Today's Schedule" : selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </Text>
            <View style={[ds.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
              <Text style={[ds.badgeText, { color: theme.textSecondary }]}>{selectedEvents.length} Events</Text>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
          ) : selectedEvents.length === 0 ? (
            <Animated.View entering={FadeIn} style={ds.emptyState}>
              <View style={[ds.emptyIconContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="calendar-outline" size={42} color={theme.textSecondary} />
              </View>
              <Text style={[ds.emptyText, { color: theme.textSecondary }]}>No events scheduled for this day</Text>
            </Animated.View>
          ) : (
            <View>
              {/* Medicine Section */}
              {(groupedEvents.medicine['Morning 🌅'].length > 0 || 
                groupedEvents.medicine['Afternoon ☀️'].length > 0 || 
                groupedEvents.medicine['Night 🌙'].length > 0) && (
                <View style={{ marginBottom: 15 }}>
                  <Text style={[ds.groupLabel, { color: theme.primary, fontSize: 13, fontWeight: '900', letterSpacing: 1 }]}>MEDICATION SCHEDULE</Text>
                  {Object.entries(groupedEvents.medicine).map(([period, events]) => {
                    if (events.length === 0) return null;
                    return (
                      <View key={period} style={{ marginBottom: 10 }}>
                        <Text style={[ds.subPeriodLabel, { color: theme.textSecondary }]}>{period}</Text>
                        {events.map((event) => renderEventCard(event))}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* General Section */}
              {groupedEvents.general.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[ds.groupLabel, { color: theme.primary, fontSize: 13, fontWeight: '900', letterSpacing: 1 }]}>TASKS & EVENTS</Text>
                  {groupedEvents.general.map((event) => renderEventCard(event))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity 
        style={ds.fab} 
        onPress={() => router.push({ pathname: '/reminder/create', params: { initialDate: selectedDate.toISOString() } })}
      >
        <LinearGradient colors={colors.gradient.primary} style={ds.fabGradient}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = (theme: any, isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
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
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 120,
  },
  calendarCard: {
    borderRadius: 30,
    padding: 22,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'medium'),
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthLabel: {
    ...typography.titleMedium,
    fontWeight: '800',
  },
  navBtns: {
    flexDirection: 'row',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  weekDayText: {
    width: COLUMN_WIDTH,
    textAlign: 'center',
    ...typography.bodySmall,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH + 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 14,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: theme.primary,
  },
  dayCellEmpty: {
    backgroundColor: 'transparent',
  },
  dayText: {
    ...typography.bodyMedium,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dayTextToday: {
    fontWeight: '900',
  },
  todayIndicator: {
    position: 'absolute',
    top: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  todayIndicatorActive: {
    backgroundColor: theme.primary,
  },
  dotsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 6,
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventsSection: {
    marginTop: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    ...typography.titleMedium,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'soft'),
  },
  emptyText: {
    ...typography.bodyMedium,
    textAlign: 'center',
    fontWeight: '500',
  },
  groupLabel: {
    ...typography.caption,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 10,
  },
  eventCard: {
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'soft'),
  },
  eventIndicator: {
    width: 6,
    height: 40,
    borderRadius: 3,
    marginRight: 15,
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: {
    ...typography.caption,
    fontWeight: '800',
    fontSize: 9,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventMetaText: {
    ...typography.caption,
    marginLeft: 4,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 25,
    ...getThemedShadow(theme, 'strong'),
  },
  fabGradient: {
    width: 65,
    height: 65,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subPeriodLabel: {
    ...typography.caption,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
});
