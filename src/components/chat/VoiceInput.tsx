import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { transcribeAudio } from '../../services/whisper/transcription';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscription,
  onError,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = () => {
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.current.start();
  };

  const stopPulse = () => {
    pulseAnimation.current?.stop();
    pulseAnim.setValue(1);
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        onError?.('Mikrofon izni verilmedi');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      startPulse();
    } catch (error) {
      onError?.('Kayıt başlatılamadı');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    setIsRecording(false);
    setIsProcessing(true);
    stopPulse();

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('Ses dosyası bulunamadı');

      const text = await transcribeAudio(uri);
      if (text.trim()) {
        onTranscription(text.trim());
      } else {
        onError?.('Ses anlaşılamadı, tekrar deneyin');
      }
    } catch (error) {
      onError?.('Ses işlenemedi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePress = () => {
    if (disabled || isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || isProcessing}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.button,
          isRecording && styles.recording,
          disabled && styles.disabled,
          { transform: [{ scale: isRecording ? pulseAnim : 1 }] },
        ]}
      >
        {isProcessing ? (
          <Text style={styles.processingText}>...</Text>
        ) : (
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={22}
            color={isRecording ? '#fff' : Colors.primary}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recording: {
    backgroundColor: Colors.error,
    shadowColor: Colors.error,
    shadowOpacity: 0.3,
  },
  disabled: {
    opacity: 0.4,
  },
  processingText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
