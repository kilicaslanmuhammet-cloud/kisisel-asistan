import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import axios from 'axios';
import { LocationContext, NearbyPlace } from '../../types';
import { Config } from '../../constants/config';

const BACKGROUND_LOCATION_TASK = 'background-location';
const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

// Konum izni iste
export const requestLocationPermission = async (): Promise<boolean> => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') return false;

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  return backgroundStatus === 'granted';
};

// Mevcut konumu al
export const getCurrentLocation = async (): Promise<{
  latitude: number;
  longitude: number;
} | null> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
};

// Konum bağlamını belirle (ev/iş/yolda)
export const determineLocationContext = async (
  currentLat: number,
  currentLon: number,
  homeLocation?: { latitude: number; longitude: number },
  workLocation?: { latitude: number; longitude: number }
): Promise<LocationContext> => {
  if (homeLocation) {
    const homeDistance = calculateDistance(
      currentLat, currentLon,
      homeLocation.latitude, homeLocation.longitude
    );
    if (homeDistance < 0.2) return 'home'; // 200 metre
  }

  if (workLocation) {
    const workDistance = calculateDistance(
      currentLat, currentLon,
      workLocation.latitude, workLocation.longitude
    );
    if (workDistance < 0.3) return 'work'; // 300 metre
  }

  return 'other';
};

// İki konum arasındaki mesafe (km)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg: number) => deg * (Math.PI / 180);

// Yakın yerleri bul (Google Places API)
export const findNearbyPlaces = async (
  lat: number,
  lon: number,
  type = 'restaurant',
  radius = 500
): Promise<NearbyPlace[]> => {
  const apiKey = Config.googleMaps.apiKey;
  if (!apiKey) return [];

  try {
    const response = await axios.get(`${PLACES_API_BASE}/nearbysearch/json`, {
      params: {
        location: `${lat},${lon}`,
        radius,
        type,
        key: apiKey,
        language: 'tr',
      },
    });

    return (response.data.results || []).slice(0, 5).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      type: place.types?.[0] || type,
      address: place.vicinity,
      distance: calculateDistance(lat, lon, place.geometry.location.lat, place.geometry.location.lng) * 1000,
      rating: place.rating,
      location: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
    }));
  } catch {
    return [];
  }
};

// Rota optimizasyonu (Google Directions API)
export const getOptimizedRoute = async (
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  waypoints?: { lat: number; lon: number }[]
): Promise<{
  distance: string;
  duration: string;
  steps: string[];
} | null> => {
  const apiKey = Config.googleMaps.apiKey;
  if (!apiKey) return null;

  try {
    const waypointsStr = waypoints
      ?.map((w) => `${w.lat},${w.lon}`)
      .join('|');

    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: `${origin.lat},${origin.lon}`,
        destination: `${destination.lat},${destination.lon}`,
        waypoints: waypointsStr ? `optimize:true|${waypointsStr}` : undefined,
        mode: 'driving',
        language: 'tr',
        key: apiKey,
      },
    });

    const route = response.data.routes?.[0];
    if (!route) return null;

    const leg = route.legs?.[0];
    return {
      distance: leg?.distance?.text || '',
      duration: leg?.duration?.text || '',
      steps: (leg?.steps || []).map((s: any) => s.html_instructions.replace(/<[^>]*>/g, '')),
    };
  } catch {
    return null;
  }
};

// Arka plan konum görevi tanımla
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }: any) => {
  if (error) {
    console.error('Arka plan konum hatası:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    console.log('Arka plan konum güncellemesi:', locations);
    // Konum güncellemelerini işle
  }
});

// Arka plan konum takibini başlat
export const startBackgroundLocation = async (): Promise<void> => {
  const { status } = await Location.getBackgroundPermissionsAsync();
  if (status !== 'granted') return;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 100, // 100 metre değişimde güncelle
    timeInterval: 5 * 60 * 1000, // 5 dakikada bir
    foregroundService: {
      notificationTitle: 'Kişisel Asistan',
      notificationBody: 'Konum takibi aktif',
    },
  });
};

// Arka plan konum takibini durdur
export const stopBackgroundLocation = async (): Promise<void> => {
  const isTracking = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (isTracking) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
};

// Adresten koordinat al (Geocoding)
export const geocodeAddress = async (address: string): Promise<{
  latitude: number;
  longitude: number;
} | null> => {
  const locations = await Location.geocodeAsync(address);
  if (locations.length > 0) {
    return {
      latitude: locations[0].latitude,
      longitude: locations[0].longitude,
    };
  }
  return null;
};
