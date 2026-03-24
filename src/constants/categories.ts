export type Category = 'aile' | 'is' | 'sosyal' | 'notlar';

export const Categories = [
  {
    id: 'aile' as Category,
    label: 'Aile',
    icon: 'home',
    color: '#FF6B6B',
    emoji: '👨‍👩‍👧‍👦',
    description: 'Aile görevleri ve etkinlikleri',
  },
  {
    id: 'is' as Category,
    label: 'İş',
    icon: 'briefcase',
    color: '#4A90E2',
    emoji: '💼',
    description: 'İş görevleri ve toplantılar',
  },
  {
    id: 'sosyal' as Category,
    label: 'Sosyal',
    icon: 'people',
    color: '#7B68EE',
    emoji: '🤝',
    description: 'Sosyal etkinlikler ve arkadaşlar',
  },
  {
    id: 'notlar' as Category,
    label: 'Notlar',
    icon: 'document-text',
    color: '#4CAF50',
    emoji: '📝',
    description: 'Kişisel notlar ve fikirler',
  },
];

export const getCategoryById = (id: Category) =>
  Categories.find((c) => c.id === id);
