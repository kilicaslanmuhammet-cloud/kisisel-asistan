import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { Mail } from '../../types';
import { Card } from '../../components/common/Card';
import { CategoryBadge } from '../../components/common/CategoryBadge';
import { fetchGmailMessages } from '../../services/gmail/gmail';
import { fetchOutlookMessages } from '../../services/outlook/outlook';
import { summarizeAndCategorizeMails } from '../../services/ai';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function MailScreen() {
  const { user } = useAuthStore();
  const { mails, setMails, loadingStates, setLoading } = useAppStore();

  const [selectedSource, setSelectedSource] = useState<'all' | 'gmail' | 'outlook'>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMails();
  }, []);

  const loadMails = async () => {
    setLoading('mails', true);
    const allMails: Mail[] = [];

    try {
      const gmailMails = await fetchGmailMessages(20);
      allMails.push(...gmailMails);
    } catch {
      // Gmail entegre değil
    }

    try {
      const outlookMails = await fetchOutlookMessages(20);
      allMails.push(...outlookMails);
    } catch {
      // Outlook entegre değil
    }

    setMails(allMails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setLoading('mails', false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMails();
    setRefreshing(false);
  };

  const analyzeWithAI = async () => {
    if (mails.length === 0) return;
    setIsAnalyzing(true);

    try {
      const mailsToAnalyze = mails.slice(0, 10).map((m, i) => ({
        ...m,
        id: i,
        date: format(new Date(m.date), 'd MMM yyyy', { locale: tr }),
      }));

      const results = await summarizeAndCategorizeMails(mailsToAnalyze);

      const updatedMails = mails.map((mail, i) => {
        const analysis = results.find((r) => r.id === i);
        if (analysis) {
          return {
            ...mail,
            summary: analysis.summary,
            category: analysis.category as any,
            importance: analysis.importance as any,
          };
        }
        return mail;
      });

      setMails(updatedMails);
      Alert.alert('Başarılı', 'Mailler AI ile analiz edildi ve kategorilendi');
    } catch {
      Alert.alert('Hata', 'Mail analizi yapılamadı');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredMails = mails.filter(
    (m) => selectedSource === 'all' || m.source === selectedSource
  );

  const unreadCount = filteredMails.filter((m) => !m.isRead).length;

  const IMPORTANCE_CONFIG = {
    high: { color: Colors.error, label: 'Yüksek' },
    normal: { color: Colors.textMuted, label: 'Normal' },
    low: { color: Colors.success, label: 'Düşük' },
  };

  return (
    <View style={styles.container}>
      {/* Başlık bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📧 Mailler</Text>
          <Text style={styles.subtitle}>{unreadCount} okunmamış</Text>
        </View>
        <TouchableOpacity
          style={styles.analyzeBtn}
          onPress={analyzeWithAI}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <View style={styles.analyzeBtnInner}>
              <Ionicons name="sparkles" size={16} color={Colors.primary} />
              <Text style={styles.analyzeBtnText}>AI Analiz</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Kaynak filtresi */}
      <View style={styles.sourceFilter}>
        {(['all', 'gmail', 'outlook'] as const).map((source) => (
          <TouchableOpacity
            key={source}
            style={[styles.sourceChip, selectedSource === source && styles.sourceChipActive]}
            onPress={() => setSelectedSource(source)}
          >
            <Text style={[styles.sourceChipText, selectedSource === source && styles.sourceChipTextActive]}>
              {source === 'all' ? 'Tümü' : source === 'gmail' ? '📧 Gmail' : '📨 Outlook'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mail listesi */}
      {loadingStates['mails'] ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Mailler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMails}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: mail }) => (
            <Card style={[styles.mailCard, !mail.isRead && styles.unreadCard]}>
              <View style={styles.mailHeader}>
                <View style={styles.mailSenderRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {mail.from.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.senderInfo}>
                    <Text style={styles.senderName} numberOfLines={1}>
                      {mail.from.split('<')[0].trim() || mail.from}
                    </Text>
                    <Text style={styles.mailDate}>
                      {format(new Date(mail.date), 'd MMM, HH:mm', { locale: tr })}
                    </Text>
                  </View>
                </View>
                <View style={styles.mailBadges}>
                  {!mail.isRead && <View style={styles.unreadDot} />}
                  {mail.importance && mail.importance !== 'normal' && (
                    <View style={[styles.importanceBadge, { backgroundColor: `${IMPORTANCE_CONFIG[mail.importance].color}20` }]}>
                      <Text style={[styles.importanceText, { color: IMPORTANCE_CONFIG[mail.importance].color }]}>
                        {IMPORTANCE_CONFIG[mail.importance].label}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.sourceTag}>
                    {mail.source === 'gmail' ? '📧' : '📨'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.mailSubject, !mail.isRead && styles.unreadText]} numberOfLines={1}>
                {mail.subject}
              </Text>

              {mail.summary ? (
                <View style={styles.summaryContainer}>
                  <Ionicons name="sparkles" size={12} color={Colors.secondary} />
                  <Text style={styles.summaryText} numberOfLines={2}>{mail.summary}</Text>
                </View>
              ) : (
                <Text style={styles.mailPreview} numberOfLines={2}>
                  {mail.body.replace(/<[^>]*>/g, '').substring(0, 100)}
                </Text>
              )}

              {mail.category && (
                <View style={styles.categoryRow}>
                  <CategoryBadge category={mail.category} size="sm" />
                </View>
              )}
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>Gelen kutusu boş</Text>
              <Text style={styles.emptyText}>Gmail veya Outlook entegrasyonunu ayarlardan yapılandırın</Text>
            </View>
          }
        />
      )}
    </View>
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  analyzeBtn: {
    backgroundColor: `${Colors.primary}15`,
    borderRadius: 12,
    padding: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  analyzeBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  analyzeBtnText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  sourceFilter: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.surface,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sourceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceVariant,
  },
  sourceChipActive: {
    backgroundColor: Colors.primary,
  },
  sourceChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sourceChipTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  mailCard: {
    marginBottom: 10,
    padding: 14,
    gap: 8,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  mailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mailSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  mailDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  mailBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  importanceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  importanceText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sourceTag: {
    fontSize: 14,
  },
  mailSubject: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  unreadText: {
    color: Colors.text,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: `${Colors.secondary}10`,
    borderRadius: 8,
    padding: 8,
  },
  summaryText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  mailPreview: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  categoryRow: {
    flexDirection: 'row',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
