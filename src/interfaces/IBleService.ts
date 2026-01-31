/**
 * BleService 接口定义
 * 用于依赖注入和单元测试 Mock
 */
import {Device} from 'react-native-ble-plx';

// ==================== 类型定义 ====================

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface BleDevice {
  id: string;
  name: string | null;
  rssi: number | null;
}

export interface BleUUIDs {
  serviceUUID: string;
  characteristicUUID: string;
}

export type DataCallback = (data: string) => void;
export type DeviceCallback = (device: BleDevice) => void;
export type StateCallback = (state: ConnectionState) => void;

// 错误码枚举
export enum BleErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SCAN_FAILED = 'SCAN_FAILED',
  CONNECT_FAILED = 'CONNECT_FAILED',
  CONNECT_TIMEOUT = 'CONNECT_TIMEOUT',
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  CHARACTERISTIC_NOT_FOUND = 'CHARACTERISTIC_NOT_FOUND',
  DEVICE_DISCONNECTED = 'DEVICE_DISCONNECTED',
  WRITE_FAILED = 'WRITE_FAILED',
  READ_FAILED = 'READ_FAILED',
  NOT_CONNECTED = 'NOT_CONNECTED',
  UNKNOWN = 'UNKNOWN',
}

// 错误类接口
export interface IBleError {
  code: BleErrorCode;
  userMessage: string;
  originalError?: Error;
}

export type ErrorCallback = (error: IBleError) => void;

// ==================== IBleService 接口 ====================

export interface IBleService {
  // 权限管理
  requestPermissions(): Promise<boolean>;

  // 扫描管理
  startScan(onDeviceFound?: DeviceCallback): void;
  stopScan(): void;

  // 连接管理
  connect(deviceId: string): Promise<boolean>;
  disconnect(): Promise<void>;

  // 数据传输
  send(data: string): Promise<boolean>;
  sendCommand(command: 'START' | 'PAUSE' | 'STOP'): Promise<boolean>;
  sendPath(path: Array<{lat: number; lng: number}>): Promise<boolean>;

  // 状态查询
  getConnectionState(): ConnectionState;
  getConnectedDevice(): Device | null;

  // 缓存管理
  clearUUIDCache(): void;

  // 事件订阅
  onData(callback: DataCallback): () => void;
  onStateChange(callback: StateCallback): () => void;
  onError(callback: ErrorCallback): () => void;
}

export default IBleService;
