import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WeatherData } from '../../types';
import { Colors } from '../../constants/colors';
import { getWeatherEmoji, getWeatherIconUrl } from '../../services/weather/weather';

interface WeatherCardProps {
  weather: WeatherData;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather }) => {
  const emoji = getWeatherEmoji(weather.condition);

  return (
    <LinearGradient
      colors={Colors.gradient.cool as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.mainRow}>
        <View>
          <Text style={styles.city}>{weather.city}</Text>
          <Text style={styles.temperature}>{weather.temperature}°C</Text>
          <Text style={styles.description}>{weather.description}</Text>
        </View>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      <View style={styles.detailsRow}>
        <WeatherDetail label="Hissedilen" value={`${weather.feelsLike}°C`} />
        <WeatherDetail label="Nem" value={`%${weather.humidity}`} />
        <WeatherDetail label="Rüzgar" value={`${weather.windSpeed} km/s`} />
      </View>

      {weather.forecast && weather.forecast.length > 0 && (
        <View style={styles.forecastRow}>
          {weather.forecast.slice(0, 5).map((f, i) => (
            <View key={i} style={styles.forecastItem}>
              <Text style={styles.forecastDay}>
                {new Date(f.date).toLocaleDateString('tr-TR', { weekday: 'short' })}
              </Text>
              <Text style={styles.forecastEmoji}>{getWeatherEmoji(f.condition)}</Text>
              <Text style={styles.forecastTemp}>{Math.round(f.tempMax)}°</Text>
            </View>
          ))}
        </View>
      )}
    </LinearGradient>
  );
};

const WeatherDetail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detail}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  city: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  temperature: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginTop: 2,
  },
  emoji: {
    fontSize: 64,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  detail: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginBottom: 4,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forecastItem: {
    alignItems: 'center',
    flex: 1,
  },
  forecastDay: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginBottom: 4,
  },
  forecastEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  forecastTemp: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
