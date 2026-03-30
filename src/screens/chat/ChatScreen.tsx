import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { VoiceInput } from '../../components/chat/VoiceInput';
import { sendChatMessage, processVoiceCommand } from '../../services/claude/ai';
import { features } from '../../constants/config';
import { ChatMessage } from '../../types';
import { saveChatMessage, getChatHistory } from '../../services/firebase/firestore';
import { createTask } from '../../services/firebase/firestore';

export default function ChatScreen() {
  const { user } = useAuthStore();
  const { tasks, events, weather, chatMessages, setChatMessages, addChatMessage } = useAppStore();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  const loadChatHistory = async () => {
    if (!user) return;
    const history = await getChatHistory(user.uid, 30);
    setChatMessages(history);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = useCallback(async (text: string, isVoice = false) => {
    if (!text.trim() || !user) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
      isVoice,
    };

    addChatMessage(userMessage);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    // Streaming placeholder mesajı
    const placeholderMessage: ChatMessage = {
      id: `streaming-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    addChatMessage(placeholderMessage);

    try {
      // Sesli komut mu normal sohbet mi?
      let responseText = '';
      if (isVoice) {
        const result = await processVoiceCommand(text, { tasks, events });

        // Aksiyon varsa uygula
        if (result.action === 'create_task' && result.data) {
          await createTask({
            userId: user.uid,
            title: result.data.title || text,
            category: result.data.category || 'notlar',
            priority: result.data.priority || 'medium',
            status: 'pending',
          });
        }
        responseText = result.response;
      } else {
        responseText = await sendChatMessage(
          chatMessages,
          text,
          { tasks, events, weather: weather || undefined }
        );
      }

      // Placeholder'ı gerçek yanıtla değiştir
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };

      // Placeholder'ı kaldır ve gerçek mesajı ekle
      const updatedMessages = chatMessages
        .filter((m) => !m.isStreaming)
        .concat(userMessage, assistantMessage);
      setChatMessages(updatedMessages);

      // Firestore'a kaydet
      await saveChatMessage(user.uid, userMessage);
      await saveChatMessage(user.uid, assistantMessage);

      // TTS ile sesli yanıt
      if (isSpeechEnabled && responseText) {
        Speech.speak(responseText, {
          language: 'tr-TR',
          rate: 0.9,
          pitch: 1.0,
        });
      }

      scrollToBottom();
    } catch (error) {
      Alert.alert('Hata', 'Yanıt alınamadı. Tekrar deneyin.');
      const updatedMessages = chatMessages.filter((m) => !m.isStreaming);
      setChatMessages(updatedMessages);
    } finally {
      setIsLoading(false);
    }
  }, [user, chatMessages, tasks, events, weather, isSpeechEnabled]);

  const handleVoiceTranscription = (text: string) => {
    sendMessage(text, true);
  };

  const toggleSpeech = () => {
    if (isSpeechEnabled) {
      Speech.stop();
    }
    setIsSpeechEnabled(!isSpeechEnabled);
  };

  const clearHistory = () => {
    Alert.alert(
      'Geçmişi Temizle',
      'Sohbet geçmişini silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => setChatMessages([]),
        },
      ]
    );
  };

  const SUGGESTIONS = [
    'Bugün ne yapmalıyım?',
    'Sabah brifingimi oluştur',
    'Yüksek öncelikli görevlerimi listele',
    'Hava durumu nasıl?',
    'Haftalık özetimi hazırla',
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Claude AI devre dışı uyarısı */}
      {!features.aiChat && (
        <View style={styles.disabledBanner}>
          <Ionicons name="warning-outline" size={16} color="#f59e0b" />
          <Text style={styles.disabledBannerText}>
            Claude AI henüz aktif değil — Anthropic API anahtarı bekleniyor
          </Text>
        </View>
      )}

      {/* Üst bar */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>🤖</Text>
          </View>
          <View>
            <Text style={styles.aiName}>AI Asistan</Text>
            <Text style={styles.aiStatus}>
              {isLoading ? 'Yazıyor...' : 'Aktif'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerBtn, isSpeechEnabled && styles.headerBtnActive]}
            onPress={toggleSpeech}
          >
            <Ionicons
              name={isSpeechEnabled ? 'volume-high' : 'volume-mute'}
              size={18}
              color={isSpeechEnabled ? Colors.primary : Colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={clearHistory}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mesajlar */}
      <FlatList
        ref={flatListRef}
        data={chatMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>Merhaba!</Text>
            <Text style={styles.emptyText}>
              Herhangi bir konuda yardım isteyebilirsiniz.{'\n'}
              Sesli komut veya yazılı mesaj gönderebilirsiniz.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestion}
                  onPress={() => sendMessage(s)}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
      />

      {/* Giriş alanı */}
      <View style={styles.inputContainer}>
        <VoiceInput
          onTranscription={handleVoiceTranscription}
          onError={(error) => Alert.alert('Ses Hatası', error)}
          disabled={isLoading || !features.aiChat}
        />
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={features.aiChat ? 'Bir şeyler yazın...' : 'AI henüz kullanılamıyor...'}
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(inputText)}
          editable={features.aiChat}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading || !features.aiChat) && styles.sendButtonDisabled]}
          onPress={() => sendMessage(inputText)}
          disabled={!inputText.trim() || isLoading || !features.aiChat}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: {
    fontSize: 20,
  },
  aiName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  aiStatus: {
    fontSize: 12,
    color: Colors.success,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnActive: {
    backgroundColor: `${Colors.primary}20`,
  },
  messagesList: {
    paddingVertical: 12,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  suggestions: {
    width: '100%',
    gap: 8,
  },
  suggestion: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 120,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  disabledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245,158,11,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  disabledBannerText: {
    fontSize: 12,
    color: '#f59e0b',
    flex: 1,
  },
});
