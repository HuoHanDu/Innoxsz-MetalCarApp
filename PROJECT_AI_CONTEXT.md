
# 金属探测小车 App - AI 项目文档

## 1. 项目概述

### 基本信息
- **项目名称**：MetalDetector（金属探测小车控制 App）
- **用途**：控制自动化金属探测小车，在指定区域进行金属探测作业
- **目标用户**：小车操作人员

### 核心功能
1. 蓝牙连接小车，收发控制指令
2. 在地图上绑制电子围栏（探测区域）
3. 自动生成弓字形覆盖路径
4. 下发路径到小车
5. 接收并显示金属探测结果

### 技术栈
- **框架**：React Native 0.83
- **语言**：TypeScript
- **地图**：高德地图 JS API 2.0（WebView 方式）
- **蓝牙**：react-native-ble-plx
- **导航**：@react-navigation/bottom-tabs

### 关键依赖

```json
{
  "react-native": "0.83.x",
  "react-native-ble-plx": "BLE通信",
  "react-native-webview": "承载高德地图",
  "@react-navigation/native": "导航框架",
  "@react-navigation/bottom-tabs": "底部Tab导航",
  "buffer": "蓝牙数据编解码"
}
```

---

## 2. 目录结构

```
MetalDetector/
├── src/
│   ├── components/
│   │   └── AMapView.tsx        # 高德地图组件（WebView封装）
│   ├── screens/
│   │   ├── HomeScreen.tsx      # 主页：地图 + 控制栏
│   │   ├── DeviceScreen.tsx    # 设备页：蓝牙扫描/连接
│   │   ├── FenceScreen.tsx     # 围栏页：绑制围栏 + 生成路径
│   │   ├── ResultScreen.tsx    # 结果页：探测结果展示（待完善）
│   │   └── SettingsScreen.tsx  # 设置页（待完善）
│   ├── services/
│   │   ├── BleService.ts       # 蓝牙通信服务（单例）
│   │   └── PathPlanner.ts      # 路径规划算法
│   └── utils/                  # 工具函数（待添加）
├── android/                    # Android 原生配置
│   ├── app/
│   │   ├── build.gradle        # App 构建配置
│   │   ├── release.keystore    # 签名密钥（勿提交）
│   │   └── src/main/
│   │       └── AndroidManifest.xml  # 权限配置
│   └── `keystore.properties`     # 签名密码配置（勿提交）
├── App.tsx                     # 应用入口 + Tab导航配置
├── index.js                    # RN 启动入口
└── PROJECT_AI_CONTEXT.md       # 本文档
```

---

## 3. 核心模块详解

### 3.1 `src/services/BleService.ts`

**用途**：蓝牙 BLE 通信服务，单例模式

**导出**：

```typescript
export default BleService  // 单例实例
```

**关键属性**：

```typescript
SERVICE_UUID: string           // BLE 服务 UUID
CHARACTERISTIC_UUID: string    // BLE 特征值 UUID
connectedDevice: Device | null // 当前连接的设备
```

**关键方法**：

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `requestPermissions()` | - | `Promise<boolean>` | 请求蓝牙和定位权限 |
| `checkBluetoothState()` | - | `Promise<State>` | 检查蓝牙开关状态 |
| `scanDevices(onFound, onError)` | 回调函数 | `void` | 开始扫描设备 |
| `stopScan()` | - | `void` | 停止扫描 |
| `connectToDevice(deviceId)` | 设备ID | `Promise<Device>` | 连接设备 |
| `disconnect()` | - | `Promise<void>` | 断开连接 |
| `isConnected()` | - | `boolean` | 检查是否已连接 |
| `sendCommand(cmd)` | 字符串指令 | `Promise<void>` | 发送指令（START/PAUSE/STOP） |
| `sendPath(points)` | 坐标数组 | `Promise<void>` | 下发路径数据 |
| `onDataReceived(callback)` | 回调函数 | `void` | 监听接收数据 |
| `setOnDisconnect(callback)` | 回调函数 | `void` | 设置断线回调 |

**使用示例**：

```javascript
import BleService from '../services/BleService';

// 扫描
BleService.scanDevices(
  (device) => console.log('发现:', device.name),
  (error) => console.error(error)
);

// 连接
await BleService.connectToDevice(deviceId);

// 发送指令
await BleService.sendCommand('START');

// 监听数据
BleService.onDataReceived((data) => {
  console.log('收到:', data);
});
```

---

### 3.2 `src/services/PathPlanner.ts`

**用途**：路径规划算法，生成弓字形覆盖路径

**导出**：

```typescript
export default PathPlanner  // 单例实例
```

**关键方法**：

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `generateZigzagPath(polygon, config)` | 围栏顶点数组, 配置 | `Point[]` | 生成弓字形路径 |
| `getPathLength(path)` | 路径点数组 | `number` | 计算路径总长度（米） |
| `estimateTime(path, speed)` | 路径, 速度 | `number` | 估算耗时（秒） |
| `isPointInPolygon(point, polygon)` | 点, 多边形 | `boolean` | 判断点是否在多边形内 |
| `getBounds(polygon)` | 多边形顶点 | `Bounds` | 获取边界框 |
| `getDistance(p1, p2)` | 两个坐标点 | `number` | 计算两点距离（米） |

**配置参数**：

```typescript
interface PathConfig {
  gridSize: number;                    // 栅格间距（米）
  direction: 'horizontal' | 'vertical'; // 扫描方向
}
```

**使用示例**：

```javascript
import PathPlanner from '../services/PathPlanner';

const fence = [
  { lat: 39.904, lng: 116.407 },
  { lat: 39.905, lng: 116.408 },
  { lat: 39.903, lng: 116.409 },
];

const path = PathPlanner.generateZigzagPath(fence, {
  gridSize: 2,
  direction: 'horizontal',
});

console.log('路径点数:', path.length);
console.log('总长度:', PathPlanner.getPathLength(path), '米');
```

---

### 3.3 `src/components/AMapView.tsx`

**用途**：高德地图组件，基于 WebView 封装

**Props**：

```typescript
interface AMapViewProps {
  apiKey: string;           // 高德 JS API Key
  securityCode: string;     // 高德安全密钥
  center?: { lat, lng };    // 地图中心点
  zoom?: number;            // 缩放级别
  carPosition?: { lat, lng } | null;  // 小车位置
  onMapReady?: () => void;  // 地图加载完成回调
  onMapClick?: (lat, lng) => void;    // 地图点击回调
  onFenceUpdate?: (points) => void;   // 围栏更新回调
}
```

**Ref 方法**（通过 `useRef` 调用）：

```typescript
interface AMapViewRef {
  startDrawFence(): void;   // 开始绘制围栏
  clearFence(): void;       // 清除围栏
  undoFencePoint(): void;   // 撤销最后一个点
  closeFence(): void;       // 闭合围栏
  showPath(points): void;   // 显示路径
  clearPath(): void;        // 清除路径
}
```

**使用示例**：

```javascript
import AMapView, { AMapViewRef } from '../components/AMapView';

const mapRef = useRef<AMapViewRef>(null);

<AMapView
  ref={mapRef}
  apiKey="xxx"
  securityCode="xxx"
  center={{ lat: 39.9, lng: 116.4 }}
  onFenceUpdate={(points) => setFence(points)}
/>

// 调用方法
mapRef.current?.startDrawFence();
mapRef.current?.showPath(pathPoints);
```

---

### 3.4 `src/screens/DeviceScreen.tsx`

**用途**：蓝牙设备扫描与连接页面

**状态**：

```typescript
isScanning: boolean         // 是否正在扫描
devices: Device[]           // 发现的设备列表
connectedDevice: Device     // 已连接设备
receivedData: string[]      // 接收的数据历史
```

**核心流程**：
1. 初始化时请求权限、检查蓝牙状态
2. 点击「扫描」→ 调用 `BleService.scanDevices()`
3. 点击设备 → 调用 `BleService.connectToDevice()`
4. 连接后显示控制按钮（START/PAUSE/STOP）
5. 监听接收数据并显示

---

### 3.5 `src/screens/FenceScreen.tsx`

**用途**：围栏绘制与路径规划页面

**状态**：

```typescript
isDrawing: boolean          // 是否处于绘制模式
fencePoints: Point[]        // 围栏顶点
pathPoints: Point[]         // 生成的路径点
pathInfo: { length, time }  // 路径信息
isSending: boolean          // 是否正在发送
```

**核心流程**：
1. 点击「绘制围栏」→ 进入绘制模式
2. 点击地图添加顶点
3. 点击「完成」→ 闭合围栏
4. 点击「生成路径」→ 调用 `PathPlanner.generateZigzagPath()`
5. 点击「下发路径」→ 调用 `BleService.sendPath()`

---

### 3.6 `App.tsx`

**用途**：应用入口，配置底部 Tab 导航

**导航结构**：

```
Tab.Navigator
├── Home      → HomeScreen      (主页)
├── Device    → DeviceScreen    (设备)
├── Fence     → FenceScreen     (围栏)
├── Result    → ResultScreen    (结果)
└── Settings  → SettingsScreen  (设置)
```

---

## 4. 数据流

```
┌─────────────────────────────────────────────────────┐
│                    用户操作                          │
└─────────────────────────────────────────────────────┘
│
┌───────────────┼───────────────┐
▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ DeviceScreen │  │ FenceScreen │  │ HomeScreen  │
│  蓝牙连接    │  │  围栏绘制   │  │  任务控制   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
│                │                │
▼                ▼                │
┌─────────────┐  ┌─────────────┐        │
│ BleService  │  │ PathPlanner │        │
│  蓝牙通信   │  │  路径规划   │        │
└──────┬──────┘  └──────┬──────┘        │
│                │                │
│                ▼                │
│         ┌─────────────┐        │
│         │  AMapView   │◄───────┘
│         │   地图组件   │
│         └─────────────┘
▼
┌─────────────────────────────────────────────────────┐
│                   小车硬件                           │
│        (通过 BLE 接收指令、上报位置和探测结果)        │
└─────────────────────────────────────────────────────┘
```

---

## 5. 通信协议

### App → 小车（下行指令）

| 指令 | 格式 | 说明 |
|------|------|------|
| 启动 | `START` | 开始执行任务 |
| 暂停 | `PAUSE` | 暂停运动 |
| 停止 | `STOP` | 终止任务 |
| 下发路径 | `PATH:[{lat,lng},...]` | JSON 格式坐标数组 |

### 小车 → App（上行数据）

| 数据类型 | 格式 | 说明 |
|----------|------|------|
| 位置上报 | `POS:lat,lng` | 当前位置坐标 |
| 探测结果 | `DETECT:lat,lng,strength` | 金属探测点坐标和强度 |
| 状态上报 | `STATUS:xxx` | 当前状态（待定义） |
| 电量 | `BATTERY:xx` | 电量百分比 |

> 注：协议待与嵌入式团队确认后调整

---

## 6. 配置项

### 高德地图
| 配置 | 位置 | 说明 |
|------|------|------|
| API Key | 各 Screen 文件顶部常量 | 高德 Web端(JS API) Key |
| 安全密钥 | 同上 | 高德安全密钥 |

建议后续提取到统一配置文件 `src/config.ts`

### Android 签名
| 文件 | 说明 |
|------|------|
| `android/app/release.keystore` | 签名密钥文件 |
| `android/`keystore.properties`` | 签名密码配置 |

⚠️ 这两个文件已加入 `.gitignore`，勿提交到代码仓库

### 蓝牙 UUID
| 配置 | 默认值 | 说明 |
|------|--------|------|
| SERVICE_UUID | `0000ffe0-0000-1000-8000-00805f9b34fb` | BLE 服务 UUID |
| CHARACTERISTIC_UUID | `0000ffe1-0000-1000-8000-00805f9b34fb` | BLE 特征值 UUID |

待与嵌入式确认小车蓝牙模块的实际 UUID

---

## 7. 待完成功能

### P0（核心功能）
- [ ] 主页蓝牙状态同步
- [ ] 主页控制按钮联动蓝牙
- [ ] 实时显示小车位置
- [ ] 接收并显示金属探测结果
- [ ] 对接实际通信模块

### P1（重要功能）
- [ ] 任务状态机
- [ ] 围栏保存/加载
- [ ] 路径参数可配置 UI
- [ ] 探测点列表查看
- [ ] 返航功能

### P2（增强功能）
- [ ] 避障区域标记
- [ ] 结果导出
- [ ] 离线地图
- [ ] 历史任务记录

---

## 8. 构建命令

```bash
# 开发调试（真机）
npx react-native run-android

# 打包 Release APK
cd android
./gradlew assembleRelease
# 输出: android/app/build/outputs/apk/release/app-release.apk

# 清理构建
cd android && ./gradlew clean
```

---

## 9. 常见问题

### Q: 模拟器能调试蓝牙吗？
A: 不能，必须用真机调试蓝牙功能。

### Q: 地图显示白屏？
A: 检查高德 API Key 和安全密钥是否正确配置。

### Q: BLE 连接后一段时间报错？
A: BLE 有超时断开机制，已在 `BleService` 中添加断线检测。

---

*文档生成时间：2024年*
*适用版本：MetalDetector v1.0*
