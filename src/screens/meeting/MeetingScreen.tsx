import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { Meeting } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { transcribeAudio } from '../../services/whisper/transcription';
import { analyzeMeeting } from '../../services/ai';
import { createMeeting, updateMeeting, getUserMeetings } from '../../services/firebase/firestore';
import { createTask } from '../../services/firebase/firestore';
import { sendMeetingSummaryMail } from '../../services/gmail/gmail';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped';

export default function MeetingScreen() {
  const { user } = useAuthStore();
  const { meetings, addMeeting, updateMeeting: updateMeetingStore } = useAppStore();

  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [attendeesText, setAttendees] = useState('');
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadMeetings();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadMeetings = async () => {
    if (!user) return;
    const userMeetings = await getUserMeetings(user.uid);
    useAppStore.getState().setMeetings(userMeetings);
  };

  const startRecording = async () => {
    if (!meetingTitle.trim()) {
      Alert.alert('Uyarı', 'Lütfen toplantı başlığı girin');
      return;
    }

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Toplantı kaydı için mikrofon izni gereklidir');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setRecordingStatus('recording');
      setRecordingDuration(0);

      // Süre sayacı
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Firestore'a toplantı oluştur
      if (user) {
        const attendeesList = attendeesText.split(',').map((a) => a.trim()).filter(Boolean);
        const meetingId = await createMeeting({
          userId: user.uid,
          title: meetingTitle.trim(),
          date: new Date(),
          duration: 0,
          attendees: attendeesList,
          status: 'recording',
        });

        const newMeeting: Meeting = {
          id: meetingId,
          userId: user.uid,
          title: meetingTitle.trim(),
          date: new Date(),
          duration: 0,
          attendees: attendeesList,
          status: 'recording',
          createdAt: new Date(),
        };
        setCurrentMeeting(newMeeting);
        addMeeting(newMeeting);
      }
    } catch (error) {
      Alert.alert('Hata', 'Kayıt başlatılamadı');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current || !currentMeeting) return;

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      setRecordingStatus('stopped');
      setIsAnalyzing(true);

      // Güncel süreyi al
      const duration = Math.floor(recordingDuration / 60);

      // Transkripsiyon
      let transcript = '';
      if (uri) {
        transcript = await transcribeAudio(uri);
      }

      // AI analizi
      const attendeesList = currentMeeting.attendees || [];
      const analysis = await analyzeMeeting(transcript, duration || 1, attendeesList);

      // Firestore güncelle
      const updates = {
        duration: duration || 1,
        transcript,
        summary: analysis.summary,
        decisions: analysis.decisions,
        actionItems: analysis.actionItems,
        openQuestions: analysis.openQuestions,
        audioFileUri: uri || undefined,
        status: 'completed' as const,
      };

      await updateMeeting(currentMeeting.id, updates);
      updateMeetingStore(currentMeeting.id, updates);

      const completedMeeting = { ...currentMeeting, ...updates };
      setCurrentMeeting(completedMeeting);

      // Aksiyon maddelerini görev listesine ekle
      if (user && analysis.actionItems.length > 0) {
        for (const actionItem of analysis.actionItems) {
          await createTask({
            userId: user.uid,
            title: actionItem,
            category: 'is',
            priority: 'medium',
            status: 'pending',
            source: 'meeting',
            meetingId: currentMeeting.id,
          });
        }
      }

      setIsAnalyzing(false);
      Alert.alert(
        'Toplantı Tamamlandı',
        `Özet oluşturuldu ve ${analysis.actionItems.length} aksiyon göreve eklendi.`,
        [
          {
            text: 'Özeti Gör',
            onPress: () => {
              setSelectedMeeting(completedMeeting);
              setShowDetailModal(true);
            },
          },
          {
            text: 'Özeti Gönder',
            onPress: () => sendSummaryEmail(completedMeeting),
          },
          { text: 'Tamam' },
        ]
      );
    } catch (error) {
      setIsAnalyzing(false);
      Alert.alert('Hata', 'Toplantı analizi yapılamadı');
    }
  };

  const sendSummaryEmail = async (meeting: Meeting) => {
    if (!meeting.attendees?.length || !meeting.summary) return;

    Alert.alert('Özeti Gönder', `${meeting.attendees.length} katılımcıya özet maili gönderilsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Gönder',
        onPress: async () => {
          try {
            await sendMeetingSummaryMail({
              attendees: meeting.attendees!,
              meetingTitle: meeting.title,
              summary: meeting.summary!,
              decisions: meeting.decisions || [],
              actionItems: meeting.actionItems || [],
            });
            Alert.alert('Başarılı', 'Özet maili gönderildi');
          } catch {
            Alert.alert('Hata', 'Mail gönderilemedi');
          }
        },
      },
    ]);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Kayıt alanı */}
      <Card style={styles.recordingCard}>
        <Text style={styles.sectionTitle}>🎤 Toplantı Kayıt</Text>

        <TextInput
          style={styles.input}
          placeholder="Toplantı başlığı *"
          placeholderTextColor={Colors.textMuted}
          value={meetingTitle}
          onChangeText={setMeetingTitle}
          editable={recordingStatus === 'idle'}
        />

        <TextInput
          style={styles.input}
          placeholder="Katılımcılar (virgülle ayırın, e-posta)"
          placeholderTextColor={Colors.textMuted}
          value={attendeesText}
          onChangeText={setAttendees}
          editable={recordingStatus === 'idle'}
        />

        {/* Kayıt kontrolü */}
        <View style={styles.recordingControls}>
          {recordingStatus === 'idle' && (
            <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
              <LinearGradient
                colors={[Colors.error, '#FF9800']}
                style={styles.recordButtonGradient}
              >
                <Ionicons name="mic" size={32} color="#fff" />
              </LinearGradient>
              <Text style={styles.recordButtonText}>Kaydı Başlat</Text>
            </TouchableOpacity>
          )}

          {recordingStatus === 'recording' && (
            <View style={styles.activeRecording}>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Kayıt yapılıyor</Text>
              </View>
              <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
              <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                <Ionicons name="stop-circle" size={56} color={Colors.error} />
              </TouchableOpacity>
              <Text style={styles.stopButtonText}>Durdurmak için dokun</Text>
            </View>
          )}

          {isAnalyzing && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.analyzingText}>Toplantı analiz ediliyor...</Text>
              <Text style={styles.analyzingSubText}>Transkript oluşturuluyor ve özet hazırlanıyor</Text>
            </View>
          )}
        </View>
      </Card>

      {/* Geçmiş toplantılar */}
      <Text style={styles.historyTitle}>📋 Geçmiş Toplantılar</Text>

      {meetings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎙️</Text>
          <Text style={styles.emptyText}>Henüz toplantı kaydı yok</Text>
        </View>
      ) : (
        meetings.map((meeting) => (
          <Card
            key={meeting.id}
            style={styles.meetingCard}
            onPress={() => {
              setSelectedMeeting(meeting);
              setShowDetailModal(true);
            }}
          >
            <View style={styles.meetingHeader}>
              <View style={styles.meetingStatus}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: meeting.status === 'completed' ? Colors.success : Colors.warning }
                ]} />
                <Text style={styles.meetingDate}>
                  {format(new Date(meeting.date), 'd MMM yyyy, HH:mm', { locale: tr })}
                </Text>
              </View>
              <Text style={styles.meetingDuration}>{meeting.duration} dk</Text>
            </View>
            <Text style={styles.meetingTitle}>{meeting.title}</Text>
            {meeting.summary && (
              <Text style={styles.meetingPreview} numberOfLines={2}>{meeting.summary}</Text>
            )}
            {meeting.actionItems && meeting.actionItems.length > 0 && (
              <Text style={styles.actionCount}>
                📌 {meeting.actionItems.length} aksiyon maddesi
              </Text>
            )}
          </Card>
        ))
      )}

      {/* Toplantı detay modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedMeeting && (
          <ScrollView style={styles.detailModal} contentContainerStyle={styles.detailContent}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{selectedMeeting.title}</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.detailDate}>
              {format(new Date(selectedMeeting.date), 'd MMMM yyyy, HH:mm', { locale: tr })} •{' '}
              {selectedMeeting.duration} dakika
            </Text>

            {selectedMeeting.summary && (
              <Section title="📋 Özet" content={selectedMeeting.summary} />
            )}

            {selectedMeeting.decisions && selectedMeeting.decisions.length > 0 && (
              <ListSection title="✅ Kararlar" items={selectedMeeting.decisions} />
            )}

            {selectedMeeting.actionItems && selectedMeeting.actionItems.length > 0 && (
              <ListSection title="📌 Aksiyon Maddeleri" items={selectedMeeting.actionItems} />
            )}

            {selectedMeeting.openQuestions && selectedMeeting.openQuestions.length > 0 && (
              <ListSection title="❓ Açık Sorular" items={selectedMeeting.openQuestions} />
            )}

            {selectedMeeting.attendees && selectedMeeting.attendees.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>👥 Katılımcılar</Text>
                <Text style={styles.sectionContent}>
                  {selectedMeeting.attendees.join('\n')}
                </Text>
              </View>
            )}

            <Button
              title="Özeti E-posta ile Gönder"
              onPress={() => sendSummaryEmail(selectedMeeting)}
              variant="outline"
              style={styles.sendEmailBtn}
              icon={<Ionicons name="mail" size={18} color={Colors.primary} />}
            />
          </ScrollView>
        )}
      </Modal>
    </ScrollView>
  );
}

const Section: React.FC<{ title: string; content: string }> = ({ title, content }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>{title}</Text>
    <Text style={styles.sectionContent}>{content}</Text>
  </View>
);

const ListSection: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>{title}</Text>
    {items.map((item, i) => (
      <View key={i} style={styles.listItem}>
        <Text style={styles.listItemNumber}>{i + 1}.</Text>
        <Text style={styles.listItemText}>{item}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  recordingCard: {
    marginBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  recordingControls: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  recordButton: {
    alignItems: 'center',
    gap: 12,
  },
  recordButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  recordButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  activeRecording: {
    alignItems: 'center',
    gap: 12,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
  },
  recordingText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
  },
  duration: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
  },
  stopButton: {
    padding: 8,
  },
  stopButtonText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  analyzingContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  analyzingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  analyzingSubText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  meetingCard: {
    marginBottom: 12,
    padding: 16,
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  meetingDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  meetingDuration: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  meetingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  meetingPreview: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  actionCount: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  detailModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  detailContent: {
    padding: 24,
    paddingBottom: 40,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    flex: 1,
    lineHeight: 28,
  },
  detailDate: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  listItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  listItemNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 20,
  },
  listItemText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  sendEmailBtn: {
    marginTop: 8,
  },
});
