import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {colors, borderRadius, spacing} from '../theme';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  style,
  padding = true,
}) => {
  return (
    <View style={[styles.card, padding && styles.padding, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padding: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
});

export default Card;
