export interface Point {
  lat: number;
  lng: number;
}

export interface PathPlannerConfig {
  spacing: number; // 路径间距（米）
  direction: 'horizontal' | 'vertical'; // 弓字形方向
}

import {PATH_CONFIG} from '../constants';

// ==================== 路径简化算法 ====================

/**
 * 计算点到线段的垂直距离
 */
const perpendicularDistance = (point: Point, lineStart: Point, lineEnd: Point): number => {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;

  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point.lng - lineStart.lng, 2) +
      Math.pow(point.lat - lineStart.lat, 2)
    );
  }

  const t = ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / (dx * dx + dy * dy);
  const nearestLng = lineStart.lng + t * dx;
  const nearestLat = lineStart.lat + t * dy;

  return Math.sqrt(
    Math.pow(point.lng - nearestLng, 2) +
    Math.pow(point.lat - nearestLat, 2)
  );
};

/**
 * Douglas-Peucker 路径简化算法
 * 用于减少路径点数量，同时保持路径形状
 * 
 * @param points 原始路径点数组
 * @param tolerance 容差值（经纬度单位），越大简化程度越高
 *                  - 0.00001 约等于 1 米精度
 *                  - 0.000005 约等于 0.5 米精度
 * @returns 简化后的路径点数组
 */
export const simplifyPath = (points: Point[], tolerance: number): Point[] => {
  if (points.length <= 2) return [...points];

  // 找到距离最大的点
  let maxDistance = 0;
  let maxIndex = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // 如果最大距离大于容差，递归简化
  if (maxDistance > tolerance) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPath(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[end]];
};

/**
 * 根据点数和阈值自动简化路径
 * 
 * @param points 原始路径点数组
 * @param threshold 点数阈值，超过此值才进行简化，默认 200
 * @param tolerance 容差值，默认 0.000005（约 0.5 米）
 * @returns 简化后的路径点数组
 */
export const autoSimplifyPath = (
  points: Point[],
  threshold: number = PATH_CONFIG.SIMPLIFY_THRESHOLD,
  tolerance: number = PATH_CONFIG.SIMPLIFY_TOLERANCE
): Point[] => {
  if (points.length <= threshold) {
    return points;
  }

  const simplified = simplifyPath(points, tolerance);
  console.log(`路径简化: ${points.length} -> ${simplified.length} 点`);
  return simplified;
};

// ==================== PathPlanner 类 ====================

class PathPlanner {
  private static instance: PathPlanner;
  private config: PathPlannerConfig = {
    spacing: PATH_CONFIG.DEFAULT_SPACING,
    direction: 'horizontal',
  };

  private constructor() {}

  static getInstance(): PathPlanner {
    if (!PathPlanner.instance) {
      PathPlanner.instance = new PathPlanner();
    }
    return PathPlanner.instance;
  }

  // 设置配置
  setConfig(config: Partial<PathPlannerConfig>): void {
    this.config = {...this.config, ...config};
  }

  getConfig(): PathPlannerConfig {
    return {...this.config};
  }

  /**
   * 按极角排序点集，形成简单多边形（不自相交）
   * 支持凹多边形，保留所有顶点
   */
  sortPointsByAngle(points: Point[]): Point[] {
    if (points.length < 3) return [...points];

    // 计算质心作为参考点
    const centroid = {
      lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
      lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
    };

    // 按相对于质心的极角排序
    const sorted = [...points].sort((a, b) => {
      const angleA = Math.atan2(a.lat - centroid.lat, a.lng - centroid.lng);
      const angleB = Math.atan2(b.lat - centroid.lat, b.lng - centroid.lng);
      return angleA - angleB;
    });

    return sorted;
  }

  /**
   * 计算凸包 - Graham Scan 算法
   * 仅在需要时使用（如计算最大外围边界）
   */
  computeConvexHull(points: Point[]): Point[] {
    if (points.length < 3) return [...points];

    let start = 0;
    for (let i = 1; i < points.length; i++) {
      if (
        points[i].lat < points[start].lat ||
        (points[i].lat === points[start].lat && points[i].lng < points[start].lng)
      ) {
        start = i;
      }
    }

    const startPoint = points[start];
    const remaining = points.filter((_, i) => i !== start);

    remaining.sort((a, b) => {
      const angleA = Math.atan2(a.lat - startPoint.lat, a.lng - startPoint.lng);
      const angleB = Math.atan2(b.lat - startPoint.lat, b.lng - startPoint.lng);
      if (angleA !== angleB) return angleA - angleB;
      const distA = (a.lng - startPoint.lng) ** 2 + (a.lat - startPoint.lat) ** 2;
      const distB = (b.lng - startPoint.lng) ** 2 + (b.lat - startPoint.lat) ** 2;
      return distA - distB;
    });

    const hull: Point[] = [startPoint];
    for (const point of remaining) {
      while (hull.length >= 2 && this.crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
        hull.pop();
      }
      hull.push(point);
    }
    return hull;
  }

  private crossProduct(o: Point, a: Point, b: Point): number {
    return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
  }

  // ==================== 三角剖分算法 ====================

  /**
   * 耳切法三角剖分 (Ear Clipping Triangulation)
   * 将简单多边形分割成三角形
   */
  private triangulate(polygon: Point[]): Point[][] {
    if (polygon.length < 3) return [];
    if (polygon.length === 3) return [polygon];

    const triangles: Point[][] = [];
    let vertices = [...polygon];

    // 确保多边形是逆时针方向
    if (this.getPolygonArea(vertices) < 0) {
      vertices.reverse();
    }

    while (vertices.length > 3) {
      let earFound = false;

      for (let i = 0; i < vertices.length; i++) {
        const prev = vertices[(i - 1 + vertices.length) % vertices.length];
        const curr = vertices[i];
        const next = vertices[(i + 1) % vertices.length];

        // 检查是否是凸顶点（耳朵候选）
        if (this.crossProduct(prev, curr, next) > 0) {
          // 检查三角形内是否有其他顶点
          let isEar = true;
          for (let j = 0; j < vertices.length; j++) {
            if (j === (i - 1 + vertices.length) % vertices.length || 
                j === i || 
                j === (i + 1) % vertices.length) {
              continue;
            }
            if (this.isPointInTriangle(vertices[j], prev, curr, next)) {
              isEar = false;
              break;
            }
          }

          if (isEar) {
            triangles.push([prev, curr, next]);
            vertices.splice(i, 1);
            earFound = true;
            break;
          }
        }
      }

      // 如果没有找到耳朵，可能是多边形自相交，强制移除一个顶点
      if (!earFound) {
        vertices.splice(0, 1);
      }
    }

    if (vertices.length === 3) {
      triangles.push(vertices);
    }

    return triangles;
  }

  /**
   * 计算多边形有符号面积（用于判断方向）
   */
  private getPolygonArea(polygon: Point[]): number {
    let area = 0;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += polygon[i].lng * polygon[j].lat;
      area -= polygon[j].lng * polygon[i].lat;
    }
    return area / 2;
  }

  /**
   * 判断点是否在三角形内
   */
  private isPointInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
    const d1 = this.crossProduct(a, b, p);
    const d2 = this.crossProduct(b, c, p);
    const d3 = this.crossProduct(c, a, p);

    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

    return !(hasNeg && hasPos);
  }

  /**
   * 在单个三角形内生成弓字形路径
   */
  private generateTrianglePath(triangle: Point[]): Point[] {
    const bounds = this.getBounds(triangle);
    const spacingDeg = this.metersToLatDegrees(this.config.spacing);
    const path: Point[] = [];

    let lat = bounds.minLat;
    let direction = 1;

    while (lat <= bounds.maxLat) {
      const intersections = this.findIntersections(triangle, lat, 'horizontal');

      if (intersections.length >= 2) {
        intersections.sort((a, b) => a.lng - b.lng);
        
        if (direction === 1) {
          path.push(intersections[0]);
          path.push(intersections[intersections.length - 1]);
        } else {
          path.push(intersections[intersections.length - 1]);
          path.push(intersections[0]);
        }
        direction *= -1;
      }

      lat += spacingDeg;
    }

    return path;
  }

  /**
   * 连接多个三角形的路径，优化顺序以减少空行程
   */
  private connectTrianglePaths(trianglePaths: Point[][]): Point[] {
    if (trianglePaths.length === 0) return [];
    if (trianglePaths.length === 1) return trianglePaths[0];

    // 过滤空路径
    const validPaths = trianglePaths.filter(p => p.length > 0);
    if (validPaths.length === 0) return [];

    const result: Point[] = [...validPaths[0]];
    const used = new Set<number>([0]);

    while (used.size < validPaths.length) {
      const lastPoint = result[result.length - 1];
      let nearestIdx = -1;
      let nearestDist = Infinity;
      let reverseNearest = false;

      // 找到最近的未使用路径
      for (let i = 0; i < validPaths.length; i++) {
        if (used.has(i)) continue;

        const path = validPaths[i];
        const distToStart = this.pointDistance(lastPoint, path[0]);
        const distToEnd = this.pointDistance(lastPoint, path[path.length - 1]);

        if (distToStart < nearestDist) {
          nearestDist = distToStart;
          nearestIdx = i;
          reverseNearest = false;
        }
        if (distToEnd < nearestDist) {
          nearestDist = distToEnd;
          nearestIdx = i;
          reverseNearest = true;
        }
      }

      if (nearestIdx !== -1) {
        used.add(nearestIdx);
        const nextPath = reverseNearest 
          ? [...validPaths[nearestIdx]].reverse() 
          : validPaths[nearestIdx];
        result.push(...nextPath);
      }
    }

    return result;
  }

  /**
   * 计算两点之间的简单距离（用于路径优化）
   */
  private pointDistance(a: Point, b: Point): number {
    return Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2));
  }

  // ==================== 主路径生成方法 ====================

  // 生成弓字形覆盖路径（支持凹多边形）
  generateZigzagPath(polygon: Point[], useConvexHull: boolean = false): Point[] {
    if (polygon.length < 3) {
      return [];
    }

    // 外围模式：使用凸包，直接生成路径
    if (useConvexHull) {
      const convexHull = this.computeConvexHull(polygon);
      return this.generateSimpleZigzagPath(convexHull);
    }

    // 精确模式：使用三角剖分处理凹多边形
    const triangles = this.triangulate(polygon);
    
    if (triangles.length === 0) {
      return [];
    }

    // 为每个三角形生成路径
    const trianglePaths = triangles.map(tri => this.generateTrianglePath(tri));

    // 连接所有三角形路径
    return this.connectTrianglePaths(trianglePaths);
  }

  /**
   * 为凸多边形生成简单弓字形路径
   */
  private generateSimpleZigzagPath(polygon: Point[]): Point[] {
    const bounds = this.getBounds(polygon);
    const spacingDeg = this.metersToLatDegrees(this.config.spacing);
    const path: Point[] = [];

    if (this.config.direction === 'horizontal') {
      let lat = bounds.minLat;
      let direction = 1;

      while (lat <= bounds.maxLat) {
        const intersections = this.findIntersections(polygon, lat, 'horizontal');

        if (intersections.length >= 2) {
          intersections.sort((a, b) => a.lng - b.lng);
          
          if (direction === 1) {
            path.push(intersections[0]);
            path.push(intersections[intersections.length - 1]);
          } else {
            path.push(intersections[intersections.length - 1]);
            path.push(intersections[0]);
          }
          direction *= -1;
        }

        lat += spacingDeg;
      }
    } else {
      let lng = bounds.minLng;
      let direction = 1;
      const spacingLng = this.metersToLngDegrees(this.config.spacing, bounds.minLat);

      while (lng <= bounds.maxLng) {
        const intersections = this.findIntersections(polygon, lng, 'vertical');

        if (intersections.length >= 2) {
          intersections.sort((a, b) => a.lat - b.lat);

          if (direction === 1) {
            path.push(intersections[0]);
            path.push(intersections[intersections.length - 1]);
          } else {
            path.push(intersections[intersections.length - 1]);
            path.push(intersections[0]);
          }
          direction *= -1;
        }

        lng += spacingLng;
      }
    }

    return path;
  }

  // 计算路径总长度（米）
  calculatePathLength(path: Point[]): number {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      length += this.calculateDistance(path[i - 1], path[i]);
    }
    return length;
  }

  // 估算完成时间（分钟）
  estimateTime(pathLength: number, speed: number = 0.5): number {
    // speed: 速度（米/秒），默认 0.5 m/s
    return pathLength / speed / 60;
  }

  // 计算多边形面积（平方米）
  calculatePolygonArea(polygon: Point[]): number {
    if (polygon.length < 3) return 0;

    let area = 0;
    const n = polygon.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const p1 = this.toCartesian(polygon[i]);
      const p2 = this.toCartesian(polygon[j]);
      area += p1.x * p2.y - p2.x * p1.y;
    }

    return Math.abs(area / 2);
  }

  // 获取多边形边界
  private getBounds(polygon: Point[]): {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } {
    const lats = polygon.map(p => p.lat);
    const lngs = polygon.map(p => p.lng);

    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }

  // 查找多边形与直线的交点
  private findIntersections(
    polygon: Point[],
    value: number,
    direction: 'horizontal' | 'vertical',
  ): Point[] {
    const intersections: Point[] = [];
    const n = polygon.length;

    for (let i = 0; i < n; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % n];

      let intersection: Point | null = null;

      if (direction === 'horizontal') {
        // 水平线 lat = value
        if ((p1.lat <= value && p2.lat >= value) || (p1.lat >= value && p2.lat <= value)) {
          if (p1.lat !== p2.lat) {
            const t = (value - p1.lat) / (p2.lat - p1.lat);
            const lng = p1.lng + t * (p2.lng - p1.lng);
            intersection = {lat: value, lng};
          }
        }
      } else {
        // 垂直线 lng = value
        if ((p1.lng <= value && p2.lng >= value) || (p1.lng >= value && p2.lng <= value)) {
          if (p1.lng !== p2.lng) {
            const t = (value - p1.lng) / (p2.lng - p1.lng);
            const lat = p1.lat + t * (p2.lat - p1.lat);
            intersection = {lat, lng: value};
          }
        }
      }

      if (intersection) {
        intersections.push(intersection);
      }
    }

    return intersections;
  }

  // 米转换为纬度度数
  private metersToLatDegrees(meters: number): number {
    return meters / 111320;
  }

  // 米转换为经度度数
  private metersToLngDegrees(meters: number, lat: number): number {
    return meters / (111320 * Math.cos((lat * Math.PI) / 180));
  }

  // 计算两点之间的距离（米）
  private calculateDistance(p1: Point, p2: Point): number {
    const R = 6371000; // 地球半径（米）
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const deltaLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const deltaLng = ((p2.lng - p1.lng) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // 经纬度转笛卡尔坐标（用于面积计算）
  private toCartesian(point: Point): {x: number; y: number} {
    const R = 6371000;
    return {
      x: R * Math.cos((point.lat * Math.PI) / 180) * Math.cos((point.lng * Math.PI) / 180),
      y: R * Math.cos((point.lat * Math.PI) / 180) * Math.sin((point.lng * Math.PI) / 180),
    };
  }
}

export default PathPlanner.getInstance();
