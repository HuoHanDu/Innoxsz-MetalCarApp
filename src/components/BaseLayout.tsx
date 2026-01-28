import React from 'react';
import {View, StyleSheet, StatusBar, ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../theme';

interface BaseLayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
  safeArea?: boolean;
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  style,
  safeArea = true,
}) => {
  const Container = safeArea ? SafeAreaView : View;

  return (
    <Container style={[styles.container, style]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default BaseLayout;
