export interface Point {
  lat: number;
  lng: number;
}

export interface PathPlannerConfig {
  spacing: number; // 路径间距（米）
  direction: 'horizontal' | 'vertical'; // 弓字形方向
}

class PathPlanner {
  private static instance: PathPlanner;
  private config: PathPlannerConfig = {
    spacing: 2,
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

  // 生成弓字形覆盖路径（支持凹多边形）
  generateZigzagPath(polygon: Point[], useConvexHull: boolean = false): Point[] {
    if (polygon.length < 3) {
      return [];
    }

    // 根据参数选择使用凸包还是排序后的原始多边形
    const processedPolygon = useConvexHull 
      ? this.computeConvexHull(polygon) 
      : this.sortPointsByAngle(polygon);
    
    const bounds = this.getBounds(processedPolygon);
    const spacingDeg = this.metersToLatDegrees(this.config.spacing);
    const path: Point[] = [];

    if (this.config.direction === 'horizontal') {
      // 水平弓字形
      let lat = bounds.minLat;
      let direction = 1; // 1: left to right, -1: right to left

      while (lat <= bounds.maxLat) {
        // 对于凹多边形，可能有多个交点对
        const intersections = this.findIntersections(processedPolygon, lat, 'horizontal');

        if (intersections.length >= 2) {
          intersections.sort((a, b) => a.lng - b.lng);
          
          // 处理凹多边形的多段交点：成对处理
          const segments: Array<{start: Point; end: Point}> = [];
          for (let i = 0; i < intersections.length - 1; i += 2) {
            if (i + 1 < intersections.length) {
              segments.push({
                start: intersections[i],
                end: intersections[i + 1]
              });
            }
          }

          // 根据方向添加路径段
          if (direction === 1) {
            for (const seg of segments) {
              path.push(seg.start);
              path.push(seg.end);
            }
          } else {
            for (let i = segments.length - 1; i >= 0; i--) {
              path.push(segments[i].end);
              path.push(segments[i].start);
            }
          }

          direction *= -1;
        }

        lat += spacingDeg;
      }
    } else {
      // 垂直弓字形
      let lng = bounds.minLng;
      let direction = 1;
      const spacingLng = this.metersToLngDegrees(this.config.spacing, bounds.minLat);

      while (lng <= bounds.maxLng) {
        const intersections = this.findIntersections(processedPolygon, lng, 'vertical');

        if (intersections.length >= 2) {
          intersections.sort((a, b) => a.lat - b.lat);

          // 处理凹多边形的多段交点
          const segments: Array<{start: Point; end: Point}> = [];
          for (let i = 0; i < intersections.length - 1; i += 2) {
            if (i + 1 < intersections.length) {
              segments.push({
                start: intersections[i],
                end: intersections[i + 1]
              });
            }
          }

          if (direction === 1) {
            for (const seg of segments) {
              path.push(seg.start);
              path.push(seg.end);
            }
          } else {
            for (let i = segments.length - 1; i >= 0; i--) {
              path.push(segments[i].end);
              path.push(segments[i].start);
            }
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
