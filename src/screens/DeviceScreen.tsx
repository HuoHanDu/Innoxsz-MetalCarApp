import React, {useCallback, useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, Alert} from 'react-native';
import {BaseLayout, Card, Button, StatusBadge} from '../components';
import {colors, spacing, borderRadius, typography} from '../theme';
import BleService from '../services/BleService';
import {BLE_CONFIG} from '../constants';
import {
  useDeviceStore,
  selectConnectionState,
  selectConnectedDeviceId,
  selectConnectedDeviceName,
  selectScannedDevices,
  selectIsScanning,
} from '../stores';

interface ScannedDevice {
  id: string;
  name: string | null;
  rssi: number | null;
}

const DeviceScreen: React.FC = () => {
  // 从 Zustand store 读取状态（使用原始值选择器避免对象重建导致无限循环）
  const connectionState = useDeviceStore(selectConnectionState);
  const connectedDeviceId = useDeviceStore(selectConnectedDeviceId);
  const connectedDeviceName = useDeviceStore(selectConnectedDeviceName);
  const devices = useDeviceStore(selectScannedDevices);
  const scanning = useDeviceStore(selectIsScanning);
  const clearScannedDevices = useDeviceStore(state => state.clearScannedDevices);

  useEffect(() => {
    return () => {
      BleService.stopScan();
    };
  }, []);

  const startScan = useCallback(async () => {
    const hasPermission = await BleService.requestPermissions();
    if (!hasPermission) {
      Alert.alert('权限不足', '请授予蓝牙和位置权限以扫描设备');
      return;
    }

    clearScannedDevices();
    BleService.startScan();

    // 扫描超时后自动停止
    setTimeout(() => {
      BleService.stopScan();
    }, BLE_CONFIG.SCAN_TIMEOUT_MS);
  }, [clearScannedDevices]);

  const stopScan = useCallback(() => {
    BleService.stopScan();
  }, []);

  const connectDevice = useCallback(async (device: ScannedDevice) => {
    BleService.stopScan();
    const success = await BleService.connect(device.id);
    if (!success) {
      Alert.alert('连接失败', '无法连接到设备，请重试');
    }
  }, []);

  const disconnectDevice = useCallback(async () => {
    await BleService.disconnect();
  }, []);

  const renderDevice = ({item}: {item: ScannedDevice}) => {
    const isConnected = item.id === connectedDeviceId;

    return (
      <TouchableOpacity
        style={[styles.deviceItem, isConnected && styles.deviceItemConnected]}
        onPress={() => (isConnected ? disconnectDevice() : connectDevice(item))}
        disabled={connectionState === 'connecting'}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name || '未知设备'}</Text>
          <Text style={styles.deviceId}>{item.id}</Text>
        </View>
        <View style={styles.deviceRight}>
          <Text style={styles.rssi}>{item.rssi} dBm</Text>
          {isConnected ? (
            <StatusBadge status="success" text="已连接" />
          ) : connectionState === 'connecting' ? (
            <StatusBadge status="warning" text="连接中" />
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <BaseLayout>
      <View style={styles.container}>
        <Text style={styles.title}>设备连接</Text>

        {/* 连接状态卡片 */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>蓝牙状态</Text>
            <StatusBadge
              status={connectionState === 'connected' ? 'success' : 'error'}
              text={
                connectionState === 'connected'
                  ? '已连接'
                  : connectionState === 'connecting'
                  ? '连接中'
                  : '未连接'
              }
            />
          </View>
          {connectedDeviceId && (
            <View style={styles.connectedInfo}>
              <Text style={styles.connectedLabel}>已连接设备</Text>
              <Text style={styles.connectedDevice}>
                {connectedDeviceName || connectedDeviceId}
              </Text>
            </View>
          )}
        </Card>

        {/* 扫描控制 */}
        <View style={styles.scanControl}>
          <Button
            title={scanning ? '停止扫描' : '扫描设备'}
            onPress={scanning ? stopScan : startScan}
            variant={scanning ? 'secondary' : 'primary'}
            loading={scanning}
          />
        </View>

        {/* 设备列表 */}
        <Text style={styles.sectionTitle}>
          发现的设备 ({devices.length})
        </Text>

        <FlatList
          data={devices}
          keyExtractor={item => item.id}
          renderItem={renderDevice}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {scanning ? '正在扫描设备...' : '点击扫描按钮查找设备'}
              </Text>
            </View>
          }
        />

        {/* 断开连接按钮 */}
        {connectionState === 'connected' && (
          <Button
            title="断开连接"
            onPress={disconnectDevice}
            variant="danger"
            style={styles.disconnectButton}
          />
        )}
      </View>
    </BaseLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    ...typography.pageTitle,
  },
  statusCard: {
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  connectedInfo: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  connectedLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  connectedDevice: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  scanControl: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceItemConnected: {
    borderColor: colors.success,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  deviceId: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deviceRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  rssi: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  disconnectButton: {
    marginTop: spacing.md,
  },
});

export default DeviceScreen;
