/**
 * Mock BLE 服务 - 用于开发测试
 * 在开发模式下接收 ADB 广播，模拟蓝牙数据
 */
import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import {useDeviceStore} from '../stores';

const {MockBleModule} = NativeModules;

// 事件名称
const EVENT_MOCK_DATA = 'onMockBleData';

// 事件发射器
let eventEmitter: NativeEventEmitter | null = null;
let subscription: any = null;

/**
 * 解析并同步 Mock 数据到 store
 * 复用 BleService 的数据格式
 */
const handleMockData = (data: string): void => {
  console.log('[MockBle] 收到数据:', data);
  const store = useDeviceStore.getState();

  if (data.startsWith('POS:')) {
    const [lat, lng] = data.slice(4).split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      store.setCurrentPosition({lat, lng});
      console.log('[MockBle] 更新位置:', {lat, lng});
    }
  } else if (data.startsWith('BATTERY:')) {
    const battery = parseInt(data.slice(8), 10);
    if (!isNaN(battery)) {
      store.setCarBattery(battery);
      console.log('[MockBle] 更新车辆电量:', battery);
    }
  } else if (data.startsWith('REMOTE_BATTERY:')) {
    const battery = parseInt(data.slice(15), 10);
    if (!isNaN(battery)) {
      store.setRemoteBattery(battery);
      console.log('[MockBle] 更新遥控器电量:', battery);
    }
  } else if (data.startsWith('PROGRESS:')) {
    const progress = parseInt(data.slice(9), 10);
    if (!isNaN(progress)) {
      store.setProgress(progress);
      console.log('[MockBle] 更新进度:', progress);
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
        console.log('[MockBle] 添加检测结果:', {lat, lng, metalType: parts[2], depth: parts[3]});
      }
    }
  } else if (data === 'CONNECT') {
    // 模拟连接成功
    store.setConnectionState('connected');
    store.setConnectedDevice('mock-device-001', 'Mock 设备');
    console.log('[MockBle] 模拟连接成功');
  } else if (data === 'DISCONNECT') {
    // 模拟断开连接
    store.setConnectionState('disconnected');
    store.setConnectedDevice(null, null);
    console.log('[MockBle] 模拟断开连接');
  }
};

/**
 * 启用 Mock BLE 模式
 */
export const enableMockBle = (): void => {
  if (Platform.OS !== 'android' || !MockBleModule) {
    console.warn('[MockBle] 仅支持 Android 平台');
    return;
  }

  // 创建事件发射器
  if (!eventEmitter) {
    eventEmitter = new NativeEventEmitter(MockBleModule);
  }

  // 注册事件监听
  if (!subscription) {
    subscription = eventEmitter.addListener(EVENT_MOCK_DATA, handleMockData);
  }

  // 启用原生模块
  MockBleModule.enable();
  console.log('[MockBle] 已启用');
};

/**
 * 禁用 Mock BLE 模式
 */
export const disableMockBle = (): void => {
  if (Platform.OS !== 'android' || !MockBleModule) {
    return;
  }

  // 移除事件监听
  if (subscription) {
    subscription.remove();
    subscription = null;
  }

  // 禁用原生模块
  MockBleModule.disable();
  console.log('[MockBle] 已禁用');
};

/**
 * 检查 Mock 模式是否可用
 */
export const isMockBleAvailable = (): boolean => {
  return Platform.OS === 'android' && !!MockBleModule;
};

export default {
  enable: enableMockBle,
  disable: disableMockBle,
  isAvailable: isMockBleAvailable,
};
