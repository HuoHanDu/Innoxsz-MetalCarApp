import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TextInput, ScrollView, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BaseLayout, Card, Button} from '../components';
import {colors, spacing, borderRadius} from '../theme';
import PathPlanner from '../services/PathPlanner';

// 存储键名
const STORAGE_KEYS = {
  PATH_SPACING: '@settings/pathSpacing',
  SERVICE_UUID: '@settings/serviceUUID',
  CHARACTERISTIC_UUID: '@settings/characteristicUUID',
  AMAP_KEY: '@settings/amapKey',
  AMAP_SECURITY_KEY: '@settings/amapSecurityKey',
};

const SettingsScreen: React.FC = () => {
  const [pathSpacing, setPathSpacing] = useState('2');
  const [serviceUUID, setServiceUUID] = useState('0000FFE0-0000-1000-8000-00805F9B34FB');
  const [characteristicUUID, setCharacteristicUUID] = useState('0000FFE1-0000-1000-8000-00805F9B34FB');
  const [amapKey, setAmapKey] = useState('');
  const [amapSecurityKey, setAmapSecurityKey] = useState('');

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
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PATH_SPACING),
          AsyncStorage.getItem(STORAGE_KEYS.SERVICE_UUID),
          AsyncStorage.getItem(STORAGE_KEYS.CHARACTERISTIC_UUID),
          AsyncStorage.getItem(STORAGE_KEYS.AMAP_KEY),
          AsyncStorage.getItem(STORAGE_KEYS.AMAP_SECURITY_KEY),
        ]);

        if (savedPathSpacing) setPathSpacing(savedPathSpacing);
        if (savedServiceUUID) setServiceUUID(savedServiceUUID);
        if (savedCharacteristicUUID) setCharacteristicUUID(savedCharacteristicUUID);
        if (savedAmapKey) setAmapKey(savedAmapKey);
        if (savedAmapSecurityKey) setAmapSecurityKey(savedAmapSecurityKey);

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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
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
    fontSize: 12,
    color: colors.textSecondary,
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
});

export default SettingsScreen;
