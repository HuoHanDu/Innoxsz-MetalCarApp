/**
 * 设备状态全局 Store
 * 管理蓝牙连接状态、设备电量、位置、探测结果等
 */
import {create} from 'zustand';
import {subscribeWithSelector} from 'zustand/middleware';

// ==================== 类型定义 ====================

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface Position {
  lat: number;
  lng: number;
}

export interface DetectionResult {
  id: string;
  position: Position;
  timestamp: number;
  metalType?: string;
  depth?: number;
}

export interface DeviceState {
  // 连接状态
  connectionState: ConnectionState;
  connectedDeviceId: string | null;
  connectedDeviceName: string | null;

  // 设备电量
  carBattery: number;
  remoteBattery: number;

  // 位置信息
  currentPosition: Position | null;

  // 探测进度和结果
  progress: number;
  detectionResults: DetectionResult[];

  // 扫描到的设备列表
  scannedDevices: Array<{
    id: string;
    name: string | null;
    rssi: number | null;
  }>;
  isScanning: boolean;
}

export interface DeviceActions {
  // 连接状态操作
  setConnectionState: (state: ConnectionState) => void;
  setConnectedDevice: (id: string | null, name?: string | null) => void;

  // 电量更新
  setCarBattery: (level: number) => void;
  setRemoteBattery: (level: number) => void;

  // 位置更新
  setCurrentPosition: (position: Position | null) => void;

  // 进度和结果
  setProgress: (progress: number) => void;
  addDetectionResult: (result: Omit<DetectionResult, 'id' | 'timestamp'>) => void;
  clearDetectionResults: () => void;

  // 扫描设备管理
  setScanning: (isScanning: boolean) => void;
  addScannedDevice: (device: {id: string; name: string | null; rssi: number | null}) => void;
  clearScannedDevices: () => void;

  // 重置所有状态
  reset: () => void;
}

// ==================== 初始状态 ====================

const initialState: DeviceState = {
  connectionState: 'disconnected',
  connectedDeviceId: null,
  connectedDeviceName: null,
  carBattery: 0,
  remoteBattery: 0,
  currentPosition: null,
  progress: 0,
  detectionResults: [],
  scannedDevices: [],
  isScanning: false,
};

// ==================== Store 定义 ====================

export const useDeviceStore = create<DeviceState & DeviceActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // 连接状态操作
    setConnectionState: (connectionState) => {
      set({connectionState});
      // 断开连接时清除设备信息
      if (connectionState === 'disconnected') {
        set({connectedDeviceId: null, connectedDeviceName: null});
      }
    },

    setConnectedDevice: (id, name = null) => {
      set({connectedDeviceId: id, connectedDeviceName: name});
    },

    // 电量更新
    setCarBattery: (carBattery) => set({carBattery}),
    setRemoteBattery: (remoteBattery) => set({remoteBattery}),

    // 位置更新
    setCurrentPosition: (currentPosition) => set({currentPosition}),

    // 进度和结果
    setProgress: (progress) => set({progress}),

    addDetectionResult: (result) => {
      const newResult: DetectionResult = {
        ...result,
        id: `detection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };
      set((state) => ({
        detectionResults: [...state.detectionResults, newResult],
      }));
    },

    clearDetectionResults: () => set({detectionResults: []}),

    // 扫描设备管理
    setScanning: (isScanning) => set({isScanning}),

    addScannedDevice: (device) => {
      set((state) => {
        const exists = state.scannedDevices.find((d) => d.id === device.id);
        if (exists) {
          // 更新已存在的设备
          return {
            scannedDevices: state.scannedDevices.map((d) =>
              d.id === device.id ? device : d
            ),
          };
        }
        // 添加新设备
        return {scannedDevices: [...state.scannedDevices, device]};
      });
    },

    clearScannedDevices: () => set({scannedDevices: []}),

    // 重置所有状态
    reset: () => set(initialState),
  }))
);

// ==================== 选择器（Selectors）====================

// 连接状态相关
export const selectConnectionState = (state: DeviceState) => state.connectionState;
export const selectIsConnected = (state: DeviceState) => state.connectionState === 'connected';
export const selectIsConnecting = (state: DeviceState) => state.connectionState === 'connecting';
export const selectConnectedDeviceId = (state: DeviceState) => state.connectedDeviceId;
export const selectConnectedDeviceName = (state: DeviceState) => state.connectedDeviceName;
export const selectConnectedDevice = (state: DeviceState) => ({
  id: state.connectedDeviceId,
  name: state.connectedDeviceName,
});

// 电量相关 - 添加原始值选择器避免对象重建
export const selectCarBattery = (state: DeviceState) => state.carBattery;
export const selectRemoteBattery = (state: DeviceState) => state.remoteBattery;
export const selectBatteries = (state: DeviceState) => ({
  carBattery: state.carBattery,
  remoteBattery: state.remoteBattery,
});

// 位置相关
export const selectCurrentPosition = (state: DeviceState) => state.currentPosition;

// 探测相关
export const selectProgress = (state: DeviceState) => state.progress;
export const selectDetectionResults = (state: DeviceState) => state.detectionResults;
export const selectDetectionCount = (state: DeviceState) => state.detectionResults.length;

// 扫描相关
export const selectScannedDevices = (state: DeviceState) => state.scannedDevices;
export const selectIsScanning = (state: DeviceState) => state.isScanning;

export default useDeviceStore;
