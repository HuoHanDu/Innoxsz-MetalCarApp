import React, {useState, useCallback, useMemo} from 'react';
import {View, Text, StyleSheet, Alert, TouchableOpacity} from 'react-native';
import {BaseLayout, Card, Button, AMapView} from '../components';
import {colors, spacing, typography} from '../theme';
import PathPlanner, {Point} from '../services/PathPlanner';
import BleService from '../services/BleService';
import {useMapKeys} from '../hooks';
import {useDeviceStore, selectCurrentPosition} from '../stores';

type PolygonMode = 'convex' | 'concave';

const FenceScreen: React.FC = () => {
  const {keys: mapKeys} = useMapKeys();
  // 从 store 获取小车当前位置
  const currentPosition = useDeviceStore(selectCurrentPosition);
  const [fencePoints, setFencePoints] = useState<Point[]>([]);
  const [path, setPath] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonMode, setPolygonMode] = useState<PolygonMode>('concave'); // 默认支持凹多边形
  const [pathInfo, setPathInfo] = useState<{
    length: number;
    time: number;
    area: number;
  } | null>(null);

  // 根据模式计算显示用的多边形
  const displayPolygon = useMemo(() => {
    if (fencePoints.length < 3) return undefined;
    // 外围模式使用凸包，精确模式保持用户绘制顺序
    return polygonMode === 'convex' 
      ? PathPlanner.computeConvexHull(fencePoints)
      : fencePoints; // 精确模式：保持原始绘制顺序
  }, [fencePoints, polygonMode]);

  const handleMapClick = useCallback(
    (point: Point) => {
      if (isDrawing) {
        setFencePoints(prev => [...prev, point]);
      }
    },
    [isDrawing],
  );

  const startDrawing = useCallback(() => {
    setFencePoints([]);
    setPath([]);
    setPathInfo(null);
    setIsDrawing(true);
  }, []);

  const finishDrawing = useCallback(() => {
    setIsDrawing(false);
    if (fencePoints.length < 3) {
      Alert.alert('提示', '请至少绘制3个点形成围栏区域');
      return;
    }
  }, [fencePoints]);

  const generatePath = useCallback(() => {
    if (fencePoints.length < 3) {
      Alert.alert('提示', '请先绘制围栏区域');
      return;
    }

    // 根据模式生成路径
    const useConvexHull = polygonMode === 'convex';
    const generatedPath = PathPlanner.generateZigzagPath(fencePoints, useConvexHull);
    setPath(generatedPath);

    const length = PathPlanner.calculatePathLength(generatedPath);
    const time = PathPlanner.estimateTime(length);
    
    // 面积也根据模式计算：外围模式用凸包，精确模式用原始顺序
    const areaPolygon = useConvexHull 
      ? PathPlanner.computeConvexHull(fencePoints)
      : fencePoints;
    const area = PathPlanner.calculatePolygonArea(areaPolygon);

    setPathInfo({
      length: Math.round(length),
      time: Math.round(time * 10) / 10,
      area: Math.round(area),
    });
  }, [fencePoints, polygonMode]);

  const sendPathToDevice = useCallback(async () => {
    if (path.length === 0) {
      Alert.alert('提示', '请先生成路径');
      return;
    }

    if (BleService.getConnectionState() !== 'connected') {
      Alert.alert('提示', '请先连接设备');
      return;
    }

    const success = await BleService.sendPath(path);
    if (success) {
      Alert.alert('成功', '路径已下发到设备');
    } else {
      Alert.alert('失败', '路径下发失败，请重试');
    }
  }, [path]);

  const clearAll = useCallback(() => {
    setFencePoints([]);
    setPath([]);
    setPathInfo(null);
    setIsDrawing(false);
  }, []);

  const undoLastPoint = useCallback(() => {
    setFencePoints(prev => prev.slice(0, -1));
  }, []);

  return (
    <BaseLayout>
      <View style={styles.container}>
        <Text style={styles.title}>区域规划</Text>

        {/* 模式切换 */}
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeBtn, polygonMode === 'concave' && styles.modeBtnActive]}
            onPress={() => setPolygonMode('concave')}
          >
            <Text style={[styles.modeBtnText, polygonMode === 'concave' && styles.modeBtnTextActive]}>
              精确模式
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, polygonMode === 'convex' && styles.modeBtnActive]}
            onPress={() => setPolygonMode('convex')}
          >
            <Text style={[styles.modeBtnText, polygonMode === 'convex' && styles.modeBtnTextActive]}>
              外围模式
            </Text>
          </TouchableOpacity>
        </View>

        {/* 地图 */}
        <Card style={styles.mapCard} padding={false}>
          <AMapView
            style={styles.map}
            apiKey={mapKeys.apiKey}
            securityKey={mapKeys.securityKey}
            center={currentPosition || undefined}
            polygon={displayPolygon}
            polyline={path.length > 0 ? path : undefined}
            onMapClick={handleMapClick}
            markers={[
              // 小车位置标记
              ...(currentPosition
                ? [{position: currentPosition, title: '小车位置'}]
                : []),
              // 围栏顶点标记
              ...fencePoints.map((p, i) => ({
                position: p,
                title: `点 ${i + 1}`,
              })),
            ]}
          />
        </Card>

        {/* 状态提示 */}
        <Card style={styles.infoCard}>
          {isDrawing ? (
            <View>
              <Text style={styles.infoText}>
                点击地图添加围栏顶点（已添加 {fencePoints.length} 个点）
              </Text>
              <Text style={styles.infoHint}>
                {polygonMode === 'concave' 
                  ? '精确模式：请按顺时针或逆时针顺序依次点击边界点' 
                  : '外围模式：自动生成最大外围区域'}
              </Text>
            </View>
          ) : pathInfo ? (
            <View style={styles.pathInfoRow}>
              <View style={styles.pathInfoItem}>
                <Text style={styles.pathInfoLabel}>路径长度</Text>
                <Text style={styles.pathInfoValue}>{pathInfo.length} m</Text>
              </View>
              <View style={styles.pathInfoItem}>
                <Text style={styles.pathInfoLabel}>预计耗时</Text>
                <Text style={styles.pathInfoValue}>{pathInfo.time} min</Text>
              </View>
              <View style={styles.pathInfoItem}>
                <Text style={styles.pathInfoLabel}>覆盖面积</Text>
                <Text style={styles.pathInfoValue}>{pathInfo.area} m²</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.infoText}>点击"开始绘制"在地图上画出探测区域</Text>
          )}
        </Card>

        {/* 操作按钮 */}
        <View style={styles.buttonRow}>
          {isDrawing ? (
            <>
              <Button
                title="撤销"
                onPress={undoLastPoint}
                variant="secondary"
                style={styles.button}
                disabled={fencePoints.length === 0}
              />
              <Button
                title="完成绘制"
                onPress={finishDrawing}
                style={styles.button}
              />
            </>
          ) : (
            <>
              <Button
                title="开始绘制"
                onPress={startDrawing}
                variant="secondary"
                style={styles.button}
              />
              <Button
                title="生成路径"
                onPress={generatePath}
                style={styles.button}
                disabled={fencePoints.length < 3}
              />
            </>
          )}
        </View>

        <View style={styles.buttonRow}>
          <Button
            title="清除全部"
            onPress={clearAll}
            variant="outline"
            style={styles.button}
          />
          <Button
            title="下发路径"
            onPress={sendPathToDevice}
            style={styles.button}
            disabled={path.length === 0}
          />
        </View>
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
    marginBottom: spacing.md,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 4,
    marginBottom: spacing.md,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modeBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  mapCard: {
    flex: 1,
    marginBottom: spacing.lg,
    minHeight: 300,
  },
  map: {
    flex: 1,
    borderRadius: 16,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.7,
  },
  pathInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pathInfoItem: {
    alignItems: 'center',
  },
  pathInfoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pathInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  button: {
    flex: 1,
  },
});

export default FenceScreen;
