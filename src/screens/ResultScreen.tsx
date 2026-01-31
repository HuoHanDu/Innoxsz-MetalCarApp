import React, {useState, useMemo} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import {BaseLayout, Card, Button, AMapView} from '../components';
import {colors, spacing, borderRadius, typography} from '../theme';
import {useMapKeys} from '../hooks';
import {
  useDeviceStore,
  selectDetectionResults,
  selectCurrentPosition,
  DetectionResult,
} from '../stores';

type ViewMode = 'map' | 'list';

const ResultScreen: React.FC = () => {
  const {keys: mapKeys} = useMapKeys();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  
  // 从 store 获取检测结果和当前位置
  const detections = useDeviceStore(selectDetectionResults);
  const currentPosition = useDeviceStore(selectCurrentPosition);
  const clearDetectionResults = useDeviceStore(state => state.clearDetectionResults);

  // 根据金属类型获取颜色
  const getTypeColor = (metalType?: string) => {
    switch (metalType?.toLowerCase()) {
      case 'gold':
        return '#FFD700';
      case 'iron':
        return colors.error;
      case 'copper':
        return '#B87333';
      default:
        return colors.primary;
    }
  };

  // 根据深度获取标签
  const getDepthLabel = (depth?: number) => {
    if (depth === undefined) return '未知';
    if (depth < 0.3) return '浅层';
    if (depth < 0.8) return '中层';
    return '深层';
  };

  const renderDetectionItem = ({item}: {item: DetectionResult}) => (
    <TouchableOpacity style={styles.detectionItem}>
      <View style={styles.detectionLeft}>
        <View
          style={[
            styles.strengthIndicator,
            {backgroundColor: getTypeColor(item.metalType)},
          ]}
        />
        <View>
          <Text style={styles.detectionCoords}>
            {item.position.lat.toFixed(6)}, {item.position.lng.toFixed(6)}
          </Text>
          <Text style={styles.detectionTime}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </View>
      <View style={styles.detectionRight}>
        <Text
          style={[
            styles.strengthValue,
            {color: getTypeColor(item.metalType)},
          ]}>
          {item.metalType || '未知'}
        </Text>
        <Text style={styles.strengthLabel}>
          {item.depth ? `${item.depth}m · ${getDepthLabel(item.depth)}` : '深度未知'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const mapMarkers = useMemo(() => [
    // 小车位置
    ...(currentPosition
      ? [{position: currentPosition, title: '小车位置'}]
      : []),
    // 检测点
    ...detections.map(d => ({
      position: d.position,
      title: `${d.metalType || '未知'} · ${d.depth ? d.depth + 'm' : ''}`,
    })),
  ], [currentPosition, detections]);

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
            <AMapView
              style={styles.map}
              apiKey={mapKeys.apiKey}
              securityKey={mapKeys.securityKey}
              center={currentPosition || (detections.length > 0 ? detections[0].position : undefined)}
              markers={mapMarkers}
            />
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
                <Text style={styles.statLabel}>铁</Text>
                <Text style={styles.statValue}>
                  {detections.filter(d => d.metalType?.toLowerCase() === 'iron').length}
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statDot, {backgroundColor: '#B87333'}]} />
                <Text style={styles.statLabel}>铜</Text>
                <Text style={styles.statValue}>
                  {detections.filter(d => d.metalType?.toLowerCase() === 'copper').length}
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statDot, {backgroundColor: '#FFD700'}]} />
                <Text style={styles.statLabel}>金</Text>
                <Text style={styles.statValue}>
                  {detections.filter(d => d.metalType?.toLowerCase() === 'gold').length}
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statDot, {backgroundColor: colors.textSecondary}]} />
                <Text style={styles.statLabel}>其他</Text>
                <Text style={styles.statValue}>
                  {detections.filter(d => !['iron', 'copper', 'gold'].includes(d.metalType?.toLowerCase() || '')).length}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* 清除按钮 */}
        {detections.length > 0 && (
          <Button
            title="清除记录"
            onPress={clearDetectionResults}
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
    ...typography.pageTitle,
    marginBottom: 0,
  },
  count: {
    ...typography.hint,
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
