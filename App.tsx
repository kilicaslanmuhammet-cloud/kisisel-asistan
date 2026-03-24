import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { initFirebase } from './src/services/firebase/config';
import { configureGoogleSignIn, onAuthChanged } from './src/services/firebase/auth';
import { getUserProfile } from './src/services/firebase/firestore';
import { useAuthStore } from './src/store/authStore';
import Navigation from './src/navigation';
import { startBackgroundLocation } from './src/services/location/location';

// Splash screen otomatik gizlenmesin
SplashScreen.preventAutoHideAsync();

// Bildirim yapılandırması
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Firebase başlat
      initFirebase();

      // Google Sign-In yapılandır
      configureGoogleSignIn();

      // Auth durumunu dinle
      const unsubscribe = onAuthChanged(async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await getUserProfile(firebaseUser.uid);
          setUser(profile);

          // Arka plan konum başlat
          try {
            await startBackgroundLocation();
          } catch {
            // Konum izni yoksa geç
          }
        } else {
          setUser(null);
        }
      });

      // Bildirim izni iste
      await Notifications.requestPermissionsAsync();

      await SplashScreen.hideAsync();

      return unsubscribe;
    } catch (error) {
      console.error('Uygulama başlatma hatası:', error);
      setLoading(false);
      await SplashScreen.hideAsync();
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Navigation />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
