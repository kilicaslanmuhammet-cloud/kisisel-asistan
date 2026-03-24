import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../store/authStore';

// Ekranlar
import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import TasksScreen from '../screens/tasks/TasksScreen';
import MailScreen from '../screens/mail/MailScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import MeetingScreen from '../screens/meeting/MeetingScreen';
import DailyPlanScreen from '../screens/daily-plan/DailyPlanScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            Dashboard: focused ? 'home' : 'home-outline',
            Chat: focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline',
            Tasks: focused ? 'checkmark-done-circle' : 'checkmark-done-circle-outline',
            Mail: focused ? 'mail' : 'mail-outline',
            Calendar: focused ? 'calendar' : 'calendar-outline',
          };
          return <Ionicons name={(icons[route.name] || 'circle') as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Ana Sayfa' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'AI Sohbet' }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'Görevler' }} />
      <Tab.Screen name="Mail" component={MailScreen} options={{ title: 'Mail' }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Takvim' }} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Meeting"
            component={MeetingScreen}
            options={{
              headerShown: true,
              title: 'Toplantı Kaydı',
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.text,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="DailyPlan"
            component={DailyPlanScreen}
            options={{
              headerShown: true,
              title: 'Günlük Plan',
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.text,
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: true,
              title: 'Ayarlar',
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.text,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function Navigation() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
