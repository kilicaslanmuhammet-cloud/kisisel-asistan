import axios from 'axios';
import { WeatherData, WeatherForecast } from '../../types';
import { Config } from '../../constants/config';

// Hava durumu çek
export const fetchWeather = async (
  lat: number,
  lon: number
): Promise<WeatherData> => {
  const { apiKey, baseUrl } = Config.weather;

  const [currentRes, forecastRes] = await Promise.allSettled([
    axios.get(`${baseUrl}/weather`, {
      params: { lat, lon, appid: apiKey, units: 'metric', lang: 'tr' },
    }),
    axios.get(`${baseUrl}/forecast`, {
      params: { lat, lon, appid: apiKey, units: 'metric', lang: 'tr', cnt: 5 },
    }),
  ]);

  if (currentRes.status === 'rejected') {
    throw new Error('Hava durumu alınamadı');
  }

  const current = currentRes.value.data;
  const forecasts: WeatherForecast[] = [];

  if (forecastRes.status === 'fulfilled') {
    const forecastData = forecastRes.value.data;
    // Her gün için bir tahmin al
    const dailyForecasts = (forecastData.list || [])
      .filter((_: any, index: number) => index % 8 === 0)
      .slice(0, 5);

    for (const item of dailyForecasts) {
      forecasts.push({
        date: new Date(item.dt * 1000),
        tempMin: item.main.temp_min,
        tempMax: item.main.temp_max,
        condition: item.weather[0].main,
        icon: item.weather[0].icon,
      });
    }
  }

  return {
    temperature: Math.round(current.main.temp),
    feelsLike: Math.round(current.main.feels_like),
    condition: current.weather[0].main,
    description: capitalizeFirst(current.weather[0].description),
    icon: current.weather[0].icon,
    humidity: current.main.humidity,
    windSpeed: Math.round(current.wind.speed * 3.6), // m/s -> km/h
    city: current.name,
    forecast: forecasts,
  };
};

// Hava durumu ikonu URL'i
export const getWeatherIconUrl = (iconCode: string): string => {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
};

// Hava durumu emoji
export const getWeatherEmoji = (condition: string): string => {
  const conditions: Record<string, string> = {
    Clear: '☀️',
    Clouds: '☁️',
    Rain: '🌧️',
    Drizzle: '🌦️',
    Thunderstorm: '⛈️',
    Snow: '❄️',
    Mist: '🌫️',
    Fog: '🌁',
    Haze: '🌁',
    Dust: '💨',
    Sand: '💨',
    Ash: '🌋',
    Squall: '🌬️',
    Tornado: '🌪️',
  };
  return conditions[condition] || '🌤️';
};

const capitalizeFirst = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);
