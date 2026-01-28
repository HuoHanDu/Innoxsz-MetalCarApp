import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, Alert} from 'react-native';
import {BaseLayout, Card, Button, StatusBadge} from '../components';
import {colors, spacing, borderRadius} from '../theme';
import BleService, {BleDevice, ConnectionState} from '../services/BleService';

const DeviceScreen: React.FC = () => {
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = BleService.onStateChange(state => {
      setConnectionState(state);
      if (state === 'disconnected') {
        setConnectedDeviceId(null);
      }
    });

    return () => {
      unsubscribe();
      BleService.stopScan();
    };
  }, []);

  const startScan = useCallback(async () => {
    const hasPermission = await BleService.requestPermissions();
    if (!hasPermission) {
      Alert.alert('权限不足', '请授予蓝牙和位置权限以扫描设备');
      return;
    }

    setDevices([]);
    setScanning(true);

    BleService.startScan(device => {
      setDevices(prev => {
        const exists = prev.find(d => d.id === device.id);
        if (exists) {
          return prev.map(d => (d.id === device.id ? device : d));
        }
        return [...prev, device];
      });
    });

    // 10秒后自动停止扫描
    setTimeout(() => {
      stopScan();
    }, 10000);
  }, []);

  const stopScan = useCallback(() => {
    BleService.stopScan();
    setScanning(false);
  }, []);

  const connectDevice = useCallback(async (device: BleDevice) => {
    stopScan();
    const success = await BleService.connect(device.id);
    if (success) {
      setConnectedDeviceId(device.id);
    } else {
      Alert.alert('连接失败', '无法连接到设备，请重试');
    }
  }, [stopScan]);

  const disconnectDevice = useCallback(async () => {
    await BleService.disconnect();
  }, []);

  const renderDevice = ({item}: {item: BleDevice}) => {
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
                {devices.find(d => d.id === connectedDeviceId)?.name || connectedDeviceId}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
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
