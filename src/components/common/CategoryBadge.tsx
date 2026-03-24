import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Category, getCategoryById } from '../../constants/categories';

interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'md';
  onPress?: () => void;
  selected?: boolean;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  size = 'md',
  onPress,
  selected = false,
}) => {
  const cat = getCategoryById(category);
  if (!cat) return null;

  const isSmall = size === 'sm';

  const content = (
    <View
      style={[
        styles.badge,
        isSmall ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: selected ? cat.color : `${cat.color}20` },
        selected && styles.selectedBadge,
      ]}
    >
      <Text style={isSmall ? styles.emojiSm : styles.emojiMd}>{cat.emoji}</Text>
      <Text
        style={[
          styles.label,
          isSmall ? styles.labelSm : styles.labelMd,
          { color: selected ? '#fff' : cat.color },
        ]}
      >
        {cat.label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  selectedBadge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  emojiSm: {
    fontSize: 11,
  },
  emojiMd: {
    fontSize: 13,
  },
  label: {
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 11,
  },
  labelMd: {
    fontSize: 13,
  },
});
