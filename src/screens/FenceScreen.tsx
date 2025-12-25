import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AMapView, { AMapViewRef } from '../components/AMapView';
import PathPlanner from '../services/PathPlanner';

const AMAP_KEY = '021dcbf83c13894c8bd8d4698635b61a';  // 替换成你的
const AMAP_SECURITY_CODE = 'a2fa71f756b52e806da0137436755372';


export default function FenceScreen() {
  const mapRef = useRef<AMapViewRef>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [fencePoints, setFencePoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [pathPoints, setPathPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [pathInfo, setPathInfo] = useState<{ length: number; time: number } | null>(null);

  const handleStartDraw = () => {
    setIsDrawing(true);
    setPathPoints([]);
    setPathInfo(null);
    mapRef.current?.startDrawFence();
  };

  const handleUndo = () => {
    mapRef.current?.undoFencePoint();
  };

  const handleClear = () => {
    setIsDrawing(false);
    setPathPoints([]);
    setPathInfo(null);
    mapRef.current?.clearFence();
  };

  const handleComplete = () => {
    if (fencePoints.length < 3) {
      Alert.alert('提示', '至少需要3个点才能形成围栏');
      return;
    }
    setIsDrawing(false);
    mapRef.current?.closeFence();
  };

  // 生成路径
  const handleGeneratePath = () => {
    if (fencePoints.length < 3) {
      Alert.alert('提示', '请先绘制围栏');
      return;
    }

    const path = PathPlanner.generateZigzagPath(fencePoints, {
      gridSize: 2,  // 2米间距
      direction: 'horizontal',
    });

    if (path.length === 0) {
      Alert.alert('提示', '无法生成路径，请检查围栏');
      return;
    }

    setPathPoints(path);
    
    const length = PathPlanner.getPathLength(path);
    const time = PathPlanner.estimateTime(path, 0.5);
    setPathInfo({ length, time });

    // 在地图上显示路径
    mapRef.current?.showPath(path);

    Alert.alert(
      '路径已生成',
      `共 ${path.length} 个点\n总长度: ${length.toFixed(1)} 米\n预计时间: ${Math.ceil(time / 60)} 分钟`
    );
  };

  return (
    <View style={styles.container}>
      <AMapView
        ref={mapRef}
        apiKey={AMAP_KEY}
        securityCode={AMAP_SECURITY_CODE}
        center={{ lat: 39.9042, lng: 116.4074 }}
        zoom={16}
        onFenceUpdate={(points) => setFencePoints(points)}
      />

      {/* 顶部提示 */}
      <View style={styles.tipBar}>
        <Text style={styles.tipText}>
          {isDrawing 
            ? `📍 点击地图添加顶点（已添加 ${fencePoints.length} 个）` 
            : fencePoints.length >= 3
              ? `围栏已完成（${fencePoints.length} 个顶点）`
              : '点击「开始绑制」在地图上画出探测区域'}
        </Text>
        {pathInfo && (
          <Text style={styles.pathInfo}>
            📏 {pathInfo.length.toFixed(1)}米 | ⏱️ 约{Math.ceil(pathInfo.time / 60)}分钟
          </Text>
        )}
      </View>

      {/* 底部控制栏 */}
      <View style={styles.controlBar}>
        {!isDrawing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: '#e94560' }]} 
              onPress={handleStartDraw}
            >
              <Text style={styles.btnText}>✏️ 绘制围栏</Text>
            </TouchableOpacity>
            
            {fencePoints.length >= 3 && (
              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: '#4ade80' }]} 
                onPress={handleGeneratePath}
              >
                <Text style={styles.btnText}>🛤️ 生成路径</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#facc15' }]} onPress={handleUndo}>
              <Text style={styles.btnText}>↩️ 撤销</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#f87171' }]} onPress={handleClear}>
              <Text style={styles.btnText}>🗑️ 清除</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#4ade80' }]} onPress={handleComplete}>
              <Text style={styles.btnText}>✅ 完成</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tipBar: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(22, 33, 62, 0.9)',
    padding: 12,
    borderRadius: 8,
  },
  tipText: { color: '#fff', fontSize: 14, textAlign: 'center' },
  pathInfo: { color: '#4ade80', fontSize: 12, textAlign: 'center', marginTop: 4 },
  controlBar: {
    backgroundColor: '#16213e',
    padding: 16,
    paddingBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 14 },
});