import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, borderRadius, spacing} from '../theme';

type StatusType = 'success' | 'warning' | 'error' | 'info';

interface StatusBadgeProps {
  status: StatusType;
  text: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({status, text}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      case 'info':
      default:
        return colors.primary;
    }
  };

  const statusColor = getStatusColor();

  return (
    <View style={[styles.badge, {backgroundColor: `${statusColor}20`}]}>
      <View style={[styles.dot, {backgroundColor: statusColor}]} />
      <Text style={[styles.text, {color: statusColor}]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default StatusBadge;
