/**
 * PathPlanner 接口定义
 * 用于依赖注入和单元测试 Mock
 */

// ==================== 类型定义 ====================

export interface Point {
  lat: number;
  lng: number;
}

export interface PathPlannerConfig {
  spacing: number;
  direction: 'horizontal' | 'vertical';
}

// ==================== IPathPlanner 接口 ====================

export interface IPathPlanner {
  // 配置管理
  setConfig(config: Partial<PathPlannerConfig>): void;
  getConfig(): PathPlannerConfig;

  // 多边形处理
  sortPointsByAngle(points: Point[]): Point[];
  computeConvexHull(points: Point[]): Point[];

  // 路径规划 (弓字形覆盖路径)
  generateZigzagPath(polygon: Point[], useConvexHull?: boolean): Point[];

  // 路径计算
  calculatePathLength(path: Point[]): number;
  estimateTime(pathLength: number, speed?: number): number;

  // 面积计算
  calculatePolygonArea(polygon: Point[]): number;
}

// ==================== 独立函数接口 ====================

export interface PathSimplifier {
  simplifyPath(points: Point[], tolerance: number): Point[];
  autoSimplifyPath(points: Point[], threshold?: number, tolerance?: number): Point[];
}

export default IPathPlanner;
