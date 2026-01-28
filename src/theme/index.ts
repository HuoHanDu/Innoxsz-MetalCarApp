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

export const typography = {
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
};

export default {
  colors,
  spacing,
  borderRadius,
  typography,
};
