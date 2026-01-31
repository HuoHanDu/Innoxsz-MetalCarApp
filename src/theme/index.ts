// 深色 Dashboard 风格配色方案
export const colors = {
  primary: '#EA7C69',
  background: '#252836',
  card: '#1F1D2B',
  surface: '#2D303E',
  textPrimary: '#FFFFFF',
  textSecondary: '#ABBBC2',
  success: '#50D1AA',
  warning: '#FFB572',
  error: '#FF7CA3',
  border: '#393C49',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const borderRadius = {
  small: 8,    // 输入框/标签
  medium: 12,  // 按钮/小卡片
  large: 16,   // 大卡片
};

// ==================== 排版样式 ====================

export const typography = {
  // 基础样式
  h1: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    color: colors.textSecondary,
  },

  // 页面级样式（含 margin）
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
  },
  valueSmall: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  hint: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    color: colors.textSecondary,
  },
};

// 类型导出
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Typography = typeof typography;

export default {
  colors,
  spacing,
  borderRadius,
  typography,
};
