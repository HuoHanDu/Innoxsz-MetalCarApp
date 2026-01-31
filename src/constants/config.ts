/**
 * 应用配置常量
 * 集中管理所有魔法数字和默认配置值
 */

// ==================== 蓝牙配置 ====================

export const BLE_CONFIG = {
  /** 扫描超时时间（毫秒） */
  SCAN_TIMEOUT_MS: 10000,

  /** 连接超时时间（毫秒） */
  CONNECT_TIMEOUT_MS: 10000,

  /** 数据发送重试次数 */
  SEND_RETRY_COUNT: 3,

  /** 重连延迟（毫秒） */
  RECONNECT_DELAY_MS: 1000,
} as const;

// ==================== 路径规划配置 ====================

export const PATH_CONFIG = {
  /** 默认路径间距（米） */
  DEFAULT_SPACING: 2,

  /** 最小路径间距（米） */
  MIN_SPACING: 0.5,

  /** 最大路径间距（米） */
  MAX_SPACING: 10,

  /** 默认行进速度（米/秒） */
  DEFAULT_SPEED: 0.5,

  /** 路径简化阈值（点数超过此值时触发简化） */
  SIMPLIFY_THRESHOLD: 200,

  /** 路径简化容差（度） */
  SIMPLIFY_TOLERANCE: 0.000005,
} as const;

// ==================== 地图配置 ====================

export const MAP_CONFIG = {
  /** 默认地图中心（北京） */
  DEFAULT_CENTER: {
    lat: 39.9042,
    lng: 116.4074,
  },

  /** 默认缩放级别 */
  DEFAULT_ZOOM: 15,

  /** 最小缩放级别 */
  MIN_ZOOM: 3,

  /** 最大缩放级别 */
  MAX_ZOOM: 18,
} as const;

// ==================== UI 配置 ====================

export const UI_CONFIG = {
  /** 摇杆尺寸（像素） */
  JOYSTICK_SIZE: 150,

  /** 摇杆旋钮尺寸（像素） */
  JOYSTICK_KNOB_SIZE: 60,

  /** 进度环默认尺寸（像素） */
  PROGRESS_RING_SIZE: 80,

  /** 进度环默认线宽（像素） */
  PROGRESS_RING_STROKE_WIDTH: 8,

  /** 列表项动画时长（毫秒） */
  LIST_ANIMATION_DURATION: 300,

  /** 防抖延迟（毫秒） */
  DEBOUNCE_DELAY_MS: 300,
} as const;

// ==================== 探测配置 ====================

export const DETECTION_CONFIG = {
  /** 电池低电量警告阈值（百分比） */
  BATTERY_LOW_THRESHOLD: 20,

  /** 电池临界电量阈值（百分比） */
  BATTERY_CRITICAL_THRESHOLD: 10,

  /** 面积单位转换阈值（平方米转公顷） */
  AREA_HECTARE_THRESHOLD: 10000,
} as const;

// ==================== 类型导出 ====================

export type BleConfig = typeof BLE_CONFIG;
export type PathConfig = typeof PATH_CONFIG;
export type MapConfig = typeof MAP_CONFIG;
export type UIConfig = typeof UI_CONFIG;
export type DetectionConfig = typeof DETECTION_CONFIG;
