import React, {useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Alert,
} from 'react-native';
import {BaseLayout, Card, Button} from '../components';
import {colors, spacing, borderRadius, typography} from '../theme';
import BleService from '../services/BleService';
import {UI_CONFIG} from '../constants';

const ControlScreen: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [joystickPosition, setJoystickPosition] = useState({x: 0, y: 0});
  const pan = useRef(new Animated.ValueXY()).current;

  const joystickSize = UI_CONFIG.JOYSTICK_SIZE;
  const knobSize = UI_CONFIG.JOYSTICK_KNOB_SIZE;
  const maxDistance = (joystickSize - knobSize) / 2;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const distance = Math.sqrt(
          gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy,
        );

        if (distance <= maxDistance) {
          pan.setValue({x: gestureState.dx, y: gestureState.dy});
          setJoystickPosition({
            x: Math.round((gestureState.dx / maxDistance) * 100),
            y: Math.round((-gestureState.dy / maxDistance) * 100),
          });
        } else {
          const angle = Math.atan2(gestureState.dy, gestureState.dx);
          const x = maxDistance * Math.cos(angle);
          const y = maxDistance * Math.sin(angle);
          pan.setValue({x, y});
          setJoystickPosition({
            x: Math.round((x / maxDistance) * 100),
            y: Math.round((-y / maxDistance) * 100),
          });
        }
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        Animated.spring(pan, {
          toValue: {x: 0, y: 0},
          useNativeDriver: false,
        }).start();
        setJoystickPosition({x: 0, y: 0});
      },
    }),
  ).current;

  const handleStart = useCallback(async () => {
    if (BleService.getConnectionState() !== 'connected') {
      Alert.alert('提示', '请先连接设备');
      return;
    }

    const success = await BleService.sendCommand('START');
    if (success) {
      setIsRunning(true);
    }
  }, []);

  const handlePause = useCallback(async () => {
    const success = await BleService.sendCommand('PAUSE');
    if (success) {
      setIsRunning(false);
    }
  }, []);

  const handleStop = useCallback(async () => {
    const success = await BleService.sendCommand('STOP');
    if (success) {
      setIsRunning(false);
    }
  }, []);

  return (
    <BaseLayout>
      <View style={styles.container}>
        <Text style={styles.title}>手动控制</Text>

        {/* 图传画面（占位） */}
        <Card style={styles.videoCard}>
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoText}>图传画面</Text>
            <Text style={styles.videoSubtext}>视频流将在这里显示</Text>
          </View>
        </Card>

        {/* 控制面板 */}
        <View style={styles.controlPanel}>
          {/* 虚拟摇杆 */}
          <View style={styles.joystickContainer}>
            <Text style={styles.joystickLabel}>方向控制</Text>
            <View style={styles.joystick}>
              <Animated.View
                style={[
                  styles.joystickKnob,
                  {
                    transform: [{translateX: pan.x}, {translateY: pan.y}],
                  },
                ]}
                {...panResponder.panHandlers}
              />
            </View>
            <Text style={styles.joystickValue}>
              X: {joystickPosition.x}% Y: {joystickPosition.y}%
            </Text>
          </View>

          {/* 控制按钮 */}
          <View style={styles.buttonPanel}>
            <Text style={styles.buttonLabel}>任务控制</Text>
            <View style={styles.buttonGrid}>
              <Button
                title={isRunning ? '暂停' : '启动'}
                onPress={isRunning ? handlePause : handleStart}
                variant={isRunning ? 'warning' : 'primary'}
                style={styles.controlButton}
              />
              <Button
                title="停止"
                onPress={handleStop}
                variant="danger"
                style={styles.controlButton}
              />
            </View>
          </View>
        </View>

        {/* 状态指示 */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>运行状态</Text>
              <Text
                style={[
                  styles.statusValue,
                  {color: isRunning ? colors.success : colors.textSecondary},
                ]}>
                {isRunning ? '运行中' : '已停止'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>控制模式</Text>
              <Text style={styles.statusValue}>手动模式</Text>
            </View>
          </View>
        </Card>
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
  videoCard: {
    height: 200,
    marginBottom: spacing.lg,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
  },
  videoText: {
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  videoSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  controlPanel: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  joystickContainer: {
    flex: 1,
    alignItems: 'center',
  },
  joystickLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  joystick: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joystickKnob: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
  },
  joystickValue: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  buttonPanel: {
    flex: 1,
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  buttonGrid: {
    width: '100%',
    gap: spacing.md,
  },
  controlButton: {
    width: '100%',
  },
  statusCard: {
    marginTop: 'auto',
  },
  statusRow: {
    flexDirection: 'row',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default ControlScreen;
