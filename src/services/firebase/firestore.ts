import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { getFirebaseDB } from './config';
import { User, Task, Meeting, DailyPlan, WeeklySummary, ChatMessage } from '../../types';

// Koleksiyon adları
const COLLECTIONS = {
  users: 'users',
  tasks: 'tasks',
  meetings: 'meetings',
  dailyPlans: 'dailyPlans',
  weeklySummaries: 'weeklySummaries',
  chatHistory: 'chatHistory',
  habits: 'habits',
};

// Kullanıcı işlemleri
export const createUserProfile = async (user: Omit<User, 'preferences'>) => {
  const db = getFirebaseDB();
  await setDoc(doc(db, COLLECTIONS.users, user.uid), {
    ...user,
    createdAt: serverTimestamp(),
    preferences: {
      workStartTime: '09:00',
      workEndTime: '18:00',
      categories: ['aile', 'is', 'sosyal', 'notlar'],
      notifications: {
        morningBriefing: true,
        taskReminders: true,
        weeklyReport: true,
        briefingTime: '07:00',
      },
      integrations: {
        gmail: false,
        outlook: false,
        googleCalendar: false,
        telegram: false,
      },
    },
  });
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  const db = getFirebaseDB();
  const docRef = doc(db, COLLECTIONS.users, uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as User;
  }
  return null;
};

export const updateUserPreferences = async (uid: string, preferences: Partial<User['preferences']>) => {
  const db = getFirebaseDB();
  await updateDoc(doc(db, COLLECTIONS.users, uid), {
    preferences: preferences,
    updatedAt: serverTimestamp(),
  });
};

// Görev işlemleri
export const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
  const db = getFirebaseDB();
  const docRef = await addDoc(collection(db, COLLECTIONS.tasks), {
    ...task,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getUserTasks = async (userId: string, constraints: QueryConstraint[] = []) => {
  const db = getFirebaseDB();
  const q = query(
    collection(db, COLLECTIONS.tasks),
    where('userId', '==', userId),
    ...constraints,
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate(),
    updatedAt: d.data().updatedAt?.toDate(),
    dueDate: d.data().dueDate?.toDate(),
    completedAt: d.data().completedAt?.toDate(),
  })) as Task[];
};

export const updateTask = async (taskId: string, updates: Partial<Task>) => {
  const db = getFirebaseDB();
  await updateDoc(doc(db, COLLECTIONS.tasks, taskId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteTask = async (taskId: string) => {
  const db = getFirebaseDB();
  await deleteDoc(doc(db, COLLECTIONS.tasks, taskId));
};

export const subscribeToTasks = (
  userId: string,
  callback: (tasks: Task[]) => void,
  constraints: QueryConstraint[] = []
) => {
  const db = getFirebaseDB();
  const q = query(
    collection(db, COLLECTIONS.tasks),
    where('userId', '==', userId),
    ...constraints,
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate(),
      updatedAt: d.data().updatedAt?.toDate(),
      dueDate: d.data().dueDate?.toDate(),
      completedAt: d.data().completedAt?.toDate(),
    })) as Task[];
    callback(tasks);
  });
};

// Toplantı işlemleri
export const createMeeting = async (meeting: Omit<Meeting, 'id' | 'createdAt'>) => {
  const db = getFirebaseDB();
  const docRef = await addDoc(collection(db, COLLECTIONS.meetings), {
    ...meeting,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateMeeting = async (meetingId: string, updates: Partial<Meeting>) => {
  const db = getFirebaseDB();
  await updateDoc(doc(db, COLLECTIONS.meetings, meetingId), updates);
};

export const getUserMeetings = async (userId: string) => {
  const db = getFirebaseDB();
  const q = query(
    collection(db, COLLECTIONS.meetings),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    date: d.data().date?.toDate(),
    createdAt: d.data().createdAt?.toDate(),
  })) as Meeting[];
};

// Sohbet geçmişi
export const saveChatMessage = async (userId: string, message: Omit<ChatMessage, 'id'>) => {
  const db = getFirebaseDB();
  const docRef = await addDoc(
    collection(db, COLLECTIONS.chatHistory, userId, 'messages'),
    {
      ...message,
      timestamp: serverTimestamp(),
    }
  );
  return docRef.id;
};

export const getChatHistory = async (userId: string, messageLimit = 50) => {
  const db = getFirebaseDB();
  const q = query(
    collection(db, COLLECTIONS.chatHistory, userId, 'messages'),
    orderBy('timestamp', 'desc'),
    limit(messageLimit)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate(),
    }))
    .reverse() as ChatMessage[];
};

// Alışkanlık takibi
export const recordHabit = async (userId: string, habit: {
  type: string;
  data: Record<string, any>;
  timestamp: Date;
}) => {
  const db = getFirebaseDB();
  await addDoc(collection(db, COLLECTIONS.habits, userId, 'records'), {
    ...habit,
    timestamp: serverTimestamp(),
  });
};

export const getHabits = async (userId: string, days = 30) => {
  const db = getFirebaseDB();
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const q = query(
    collection(db, COLLECTIONS.habits, userId, 'records'),
    where('timestamp', '>=', Timestamp.fromDate(sinceDate)),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    timestamp: d.data().timestamp?.toDate(),
  }));
};

// Haftalık özet kaydet
export const saveWeeklySummary = async (userId: string, summary: WeeklySummary) => {
  const db = getFirebaseDB();
  const weekKey = summary.weekStart.toISOString().split('T')[0];
  await setDoc(doc(db, COLLECTIONS.weeklySummaries, `${userId}_${weekKey}`), {
    ...summary,
    userId,
    createdAt: serverTimestamp(),
  });
};
