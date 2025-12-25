import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AMapView from '../components/AMapView';

const AMAP_KEY = '021dcbf83c13894c8bd8d4698635b61a';  // 替换成你的
const AMAP_SECURITY_CODE = 'a2fa71f756b52e806da0137436755372';

export default function HomeScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const [carPosition, setCarPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // 模拟小车移动（后续接蓝牙数据）
  const simulateCarMove = () => {
    setCarPosition({
      lat: 39.9042 + Math.random() * 0.01,
      lng: 116.4074 + Math.random() * 0.01,
    });
  };

  return (
    <View style={styles.container}>
      {/* 地图 */}
      <AMapView
        apiKey={AMAP_KEY}
		securityCode={AMAP_SECURITY_CODE}
        center= {{lat: 39.9042, lng: 116.4074 }}
        zoom={16}
        carPosition={carPosition}
        onMapReady={() => setMapReady(true)}
      />

      {/* 地图加载状态 */}
      {!mapReady && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>地图加载中...</Text>
        </View>
      )}

      {/* 底部控制栏 */}
      <View style={styles.controlBar}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isConnected ? styles.connected : styles.disconnected]} />
          <Text style={styles.statusText}>
            {isConnected ? '已连接' : '未连接'}
          </Text>
          
          {/* 测试按钮 */}
          <TouchableOpacity style={styles.testBtn} onPress={simulateCarMove}>
            <Text style={styles.testBtnText}>模拟移动</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.startButton]}>
            <Text style={styles.buttonText}>▶ 开始</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.pauseButton]}>
            <Text style={styles.buttonText}>⏸ 暂停</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.stopButton]}>
            <Text style={styles.buttonText}>⏹ 停止</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: '#fff', fontSize: 16 },
  controlBar: {
    backgroundColor: '#16213e',
    padding: 16,
    paddingBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  connected: { backgroundColor: '#4ade80' },
  disconnected: { backgroundColor: '#f87171' },
  statusText: { color: '#fff', fontSize: 14, flex: 1 },
  testBtn: {
    backgroundColor: '#4ade80',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  testBtnText: { color: '#1a1a2e', fontSize: 12, fontWeight: 'bold' },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  startButton: { backgroundColor: '#4ade80' },
  pauseButton: { backgroundColor: '#facc15' },
  stopButton: { backgroundColor: '#f87171' },
  buttonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 14,
  },
});