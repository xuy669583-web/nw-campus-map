import { useCallback, useEffect, useState, useRef } from 'react';
import { Layers, Bus, Footprints, Wrench, Crosshair } from 'lucide-react';
import { useMapContext } from '../hooks/useMapContext';
import { getMapInstance, doLocate } from './AMapContainer';
import ZoomControl from './ZoomControl';

// Campus center for searching nearby bus stops
const CAMPUS_CENTER_LNG = 103.7381;
const CAMPUS_CENTER_LAT = 36.0985;

// Store fetched bus stop data globally for dialog to access
function setBusStopData(stops: any[]) {
  (window as any).__busStopData = stops;
}
export function getBusStopData(): any[] {
  return (window as any).__busStopData || [];
}

export default function FloatingToolbar() {
  const { state } = useMapContext();
  const [locStatus, setLocStatus] = useState<'idle' | 'done' | 'error'>('idle');
  const [locatingNow, setLocatingNow] = useState(false);
  const [transitVisible, setTransitVisible] = useState(false);

  // useRef avoids closure staleness - always points to latest markers
  const markersRef = useRef<any[]>([]);
  const visibleRef = useRef(false);

  // Haversine distance in meters
  function getDistance(lng1: number, lat1: number, lng2: number, lat2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Fetch bus line data from AMap API to get precise coordinates
  async function fetchBusLines(): Promise<any[]> {
    const WEB_SERVICE_KEY = 'f814cda153d9f1650fa114047bb2ba8d';
    const lines = ['66路', '121路', '166路', 'B1路', 'TB1路', '72路'];
    const allStops: any[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
      try {
        const url = `https://restapi.amap.com/v3/bus/linename?key=${WEB_SERVICE_KEY}&city=兰州&keywords=${encodeURIComponent(line)}&extensions=all`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.status === '1' && data.buslines) {
          data.buslines.forEach((bl: any) => {
            if (bl.busstops) {
              bl.busstops.forEach((stop: any) => {
                const [lng, lat] = stop.location.split(',').map(Number);
                const dist = getDistance(CAMPUS_CENTER_LNG, CAMPUS_CENTER_LAT, lng, lat);
                if (dist <= 1000 && !seen.has(stop.name)) {
                  seen.add(stop.name);
                  allStops.push({
                    id: `bs_${stop.name}`,
                    name: stop.name,
                    type: '公交站点',
                    address: '',
                    lng, lat,
                    distance: Math.round(dist),
                    routes: line,
                  });
                } else if (dist <= 1000) {
                  // Add route to existing stop
                  const existing = allStops.find(s => s.name === stop.name);
                  if (existing && !existing.routes.includes(line)) {
                    existing.routes += `,${line}`;
                  }
                }
              });
            }
          });
        }
      } catch (e) { /* skip failed line */ }
    }

    return allStops.sort((a, b) => a.distance - b.distance);
  }

  // Create markers using bus line API for precise coordinates
  const createMarkers = useCallback(async () => {
    const map = getMapInstance();
    if (!map || !window.AMap) return;

    // If already created, just show
    if (markersRef.current.length > 0) {
      markersRef.current.forEach((m: any) => { try { m.setMap(map); } catch {} });
      visibleRef.current = true;
      setTransitVisible(true);
      return;
    }

    // Fetch precise coordinates from bus line API
    const stopData = await fetchBusLines();

    if (stopData.length > 0) {
      const markers: any[] = [];

      stopData.forEach((stop: any) => {
        const el = document.createElement('div');
        el.style.cssText = `width:28px;height:28px;background:#2d6a4f;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:bold;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.25);`;
        el.innerText = '公';

        const marker = new window.AMap.Marker({
          position: [stop.lng, stop.lat],
          content: el,
          offset: new window.AMap.Pixel(-14, -14),
          zIndex: 160,
        });

        marker.on('click', () => {
          window.dispatchEvent(new CustomEvent('transit-select', {
            detail: {
              poi: {
                id: stop.id,
                name: stop.name,
                type: stop.type,
                address: stop.address,
                location: { lng: stop.lng, lat: stop.lat },
                distance: stop.distance,
              }
            }
          }));
        });

        marker.setMap(map);
        markers.push(marker);
      });

      markersRef.current = markers;
      setBusStopData(stopData);
      visibleRef.current = true;
      setTransitVisible(true);
      window.dispatchEvent(new CustomEvent('bus-stops-loaded', { detail: { stops: stopData } }));
    } else {
      // Fallback
      createFallbackMarkers(map, markersRef, visibleRef, setTransitVisible);
    }
  }, []);

  // Fallback markers with approximate coordinates
  const createFallbackMarkers = (map: any, mRef: any, vRef: any, setVis: any) => {
    const fallbackStops = [
      { id: 'bs001', name: '西北师大站', lng: 103.7359, lat: 36.1006 },
      { id: 'bs002', name: '西北师大站(BRT)', lng: 103.7362, lat: 36.1004 },
      { id: 'bs003', name: '省党校家属院', lng: 103.7375, lat: 36.0998 },
      { id: 'bs004', name: '省委党校', lng: 103.7392, lat: 36.0989 },
      { id: 'bs005', name: '政法大学', lng: 103.7408, lat: 36.0975 },
      { id: 'bs007', name: '培黎广场', lng: 103.7318, lat: 36.1032 },
      { id: 'bs009', name: '交通大学', lng: 103.7425, lat: 36.0962 },
      { id: 'bs010', name: '安宁区医院', lng: 103.7345, lat: 36.0978 },
      { id: 'bs012', name: '兰天公寓', lng: 103.7410, lat: 36.0995 },
      { id: 'bs014', name: '幸福巷', lng: 103.7380, lat: 36.1012 },
    ];

    const markers: any[] = [];
    fallbackStops.forEach((stop) => {
      const el = document.createElement('div');
      el.style.cssText = `width:28px;height:28px;background:#2d6a4f;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:bold;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.25);`;
      el.innerText = '公';

      const marker = new window.AMap.Marker({
        position: [stop.lng, stop.lat],
        content: el,
        offset: new window.AMap.Pixel(-14, -14),
        zIndex: 160,
      });

      marker.on('click', () => {
        window.dispatchEvent(new CustomEvent('transit-select', {
          detail: { poi: { id: stop.id, name: stop.name, type: '公交站点', address: '', location: { lng: stop.lng, lat: stop.lat } } }
        }));
      });

      marker.setMap(map);
      markers.push(marker);
    });

    mRef.current = markers;
    setBusStopData(fallbackStops);
    vRef.current = true;
    setVis(true);
    window.dispatchEvent(new CustomEvent('bus-stops-loaded', { detail: { stops: fallbackStops } }));
  };

  const hideMarkers = useCallback(() => {
    markersRef.current.forEach((m: any) => { try { m.setMap(null); } catch {} });
    visibleRef.current = false;
    setTransitVisible(false);
  }, []);

  // Store latest callbacks in refs to avoid useEffect dependency issues
  const createRef = useRef(createMarkers);
  const hideRef = useRef(hideMarkers);
  useEffect(() => { createRef.current = createMarkers; hideRef.current = hideMarkers; });

  // Listen for transit toggle events - stable handler, no dependencies
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.show) createRef.current();
      else hideRef.current();
    };
    window.addEventListener('transit-toggle', handler);
    return () => window.removeEventListener('transit-toggle', handler);
  }, []);

  const handleToolClick = useCallback((key: string) => {
    switch (key) {
      case 'navigate': window.dispatchEvent(new CustomEvent('open-nav-panel')); break;
      case 'transit': window.dispatchEvent(new CustomEvent('open-transit-dialog')); break;
      case 'layer': window.dispatchEvent(new CustomEvent('open-layer-panel')); break;
      case 'annotation': window.dispatchEvent(new CustomEvent('toggle-annotation')); break;
      case 'locate': if (!locatingNow) { setLocatingNow(true); doLocate(false); } break;
    }
  }, [locatingNow]);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.error) { setLocStatus('error'); setLocatingNow(false); }
      else if (d?.position) { setLocStatus('done'); setLocatingNow(false); }
      else if (d?.locating) { setLocatingNow(true); }
    };
    window.addEventListener('user-located', handler);
    return () => window.removeEventListener('user-located', handler);
  }, []);

  const locateStyle = locStatus === 'done' ? { background: 'var(--blue-pale)', color: 'var(--blue-standard)', border: '1.5px solid var(--blue-standard)' } : locStatus === 'error' ? { background: '#fee2e2', color: '#e83e3e', border: '1.5px solid #e83e3e' } : {};

  return (
    <>
      <div className="absolute left-3 top-[68px] z-[50] flex flex-col gap-1.5" style={{ pointerEvents: 'auto' }}>
        <button onClick={() => handleToolClick('navigate')} className="tool-btn-float" title="导航" style={{ background: 'var(--blue-standard)', color: '#fff' }}><Footprints size={18} /></button>
        <button onClick={() => handleToolClick('locate')} className="tool-btn-float" title={locStatus === 'done' ? '已定位' : locStatus === 'error' ? '定位失败' : locatingNow ? '定位中...' : '定位'} style={locateStyle as any}>
          {locatingNow ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Crosshair size={18} />}
        </button>
        <button onClick={() => handleToolClick('transit')} className={`tool-btn-float ${transitVisible ? 'active' : ''}`} title="公共交通"><Bus size={18} /></button>
        <button onClick={() => handleToolClick('annotation')} className={`tool-btn-float ${['mark','text','drawPoint','drawLine','drawPolygon','measureArea','measure','coord'].includes(state.activeMode) ? 'active' : ''}`} title="工具箱"><Wrench size={18} /></button>
        <div style={{ height: 1, background: 'var(--divider)', margin: '2px 4px' }} />
        <button onClick={() => handleToolClick('layer')} className="tool-btn-float" title="图层设置"><Layers size={18} /></button>
      </div>
      <div className="absolute right-3 top-[68px] z-[50]" style={{ pointerEvents: 'auto' }}><ZoomControl /></div>
    </>
  );
}
