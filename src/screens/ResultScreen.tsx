import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import {BaseLayout, Card, Button, AMapView} from '../components';
import {colors, spacing, borderRadius} from '../theme';
import BleService from '../services/BleService';

interface DetectionPoint {
  id: string;
  lat: number;
  lng: number;
  strength: number;
  timestamp: Date;
}

type ViewMode = 'map' | 'list';

const ResultScreen: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [detections, setDetections] = useState<DetectionPoint[]>([]);

  useEffect(() => {
    // 监听探测数据
    const unsubscribe = BleService.onData(data => {
      if (data.startsWith('DETECT:')) {
        const parts = data.slice(7).split(',');
        if (parts.length >= 3) {
          const newDetection: DetectionPoint = {
            id: Date.now().toString(),
            lat: parseFloat(parts[0]),
            lng: parseFloat(parts[1]),
            strength: parseFloat(parts[2]),
            timestamp: new Date(),
          };
          setDetections(prev => [newDetection, ...prev]);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return colors.error;
    if (strength >= 50) return colors.warning;
    return colors.success;
  };

  const getStrengthLabel = (strength: number) => {
    if (strength >= 80) return '强';
    if (strength >= 50) return '中';
    return '弱';
  };

  const renderDetectionItem = ({item}: {item: DetectionPoint}) => (
    <TouchableOpacity style={styles.detectionItem}>
      <View style={styles.detectionLeft}>
        <View
          style={[
            styles.strengthIndicator,
            {backgroundColor: getStrengthColor(item.strength)},
          ]}
        />
        <View>
          <Text style={styles.detectionCoords}>
            {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
          </Text>
          <Text style={styles.detectionTime}>
            {item.timestamp.toLocaleTimeString()}
          </Text>
        </View>
      </View>
      <View style={styles.detectionRight}>
        <Text
          style={[
            styles.strengthValue,
            {color: getStrengthColor(item.strength)},
          ]}>
          {item.strength}%
        </Text>
        <Text style={styles.strengthLabel}>
          信号{getStrengthLabel(item.strength)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const mapMarkers = detections.map(d => ({
    position: {lat: d.lat, lng: d.lng},
    title: `信号: ${d.strength}%`,
  }));

  return (
    <BaseLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>探测结果</Text>
          <Text style={styles.count}>共 {detections.length} 个</Text>
        </View>

        {/* 视图切换 */}
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'map' && styles.modeButtonActive]}
            onPress={() => setViewMode('map')}>
            <Text
              style={[
                styles.modeButtonText,
                viewMode === 'map' && styles.modeButtonTextActive,
              ]}>
              地图模式
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'list' && styles.modeButtonActive]}
            onPress={() => setViewMode('list')}>
            <Text
              style={[
                styles.modeButtonText,
                viewMode === 'list' && styles.modeButtonTextActive,
              ]}>
              列表模式
            </Text>
          </TouchableOpacity>
        </View>

        {/* 内容区域 */}
        {viewMode === 'map' ? (
          <Card style={styles.mapCard} padding={false}>
            <AMapView style={styles.map} markers={mapMarkers} />
          </Card>
        ) : (
          <FlatList
            data={detections}
            keyExtractor={item => item.id}
            renderItem={renderDetectionItem}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>暂无探测数据</Text>
                <Text style={styles.emptySubtext}>
                  开始探测后，结果将显示在这里
                </Text>
              </View>
            }
          />
        )}

        {/* 统计卡片 */}
        {detections.length > 0 && (
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statDot, {backgroundColor: colors.error}]} />
                <Text style={styles.statLabel}>强信号</Text>
                <Text style={styles.statValue}>
                  {detections.filter(d => d.strength >= 80).length}
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statDot, {backgroundColor: colors.warning}]} />
                <Text style={styles.statLabel}>中信号</Text>
                <Text style={styles.statValue}>
                  {detections.filter(d => d.strength >= 50 && d.strength < 80).length}
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statDot, {backgroundColor: colors.success}]} />
                <Text style={styles.statLabel}>弱信号</Text>
                <Text style={styles.statValue}>
                  {detections.filter(d => d.strength < 50).length}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* 清除按钮 */}
        {detections.length > 0 && (
          <Button
            title="清除记录"
            onPress={() => setDetections([])}
            variant="outline"
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  count: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.medium,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.small,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modeButtonTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  mapCard: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  map: {
    flex: 1,
    borderRadius: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  detectionItem: {
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
  detectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  strengthIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  detectionCoords: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  detectionTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  detectionRight: {
    alignItems: 'flex-end',
  },
  strengthValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  strengthLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsCard: {
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
});

export default ResultScreen;
