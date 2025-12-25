import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Device, State } from 'react-native-ble-plx';
import BleService from '../services/BleService';

export default function DeviceScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [bleState, setBleState] = useState<State>(State.Unknown);
  const [receivedData, setReceivedData] = useState<string[]>([]);

  useEffect(() => {
    initBluetooth();
    return () => {
      BleService.stopScan();
    };
  }, []);

  const initBluetooth = async () => {
    const hasPermission = await BleService.requestPermissions();
    if (!hasPermission) {
      Alert.alert('权限不足', '请授予蓝牙和定位权限');
      return;
    }

    const state = await BleService.checkBluetoothState();
    setBleState(state);

    if (state !== State.PoweredOn) {
      Alert.alert('蓝牙未开启', '请打开蓝牙后重试');
    }
  };

  const startScan = () => {
    if (bleState !== State.PoweredOn) {
      Alert.alert('蓝牙未开启', '请先打开蓝牙');
      return;
    }

    setDevices([]);
    setIsScanning(true);

    BleService.scanDevices(
      (device) => {
        setDevices((prev) => {
          if (prev.find((d) => d.id === device.id)) {
            return prev;
          }
          return [...prev, device];
        });
      },
      (error) => {
        console.error('扫描错误:', error);
        setIsScanning(false);
      }
    );

    setTimeout(() => {
      BleService.stopScan();
      setIsScanning(false);
    }, 10000);
  };

  const stopScan = () => {
    BleService.stopScan();
    setIsScanning(false);
  };

  const connectToDevice = async (device: Device) => {
	try {
		stopScan();
		Alert.alert('连接中', `正在连接 ${device.name}...`);
		
		// 设置断线回调
		BleService.setOnDisconnect(() => {
		setConnectedDevice(null);
		setReceivedData([]);
		Alert.alert('连接断开', '设备连接已断开，请重新连接');
		});
		
		const connected = await BleService.connectToDevice(device.id);
		setConnectedDevice(connected);
		startListening();
		
		Alert.alert('连接成功', `已连接到 ${device.name}`);
	} catch (error) {
		console.error('连接失败:', error);
		Alert.alert('连接失败', '请重试');
	}
	};

  // 监听接收数据
  const startListening = () => {
    try {
      BleService.onDataReceived((data) => {
        const timestamp = new Date().toLocaleTimeString();
        setReceivedData((prev) => [`[${timestamp}] ${data}`, ...prev.slice(0, 19)]);
      });
    } catch (error) {
      console.error('监听失败:', error);
    }
  };

  const disconnect = async () => {
    try {
      await BleService.disconnect();
      setConnectedDevice(null);
      setReceivedData([]);
      Alert.alert('已断开', '设备连接已断开');
    } catch (error) {
      console.error('断开失败:', error);
    }
  };

  // 发送测试指令
  const sendTestCommand = async (cmd: string) => {
    try {
      await BleService.sendCommand(cmd);
      Alert.alert('发送成功', `已发送: ${cmd}`);
    } catch (e) {
      Alert.alert('发送失败', String(e));
    }
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connectToDevice(item)}
    >
      <Text style={styles.deviceName}>{item.name || '未知设备'}</Text>
      <Text style={styles.deviceId}>{item.id}</Text>
      <Text style={styles.deviceRssi}>信号: {item.rssi} dBm</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 连接状态 */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>当前状态</Text>
        {connectedDevice ? (
          <>
            <Text style={styles.connectedText}>✅ 已连接</Text>
            <Text style={styles.deviceInfo}>{connectedDevice.name}</Text>
            
            {/* 控制按钮 */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={[styles.cmdBtn, { backgroundColor: '#4ade80' }]}
                onPress={() => sendTestCommand('START')}
              >
                <Text style={styles.cmdBtnText}>START</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.cmdBtn, { backgroundColor: '#facc15' }]}
                onPress={() => sendTestCommand('PAUSE')}
              >
                <Text style={styles.cmdBtnText}>PAUSE</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.cmdBtn, { backgroundColor: '#f87171' }]}
                onPress={() => sendTestCommand('STOP')}
              >
                <Text style={styles.cmdBtnText}>STOP</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.disconnectBtn} onPress={disconnect}>
              <Text style={styles.disconnectText}>断开连接</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.disconnectedText}>❌ 未连接</Text>
        )}
      </View>

      {/* 接收数据显示 */}
      {connectedDevice && (
        <View style={styles.dataCard}>
          <Text style={styles.dataTitle}>📥 接收数据</Text>
          <ScrollView style={styles.dataScroll}>
            {receivedData.length > 0 ? (
              receivedData.map((item, index) => (
                <Text key={index} style={styles.dataItem}>{item}</Text>
              ))
            ) : (
              <Text style={styles.dataEmpty}>等待数据...</Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* 扫描控制 */}
      {!connectedDevice && (
        <>
          <View style={styles.scanSection}>
            <TouchableOpacity
              style={[styles.scanBtn, isScanning && styles.scanningBtn]}
              onPress={isScanning ? stopScan : startScan}
            >
              {isScanning ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.scanBtnText}>扫描中...</Text>
                </>
              ) : (
                <Text style={styles.scanBtnText}>🔍 扫描设备</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 设备列表 */}
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>发现的设备 ({devices.length})</Text>
            <FlatList
              data={devices}
              keyExtractor={(item) => item.id}
              renderItem={renderDevice}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {isScanning ? '正在搜索...' : '暂无设备，点击扫描'}
                </Text>
              }
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  statusCard: {
    backgroundColor: '#16213e',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusLabel: { color: '#888', fontSize: 14 },
  connectedText: { color: '#4ade80', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  disconnectedText: { color: '#f87171', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  deviceInfo: { color: '#fff', fontSize: 16, marginTop: 4 },
  buttonGroup: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  cmdBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cmdBtnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 12 },
  disconnectBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#f87171',
    borderRadius: 8,
  },
  disconnectText: { color: '#fff', fontWeight: 'bold' },
  dataCard: {
    backgroundColor: '#16213e',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    maxHeight: 200,
  },
  dataTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  dataScroll: { maxHeight: 150 },
  dataItem: { color: '#4ade80', fontSize: 12, fontFamily: 'monospace', marginBottom: 4 },
  dataEmpty: { color: '#666', fontSize: 12 },
  scanSection: { paddingHorizontal: 16 },
  scanBtn: {
    backgroundColor: '#4ade80',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  scanningBtn: { backgroundColor: '#facc15' },
  scanBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: 'bold' },
  listSection: { flex: 1, marginTop: 16 },
  listTitle: { color: '#888', fontSize: 14, paddingHorizontal: 16, marginBottom: 8 },
  deviceItem: {
    backgroundColor: '#16213e',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 10,
  },
  deviceName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  deviceId: { color: '#666', fontSize: 12, marginTop: 4 },
  deviceRssi: { color: '#4ade80', fontSize: 12, marginTop: 4 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40 },
});