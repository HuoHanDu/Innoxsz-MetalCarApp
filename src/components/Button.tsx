import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import {colors, borderRadius, spacing} from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'warning';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.surface;
      case 'outline':
        return 'transparent';
      case 'danger':
        return colors.error;
      case 'warning':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textSecondary;
    switch (variant) {
      case 'outline':
        return colors.primary;
      default:
        return colors.textPrimary;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return {paddingVertical: spacing.sm, paddingHorizontal: spacing.md};
      case 'large':
        return {paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl};
      default:
        return {paddingVertical: spacing.md, paddingHorizontal: spacing.lg};
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {backgroundColor: getBackgroundColor()},
        getPadding(),
        variant === 'outline' && styles.outline,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, {color: getTextColor()}, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.medium,
    gap: spacing.sm,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Button;
