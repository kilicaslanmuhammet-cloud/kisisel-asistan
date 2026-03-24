import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { signInWithGoogle } from '../../services/firebase/auth';
import { useAuthStore } from '../../store/authStore';
import { getUserProfile } from '../../services/firebase/firestore';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { setUser, setGoogleAccessToken } = useAuthStore();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { user, accessToken } = await signInWithGoogle();
      const profile = await getUserProfile(user.uid);
      setUser(profile);
      setGoogleAccessToken(accessToken);
    } catch (error: any) {
      Alert.alert('Giriş Hatası', error.message || 'Giriş yapılamadı. Tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen text="Giriş yapılıyor..." />;
  }

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      {/* Arka plan dekorasyonu */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={Colors.gradient.primary as [string, string]}
            style={styles.logoGradient}
          >
            <Ionicons name="sparkles" size={48} color="#fff" />
          </LinearGradient>
        </View>

        {/* Başlık */}
        <Text style={styles.title}>Kişisel Asistan</Text>
        <Text style={styles.subtitle}>
          AI destekli kişisel asistanınız{'\n'}mail, takvim, görev ve daha fazlası
        </Text>

        {/* Özellik listesi */}
        <View style={styles.features}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureEmoji}>{feature.emoji}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        {/* Google Giriş Butonu */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          activeOpacity={0.9}
        >
          <View style={styles.googleIconContainer}>
            <Text style={styles.googleIcon}>G</Text>
          </View>
          <Text style={styles.googleButtonText}>Google ile Giriş Yap</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Giriş yaparak{' '}
          <Text style={styles.link}>Gizlilik Politikası</Text>
          {' '}ve{' '}
          <Text style={styles.link}>Kullanım Şartları</Text>
          'nı kabul etmiş olursunuz.
        </Text>
      </View>
    </LinearGradient>
  );
}

const FEATURES = [
  { emoji: '🤖', text: 'Claude AI ile akıllı asistan' },
  { emoji: '📧', text: 'Gmail ve Outlook entegrasyonu' },
  { emoji: '📅', text: 'Google Calendar senkronizasyonu' },
  { emoji: '🎤', text: 'Sesli komut ve toplantı kaydı' },
  { emoji: '📍', text: 'Konum bazlı akıllı öneriler' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    top: -100,
    right: -100,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(123, 104, 238, 0.1)',
    bottom: 100,
    left: -50,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  logoContainer: {
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  features: {
    width: '100%',
    marginBottom: 40,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureEmoji: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    gap: 12,
  },
  googleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    textAlign: 'center',
  },
  disclaimer: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: Colors.primaryLight,
    textDecorationLine: 'underline',
  },
});
