/**
 * 设置状态全局 Store
 * 管理路径规划、蓝牙配置、地图配置等设置项
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS, DEFAULT_VALUES} from '../constants';

// ==================== 类型定义 ====================

export interface SettingsState {
  // 路径规划设置
  pathSpacing: string;

  // 蓝牙配置
  serviceUUID: string;
  characteristicUUID: string;

  // 地图配置
  amapKey: string;
  amapSecurityKey: string;

  // 加载状态
  isLoaded: boolean;
}

export interface SettingsActions {
  // 路径设置
  setPathSpacing: (spacing: string) => void;

  // 蓝牙配置
  setServiceUUID: (uuid: string) => void;
  setCharacteristicUUID: (uuid: string) => void;
  setBluetoothConfig: (serviceUUID: string, characteristicUUID: string) => void;

  // 地图配置
  setAmapKey: (key: string) => void;
  setAmapSecurityKey: (key: string) => void;
  setMapConfig: (apiKey: string, securityKey: string) => void;

  // 批量更新
  updateSettings: (settings: Partial<SettingsState>) => void;

  // 重置为默认值
  resetToDefaults: () => void;

  // 标记已加载
  setLoaded: () => void;
}

// ==================== 初始状态 ====================

const initialState: SettingsState = {
  pathSpacing: DEFAULT_VALUES.PATH_SPACING,
  serviceUUID: DEFAULT_VALUES.SERVICE_UUID,
  characteristicUUID: DEFAULT_VALUES.CHARACTERISTIC_UUID,
  amapKey: '',
  amapSecurityKey: '',
  isLoaded: false,
};

// ==================== 自定义存储适配器 ====================

// 将 store 状态映射到独立的 AsyncStorage 键
const customStorage = {
  getItem: async (_name: string): Promise<string | null> => {
    try {
      const [pathSpacing, serviceUUID, characteristicUUID, amapKey, amapSecurityKey] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PATH_SPACING),
          AsyncStorage.getItem(STORAGE_KEYS.SERVICE_UUID),
          AsyncStorage.getItem(STORAGE_KEYS.CHARACTERISTIC_UUID),
          AsyncStorage.getItem(STORAGE_KEYS.AMAP_KEY),
          AsyncStorage.getItem(STORAGE_KEYS.AMAP_SECURITY_KEY),
        ]);

      const state: SettingsState = {
        pathSpacing: pathSpacing || DEFAULT_VALUES.PATH_SPACING,
        serviceUUID: serviceUUID || DEFAULT_VALUES.SERVICE_UUID,
        characteristicUUID: characteristicUUID || DEFAULT_VALUES.CHARACTERISTIC_UUID,
        amapKey: amapKey || '',
        amapSecurityKey: amapSecurityKey || '',
        isLoaded: true,
      };

      return JSON.stringify({state});
    } catch (error) {
      console.error('加载设置失败:', error);
      return null;
    }
  },

  setItem: async (_name: string, value: string): Promise<void> => {
    try {
      const {state} = JSON.parse(value) as {state: SettingsState};

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.PATH_SPACING, state.pathSpacing),
        AsyncStorage.setItem(STORAGE_KEYS.SERVICE_UUID, state.serviceUUID),
        AsyncStorage.setItem(STORAGE_KEYS.CHARACTERISTIC_UUID, state.characteristicUUID),
        AsyncStorage.setItem(STORAGE_KEYS.AMAP_KEY, state.amapKey),
        AsyncStorage.setItem(STORAGE_KEYS.AMAP_SECURITY_KEY, state.amapSecurityKey),
      ]);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  },

  removeItem: async (_name: string): Promise<void> => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.PATH_SPACING),
        AsyncStorage.removeItem(STORAGE_KEYS.SERVICE_UUID),
        AsyncStorage.removeItem(STORAGE_KEYS.CHARACTERISTIC_UUID),
        AsyncStorage.removeItem(STORAGE_KEYS.AMAP_KEY),
        AsyncStorage.removeItem(STORAGE_KEYS.AMAP_SECURITY_KEY),
      ]);
    } catch (error) {
      console.error('清除设置失败:', error);
    }
  },
};

// ==================== Store 定义 ====================

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...initialState,

      // 路径设置
      setPathSpacing: (pathSpacing) => set({pathSpacing}),

      // 蓝牙配置
      setServiceUUID: (serviceUUID) => set({serviceUUID}),
      setCharacteristicUUID: (characteristicUUID) => set({characteristicUUID}),
      setBluetoothConfig: (serviceUUID, characteristicUUID) =>
        set({serviceUUID, characteristicUUID}),

      // 地图配置
      setAmapKey: (amapKey) => set({amapKey}),
      setAmapSecurityKey: (amapSecurityKey) => set({amapSecurityKey}),
      setMapConfig: (amapKey, amapSecurityKey) => set({amapKey, amapSecurityKey}),

      // 批量更新
      updateSettings: (settings) => set(settings),

      // 重置为默认值
      resetToDefaults: () =>
        set({
          pathSpacing: DEFAULT_VALUES.PATH_SPACING,
          serviceUUID: DEFAULT_VALUES.SERVICE_UUID,
          characteristicUUID: DEFAULT_VALUES.CHARACTERISTIC_UUID,
          amapKey: '',
          amapSecurityKey: '',
        }),

      // 标记已加载
      setLoaded: () => set({isLoaded: true}),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => customStorage),
      // 不持久化 isLoaded 状态
      partialize: (state) => ({
        pathSpacing: state.pathSpacing,
        serviceUUID: state.serviceUUID,
        characteristicUUID: state.characteristicUUID,
        amapKey: state.amapKey,
        amapSecurityKey: state.amapSecurityKey,
      }),
      onRehydrateStorage: () => (state) => {
        // 加载完成后标记
        state?.setLoaded();
      },
    }
  )
);

// ==================== 选择器（Selectors）====================

// 路径设置
export const selectPathSpacing = (state: SettingsState) => state.pathSpacing;
export const selectPathSpacingNumber = (state: SettingsState) =>
  parseFloat(state.pathSpacing) || parseFloat(DEFAULT_VALUES.PATH_SPACING);

// 蓝牙配置 - 返回原始值避免对象重建
export const selectServiceUUID = (state: SettingsState) => state.serviceUUID;
export const selectCharacteristicUUID = (state: SettingsState) => state.characteristicUUID;
export const selectBluetoothConfig = (state: SettingsState) => ({
  serviceUUID: state.serviceUUID,
  characteristicUUID: state.characteristicUUID,
});

// 地图配置 - 返回原始值避免对象重建
export const selectAmapKey = (state: SettingsState) => state.amapKey;
export const selectAmapSecurityKey = (state: SettingsState) => state.amapSecurityKey;
export const selectMapConfig = (state: SettingsState) => ({
  apiKey: state.amapKey,
  securityKey: state.amapSecurityKey,
});

// 加载状态
export const selectIsLoaded = (state: SettingsState) => state.isLoaded;

export default useSettingsStore;
