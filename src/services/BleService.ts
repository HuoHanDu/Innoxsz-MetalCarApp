import { BleManager, Device, State, BleError } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

class BleService {
  manager: BleManager;
  connectedDevice: Device | null = null;
  onDisconnectCallback: (() => void) | null = null;

  SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
  CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

  constructor() {
    this.manager = new BleManager();
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;
      
      if (apiLevel >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return Object.values(results).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  }

  async checkBluetoothState(): Promise<State> {
    return await this.manager.state();
  }

  scanDevices(
    onDeviceFound: (device: Device) => void,
    onError: (error: Error) => void
  ) {
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        onError(error);
        return;
      }
      if (device && device.name) {
        onDeviceFound(device);
      }
    });
  }

  stopScan() {
    this.manager.stopDeviceScan();
  }

  // 设置断线回调
  setOnDisconnect(callback: () => void) {
    this.onDisconnectCallback = callback;
  }

  async connectToDevice(deviceId: string): Promise<Device> {
    const device = await this.manager.connectToDevice(deviceId);
    await device.discoverAllServicesAndCharacteristics();
    this.connectedDevice = device;

    // 监听断线事件
    device.onDisconnected((error, disconnectedDevice) => {
      console.log('设备断开连接:', disconnectedDevice?.name);
      this.connectedDevice = null;
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback();
      }
    });

    return device;
  }

  async disconnect() {
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
      } catch (e) {
        // 可能已经断开了，忽略错误
        console.log('断开时出错（可能已断开）:', e);
      }
      this.connectedDevice = null;
    }
  }

  // 检查是否还连着
  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('设备未连接');
    }

    // 先检查连接状态
    const isConnected = await this.connectedDevice.isConnected();
    if (!isConnected) {
      this.connectedDevice = null;
      throw new Error('连接已断开');
    }

    const base64Command = Buffer.from(command).toString('base64');
    
    await this.connectedDevice.writeCharacteristicWithResponseForService(
      this.SERVICE_UUID,
      this.CHARACTERISTIC_UUID,
      base64Command
    );
  }

  onDataReceived(callback: (data: string) => void) {
    if (!this.connectedDevice) {
      throw new Error('设备未连接');
    }

    this.connectedDevice.monitorCharacteristicForService(
      this.SERVICE_UUID,
      this.CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          console.error('监听错误:', error);
          return;
        }
        if (characteristic?.value) {
          const data = Buffer.from(characteristic.value, 'base64').toString('utf-8');
          callback(data);
        }
      }
    );
  }
}

export default new BleService();