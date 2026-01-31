export {useDeviceStore, default as deviceStore} from './deviceStore';
export type {
  ConnectionState,
  Position,
  DetectionResult,
  DeviceState,
  DeviceActions,
} from './deviceStore';
export {
  selectConnectionState,
  selectIsConnected,
  selectIsConnecting,
  selectConnectedDeviceId,
  selectConnectedDeviceName,
  selectConnectedDevice,
  selectCarBattery,
  selectRemoteBattery,
  selectBatteries,
  selectCurrentPosition,
  selectProgress,
  selectDetectionResults,
  selectDetectionCount,
  selectScannedDevices,
  selectIsScanning,
} from './deviceStore';

export {useSettingsStore, default as settingsStore} from './settingsStore';
export type {SettingsState, SettingsActions} from './settingsStore';
export {
  selectPathSpacing,
  selectPathSpacingNumber,
  selectServiceUUID,
  selectCharacteristicUUID,
  selectBluetoothConfig,
  selectAmapKey,
  selectAmapSecurityKey,
  selectMapConfig,
  selectIsLoaded,
} from './settingsStore';
