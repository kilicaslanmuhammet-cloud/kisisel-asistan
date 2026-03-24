import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { signOut } from '../../services/firebase/auth';
import { updateUserPreferences } from '../../services/firebase/firestore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';

export default function SettingsScreen() {
  const { user, setUser, logout } = useAuthStore();

  const preferences = user?.preferences;
  const [gmailEnabled, setGmailEnabled] = useState(preferences?.integrations?.gmail || false);
  const [outlookEnabled, setOutlookEnabled] = useState(preferences?.integrations?.outlook || false);
  const [calendarEnabled, setCalendarEnabled] = useState(preferences?.integrations?.googleCalendar || false);
  const [telegramEnabled, setTelegramEnabled] = useState(preferences?.integrations?.telegram || false);
  const [morningBriefing, setMorningBriefing] = useState(preferences?.notifications?.morningBriefing ?? true);
  const [taskReminders, setTaskReminders] = useState(preferences?.notifications?.taskReminders ?? true);
  const [weeklyReport, setWeeklyReport] = useState(preferences?.notifications?.weeklyReport ?? true);
  const [briefingTime, setBriefingTime] = useState(preferences?.notifications?.briefingTime || '07:00');
  const [workStart, setWorkStart] = useState(preferences?.workStartTime || '09:00');
  const [workEnd, setWorkEnd] = useState(preferences?.workEndTime || '18:00');

  const handleSavePreferences = async () => {
    if (!user) return;
    try {
      const updatedPrefs = {
        workStartTime: workStart,
        workEndTime: workEnd,
        notifications: {
          morningBriefing,
          taskReminders,
          weeklyReport,
          briefingTime,
        },
        integrations: {
          gmail: gmailEnabled,
          outlook: outlookEnabled,
          googleCalendar: calendarEnabled,
          telegram: telegramEnabled,
        },
      };
      await updateUserPreferences(user.uid, updatedPrefs);
      setUser({ ...user, preferences: { ...user.preferences, ...updatedPrefs } as any });
      Alert.alert('Başarılı', 'Ayarlar kaydedildi');
    } catch {
      Alert.alert('Hata', 'Ayarlar kaydedilemedi');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Kullanıcı profili */}
      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.displayName?.charAt(0) || '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.displayName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>
      </Card>

      {/* Çalışma saatleri */}
      <SettingsSection title="⏰ Çalışma Saatleri">
        <SettingRow label="Başlangıç">
          <TextInput
            style={styles.timeInput}
            value={workStart}
            onChangeText={setWorkStart}
            placeholder="09:00"
            keyboardType="numeric"
          />
        </SettingRow>
        <SettingRow label="Bitiş">
          <TextInput
            style={styles.timeInput}
            value={workEnd}
            onChangeText={setWorkEnd}
            placeholder="18:00"
            keyboardType="numeric"
          />
        </SettingRow>
      </SettingsSection>

      {/* Bildirimler */}
      <SettingsSection title="🔔 Bildirimler">
        <SettingRow label="Sabah Brifing">
          <Switch
            value={morningBriefing}
            onValueChange={setMorningBriefing}
            trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
            thumbColor={morningBriefing ? Colors.primary : Colors.textMuted}
          />
        </SettingRow>
        {morningBriefing && (
          <SettingRow label="Brifing Saati">
            <TextInput
              style={styles.timeInput}
              value={briefingTime}
              onChangeText={setBriefingTime}
              placeholder="07:00"
              keyboardType="numeric"
            />
          </SettingRow>
        )}
        <SettingRow label="Görev Hatırlatıcıları">
          <Switch
            value={taskReminders}
            onValueChange={setTaskReminders}
            trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
            thumbColor={taskReminders ? Colors.primary : Colors.textMuted}
          />
        </SettingRow>
        <SettingRow label="Haftalık Rapor">
          <Switch
            value={weeklyReport}
            onValueChange={setWeeklyReport}
            trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
            thumbColor={weeklyReport ? Colors.primary : Colors.textMuted}
          />
        </SettingRow>
      </SettingsSection>

      {/* Entegrasyonlar */}
      <SettingsSection title="🔗 Entegrasyonlar">
        <SettingRow
          label="Gmail"
          subtitle="E-postalarınızı çekin ve analiz edin"
          icon="mail"
          iconColor="#EA4335"
        >
          <Switch
            value={gmailEnabled}
            onValueChange={setGmailEnabled}
            trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
            thumbColor={gmailEnabled ? Colors.primary : Colors.textMuted}
          />
        </SettingRow>
        <SettingRow
          label="Outlook"
          subtitle="Microsoft e-postalarınızı entegre edin"
          icon="mail-outline"
          iconColor="#0078D4"
        >
          <Switch
            value={outlookEnabled}
            onValueChange={setOutlookEnabled}
            trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
            thumbColor={outlookEnabled ? Colors.primary : Colors.textMuted}
          />
        </SettingRow>
        <SettingRow
          label="Google Calendar"
          subtitle="Takvim etkinliklerinizi senkronize edin"
          icon="calendar"
          iconColor="#34A853"
        >
          <Switch
            value={calendarEnabled}
            onValueChange={setCalendarEnabled}
            trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
            thumbColor={calendarEnabled ? Colors.primary : Colors.textMuted}
          />
        </SettingRow>
        <SettingRow
          label="Telegram Bot"
          subtitle="Telegram bildirimlerini etkinleştirin"
          icon="send"
          iconColor="#2AABEE"
        >
          <Switch
            value={telegramEnabled}
            onValueChange={setTelegramEnabled}
            trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
            thumbColor={telegramEnabled ? Colors.primary : Colors.textMuted}
          />
        </SettingRow>
      </SettingsSection>

      {/* Uygulama hakkında */}
      <SettingsSection title="ℹ️ Uygulama Hakkında">
        <SettingRow label="Versiyon">
          <Text style={styles.valueText}>1.0.0</Text>
        </SettingRow>
        <SettingRow label="Model">
          <Text style={styles.valueText}>Claude Opus 4.6</Text>
        </SettingRow>
      </SettingsSection>

      {/* Kaydet butonu */}
      <Button
        title="Ayarları Kaydet"
        onPress={handleSavePreferences}
        style={styles.saveButton}
      />

      {/* Çıkış */}
      <Button
        title="Hesaptan Çıkış Yap"
        onPress={handleSignOut}
        variant="danger"
        style={styles.signOutButton}
      />
    </ScrollView>
  );
}

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Card style={styles.sectionCard}>{children}</Card>
  </View>
);

const SettingRow: React.FC<{
  label: string;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  children: React.ReactNode;
}> = ({ label, subtitle, icon, iconColor, children }) => (
  <View style={styles.settingRow}>
    {icon && (
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
    )}
    <View style={styles.settingLabel}>
      <Text style={styles.settingLabelText}>{label}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    <View style={styles.settingControl}>{children}</View>
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
  profileCard: {
    marginBottom: 24,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
  },
  settingLabelText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  settingControl: {
    alignItems: 'flex-end',
  },
  timeInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    color: Colors.text,
    minWidth: 70,
    textAlign: 'center',
  },
  valueText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  saveButton: {
    marginBottom: 12,
  },
  signOutButton: {
    marginBottom: 24,
  },
});
