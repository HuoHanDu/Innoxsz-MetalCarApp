/**
 * AsyncStorage 存储键名常量
 * 集中管理所有本地存储的键名，确保一致性和类型安全
 */

// 存储键名常量对象
export const STORAGE_KEYS = {
  // 路径规划设置
  PATH_SPACING: '@settings/pathSpacing',

  // 蓝牙配置
  SERVICE_UUID: '@settings/serviceUUID',
  CHARACTERISTIC_UUID: '@settings/characteristicUUID',

  // 高德地图配置
  AMAP_KEY: '@settings/amapKey',
  AMAP_SECURITY_KEY: '@settings/amapSecurityKey',

  // 开发模式
  DEV_MODE: '@settings/devMode',
} as const;

// 存储键名类型（用于类型安全）
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// 各模块的键名分组类型（便于模块化使用）
export type PathSettingsKeys = Pick<typeof STORAGE_KEYS, 'PATH_SPACING'>;
export type BluetoothSettingsKeys = Pick<typeof STORAGE_KEYS, 'SERVICE_UUID' | 'CHARACTERISTIC_UUID'>;
export type MapSettingsKeys = Pick<typeof STORAGE_KEYS, 'AMAP_KEY' | 'AMAP_SECURITY_KEY'>;

// 默认值常量
export const DEFAULT_VALUES = {
  PATH_SPACING: '2',
  SERVICE_UUID: '0000FFE0-0000-1000-8000-00805F9B34FB',
  CHARACTERISTIC_UUID: '0000FFE1-0000-1000-8000-00805F9B34FB',
} as const;

export default STORAGE_KEYS;
