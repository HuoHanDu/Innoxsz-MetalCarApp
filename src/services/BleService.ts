import {BleManager, Device, Characteristic} from 'react-native-ble-plx';
import {Platform, PermissionsAndroid} from 'react-native';
import {Buffer} from 'buffer';

// 蓝牙服务 UUID（需要根据实际硬件配置）
const SERVICE_UUID = '0000FFE0-0000-1000-8000-00805F9B34FB';
const CHARACTERISTIC_UUID = '0000FFE1-0000-1000-8000-00805F9B34FB';

export interface BleDevice {
  id: string;
  name: string | null;
  rssi: number | null;
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

  private constructor() {
    this.manager = new BleManager();
  }

  static getInstance(): BleService {
    if (!BleService.instance) {
      BleService.instance = new BleService();
    }
    return BleService.instance;
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
  startScan(onDeviceFound: DeviceCallback): void {
    this.scanCallbacks.push(onDeviceFound);

    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Scan error:', error);
        return;
      }

      if (device && device.name) {
        const bleDevice: BleDevice = {
          id: device.id,
          name: device.name,
          rssi: device.rssi,
        };
        this.scanCallbacks.forEach(cb => cb(bleDevice));
      }
    });
  }

  // 停止扫描
  stopScan(): void {
    this.manager.stopDeviceScan();
    this.scanCallbacks = [];
  }

  // 连接设备
	async connect(deviceId: string): Promise<boolean> {
	try {
		this.setConnectionState('connecting');
		console.log('1. 开始连接...');
		
		const device = await this.manager.connectToDevice(deviceId, {
		timeout: 10000, // 加个超时
		});
		console.log('2. 连接成功，发现服务...');
		
		await device.discoverAllServicesAndCharacteristics();
		console.log('3. 服务发现完成');
		
		const services = await device.services();
		console.log('4. 服务列表:', services.map(s => s.uuid));
		
		for (const service of services) {
		if (service.uuid.toLowerCase().includes('ffe0')) {
			const characteristics = await service.characteristics();
			console.log('5. FFE0 服务的特征值:', characteristics.map(c => c.uuid));
			
			for (const char of characteristics) {
			if (char.uuid.toLowerCase().includes('ffe1')) {
				this.characteristic = char;
				console.log('6. 找到 FFE1 特征值');
				break;
			}
			}
		}
		}

		if (!this.characteristic) {
		console.error('未找到 FFE1 特征值！');
		this.setConnectionState('disconnected');
		return false;
		}

		this.connectedDevice = device;
		this.setConnectionState('connected');
		console.log('7. 连接完成');
		
		this.startDataMonitor();
		device.onDisconnected(() => this.handleDisconnect());
		
		return true;
	} catch (error) {
		console.error('Connect error:', error);
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
      console.error('No characteristic available');
      return false;
    }

    try {
      const base64Data = Buffer.from(data).toString('base64');
      await this.characteristic.writeWithResponse(base64Data);
      return true;
    } catch (error) {
      console.error('Send error:', error);
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
  }

  private handleDisconnect(): void {
    this.connectedDevice = null;
    this.characteristic = null;
    this.setConnectionState('disconnected');
  }

  private startDataMonitor(): void {
    if (!this.characteristic) return;

    this.characteristic.monitor((error, char) => {
      if (error) {
        console.error('Monitor error:', error);
        return;
      }

      if (char?.value) {
        const data = Buffer.from(char.value, 'base64').toString('utf-8');
        this.dataCallbacks.forEach(cb => cb(data));
      }
    });
  }
}

export default BleService.getInstance();
