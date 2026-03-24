import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { Config } from '../../constants/config';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

// Ses dosyasını Whisper API ile transkribe et
export const transcribeAudio = async (audioUri: string): Promise<string> => {
  if (!Config.openai.apiKey) {
    throw new Error('OpenAI API anahtarı bulunamadı');
  }

  // Ses dosyasını oku
  const audioInfo = await FileSystem.getInfoAsync(audioUri);
  if (!audioInfo.exists) {
    throw new Error('Ses dosyası bulunamadı');
  }

  // FormData oluştur
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as any);
  formData.append('model', Config.openai.whisperModel);
  formData.append('language', 'tr');
  formData.append('response_format', 'text');

  const response = await axios.post(`${OPENAI_API_BASE}/audio/transcriptions`, formData, {
    headers: {
      Authorization: `Bearer ${Config.openai.apiKey}`,
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 60 saniye timeout
  });

  return typeof response.data === 'string' ? response.data : response.data.text || '';
};

// Gerçek zamanlı ses kaydı için segment transkripsiyon
export const transcribeAudioSegment = async (
  audioChunks: string[]
): Promise<string> => {
  if (audioChunks.length === 0) return '';

  // Tüm chunk'ları birleştir (basit implementasyon)
  const fullTranscript: string[] = [];
  for (const chunk of audioChunks) {
    try {
      const text = await transcribeAudio(chunk);
      if (text.trim()) {
        fullTranscript.push(text.trim());
      }
    } catch (error) {
      console.error('Segment transkripsiyon hatası:', error);
    }
  }

  return fullTranscript.join(' ');
};

// Ses dosyası kalitesini kontrol et
export const validateAudioFile = async (audioUri: string): Promise<{
  isValid: boolean;
  error?: string;
  size?: number;
}> => {
  try {
    const info = await FileSystem.getInfoAsync(audioUri, { size: true });
    if (!info.exists) {
      return { isValid: false, error: 'Ses dosyası bulunamadı' };
    }

    const size = (info as any).size || 0;
    if (size === 0) {
      return { isValid: false, error: 'Ses dosyası boş' };
    }

    // Whisper API maksimum 25MB
    if (size > 25 * 1024 * 1024) {
      return { isValid: false, error: 'Ses dosyası çok büyük (max 25MB)' };
    }

    return { isValid: true, size };
  } catch {
    return { isValid: false, error: 'Ses dosyası doğrulanamadı' };
  }
};
