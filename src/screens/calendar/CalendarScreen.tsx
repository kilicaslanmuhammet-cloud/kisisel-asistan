import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAppStore } from '../../store/appStore';
import { CalendarEvent } from '../../types';
import { Card } from '../../components/common/Card';
import { fetchCalendarEvents, fetchWeekEvents } from '../../services/calendar/calendar';
import { fetchOutlookCalendarEvents } from '../../services/outlook/outlook';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function CalendarScreen() {
  const { events, setEvents, loadingStates, setLoading } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading('events', true);
    const allEvents: CalendarEvent[] = [];

    try {
      const googleEvents = await fetchWeekEvents();
      allEvents.push(...googleEvents);
    } catch {
      // Google Calendar entegre değil
    }

    try {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      const end = addDays(start, 7);
      const outlookEvents = await fetchOutlookCalendarEvents(start, end);
      allEvents.push(...outlookEvents);
    } catch {
      // Outlook entegre değil
    }

    const sorted = allEvents.sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    setEvents(sorted);
    setLoading('events', false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const selectedDayEvents = events.filter((e) =>
    isSameDay(new Date(e.startTime), selectedDate)
  );

  const EVENT_COLORS = {
    google: Colors.primary,
    outlook: '#0078D4',
    local: Colors.secondary,
  };

  return (
    <View style={styles.container}>
      {/* Haftalık takvim */}
      <View style={styles.weekCalendar}>
        <View style={styles.weekHeader}>
          <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, -7))}>
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.weekTitle}>
            {format(weekStart, 'MMMM yyyy', { locale: tr })}
          </Text>
          <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, 7))}>
            <Ionicons name="chevron-forward" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDays}>
          {weekDays.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const dayEvents = events.filter((e) => isSameDay(new Date(e.startTime), day));

            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                  {format(day, 'EEEEE', { locale: tr })}
                </Text>
                <View style={[styles.dayNumber, isSelected && styles.dayNumberSelected, isToday && !isSelected && styles.dayNumberToday]}>
                  <Text style={[styles.dayNumberText, isSelected && styles.dayNumberTextSelected, isToday && !isSelected && styles.dayNumberTextToday]}>
                    {format(day, 'd')}
                  </Text>
                </View>
                {dayEvents.length > 0 && (
                  <View style={styles.eventDots}>
                    {dayEvents.slice(0, 3).map((_, ei) => (
                      <View key={ei} style={[styles.eventDot, isSelected && styles.eventDotSelected]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Seçili gün etkinlikleri */}
      <View style={styles.eventsHeader}>
        <Text style={styles.eventsTitle}>
          {format(selectedDate, 'EEEE, d MMMM', { locale: tr })}
        </Text>
        <Text style={styles.eventsCount}>
          {selectedDayEvents.length} etkinlik
        </Text>
      </View>

      <FlatList
        data={selectedDayEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: event }) => (
          <Card style={styles.eventCard}>
            <View style={styles.eventRow}>
              <View style={[styles.eventColorBar, { backgroundColor: EVENT_COLORS[event.source] || Colors.primary }]} />
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                  {event.meetingLink && (
                    <TouchableOpacity style={styles.joinBtn}>
                      <Ionicons name="videocam" size={14} color={Colors.primary} />
                      <Text style={styles.joinBtnText}>Katıl</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.eventMeta}>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.eventTime}>
                      {event.isAllDay ? 'Tüm gün' : `${format(new Date(event.startTime), 'HH:mm')} - ${format(new Date(event.endTime), 'HH:mm')}`}
                    </Text>
                  </View>
                  {event.location && (
                    <View style={styles.timeRow}>
                      <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
                    </View>
                  )}
                  {event.attendees && event.attendees.length > 0 && (
                    <View style={styles.timeRow}>
                      <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.eventAttendees}>
                        {event.attendees.length} katılımcı
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.eventSource}>
                  <Text style={[styles.sourceText, { color: EVENT_COLORS[event.source] }]}>
                    {event.source === 'google' ? '📅 Google' : event.source === 'outlook' ? '📨 Outlook' : '📅 Yerel'}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>Bu gün için etkinlik yok</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  weekCalendar: {
    backgroundColor: Colors.surface,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  weekDays: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  dayButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  dayButtonSelected: {
    backgroundColor: `${Colors.primary}15`,
  },
  dayName: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  dayNameSelected: {
    color: Colors.primary,
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayNumberSelected: {
    backgroundColor: Colors.primary,
  },
  dayNumberToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  dayNumberTextSelected: {
    color: '#fff',
  },
  dayNumberTextToday: {
    color: Colors.primary,
  },
  eventDots: {
    flexDirection: 'row',
    gap: 2,
    height: 6,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    opacity: 0.6,
  },
  eventDotSelected: {
    backgroundColor: Colors.primary,
    opacity: 1,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  eventsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  eventsCount: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  eventCard: {
    marginBottom: 10,
    padding: 0,
    overflow: 'hidden',
  },
  eventRow: {
    flexDirection: 'row',
  },
  eventColorBar: {
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  eventContent: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  joinBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  eventMeta: {
    gap: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  eventLocation: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  eventAttendees: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  eventSource: {
    flexDirection: 'row',
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
