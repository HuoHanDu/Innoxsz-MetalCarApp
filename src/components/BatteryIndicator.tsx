import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, spacing} from '../theme';

interface BatteryIndicatorProps {
  level: number; // 0-100
  label?: string;
  charging?: boolean;
}

export const BatteryIndicator: React.FC<BatteryIndicatorProps> = ({
  level,
  label,
  charging = false,
}) => {
  const getColor = () => {
    if (level <= 20) return colors.error;
    if (level <= 40) return colors.warning;
    return colors.success;
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.batteryContainer}>
        <View style={styles.battery}>
          <View
            style={[
              styles.batteryLevel,
              {
                width: `${Math.min(level, 100)}%`,
                backgroundColor: getColor(),
              },
            ]}
          />
        </View>
        <View style={styles.batteryTip} />
      </View>
      <Text style={styles.levelText}>
        {level}%{charging ? ' ⚡' : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  battery: {
    width: 32,
    height: 16,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    borderRadius: 3,
    padding: 2,
    overflow: 'hidden',
  },
  batteryLevel: {
    height: '100%',
    borderRadius: 1,
  },
  batteryTip: {
    width: 3,
    height: 8,
    backgroundColor: colors.textSecondary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    marginLeft: 1,
  },
  levelText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
    minWidth: 35,
  },
});

export default BatteryIndicator;
