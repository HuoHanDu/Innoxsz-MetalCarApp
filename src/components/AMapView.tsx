import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface AMapViewProps {
  apiKey: string;
  securityCode: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  carPosition?: { lat: number; lng: number } | null;
  onMapReady?: () => void;
  onMapClick?: (lat: number, lng: number) => void;
  onFenceUpdate?: (points: Array<{ lat: number; lng: number }>) => void;
}

export interface AMapViewRef {
  startDrawFence: () => void;
  clearFence: () => void;
  undoFencePoint: () => void;
  closeFence: () => void;
  showPath: (points: Array<{ lat: number; lng: number }>) => void;
  clearPath: () => void;
}

const AMapView = forwardRef<AMapViewRef, AMapViewProps>(({
  apiKey,
  securityCode,
  center = { lat: 39.9042, lng: 116.4074 },
  zoom = 15,
  carPosition,
  onMapReady,
  onMapClick,
  onFenceUpdate,
}, ref) => {
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    startDrawFence: () => {
      webViewRef.current?.injectJavaScript('startDrawFence(); true;');
    },
    clearFence: () => {
      webViewRef.current?.injectJavaScript('clearFence(); true;');
    },
    undoFencePoint: () => {
      webViewRef.current?.injectJavaScript('undoFencePoint(); true;');
    },
    closeFence: () => {
      webViewRef.current?.injectJavaScript('closeFence(); true;');
    },
    showPath: (points) => {
      const pathStr = JSON.stringify(points);
      webViewRef.current?.injectJavaScript(`showPath(${pathStr}); true;`);
    },
    clearPath: () => {
      webViewRef.current?.injectJavaScript('clearPath(); true;');
    },
  }));

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; }
        html, body, #map { width: 100%; height: 100%; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script type="text/javascript">
        window._AMapSecurityConfig = {
          securityJsCode: '${securityCode}',
        }
      </script>
      <script src="https://webapi.amap.com/maps?v=2.0&key=${apiKey}"></script>
      <script>
        let map;
        let carMarker;
        let isDrawingFence = false;
        let fencePoints = [];
        let fenceMarkers = [];
        let fencePolyline = null;
        let fencePolygon = null;
        let pathPolyline = null;
        let pathMarkers = [];

        function initMap() {
          map = new AMap.Map('map', {
            zoom: ${zoom},
            center: [${center.lng}, ${center.lat}],
            mapStyle: 'amap://styles/dark',
          });

          AMap.plugin(['AMap.Geolocation', 'AMap.Scale'], function() {
            const geolocation = new AMap.Geolocation({
              enableHighAccuracy: true,
              timeout: 10000,
              buttonPosition: 'RB',
              zoomToAccuracy: true,
            });
            map.addControl(geolocation);
            map.addControl(new AMap.Scale());
          });

          map.on('complete', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
          });

          map.on('click', function(e) {
            const lat = e.lnglat.getLat();
            const lng = e.lnglat.getLng();
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapClick',
              lat: lat,
              lng: lng
            }));

            if (isDrawingFence) {
              addFencePoint(lat, lng);
            }
          });
        }

        function startDrawFence() {
          isDrawingFence = true;
          clearFence();
          clearPath();
        }

        function addFencePoint(lat, lng) {
          fencePoints.push({ lat, lng });
          
          const marker = new AMap.Marker({
            position: [lng, lat],
            content: '<div style="background:#e94560;width:14px;height:14px;border-radius:50%;border:3px solid #fff;"></div>',
            offset: new AMap.Pixel(-10, -10),
            draggable: true,
          });
          
          const pointIndex = fencePoints.length - 1;
          marker.on('dragend', function(e) {
            fencePoints[pointIndex] = {
              lat: e.lnglat.getLat(),
              lng: e.lnglat.getLng()
            };
            updateFenceShape();
            sendFenceUpdate();
          });
          
          map.add(marker);
          fenceMarkers.push(marker);
          
          updateFenceShape();
          sendFenceUpdate();
        }

        function updateFenceShape() {
          if (fencePolyline) map.remove(fencePolyline);
          if (fencePolygon) map.remove(fencePolygon);
          
          if (fencePoints.length < 2) return;
          
          const path = fencePoints.map(p => [p.lng, p.lat]);
          
          fencePolyline = new AMap.Polyline({
            path: path,
            strokeColor: '#e94560',
            strokeWeight: 3,
            strokeOpacity: 0.8,
          });
          map.add(fencePolyline);
          
          if (fencePoints.length >= 3) {
            fencePolygon = new AMap.Polygon({
              path: path,
              fillColor: '#e94560',
              fillOpacity: 0.2,
              strokeColor: '#e94560',
              strokeWeight: 2,
            });
            map.add(fencePolygon);
          }
        }

        function undoFencePoint() {
          if (fencePoints.length > 0) {
            fencePoints.pop();
            const marker = fenceMarkers.pop();
            if (marker) map.remove(marker);
            updateFenceShape();
            sendFenceUpdate();
          }
        }

        function closeFence() {
          isDrawingFence = false;
          if (fencePoints.length >= 3) {
            updateFenceShape();
            sendFenceUpdate();
          }
        }

        function clearFence() {
          fencePoints = [];
          fenceMarkers.forEach(m => map.remove(m));
          fenceMarkers = [];
          if (fencePolyline) map.remove(fencePolyline);
          if (fencePolygon) map.remove(fencePolygon);
          fencePolyline = null;
          fencePolygon = null;
          sendFenceUpdate();
        }

        function sendFenceUpdate() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'fenceUpdate',
            points: fencePoints
          }));
        }

        // 显示路径
        function showPath(points) {
          clearPath();
          if (!points || points.length === 0) return;

          const path = points.map(p => [p.lng, p.lat]);

          pathPolyline = new AMap.Polyline({
            path: path,
            strokeColor: '#4ade80',
            strokeWeight: 2,
            strokeOpacity: 0.8,
            strokeStyle: 'dashed',
          });
          map.add(pathPolyline);

          // 起点标记
          const startMarker = new AMap.Marker({
            position: path[0],
            content: '<div style="background:#4ade80;color:#1a1a2e;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">起点</div>',
            offset: new AMap.Pixel(-20, -10),
          });
          map.add(startMarker);
          pathMarkers.push(startMarker);

          // 终点标记
          const endMarker = new AMap.Marker({
            position: path[path.length - 1],
            content: '<div style="background:#f87171;color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">终点</div>',
            offset: new AMap.Pixel(-20, -10),
          });
          map.add(endMarker);
          pathMarkers.push(endMarker);
        }

        // 清除路径
        function clearPath() {
          if (pathPolyline) {
            map.remove(pathPolyline);
            pathPolyline = null;
          }
          pathMarkers.forEach(m => map.remove(m));
          pathMarkers = [];
        }

        // 小车位置
        function updateCarPosition(lat, lng) {
          if (carMarker) {
            carMarker.setPosition([lng, lat]);
          } else {
            carMarker = new AMap.Marker({
              position: [lng, lat],
              content: '<div style="background:#4ade80;color:#fff;padding:8px 12px;border-radius:20px;font-size:14px;white-space:nowrap;">🚗 小车</div>',
              offset: new AMap.Pixel(-40, -20),
            });
            map.add(carMarker);
          }
        }

        function setCenter(lat, lng) {
          map.setCenter([lng, lat]);
        }

        initMap();
      </script>
    </body>
    </html>
  `;

  useEffect(() => {
    if (carPosition && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        updateCarPosition(${carPosition.lat}, ${carPosition.lng});
        true;
      `);
    }
  }, [carPosition]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapReady' && onMapReady) {
        onMapReady();
      }
      if (data.type === 'mapClick' && onMapClick) {
        onMapClick(data.lat, data.lng);
      }
      if (data.type === 'fenceUpdate' && onFenceUpdate) {
        onFenceUpdate(data.points);
      }
    } catch (e) {
      console.error('WebView message error:', e);
    }
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ html: htmlContent }}
      style={styles.webview}
      onMessage={handleMessage}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      originWhitelist={['*']}
    />
  );
});

export default AMapView;

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
});