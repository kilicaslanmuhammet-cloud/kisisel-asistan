import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { WeatherCard } from '../../components/dashboard/WeatherCard';
import { Card } from '../../components/common/Card';
import { CategoryBadge } from '../../components/common/CategoryBadge';
import { fetchWeather } from '../../services/weather/weather';
import { fetchTodayEvents } from '../../services/calendar/calendar';
import { fetchGmailMessages } from '../../services/gmail/gmail';
import { getCurrentLocation } from '../../services/location/location';
import { generateMorningBriefing } from '../../services/claude/ai';
import { subscribeToTasks } from '../../services/firebase/firestore';
import { Categories } from '../../constants/categories';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const {
    tasks, setTasks, events, setEvents,
    mails, setMails, weather, setWeather,
    advice, loadingStates, setLoading, setError,
  } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);
  const [briefing, setBriefing] = useState<string>('');
  const [showBriefing, setShowBriefing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading('dashboard', true);

    try {
      // Konum ve hava durumu
      const location = await getCurrentLocation();
      if (location) {
        const weatherData = await fetchWeather(location.latitude, location.longitude);
        setWeather(weatherData);
      }

      // Takvim etkinlikleri
      try {
        const todayEvents = await fetchTodayEvents();
        setEvents(todayEvents);
      } catch {
        // Calendar entegre değilse geç
      }

      // Mailler
      try {
        const gmailMessages = await fetchGmailMessages(10);
        setMails(gmailMessages);
      } catch {
        // Gmail entegre değilse geç
      }
    } catch (error) {
      setError('dashboard', 'Veriler yüklenemedi');
    } finally {
      setLoading('dashboard', false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();

    // Görev aboneliği
    if (!user) return;
    const unsubscribe = subscribeToTasks(user.uid, setTasks);
    return () => unsubscribe();
  }, [user, loadDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleGenerateBriefing = async () => {
    if (!user || !weather) return;
    setLoading('briefing', true);
    try {
      const text = await generateMorningBriefing({
        weather,
        events: events.slice(0, 5),
        tasks: tasks.filter((t) => t.status !== 'completed').slice(0, 5),
        mails: mails.slice(0, 3),
        userName: user.displayName?.split(' ')[0] || 'Kullanıcı',
      });
      setBriefing(text);
      setShowBriefing(true);
    } catch {
      Alert.alert('Hata', 'Brifing oluşturulamadı');
    } finally {
      setLoading('briefing', false);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const todayEvents = events.filter((e) => {
    const today = new Date();
    const eventDate = new Date(e.startTime);
    return eventDate.toDateString() === today.toDateString();
  });
  const unreadMails = mails.filter((m) => !m.isRead);
  const greeting = getGreeting(user?.displayName?.split(' ')[0] || '');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Başlık */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.date}>
            {format(new Date(), 'EEEE, d MMMM', { locale: tr })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Hızlı aksiyon butonları */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActions}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.quickAction}
            onPress={() => navigation.navigate(action.screen)}
          >
            <LinearGradient
              colors={action.gradient as [string, string]}
              style={styles.quickActionGradient}
            >
              <Ionicons name={action.icon as any} size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sabah brifing */}
      {!showBriefing && (
        <TouchableOpacity
          style={styles.briefingButton}
          onPress={handleGenerateBriefing}
          disabled={loadingStates['briefing']}
        >
          <LinearGradient
            colors={['#FF6B6B', '#FF9800']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.briefingGradient}
          >
            <Ionicons name="sunny" size={20} color="#fff" />
            <Text style={styles.briefingButtonText}>
              {loadingStates['briefing'] ? 'Brifing hazırlanıyor...' : '☀️ Sabah Brifingini Başlat'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {showBriefing && briefing && (
        <Card style={styles.briefingCard}>
          <View style={styles.briefingHeader}>
            <Text style={styles.briefingTitle}>🌅 Sabah Brifing</Text>
            <TouchableOpacity onPress={() => setShowBriefing(false)}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.briefingText}>{briefing}</Text>
        </Card>
      )}

      {/* Hava durumu */}
      {weather && <WeatherCard weather={weather} />}

      {/* İstatistik kartları */}
      <View style={styles.statsRow}>
        <StatCard
          emoji="📌"
          count={pendingTasks.length}
          label="Görev"
          color={Colors.primary}
          onPress={() => navigation.navigate('Tasks')}
        />
        <StatCard
          emoji="📅"
          count={todayEvents.length}
          label="Etkinlik"
          color={Colors.secondary}
          onPress={() => navigation.navigate('Calendar')}
        />
        <StatCard
          emoji="📧"
          count={unreadMails.length}
          label="Okunmamış"
          color={Colors.accent}
          onPress={() => navigation.navigate('Mail')}
        />
      </View>

      {/* Kategoriler */}
      <Text style={styles.sectionTitle}>Kategoriler</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {Categories.map((cat) => {
          const count = pendingTasks.filter((t) => t.category === cat.id).length;
          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryCard}
              onPress={() => navigation.navigate('Tasks', { category: cat.id })}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
              <Text style={[styles.categoryCount, { color: cat.color }]}>{count}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bugünkü etkinlikler */}
      {todayEvents.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Bugünkü Etkinlikler</Text>
          {todayEvents.slice(0, 3).map((event) => (
            <Card key={event.id} style={styles.eventCard}>
              <View style={styles.eventRow}>
                <View style={styles.eventTimeContainer}>
                  <Text style={styles.eventTime}>
                    {format(new Date(event.startTime), 'HH:mm')}
                  </Text>
                  <View style={[styles.eventDot, { backgroundColor: Colors.secondary }]} />
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                  {event.location && (
                    <Text style={styles.eventLocation} numberOfLines={1}>
                      📍 {event.location}
                    </Text>
                  )}
                </View>
                {event.meetingLink && (
                  <Ionicons name="videocam" size={18} color={Colors.primary} />
                )}
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Öncelikli görevler */}
      {pendingTasks.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Öncelikli Görevler</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
              <Text style={styles.seeAll}>Tümü →</Text>
            </TouchableOpacity>
          </View>
          {pendingTasks
            .filter((t) => t.priority === 'high')
            .slice(0, 3)
            .map((task) => (
              <Card key={task.id} style={styles.taskCard}>
                <View style={styles.taskRow}>
                  <View style={[styles.priorityDot, { backgroundColor: Colors.accent }]} />
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                    {task.dueDate && (
                      <Text style={styles.taskDue}>
                        ⏰ {format(new Date(task.dueDate), 'd MMM', { locale: tr })}
                      </Text>
                    )}
                  </View>
                  <CategoryBadge category={task.category} size="sm" />
                </View>
              </Card>
            ))}
        </>
      )}

      {/* Proaktif tavsiyeler */}
      {advice.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>💡 Akıllı Öneriler</Text>
          {advice.slice(0, 2).map((adv) => (
            <Card key={adv.id} style={[styles.adviceCard, { borderLeftColor: Colors.warning }]}>
              <Text style={styles.adviceTitle}>{adv.title}</Text>
              <Text style={styles.adviceContent}>{adv.content}</Text>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const StatCard: React.FC<{
  emoji: string;
  count: number;
  label: string;
  color: string;
  onPress: () => void;
}> = ({ emoji, count, label, color, onPress }) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.8}>
    <Text style={styles.statEmoji}>{emoji}</Text>
    <Text style={[styles.statCount, { color }]}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const getGreeting = (name: string): string => {
  const hour = new Date().getHours();
  const firstName = name || '';
  if (hour < 12) return `Günaydın${firstName ? ', ' + firstName : ''}! 🌅`;
  if (hour < 17) return `İyi günler${firstName ? ', ' + firstName : ''}! ☀️`;
  if (hour < 21) return `İyi akşamlar${firstName ? ', ' + firstName : ''}! 🌆`;
  return `İyi geceler${firstName ? ', ' + firstName : ''}! 🌙`;
};

const QUICK_ACTIONS = [
  { id: 'chat', label: 'AI Sohbet', icon: 'chatbubble-ellipses', screen: 'Chat', gradient: ['#4A90E2', '#7B68EE'] },
  { id: 'meeting', label: 'Toplantı', icon: 'mic', screen: 'Meeting', gradient: ['#FF6B6B', '#FF9800'] },
  { id: 'plan', label: 'Günlük Plan', icon: 'map', screen: 'DailyPlan', gradient: ['#4CAF50', '#8BC34A'] },
  { id: 'tasks', label: 'Görevler', icon: 'checkmark-done', screen: 'Tasks', gradient: ['#7B68EE', '#9C27B0'] },
  { id: 'telegram', label: 'Telegram', icon: 'send', screen: 'Telegram', gradient: ['#00BCD4', '#0097A7'] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActions: {
    marginBottom: 20,
  },
  quickAction: {
    alignItems: 'center',
    marginRight: 16,
    width: 64,
  },
  quickActionGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  briefingButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  briefingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  briefingButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  briefingCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  briefingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  briefingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  briefingText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  statCount: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  seeAll: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  categories: {
    marginBottom: 20,
  },
  categoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
    minWidth: 80,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  eventCard: {
    marginBottom: 8,
    padding: 14,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventTimeContainer: {
    alignItems: 'center',
    width: 44,
  },
  eventTime: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  eventLocation: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  taskCard: {
    marginBottom: 8,
    padding: 14,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  taskDue: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  adviceCard: {
    marginBottom: 10,
    borderLeftWidth: 4,
    borderRadius: 16,
  },
  adviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  adviceContent: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
