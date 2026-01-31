import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TextInput, ScrollView, Alert, Switch} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BaseLayout, Card, Button} from '../components';
import {colors, spacing, borderRadius, typography} from '../theme';
import PathPlanner from '../services/PathPlanner';
import BleService from '../services/BleService';
import {enableMockBle, disableMockBle, isMockBleAvailable} from '../services/MockBleService';
import {STORAGE_KEYS, DEFAULT_VALUES} from '../constants';

const SettingsScreen: React.FC = () => {
  const [pathSpacing, setPathSpacing] = useState(DEFAULT_VALUES.PATH_SPACING);
  const [serviceUUID, setServiceUUID] = useState(DEFAULT_VALUES.SERVICE_UUID);
  const [characteristicUUID, setCharacteristicUUID] = useState(DEFAULT_VALUES.CHARACTERISTIC_UUID);
  const [amapKey, setAmapKey] = useState('');
  const [amapSecurityKey, setAmapSecurityKey] = useState('');
  const [devMode, setDevMode] = useState(false);

  // 加载保存的设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [
          savedPathSpacing,
          savedServiceUUID,
          savedCharacteristicUUID,
          savedAmapKey,
          savedAmapSecurityKey,
          savedDevMode,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PATH_SPACING),
          AsyncStorage.getItem(STORAGE_KEYS.SERVICE_UUID),
          AsyncStorage.getItem(STORAGE_KEYS.CHARACTERISTIC_UUID),
          AsyncStorage.getItem(STORAGE_KEYS.AMAP_KEY),
          AsyncStorage.getItem(STORAGE_KEYS.AMAP_SECURITY_KEY),
          AsyncStorage.getItem(STORAGE_KEYS.DEV_MODE),
        ]);

        if (savedPathSpacing) setPathSpacing(savedPathSpacing);
        if (savedServiceUUID) setServiceUUID(savedServiceUUID);
        if (savedCharacteristicUUID) setCharacteristicUUID(savedCharacteristicUUID);
        if (savedAmapKey) setAmapKey(savedAmapKey);
        if (savedAmapSecurityKey) setAmapSecurityKey(savedAmapSecurityKey);
        
        // 加载开发模式状态并启用 Mock
        const isDevMode = savedDevMode === 'true';
        setDevMode(isDevMode);
        if (isDevMode && isMockBleAvailable()) {
          enableMockBle();
        }

        // 同步路径规划配置
        if (savedPathSpacing) {
          PathPlanner.setConfig({spacing: parseFloat(savedPathSpacing)});
        }
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    };

    loadSettings();
  }, []);

  const savePathSettings = async () => {
    const spacingValue = parseFloat(pathSpacing);
    if (isNaN(spacingValue) || spacingValue <= 0) {
      Alert.alert('错误', '请输入有效的路径间距');
      return;
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PATH_SPACING, pathSpacing);
      PathPlanner.setConfig({spacing: spacingValue});
      Alert.alert('成功', '路径设置已保存');
    } catch (error) {
      Alert.alert('错误', '保存失败');
    }
  };

  const saveBluetoothSettings = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.SERVICE_UUID, serviceUUID),
        AsyncStorage.setItem(STORAGE_KEYS.CHARACTERISTIC_UUID, characteristicUUID),
      ]);
      // 清除 BleService 的 UUID 缓存，下次连接时将使用新配置
      BleService.clearUUIDCache();
      Alert.alert('成功', '蓝牙设置已保存（需要重新连接设备）');
    } catch (error) {
      Alert.alert('错误', '保存失败');
    }
  };

  const saveMapSettings = async () => {
    if (!amapKey || !amapSecurityKey) {
      Alert.alert('错误', '请填写完整的高德地图配置');
      return;
    }
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.AMAP_KEY, amapKey),
        AsyncStorage.setItem(STORAGE_KEYS.AMAP_SECURITY_KEY, amapSecurityKey),
      ]);
      Alert.alert('成功', '地图设置已保存（需要重启应用）');
    } catch (error) {
      Alert.alert('错误', '保存失败');
    }
  };

  // 切换开发模式
  const toggleDevMode = async (value: boolean) => {
    setDevMode(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DEV_MODE, value.toString());
      if (value) {
        if (isMockBleAvailable()) {
          enableMockBle();
          Alert.alert('开发模式已启用', '现在可以通过 ADB 发送模拟数据');
        } else {
          Alert.alert('提示', 'Mock BLE 模块仅在 Android 平台可用');
        }
      } else {
        disableMockBle();
        Alert.alert('开发模式已关闭', '已停止接收模拟数据');
      }
    } catch (error) {
      Alert.alert('错误', '保存设置失败');
    }
  };

  return (
    <BaseLayout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>设置</Text>

        {/* 路径规划设置 */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>路径规划</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>路径间距（米）</Text>
            <TextInput
              style={styles.input}
              value={pathSpacing}
              onChangeText={setPathSpacing}
              keyboardType="decimal-pad"
              placeholder="输入路径间距"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.hint}>建议范围：1-5 米</Text>
          </View>

          <Button title="保存路径设置" onPress={savePathSettings} />
        </Card>

        {/* 蓝牙设置 */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>蓝牙配置</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>服务 UUID</Text>
            <TextInput
              style={styles.input}
              value={serviceUUID}
              onChangeText={setServiceUUID}
              placeholder="输入服务 UUID"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>特征 UUID</Text>
            <TextInput
              style={styles.input}
              value={characteristicUUID}
              onChangeText={setCharacteristicUUID}
              placeholder="输入特征 UUID"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
            />
          </View>

          <Button title="保存蓝牙设置" onPress={saveBluetoothSettings} />
        </Card>

        {/* 地图设置 */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>高德地图</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>JS API Key</Text>
            <TextInput
              style={styles.input}
              value={amapKey}
              onChangeText={setAmapKey}
              placeholder="输入高德地图 Key"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>安全密钥</Text>
            <TextInput
              style={styles.input}
              value={amapSecurityKey}
              onChangeText={setAmapSecurityKey}
              placeholder="输入安全密钥"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />
          </View>

          <Text style={styles.hint}>
            前往高德开放平台申请 Key：https://lbs.amap.com
          </Text>

          <Button
            title="保存地图设置"
            onPress={saveMapSettings}
            style={styles.saveButton}
          />
        </Card>

        {/* 关于 */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>关于</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>应用名称</Text>
            <Text style={styles.aboutValue}>金属探测小车控制器</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>版本号</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>技术栈</Text>
            <Text style={styles.aboutValue}>React Native 0.76</Text>
          </View>
        </Card>

        {/* 开发者选项 */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>开发者选项</Text>
          
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>开发模式</Text>
              <Text style={styles.switchHint}>
                启用后可通过 ADB 发送模拟蓝牙数据
              </Text>
            </View>
            <Switch
              value={devMode}
              onValueChange={toggleDevMode}
              trackColor={{false: colors.border, true: colors.primary}}
              thumbColor={devMode ? colors.surface : colors.textSecondary}
            />
          </View>

          {devMode && (
            <View style={styles.devModeInfo}>
              <Text style={styles.devModeTitle}>ADB 命令示例：</Text>
              <Text style={styles.devModeCode}>
                adb shell am broadcast -a com.sandwormapp.MOCK_BLE --es data "BATTERY:85"
              </Text>
              <Text style={styles.devModeHint}>
                支持的数据格式：{'\n'}
                • POS:纬度,经度{'\n'}
                • BATTERY:电量{'\n'}
                • REMOTE_BATTERY:电量{'\n'}
                • PROGRESS:进度{'\n'}
                • DETECT:纬度,经度,类型,深度{'\n'}
                • CONNECT / DISCONNECT
              </Text>
            </View>
          )}
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
  title: {
    ...typography.pageTitle,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.sectionTitle,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.small,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  saveButton: {
    marginTop: spacing.md,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aboutLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  aboutValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  switchHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  devModeInfo: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.small,
  },
  devModeTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  devModeCode: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: 'monospace',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.small,
    marginBottom: spacing.sm,
  },
  devModeHint: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default SettingsScreen;
