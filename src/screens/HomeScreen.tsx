import React, {useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {BaseLayout, Card, StatusBadge, BatteryIndicator, ProgressRing, AMapView} from '../components';
import {colors, spacing, typography} from '../theme';
import {
  useDeviceStore,
  useSettingsStore,
  selectConnectionState,
  selectCarBattery,
  selectRemoteBattery,
  selectCurrentPosition,
  selectProgress,
  selectDetectionCount,
  selectAmapKey,
  selectAmapSecurityKey,
} from '../stores';

const HomeScreen: React.FC = () => {
  // 从 Zustand store 读取状态 - 使用原始值选择器避免无限循环
  const connectionState = useDeviceStore(selectConnectionState);
  const carBattery = useDeviceStore(selectCarBattery);
  const remoteBattery = useDeviceStore(selectRemoteBattery);
  const currentPosition = useDeviceStore(selectCurrentPosition);
  const progress = useDeviceStore(selectProgress);
  const detectionCount = useDeviceStore(selectDetectionCount);
  const apiKey = useSettingsStore(selectAmapKey);
  const securityKey = useSettingsStore(selectAmapSecurityKey);

  // 连接状态映射
  const connStatus = useMemo(() => {
    switch (connectionState) {
      case 'connected':
        return {status: 'success' as const, text: '已连接'};
      case 'connecting':
        return {status: 'warning' as const, text: '连接中'};
      default:
        return {status: 'error' as const, text: '未连接'};
    }
  }, [connectionState]);

  return (
    <BaseLayout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 头部状态栏 */}
        <View style={styles.header}>
          <Text style={styles.title}>金属探测小车</Text>
          <StatusBadge status={connStatus.status} text={connStatus.text} />
        </View>

        {/* 地图卡片 */}
        <Card style={styles.mapCard} padding={false}>
          <AMapView
            style={styles.map}
            apiKey={apiKey}
            securityKey={securityKey}
            center={currentPosition || undefined}
            markers={
              currentPosition
                ? [{position: currentPosition, title: '小车位置'}]
                : []
            }
          />
        </Card>

        {/* 状态面板 */}
        <View style={styles.statusRow}>
          {/* 电量卡片 */}
          <Card style={styles.statusCard}>
            <Text style={styles.cardTitle}>设备电量</Text>
            <View style={styles.batteryRow}>
              <BatteryIndicator level={carBattery} label="小车" />
            </View>
            <View style={styles.batteryRow}>
              <BatteryIndicator level={remoteBattery} label="遥控" />
            </View>
          </Card>

          {/* 进度卡片 */}
          <Card style={styles.statusCard}>
            <Text style={styles.cardTitle}>探测进度</Text>
            <View style={styles.progressContainer}>
              <ProgressRing
                progress={progress}
                size={80}
                strokeWidth={8}
                label="完成"
              />
            </View>
          </Card>
        </View>

        {/* 快捷信息 */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>今日探测</Text>
              <Text style={styles.infoValue}>3 次</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>发现目标</Text>
              <Text style={styles.infoValue}>{detectionCount} 个</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>覆盖面积</Text>
              <Text style={styles.infoValue}>256 m²</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </BaseLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.pageTitle,
    marginBottom: 0, // 由 header 控制间距
  },
  mapCard: {
    height: 250,
    marginBottom: spacing.lg,
  },
  map: {
    flex: 1,
    borderRadius: 16,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statusCard: {
    flex: 1,
  },
  cardTitle: {
    ...typography.cardTitle,
  },
  batteryRow: {
    marginBottom: spacing.sm,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    ...typography.label,
  },
  infoValue: {
    ...typography.value,
  },
  infoDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
});

export default HomeScreen;
