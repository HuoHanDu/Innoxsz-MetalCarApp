import React, {useRef, useCallback, useState, useEffect, useMemo} from 'react';
import {View, StyleSheet, ViewStyle, Text} from 'react-native';
import {WebView} from 'react-native-webview';
import {colors} from '../theme';
import {autoSimplifyPath} from '../services/PathPlanner';

interface Point {
  lat: number;
  lng: number;
}

interface AMapViewProps {
  style?: ViewStyle;
  // API Key 配置（从外部传入）
  apiKey?: string;
  securityKey?: string;
  // 地图配置
  center?: Point;
  zoom?: number;
  markers?: Array<{
    position: Point;
    title?: string;
    icon?: string;
  }>;
  polygon?: Point[];
  polyline?: Point[];
  // 事件回调
  onMapClick?: (point: Point) => void;
  onMapReady?: () => void;
}

export const AMapView: React.FC<AMapViewProps> = ({
  style,
  apiKey = '',
  securityKey = '',
  center = {lat: 39.9042, lng: 116.4074},
  zoom = 15,
  markers = [],
  polygon,
  polyline,
  onMapClick,
  onMapReady,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);

  // 基础地图 HTML - 只在 apiKey 变化时重新生成
  const mapHTML = useMemo(() => {
    if (!apiKey) {
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
            securityJsCode: '${securityKey}',
          }
        </script>
        <script src="https://webapi.amap.com/maps?v=2.0&key=${apiKey}"></script>
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

          // 更新折线
          window.updatePolyline = function(path) {
            // 清除旧的 Polyline
            if (currentPolyline) {
              currentPolyline.setMap(null);
              currentPolyline = null;
            }
            
            if (!path || path.length < 2) {
              return;
            }
            
            // 使用原生 Polyline 渲染
            currentPolyline = new AMap.Polyline({
              path: path.map(function(p) { return new AMap.LngLat(p.lng, p.lat); }),
              strokeColor: '#50D1AA',
              strokeWeight: 3,
              strokeStyle: 'dashed',
              map: map
            });
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
  }, [apiKey, securityKey, center, zoom]);

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

    // 使用 PathPlanner 的路径简化算法
    const pathToSend = autoSimplifyPath(polyline);
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
});

export default AMapView;
