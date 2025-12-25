interface Point {
  lat: number;
  lng: number;
}

interface PathConfig {
  gridSize: number;  // 栅格大小（米）
  direction: 'horizontal' | 'vertical';  // 扫描方向
}

class PathPlanner {
  // 地球半径（米）
  private EARTH_RADIUS = 6371000;

  // 计算两点距离（米）
  getDistance(p1: Point, p2: Point): number {
    const lat1 = this.toRad(p1.lat);
    const lat2 = this.toRad(p2.lat);
    const deltaLat = this.toRad(p2.lat - p1.lat);
    const deltaLng = this.toRad(p2.lng - p1.lng);

    const a = Math.sin(deltaLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS * c;
  }

  // 角度转弧度
  private toRad(deg: number): number {
    return deg * Math.PI / 180;
  }

  // 弧度转角度
  private toDeg(rad: number): number {
    return rad * 180 / Math.PI;
  }

  // 米转经纬度偏移量（近似）
  private metersToLatLng(meters: number, lat: number): { latOffset: number; lngOffset: number } {
    const latOffset = meters / 111320;
    const lngOffset = meters / (111320 * Math.cos(this.toRad(lat)));
    return { latOffset, lngOffset };
  }

  // 获取多边形边界框
  getBounds(polygon: Point[]): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
    const lats = polygon.map(p => p.lat);
    const lngs = polygon.map(p => p.lng);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }

  // 判断点是否在多边形内（射线法）
  isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;

      if (((yi > point.lat) !== (yj > point.lat)) &&
          (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  // 生成弓字形覆盖路径
  generateZigzagPath(polygon: Point[], config: PathConfig): Point[] {
    if (polygon.length < 3) return [];

    const { gridSize, direction } = config;
    const bounds = this.getBounds(polygon);
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const { latOffset, lngOffset } = this.metersToLatLng(gridSize, centerLat);

    const path: Point[] = [];
    let reverse = false;

    if (direction === 'horizontal') {
      // 水平扫描（从上到下，左右交替）
      for (let lat = bounds.maxLat; lat >= bounds.minLat; lat -= latOffset) {
        const rowPoints: Point[] = [];
        
        for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += lngOffset) {
          const point = { lat, lng };
          if (this.isPointInPolygon(point, polygon)) {
            rowPoints.push(point);
          }
        }

        if (rowPoints.length > 0) {
          if (reverse) {
            rowPoints.reverse();
          }
          path.push(...rowPoints);
          reverse = !reverse;
        }
      }
    } else {
      // 垂直扫描（从左到右，上下交替）
      for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += lngOffset) {
        const colPoints: Point[] = [];
        
        for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latOffset) {
          const point = { lat, lng };
          if (this.isPointInPolygon(point, polygon)) {
            colPoints.push(point);
          }
        }

        if (colPoints.length > 0) {
          if (reverse) {
            colPoints.reverse();
          }
          path.push(...colPoints);
          reverse = !reverse;
        }
      }
    }

    return path;
  }

  // 计算路径总长度（米）
  getPathLength(path: Point[]): number {
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += this.getDistance(path[i - 1], path[i]);
    }
    return total;
  }

  // 估算时间（秒），假设小车速度 0.5 m/s
  estimateTime(path: Point[], speed: number = 0.5): number {
    return this.getPathLength(path) / speed;
  }
}

export default new PathPlanner();