import { useEffect, useRef } from 'react';
import { useMapContext } from '../hooks/useMapContext';
import { CAMPUS_CENTER, CAMPUS_ZOOM, CAMPUS_BOUNDS } from '../data/pois';

declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig: any;
    __campusMapInstance: any;
    __amapPluginsReady: boolean;
    __mapActiveMode: string;
    __userLocation: [number, number] | null;
    __locationMarker: any;
    __accuracyCircle: any;
    __geolocationInstance: any;
    __locationWatchId: number | null;
  }
}

const PLUGINS = [
  'AMap.Marker',
  'AMap.Polygon',
  'AMap.Polyline',
  'AMap.InfoWindow',
  'AMap.PlaceSearch',
  'AMap.AutoComplete',
  'AMap.Geocoder',
  'AMap.Walking',
  'AMap.Driving',
  'AMap.Geolocation',
  'AMap.Scale',
  'AMap.TileLayer.Satellite',
];

// Intercept getContext to force preserveDrawingBuffer for WebGL
// This must run BEFORE AMap loads
const origGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, attrs?: any) {
  if (type && type.indexOf('webgl') !== -1) {
    attrs = Object.assign({}, attrs, { preserveDrawingBuffer: true });
  }
  return (origGetContext as any).call(this, type, attrs);
} as any;

/** WGS-84 to GCJ-02 conversion (Mars coordinate system) */
function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  const pi = 3.14159265358979324;
  const a = 6378245.0;
  const ee = 0.00669342162296594323;

  function transformLat(lng2: number, lat2: number) {
    let ret = -100.0 + 2.0 * lng2 + 3.0 * lat2 + 0.2 * lat2 * lat2 + 0.1 * lng2 * lat2 + 0.2 * Math.sqrt(Math.abs(lng2));
    ret += (20.0 * Math.sin(6.0 * lng2 * pi) + 20.0 * Math.sin(2.0 * lng2 * pi)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lat2 * pi) + 40.0 * Math.sin(lat2 / 3.0 * pi)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(lat2 / 12.0 * pi) + 320.0 * Math.sin(lat2 * pi / 30.0)) * 2.0 / 3.0;
    return ret;
  }
  function transformLng(lng2: number, lat2: number) {
    let ret = 300.0 + lng2 + 2.0 * lat2 + 0.1 * lng2 * lng2 + 0.1 * lng2 * lat2 + 0.1 * Math.sqrt(Math.abs(lng2));
    ret += (20.0 * Math.sin(6.0 * lng2 * pi) + 20.0 * Math.sin(2.0 * lng2 * pi)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lng2 * pi) + 40.0 * Math.sin(lng2 / 3.0 * pi)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(lng2 / 12.0 * pi) + 300.0 * Math.sin(lng2 / 30.0 * pi)) * 2.0 / 3.0;
    return ret;
  }
  function outOfChina(lng2: number, lat2: number) {
    return lng2 < 72.004 || lng2 > 137.8347 || lat2 < 0.8293 || lat2 > 55.8271;
  }

  if (outOfChina(lng, lat)) return [lng, lat];
  let dlat = transformLat(lng - 105.0, lat - 35.0);
  let dlng = transformLng(lng - 105.0, lat - 35.0);
  const radlat = lat / 180.0 * pi;
  let magic = Math.sin(radlat);
  magic = 1 - ee * magic * magic;
  const sqrtmagic = Math.sqrt(magic);
  dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * pi);
  dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * pi);
  return [lng + dlng, lat + dlat];
}

/** Show location marker + accuracy circle on map */
function showLocationMarker(pos: [number, number], accuracy?: number) {
  const map = (window as any).__campusMapInstance;
  if (!map || !window.AMap) return;
  try {
    // Remove old
    const oldM = (window as any).__locationMarker;
    const oldC = (window as any).__accuracyCircle;
    if (oldM) try { oldM.setMap(null); } catch {}
    if (oldC) try { oldC.setMap(null); } catch {}

    // Accuracy circle
    if (accuracy && accuracy > 0) {
      const circle = new window.AMap.Circle({
        center: pos,
        radius: accuracy,
        strokeColor: '#1a5fb4',
        strokeWeight: 1,
        fillColor: '#1a5fb4',
        fillOpacity: 0.1,
      });
      circle.setMap(map);
      (window as any).__accuracyCircle = circle;
    }

    // Blue dot with pulse
    const el = document.createElement('div');
    el.style.cssText = 'position:relative;width:28px;height:28px;';
    el.innerHTML = `
      <div style="width:28px;height:28px;background:#1a5fb4;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 2px #1a5fb4,0 2px 10px rgba(0,0,0,0.3);position:relative;z-index:2;"></div>
      <div style="position:absolute;top:50%;left:50%;width:28px;height:28px;margin-top:-14px;margin-left:-14px;background:rgba(26,95,180,0.3);border-radius:50%;animation:location-pulse 1.8s ease-out infinite;z-index:1;"></div>
    `;
    const marker = new window.AMap.Marker({
      position: pos, content: el,
      offset: new window.AMap.Pixel(-14, -14), zIndex: 300,
    });
    marker.setMap(map);
    (window as any).__locationMarker = marker;
  } catch {}
}

export default function AMapContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, setMap } = useMapContext();
  const initRef = useRef(false);

  useEffect(() => { window.__mapActiveMode = state.activeMode; }, [state.activeMode]);

  useEffect(() => {
    if (initRef.current || !containerRef.current) return;
    initRef.current = true;

    window._AMapSecurityConfig = {
      securityJsCode: '6b5d50940f539dfb6c6eb0a3c8dd7b9d',
    };

    const script = document.createElement('script');
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=fecbdd1b1c5fc73e9fc542cedb07cbfd';
    script.async = true;

    script.onload = () => {
      const AMap = window.AMap;
      if (!AMap || !containerRef.current) return;

      const map = new AMap.Map(containerRef.current, {
        center: CAMPUS_CENTER, zoom: CAMPUS_ZOOM,
        viewMode: '3D',          // 开启3D视角
        pitch: 50,               // 初始俯仰角度50度
        rotation: 0,             // 初始旋转角度
        mapStyle: 'amap://styles/whitesmoke',
        WebGLParams: { preserveDrawingBuffer: true },
      });
      const bounds = new AMap.Bounds(CAMPUS_BOUNDS.southwest, CAMPUS_BOUNDS.northeast);
      map.setLimitBounds(bounds);

      AMap.plugin(PLUGINS, () => {
        map.addControl(new AMap.Scale({ position: 'LB' }));

        try { const satLayer = new AMap.TileLayer.Satellite({ opacity: 1 }); satLayer.setMap(map); (window as any).__satLayer = satLayer; } catch {}

        // ===== Mouse middle button for pitch control =====
        const container = containerRef.current;
        if (container) {
          let isMiddleDown = false;
          let lastY = 0;

          container.addEventListener('mousedown', (e: MouseEvent) => {
            if (e.button === 1) { // Middle button
              e.preventDefault();
              isMiddleDown = true;
              lastY = e.clientY;
              container.style.cursor = 'ns-resize';
            }
          });

          window.addEventListener('mousemove', (e: MouseEvent) => {
            if (!isMiddleDown) return;
            const deltaY = lastY - e.clientY;
            lastY = e.clientY;
            const currentPitch = map.getPitch();
            map.setPitch(Math.max(0, Math.min(83, currentPitch + deltaY * 0.3)));
          });

          window.addEventListener('mouseup', (e: MouseEvent) => {
            if (e.button === 1 && isMiddleDown) {
              isMiddleDown = false;
              container.style.cursor = '';
            }
          });

          // Prevent default middle-click scroll
          container.addEventListener('auxclick', (e: MouseEvent) => {
            if (e.button === 1) e.preventDefault();
          });
        }

        if (!document.getElementById('pulse-style')) {
          const style = document.createElement('style');
          style.id = 'pulse-style';
          style.textContent = `@keyframes location-pulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(2.2);opacity:0}}`;
          document.head.appendChild(style);
        }

        // Store geolocation instance for shared use
        const geolocation = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 15000,
          convert: true,
          showButton: false,
          showMarker: false,
          showCircle: false,
          panToLocation: true,
          zoomToAccuracy: true,
        });
        (window as any).__geolocationInstance = geolocation;

        window.__amapPluginsReady = true;
        window.__campusMapInstance = map;
        setMap(map);

        // ========== AUTO-LOCATE on page load ==========
        setTimeout(() => {
          doLocate(true);
        }, 800);

        // CORS fix
        const fixTileCors = () => {
          const imgs = containerRef.current?.querySelectorAll('img');
          imgs?.forEach((img) => {
            if (!img.crossOrigin && img.src && (img.src.includes('autonavi') || img.src.includes('amap'))) {
              img.crossOrigin = 'anonymous';
            }
          });
        };
        fixTileCors();
        map.on('mapmove', fixTileCors);
        map.on('zoomchange', fixTileCors);
        const corsInterval = setInterval(fixTileCors, 1000);
        (window as any).__corsInterval = corsInterval;
      });
    };

    document.head.appendChild(script);
    return () => { if (window.__campusMapInstance) { window.__campusMapInstance.destroy(); window.__campusMapInstance = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />;
}

/** Unified locate function - called from AMapContainer (auto) or FloatingToolbar (manual) */
export function doLocate(isAuto: boolean = false) {
  const map = (window as any).__campusMapInstance;
  if (!map) return;

  // 1. If already located and manual click → just fly to it
  const saved = (window as any).__userLocation;
  if (saved && !isAuto) {
    map.setZoomAndCenter(17, saved);
    showLocationMarker(saved);
    window.dispatchEvent(new CustomEvent('user-located', { detail: { position: saved, source: 'cached' } }));
    return;
  }

  if (!isAuto) {
    window.dispatchEvent(new CustomEvent('user-located', { detail: { locating: true } }));
  }

  // 2. Use AMap.Geolocation with callback (correct API)
  const geo = (window as any).__geolocationInstance;
  if (geo) {
    try {
      geo.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete' && result.position) {
          // result.position is already GCJ-02 (converted by AMap)
          const pos: [number, number] = [result.position.getLng(), result.position.getLat()];
          const accuracy = result.accuracy;
          window.__userLocation = pos;
          showLocationMarker(pos, accuracy);
          if (isAuto) map.setZoomAndCenter(17, pos);
          else map.panTo(pos);
          window.dispatchEvent(new CustomEvent('user-located', {
            detail: { lng: pos[0], lat: pos[1], position: pos, accuracy, source: 'amap-geo' }
          }));
        } else {
          // AMap geo failed → try browser GPS with manual conversion
          tryBrowserGPS(isAuto);
        }
      });
      return;
    } catch { /* fallback */ }
  }

  // 3. Fallback to browser GPS
  tryBrowserGPS(isAuto);
}

function tryBrowserGPS(isAuto: boolean) {
  if (!navigator.geolocation) {
    if (!isAuto) window.dispatchEvent(new CustomEvent('user-located', { detail: { error: '浏览器不支持定位' } }));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (p) => {
      // Convert WGS-84 to GCJ-02 for AMap
      const wgsPos: [number, number] = [p.coords.longitude, p.coords.latitude];
      const gcjPos = wgs84ToGcj02(wgsPos[0], wgsPos[1]);
      const accuracy = p.coords.accuracy;
      window.__userLocation = gcjPos;
      showLocationMarker(gcjPos, accuracy);
      const map = (window as any).__campusMapInstance;
      if (map) {
        if (isAuto) map.setZoomAndCenter(17, gcjPos);
        else map.panTo(gcjPos);
      }
      window.dispatchEvent(new CustomEvent('user-located', {
        detail: { lng: gcjPos[0], lat: gcjPos[1], position: gcjPos, accuracy, source: 'browser-gps' }
      }));
    },
    (err) => {
      console.warn('Browser GPS failed:', err.code, err.message);
      if (!isAuto) {
        window.dispatchEvent(new CustomEvent('user-located', { detail: { error: err.message, code: err.code } }));
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

export function getMapInstance(): any {
  return window.__campusMapInstance || null;
}

export function arePluginsReady(): boolean {
  return window.__amapPluginsReady || false;
}
