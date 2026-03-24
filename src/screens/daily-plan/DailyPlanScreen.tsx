import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { optimizeDailyPlan } from '../../services/claude/ai';
import { getCurrentLocation, findNearbyPlaces } from '../../services/location/location';
import { fetchWeather } from '../../services/weather/weather';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ScheduleItem {
  time: string;
  duration: number;
  title: string;
  type: 'task' | 'event' | 'break' | 'commute';
  tips?: string;
}

const TYPE_CONFIG = {
  task: { color: Colors.primary, icon: 'checkmark-circle', emoji: '📌' },
  event: { color: Colors.secondary, icon: 'calendar', emoji: '📅' },
  break: { color: Colors.success, icon: 'cafe', emoji: '☕' },
  commute: { color: Colors.warning, icon: 'car', emoji: '🚗' },
};

export default function DailyPlanScreen() {
  const { user } = useAuthStore();
  const { tasks, events, weather, setWeather, locationState } = useAppStore();

  const [userInput, setUserInput] = useState('');
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);

  const handleOptimizePlan = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Konum ve hava durumu güncelle
      const location = await getCurrentLocation();
      let currentWeather = weather;

      if (location) {
        currentWeather = await fetchWeather(location.latitude, location.longitude);
        setWeather(currentWeather);

        // Yakın restoranları bul
        const places = await findNearbyPlaces(location.latitude, location.longitude, 'restaurant', 500);
        setNearbyPlaces(places);
      }

      if (!currentWeather) {
        Alert.alert('Uyarı', 'Hava durumu alınamadı, plan konum verisi olmadan oluşturulacak');
      }

      const pendingTasks = tasks.filter((t) => t.status !== 'completed');
      const todayEvents = events.filter((e) => {
        const today = new Date();
        return new Date(e.startTime).toDateString() === today.toDateString();
      });

      const result = await optimizeDailyPlan({
        userInput: userInput || 'Normal iş günü',
        tasks: pendingTasks,
        events: todayEvents,
        weather: currentWeather || { temperature: 20, condition: 'Clear', description: 'Açık', city: '', humidity: 50, windSpeed: 10, feelsLike: 18, icon: '01d' },
        currentLocation: locationState.context === 'work' ? 'İşyeri' : locationState.context === 'home' ? 'Ev' : 'Bilinmiyor',
        workStartTime: user.preferences?.workStartTime || '09:00',
        workEndTime: user.preferences?.workEndTime || '18:00',
      });

      setSchedule(result.schedule as ScheduleItem[]);
      setTips(result.tips);
      setWarnings(result.warnings);
    } catch (error) {
      Alert.alert('Hata', 'Günlük plan oluşturulamadı');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Başlık */}
      <LinearGradient
        colors={[Colors.success, '#8BC34A']}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>📅 Günlük Optimizasyon</Text>
        <Text style={styles.headerDate}>
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: tr })}
        </Text>
        {weather && (
          <Text style={styles.headerWeather}>
            {weather.temperature}°C • {weather.description}
          </Text>
        )}
      </LinearGradient>

      {/* Kullanıcı girişi */}
      <Card style={styles.inputCard}>
        <Text style={styles.inputLabel}>Bugün için planınızı anlatın</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Örn: Sabah toplantım var, öğleden sonra proje teslimi yapacağım, akşam aile yemeği..."
          placeholderTextColor={Colors.textMuted}
          value={userInput}
          onChangeText={setUserInput}
          multiline
          numberOfLines={4}
        />

        <View style={styles.contextRow}>
          <ContextBadge
            emoji={locationState.context === 'work' ? '💼' : locationState.context === 'home' ? '🏠' : '📍'}
            label={locationState.context === 'work' ? 'İşyerinde' : locationState.context === 'home' ? 'Evde' : 'Konum bilinmiyor'}
          />
          <ContextBadge emoji="📌" label={`${tasks.filter((t) => t.status !== 'completed').length} bekleyen görev`} />
          <ContextBadge emoji="📅" label={`${events.length} etkinlik`} />
        </View>

        <Button
          title={isLoading ? 'Plan oluşturuluyor...' : '🚀 Planı Optimize Et'}
          onPress={handleOptimizePlan}
          disabled={isLoading}
          loading={isLoading}
        />
      </Card>

      {/* Uyarılar */}
      {warnings.length > 0 && (
        <Card style={styles.warningCard}>
          {warnings.map((warning, i) => (
            <View key={i} style={styles.warningRow}>
              <Ionicons name="warning" size={16} color={Colors.warning} />
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Optimize edilmiş program */}
      {schedule.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>⏰ Optimize Edilmiş Program</Text>
          <View style={styles.timeline}>
            {schedule.map((item, index) => {
              const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.task;
              return (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <Text style={styles.timelineTime}>{item.time}</Text>
                    {index < schedule.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: config.color }]} />
                    )}
                  </View>
                  <View style={[styles.timelineCard, { borderLeftColor: config.color }]}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineEmoji}>{config.emoji}</Text>
                      <Text style={styles.timelineTitle}>{item.title}</Text>
                      <Text style={styles.timelineDuration}>{item.duration} dk</Text>
                    </View>
                    {item.tips && (
                      <Text style={styles.timelineTips}>{item.tips}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* İpuçları */}
      {tips.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>💡 Günün İpuçları</Text>
          <Card style={styles.tipsCard}>
            {tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={styles.tipNumber}>{i + 1}.</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Yakın yerler */}
      {nearbyPlaces.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🍽️ Yakın Yemek Yerleri</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {nearbyPlaces.map((place) => (
              <Card key={place.id} style={styles.placeCard}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeDistance}>📍 {Math.round(place.distance)}m</Text>
                {place.rating && (
                  <Text style={styles.placeRating}>⭐ {place.rating}</Text>
                )}
              </Card>
            ))}
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}

const ContextBadge: React.FC<{ emoji: string; label: string }> = ({ emoji, label }) => (
  <View style={styles.contextBadge}>
    <Text style={styles.contextEmoji}>{emoji}</Text>
    <Text style={styles.contextLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 100,
  },
  headerGradient: {
    padding: 24,
    paddingTop: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  headerWeather: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  inputCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  textInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  contextEmoji: {
    fontSize: 12,
  },
  contextLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  warningCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: `${Colors.warning}15`,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    gap: 8,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  timeline: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 50,
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginBottom: -4,
    opacity: 0.3,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineEmoji: {
    fontSize: 14,
  },
  timelineTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  timelineDuration: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  timelineTips: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  tipsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 20,
  },
  tipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  placeCard: {
    width: 140,
    marginLeft: 20,
    marginBottom: 16,
    padding: 12,
  },
  placeName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  placeDistance: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  placeRating: {
    fontSize: 12,
    color: Colors.warning,
  },
});
