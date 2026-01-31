import {BleManager, Device, Characteristic} from 'react-native-ble-plx';
import {Platform, PermissionsAndroid} from 'react-native';
import {Buffer} from 'buffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useDeviceStore} from '../stores';

// ==================== Store 同步辅助函数 ====================

// 解析并同步设备数据到 store
const syncDataToStore = (data: string): void => {
  const store = useDeviceStore.getState();

  if (data.startsWith('POS:')) {
    const [lat, lng] = data.slice(4).split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      store.setCurrentPosition({lat, lng});
    }
  } else if (data.startsWith('BATTERY:')) {
    const battery = parseInt(data.slice(8), 10);
    if (!isNaN(battery)) {
      store.setCarBattery(battery);
    }
  } else if (data.startsWith('REMOTE_BATTERY:')) {
    const battery = parseInt(data.slice(15), 10);
    if (!isNaN(battery)) {
      store.setRemoteBattery(battery);
    }
  } else if (data.startsWith('PROGRESS:')) {
    const progress = parseInt(data.slice(9), 10);
    if (!isNaN(progress)) {
      store.setProgress(progress);
    }
  } else if (data.startsWith('DETECT:')) {
    // 格式: DETECT:lat,lng,metalType,depth
    const parts = data.slice(7).split(',');
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        store.addDetectionResult({
          position: {lat, lng},
          metalType: parts[2] || undefined,
          depth: parts[3] ? parseFloat(parts[3]) : undefined,
        });
      }
    }
  }
};

// ==================== 错误处理 ====================

// 蓝牙错误码枚举
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

// 错误码对应的用户友好提示
const ERROR_MESSAGES: Record<BleErrorCode, string> = {
  [BleErrorCode.PERMISSION_DENIED]: '蓝牙权限被拒绝，请在设置中开启',
  [BleErrorCode.SCAN_FAILED]: '扫描设备失败，请检查蓝牙是否开启',
  [BleErrorCode.CONNECT_FAILED]: '连接设备失败，请重试',
  [BleErrorCode.CONNECT_TIMEOUT]: '连接超时，请靠近设备后重试',
  [BleErrorCode.SERVICE_NOT_FOUND]: '未找到蓝牙服务，请检查设备是否正确',
  [BleErrorCode.CHARACTERISTIC_NOT_FOUND]: '未找到特征值，请检查 UUID 配置',
  [BleErrorCode.DEVICE_DISCONNECTED]: '设备已断开连接',
  [BleErrorCode.WRITE_FAILED]: '数据发送失败，请重试',
  [BleErrorCode.READ_FAILED]: '数据读取失败',
  [BleErrorCode.NOT_CONNECTED]: '设备未连接，请先连接设备',
  [BleErrorCode.UNKNOWN]: '未知错误',
};

// 蓝牙错误类
export class BleError extends Error {
  public readonly code: BleErrorCode;
  public readonly userMessage: string;
  public readonly originalError?: Error;

  constructor(code: BleErrorCode, originalError?: Error, customMessage?: string) {
    const userMessage = customMessage || ERROR_MESSAGES[code];
    super(userMessage);
    this.name = 'BleError';
    this.code = code;
    this.userMessage = userMessage;
    this.originalError = originalError;

    // 保持原型链
    Object.setPrototypeOf(this, BleError.prototype);
  }

  // 从原生错误创建 BleError
  static fromNativeError(error: any, defaultCode: BleErrorCode = BleErrorCode.UNKNOWN): BleError {
    const errorMessage = error?.message?.toLowerCase() || '';

    // 根据错误信息推断错误类型
    if (errorMessage.includes('timeout')) {
      return new BleError(BleErrorCode.CONNECT_TIMEOUT, error);
    }
    if (errorMessage.includes('disconnect')) {
      return new BleError(BleErrorCode.DEVICE_DISCONNECTED, error);
    }
    if (errorMessage.includes('permission')) {
      return new BleError(BleErrorCode.PERMISSION_DENIED, error);
    }

    return new BleError(defaultCode, error);
  }
}

// 错误回调类型
export type ErrorCallback = (error: BleError) => void;

// ==================== 配置常量 ====================

import {STORAGE_KEYS, DEFAULT_VALUES, BLE_CONFIG} from '../constants';

export interface BleDevice {
  id: string;
  name: string | null;
  rssi: number | null;
}

export interface BleUUIDs {
  serviceUUID: string;
  characteristicUUID: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export type DataCallback = (data: string) => void;
export type DeviceCallback = (device: BleDevice) => void;
export type StateCallback = (state: ConnectionState) => void;

class BleService {
  private static instance: BleService;
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private characteristic: Characteristic | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private dataCallbacks: DataCallback[] = [];
  private stateCallbacks: StateCallback[] = [];
  private scanCallbacks: DeviceCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private cachedUUIDs: BleUUIDs | null = null;

  private constructor() {
    this.manager = new BleManager();
  }

  static getInstance(): BleService {
    if (!BleService.instance) {
      BleService.instance = new BleService();
    }
    return BleService.instance;
  }

  // 从 AsyncStorage 获取 UUID 配置
  private async getUUIDs(): Promise<BleUUIDs> {
    // 如果已缓存，直接返回
    if (this.cachedUUIDs) {
      return this.cachedUUIDs;
    }

    try {
      const [serviceUUID, characteristicUUID] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SERVICE_UUID),
        AsyncStorage.getItem(STORAGE_KEYS.CHARACTERISTIC_UUID),
      ]);

      this.cachedUUIDs = {
        serviceUUID: serviceUUID || DEFAULT_VALUES.SERVICE_UUID,
        characteristicUUID: characteristicUUID || DEFAULT_VALUES.CHARACTERISTIC_UUID,
      };

      console.log('已加载蓝牙 UUID 配置:', this.cachedUUIDs);
      return this.cachedUUIDs;
    } catch (error) {
      console.error('读取 UUID 配置失败，使用默认值:', error);
      return {
        serviceUUID: DEFAULT_VALUES.SERVICE_UUID,
        characteristicUUID: DEFAULT_VALUES.CHARACTERISTIC_UUID,
      };
    }
  }

  // 清除 UUID 缓存（设置更新后调用）
  clearUUIDCache(): void {
    this.cachedUUIDs = null;
    console.log('UUID 缓存已清除');
  }

  // 触发错误回调
  private emitError(error: BleError): void {
    console.error(`[BleError] ${error.code}: ${error.message}`, error.originalError);
    this.errorCallbacks.forEach(cb => cb(error));
  }

  // 监听错误事件
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }

  // 请求蓝牙权限
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;

      if (apiLevel >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          granted['android.permission.BLUETOOTH_SCAN'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.ACCESS_FINE_LOCATION'] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  }

  // 开始扫描设备
  startScan(onDeviceFound?: DeviceCallback): void {
    if (onDeviceFound) {
      this.scanCallbacks.push(onDeviceFound);
    }
    // 同步扫描状态到 store
    useDeviceStore.getState().setScanning(true);

    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        const bleError = BleError.fromNativeError(error, BleErrorCode.SCAN_FAILED);
        this.emitError(bleError);
        useDeviceStore.getState().setScanning(false);
        return;
      }

      if (device && device.name) {
        const bleDevice: BleDevice = {
          id: device.id,
          name: device.name,
          rssi: device.rssi,
        };
        // 同步到 store
        useDeviceStore.getState().addScannedDevice(bleDevice);
        this.scanCallbacks.forEach(cb => cb(bleDevice));
      }
    });
  }

  // 停止扫描
  stopScan(): void {
    this.manager.stopDeviceScan();
    this.scanCallbacks = [];
    // 同步扫描状态到 store
    useDeviceStore.getState().setScanning(false);
  }

  // 连接设备
  async connect(deviceId: string): Promise<boolean> {
    try {
      this.setConnectionState('connecting');
      console.log('1. 开始连接...');

      // 获取配置的 UUID
      const {serviceUUID, characteristicUUID} = await this.getUUIDs();
      console.log('使用 UUID 配置:', {serviceUUID, characteristicUUID});

      const device = await this.manager.connectToDevice(deviceId, {
        timeout: BLE_CONFIG.CONNECT_TIMEOUT_MS,
      });
      console.log('2. 连接成功，发现服务...');

      await device.discoverAllServicesAndCharacteristics();
      console.log('3. 服务发现完成');

      const services = await device.services();
      console.log('4. 服务列表:', services.map(s => s.uuid));

      // 提取 UUID 的短格式用于匹配（去掉前缀0000和后缀）
      const serviceShort = serviceUUID.substring(4, 8).toLowerCase();
      const charShort = characteristicUUID.substring(4, 8).toLowerCase();

      let serviceFound = false;
      for (const service of services) {
        if (service.uuid.toLowerCase().includes(serviceShort)) {
          serviceFound = true;
          const characteristics = await service.characteristics();
          console.log(`5. ${serviceShort} 服务的特征值:`, characteristics.map(c => c.uuid));

          for (const char of characteristics) {
            if (char.uuid.toLowerCase().includes(charShort)) {
              this.characteristic = char;
              console.log(`6. 找到 ${charShort} 特征值`);
              break;
            }
          }
        }
      }

      // 检查是否找到服务
      if (!serviceFound) {
        const error = new BleError(
          BleErrorCode.SERVICE_NOT_FOUND,
          undefined,
          `未找到服务 ${serviceShort}，请检查设备或 UUID 配置`
        );
        this.emitError(error);
        this.setConnectionState('disconnected');
        return false;
      }

      // 检查是否找到特征值
      if (!this.characteristic) {
        const error = new BleError(
          BleErrorCode.CHARACTERISTIC_NOT_FOUND,
          undefined,
          `未找到特征值 ${charShort}，请检查 UUID 配置`
        );
        this.emitError(error);
        this.setConnectionState('disconnected');
        return false;
      }

      this.connectedDevice = device;
      this.setConnectionState('connected');
      // 同步已连接设备信息到 store
      useDeviceStore.getState().setConnectedDevice(device.id, device.name);
      console.log('7. 连接完成');

      this.startDataMonitor();
      device.onDisconnected(() => this.handleDisconnect());

      return true;
    } catch (error: any) {
      const bleError = BleError.fromNativeError(error, BleErrorCode.CONNECT_FAILED);
      this.emitError(bleError);
      this.setConnectionState('disconnected');
      return false;
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      await this.connectedDevice.cancelConnection();
      this.handleDisconnect();
    }
  }

  // 发送数据
  async send(data: string): Promise<boolean> {
    if (!this.characteristic) {
      const error = new BleError(BleErrorCode.NOT_CONNECTED);
      this.emitError(error);
      return false;
    }

    try {
      const base64Data = Buffer.from(data).toString('base64');
      await this.characteristic.writeWithResponse(base64Data);
      return true;
    } catch (error: any) {
      const bleError = BleError.fromNativeError(error, BleErrorCode.WRITE_FAILED);
      this.emitError(bleError);
      return false;
    }
  }

  // 发送控制指令
  async sendCommand(command: 'START' | 'PAUSE' | 'STOP'): Promise<boolean> {
    return this.send(command);
  }

  // 发送路径数据
  async sendPath(
    path: Array<{lat: number; lng: number}>,
  ): Promise<boolean> {
    const pathString = `PATH:${JSON.stringify(path)}`;
    return this.send(pathString);
  }

  // 监听数据
  onData(callback: DataCallback): () => void {
    this.dataCallbacks.push(callback);
    return () => {
      this.dataCallbacks = this.dataCallbacks.filter(cb => cb !== callback);
    };
  }

  // 监听连接状态
  onStateChange(callback: StateCallback): () => void {
    this.stateCallbacks.push(callback);
    callback(this.connectionState);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter(cb => cb !== callback);
    };
  }

  // 获取连接状态
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // 获取已连接设备
  getConnectedDevice(): Device | null {
    return this.connectedDevice;
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.stateCallbacks.forEach(cb => cb(state));
    // 同步到 Zustand store
    useDeviceStore.getState().setConnectionState(state);
  }

  private handleDisconnect(): void {
    const deviceName = this.connectedDevice?.name || null;
    this.connectedDevice = null;
    this.characteristic = null;
    this.setConnectionState('disconnected');
    // 同步到 store
    useDeviceStore.getState().setConnectedDevice(null, null);
    // 触发断开连接错误（供 UI 层显示提示）
    const error = new BleError(BleErrorCode.DEVICE_DISCONNECTED);
    this.emitError(error);
  }

  private startDataMonitor(): void {
    if (!this.characteristic) return;

    this.characteristic.monitor((error, char) => {
      if (error) {
        const bleError = BleError.fromNativeError(error, BleErrorCode.READ_FAILED);
        this.emitError(bleError);
        return;
      }

      if (char?.value) {
        const data = Buffer.from(char.value, 'base64').toString('utf-8');
        // 同步数据到 store
        syncDataToStore(data);
        // 触发回调
        this.dataCallbacks.forEach(cb => cb(data));
      }
    });
  }
}

export default BleService.getInstance();
