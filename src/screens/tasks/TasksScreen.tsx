import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { Task } from '../../types';
import { Category, Categories } from '../../constants/categories';
import { CategoryBadge } from '../../components/common/CategoryBadge';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  createTask as createTaskFS,
  updateTask as updateTaskFS,
  deleteTask as deleteTaskFS,
} from '../../services/firebase/firestore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type FilterStatus = 'all' | 'pending' | 'completed';
type SortBy = 'date' | 'priority' | 'category';

export default function TasksScreen({ route }: any) {
  const defaultCategory = route?.params?.category as Category | undefined;
  const { user } = useAuthStore();
  const { tasks, addTask, updateTask, removeTask } = useAppStore();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [filterCategory, setFilterCategory] = useState<Category | null>(defaultCategory || null);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Yeni görev formu
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('notlar');
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium');

  const filteredTasks = tasks
    .filter((t) => {
      if (filterStatus === 'pending') return t.status !== 'completed';
      if (filterStatus === 'completed') return t.status === 'completed';
      return true;
    })
    .filter((t) => !filterCategory || t.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleCreateTask = async () => {
    if (!newTitle.trim() || !user) return;

    try {
      const id = await createTaskFS({
        userId: user.uid,
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        category: newCategory,
        priority: newPriority,
        status: 'pending',
      });

      const newTask: Task = {
        id,
        userId: user.uid,
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        category: newCategory,
        priority: newPriority,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addTask(newTask);
      resetForm();
      setShowModal(false);
    } catch {
      Alert.alert('Hata', 'Görev oluşturulamadı');
    }
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await updateTaskFS(task.id, {
        status: 'completed',
        completedAt: new Date(),
      });
      updateTask(task.id, { status: 'completed', completedAt: new Date() });
    } catch {
      Alert.alert('Hata', 'Görev güncellenemedi');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    Alert.alert('Görevi Sil', 'Bu görevi silmek istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTaskFS(taskId);
            removeTask(taskId);
          } catch {
            Alert.alert('Hata', 'Görev silinemedi');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDesc('');
    setNewCategory('notlar');
    setNewPriority('medium');
    setEditingTask(null);
  };

  const PRIORITY_COLORS = {
    high: Colors.error,
    medium: Colors.warning,
    low: Colors.success,
  };

  const PRIORITY_LABELS = {
    high: 'Yüksek',
    medium: 'Orta',
    low: 'Düşük',
  };

  return (
    <View style={styles.container}>
      {/* Filtreler */}
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {/* Durum filtresi */}
            {(['all', 'pending', 'completed'] as FilterStatus[]).map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                  {status === 'all' ? 'Tümü' : status === 'pending' ? 'Bekleyen' : 'Tamamlanan'}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.filterDivider} />

            {/* Kategori filtresi */}
            <TouchableOpacity
              style={[styles.filterChip, filterCategory === null && styles.filterChipActive]}
              onPress={() => setFilterCategory(null)}
            >
              <Text style={[styles.filterChipText, filterCategory === null && styles.filterChipTextActive]}>
                Tüm Kategoriler
              </Text>
            </TouchableOpacity>
            {Categories.map((cat) => (
              <CategoryBadge
                key={cat.id}
                category={cat.id}
                selected={filterCategory === cat.id}
                onPress={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Görev listesi */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: task }) => (
          <Card style={[styles.taskCard, task.status === 'completed' && styles.completedCard]}>
            <View style={styles.taskHeader}>
              <TouchableOpacity
                style={[styles.checkbox, task.status === 'completed' && styles.checkboxChecked]}
                onPress={() => task.status !== 'completed' && handleCompleteTask(task)}
              >
                {task.status === 'completed' && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </TouchableOpacity>
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, task.status === 'completed' && styles.completedText]}>
                  {task.title}
                </Text>
                {task.description && (
                  <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>
                )}
                <View style={styles.taskMeta}>
                  <CategoryBadge category={task.category} size="sm" />
                  <View style={[styles.priorityBadge, { backgroundColor: `${PRIORITY_COLORS[task.priority]}20` }]}>
                    <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
                    <Text style={[styles.priorityText, { color: PRIORITY_COLORS[task.priority] }]}>
                      {PRIORITY_LABELS[task.priority]}
                    </Text>
                  </View>
                  {task.dueDate && (
                    <Text style={styles.dueDate}>
                      📅 {format(new Date(task.dueDate), 'd MMM', { locale: tr })}
                    </Text>
                  )}
                  {task.source && task.source !== 'manual' && (
                    <Text style={styles.source}>🤖 {task.source}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteTask(task.id)}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyText}>
              {filterStatus === 'completed' ? 'Henüz tamamlanan görev yok' : 'Harika! Tüm görevler tamamlandı'}
            </Text>
          </View>
        }
      />

      {/* Görev ekle butonu */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Görev oluşturma modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Görev</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Görev başlığı *"
              placeholderTextColor={Colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Açıklama (isteğe bağlı)"
              placeholderTextColor={Colors.textMuted}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Kategori</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
              {Categories.map((cat) => (
                <CategoryBadge
                  key={cat.id}
                  category={cat.id}
                  selected={newCategory === cat.id}
                  onPress={() => setNewCategory(cat.id)}
                />
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Öncelik</Text>
            <View style={styles.priorityRow}>
              {(['high', 'medium', 'low'] as Task['priority'][]).map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityOption,
                    { borderColor: PRIORITY_COLORS[priority] },
                    newPriority === priority && { backgroundColor: PRIORITY_COLORS[priority] },
                  ]}
                  onPress={() => setNewPriority(priority)}
                >
                  <Text style={[
                    styles.priorityOptionText,
                    { color: newPriority === priority ? '#fff' : PRIORITY_COLORS[priority] },
                  ]}>
                    {PRIORITY_LABELS[priority]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Görevi Ekle"
              onPress={handleCreateTask}
              disabled={!newTitle.trim()}
              style={styles.createButton}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const PRIORITY_COLORS = {
  high: Colors.error,
  medium: Colors.warning,
  low: Colors.success,
};

const PRIORITY_LABELS = {
  high: 'Yüksek',
  medium: 'Orta',
  low: 'Düşük',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filters: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surfaceVariant,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  taskCard: {
    marginBottom: 10,
    padding: 14,
  },
  completedCard: {
    opacity: 0.6,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  taskContent: {
    flex: 1,
    gap: 6,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  taskDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dueDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  source: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  deleteBtn: {
    padding: 4,
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
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: -4,
  },
  categoryRow: {
    flexGrow: 0,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  createButton: {
    marginTop: 8,
  },
});
