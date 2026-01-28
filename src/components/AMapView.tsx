import React, {useRef, useCallback, useState, useEffect, useMemo} from 'react';
import {View, StyleSheet, ViewStyle, Text} from 'react-native';
import {WebView} from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors} from '../theme';

interface Point {
  lat: number;
  lng: number;
}

// Douglas-Peucker 路径简化算法
const simplifyPath = (points: Point[], tolerance: number): Point[] => {
  if (points.length <= 2) return points;

  // 计算点到线段的垂直距离
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

interface AMapViewProps {
  style?: ViewStyle;
  center?: Point;
  zoom?: number;
  markers?: Array<{
    position: Point;
    title?: string;
    icon?: string;
  }>;
  polygon?: Point[];
  polyline?: Point[];
  onMapClick?: (point: Point) => void;
  onMapReady?: () => void;
}

export const AMapView: React.FC<AMapViewProps> = ({
  style,
  center = {lat: 39.9042, lng: 116.4074},
  zoom = 15,
  markers = [],
  polygon,
  polyline,
  onMapClick,
  onMapReady,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [amapKey, setAmapKey] = useState<string>('');
  const [amapSecurityKey, setAmapSecurityKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // 加载 API Key
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const [key, securityKey] = await Promise.all([
          AsyncStorage.getItem('@settings/amapKey'),
          AsyncStorage.getItem('@settings/amapSecurityKey'),
        ]);
        setAmapKey(key || '');
        setAmapSecurityKey(securityKey || '');
      } catch (error) {
        console.error('加载地图 Key 失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadKeys();
  }, []);

  // 基础地图 HTML - 只在 amapKey 变化时重新生成
  const mapHTML = useMemo(() => {
    if (!amapKey) {
      return `
        <html>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#1F1D2B;color:#ABBBC2;font-family:sans-serif;">
          <div style="text-align:center;">
            <p>请在设置中配置高德地图 API Key</p>
          </div>
        </body>
        </html>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; }
          html, body, #map { width: 100%; height: 100%; }
        </style>
        <script type="text/javascript">
          window._AMapSecurityConfig = {
            securityJsCode: '${amapSecurityKey}',
          }
        </script>
        <script src="https://webapi.amap.com/maps?v=2.0&key=${amapKey}"></script>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = new AMap.Map('map', {
            zoom: ${zoom},
            center: [${center.lng}, ${center.lat}],
            mapStyle: 'amap://styles/dark',
            viewMode: '2D'
          });

          // 存储覆盖物引用，用于动态更新
          var currentMarkers = [];
          var currentPolygon = null;
          var currentPolyline = null;

          // 更新标记点
          window.updateMarkers = function(markersData) {
            // 清除旧标记
            currentMarkers.forEach(function(m) { m.setMap(null); });
            currentMarkers = [];
            
            // 添加新标记
            markersData.forEach(function(m) {
              var marker = new AMap.Marker({
                position: new AMap.LngLat(m.lng, m.lat),
                title: m.title || '',
                content: '<div style="width:12px;height:12px;background:#EA7C69;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
                offset: new AMap.Pixel(-6, -6),
                map: map
              });
              currentMarkers.push(marker);
            });
          };

          // 更新多边形
          window.updatePolygon = function(path) {
            if (currentPolygon) {
              currentPolygon.setMap(null);
              currentPolygon = null;
            }
            if (path && path.length >= 3) {
              currentPolygon = new AMap.Polygon({
                path: path.map(function(p) { return new AMap.LngLat(p.lng, p.lat); }),
                fillColor: '#EA7C6930',
                strokeColor: '#EA7C69',
                strokeWeight: 2,
                map: map
              });
            }
          };

          // 更新折线 - 使用 Canvas 自定义图层提升大量路径的渲染性能
          var pathCanvas = null;
          var pathCtx = null;
          var cachedPath = null;
          
          // 初始化 Canvas 图层
          function initPathCanvas() {
            if (pathCanvas) return;
            
            var size = map.getSize();
            pathCanvas = document.createElement('canvas');
            pathCanvas.width = size.width * 2;  // 高清屏适配
            pathCanvas.height = size.height * 2;
            pathCanvas.style.width = size.width + 'px';
            pathCanvas.style.height = size.height + 'px';
            pathCanvas.style.position = 'absolute';
            pathCanvas.style.top = '0';
            pathCanvas.style.left = '0';
            pathCanvas.style.pointerEvents = 'none';
            pathCanvas.style.zIndex = '100';
            pathCtx = pathCanvas.getContext('2d');
            pathCtx.scale(2, 2);
            
            document.getElementById('map').appendChild(pathCanvas);
            
            // 监听地图移动和缩放，重绘路径
            map.on('mapmove', function() { drawPath(); });
            map.on('zoomchange', function() { drawPath(); });
          }
          
          // 绘制路径到 Canvas
          function drawPath() {
            if (!pathCtx || !cachedPath || cachedPath.length < 2) return;
            
            var size = map.getSize();
            pathCtx.clearRect(0, 0, size.width, size.height);
            
            pathCtx.strokeStyle = '#50D1AA';
            pathCtx.lineWidth = 2;
            pathCtx.setLineDash([8, 4]);
            pathCtx.lineCap = 'round';
            pathCtx.lineJoin = 'round';
            
            pathCtx.beginPath();
            
            for (var i = 0; i < cachedPath.length; i++) {
              var pixel = map.lngLatToContainer(new AMap.LngLat(cachedPath[i].lng, cachedPath[i].lat));
              if (i === 0) {
                pathCtx.moveTo(pixel.x, pixel.y);
              } else {
                pathCtx.lineTo(pixel.x, pixel.y);
              }
            }
            
            pathCtx.stroke();
          }
          
          window.updatePolyline = function(path) {
            // 清除旧的 AMap Polyline
            if (currentPolyline) {
              currentPolyline.setMap(null);
              currentPolyline = null;
            }
            
            // 路径点较少时使用 AMap Polyline（质量更好）
            // 路径点较多时使用 Canvas（性能更好）
            var CANVAS_THRESHOLD = 100;
            
            if (!path || path.length < 2) {
              cachedPath = null;
              if (pathCtx) {
                var size = map.getSize();
                pathCtx.clearRect(0, 0, size.width, size.height);
              }
              return;
            }
            
            if (path.length <= CANVAS_THRESHOLD) {
              // 点数较少，使用原生 Polyline
              cachedPath = null;
              if (pathCtx) {
                var size = map.getSize();
                pathCtx.clearRect(0, 0, size.width, size.height);
              }
              currentPolyline = new AMap.Polyline({
                path: path.map(function(p) { return new AMap.LngLat(p.lng, p.lat); }),
                strokeColor: '#50D1AA',
                strokeWeight: 3,
                strokeStyle: 'dashed',
                map: map
              });
            } else {
              // 点数较多，使用 Canvas 渲染
              initPathCanvas();
              cachedPath = path;
              drawPath();
            }
          };

          map.on('click', function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapClick',
              data: { lat: e.lnglat.getLat(), lng: e.lnglat.getLng() }
            }));
          });

          map.on('complete', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapReady'
            }));
          });
        </script>
      </body>
      </html>
    `;
  }, [amapKey, amapSecurityKey, center, zoom]);

  // 向地图发送指令
  const sendToMap = useCallback((script: string) => {
    webViewRef.current?.injectJavaScript(script + '; true;');
  }, []);

  // 当 markers 变化时，通过 JS 注入更新，而不是重新加载整个地图
  useEffect(() => {
    if (!mapReady) return;
    
    const markersData = markers.map(m => ({
      lng: m.position.lng,
      lat: m.position.lat,
      title: m.title || '',
    }));
    sendToMap(`window.updateMarkers(${JSON.stringify(markersData)})`);
  }, [markers, mapReady, sendToMap]);

  // 当 polygon 变化时更新
  useEffect(() => {
    if (!mapReady) return;
    sendToMap(`window.updatePolygon(${JSON.stringify(polygon || [])})`);
  }, [polygon, mapReady, sendToMap]);

  // 当 polyline 变化时更新（先简化路径再传递）
  useEffect(() => {
    if (!mapReady) return;
    
    if (!polyline || polyline.length < 2) {
      sendToMap(`window.updatePolyline([])`);
      return;
    }
    
    // 路径简化：当点数超过阈值时进行抽稀
    // tolerance 越大简化程度越高，0.00001 约为 1 米精度
    const SIMPLIFY_THRESHOLD = 200;
    const TOLERANCE = 0.000005; // 约 0.5 米
    
    let pathToSend = polyline;
    if (polyline.length > SIMPLIFY_THRESHOLD) {
      pathToSend = simplifyPath(polyline, TOLERANCE);
      console.log(`路径简化: ${polyline.length} -> ${pathToSend.length} 点`);
    }
    
    sendToMap(`window.updatePolyline(${JSON.stringify(pathToSend)})`);
  }, [polyline, mapReady, sendToMap]);

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        if (message.type === 'mapClick' && onMapClick) {
          onMapClick(message.data);
        } else if (message.type === 'mapReady') {
          setMapReady(true);
          onMapReady?.();
        }
      } catch (e) {
        console.error('Map message parse error:', e);
      }
    },
    [onMapClick, onMapReady],
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.placeholder, style]}>
        <Text style={styles.placeholderText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{html: mapHTML}}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        mixedContentMode="always"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});

export default AMapView;
