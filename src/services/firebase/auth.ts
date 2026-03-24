import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { getFirebaseAuth } from './config';
import { Config } from '../../constants/config';
import { createUserProfile, getUserProfile } from './firestore';

// Google Sign-In konfigürasyonu
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: Config.google.webClientId,
    iosClientId: Config.google.iosClientId,
    scopes: Config.google.scopes,
    offlineAccess: true,
  });
};

// Google ile giriş
export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = await GoogleSignin.getTokens();

    if (!idToken) {
      throw new Error('Google ID Token alınamadı');
    }

    const googleCredential = GoogleAuthProvider.credential(idToken);
    const auth = getFirebaseAuth();
    const result = await signInWithCredential(auth, googleCredential);

    // Kullanıcı profilini oluştur veya güncelle
    const existingProfile = await getUserProfile(result.user.uid);
    if (!existingProfile) {
      await createUserProfile({
        uid: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || '',
        photoURL: result.user.photoURL || undefined,
        createdAt: new Date(),
      });
    }

    return {
      user: result.user,
      accessToken: (await GoogleSignin.getTokens()).accessToken,
    };
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('Giriş iptal edildi');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Giriş işlemi devam ediyor');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Servisleri kullanılamıyor');
    }
    throw error;
  }
};

// Çıkış
export const signOut = async () => {
  try {
    const auth = getFirebaseAuth();
    await GoogleSignin.signOut();
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Çıkış hatası:', error);
    throw error;
  }
};

// Auth durumu dinleyicisi
export const onAuthChanged = (callback: (user: FirebaseUser | null) => void) => {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
};

// Google Access Token al
export const getGoogleAccessToken = async (): Promise<string | null> => {
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch {
    return null;
  }
};

// Token yenile
export const refreshGoogleToken = async (): Promise<string | null> => {
  try {
    await GoogleSignin.clearCachedAccessToken(
      (await GoogleSignin.getTokens()).accessToken
    );
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch {
    return null;
  }
};
