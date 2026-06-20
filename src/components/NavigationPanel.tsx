import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Footprints, Car, ArrowUpDown, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useMapContext } from '../hooks/useMapContext';
import { campusPOIs } from '../data/pois';

type NavMode = 'walking' | 'driving';

interface RouteStep {
  instruction: string;
  distance: number;
  road?: string;
  action?: string;
}

interface RouteObj {
  id: number;
  start: [number, number];
  end: [number, number];
  startLabel: string;
  endLabel: string;
  distance: number;
  time: number;
  mode: NavMode;
  path: [number, number][]; // Full route path for animation
  line: any;
  startMarker: any;
  endMarker: any;
  nodeMarkers: any[];
  steps: RouteStep[];
}

const routeObjects: RouteObj[] = [];

function getNextId(): number {
  const used = new Set(routeObjects.map(r => r.id));
  let id = 1;
  while (used.has(id)) id++;
  return id;
}

function compactIds() {
  const sorted = [...routeObjects].sort((a, b) => a.id - b.id);
  sorted.forEach((r, idx) => {
    const newId = idx + 1;
    if (r.id !== newId) {
      r.id = newId;
      updateMarkerLabel(r.startMarker, newId, '起', '#1a5fb4');
      updateMarkerLabel(r.endMarker, newId, '终', '#e83e3e');
    }
  });
  routeObjects.sort((a, b) => a.id - b.id);
}

function updateMarkerLabel(marker: any, id: number, label: string, color: string) {
  if (!marker) return;
  try {
    marker.setContent(
      `<div style="width:28px;height:28px;background:${color};border:2px solid rgba(0,0,0,0.8);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${id}-${label}</div>`
    );
  } catch {}
}

const PRESET_ROUTES = [
  { name: '北大门→图书馆', start: [103.735912, 36.100563] as [number, number], end: [103.737956, 36.098157] as [number, number] },
  { name: '西苑→东苑食堂', start: [103.732185, 36.099344] as [number, number], end: [103.740127, 36.098082] as [number, number] },
  { name: '西门→东门', start: [103.731298, 36.09822] as [number, number], end: [103.744297, 36.096028] as [number, number] },
];

let selectStartMarker: any = null;
let selectEndMarker: any = null;

function clearSelectMarker(type: 'start' | 'end') {
  if (type === 'start' && selectStartMarker) {
    try { selectStartMarker.setMap(null); } catch {}
    selectStartMarker = null;
  }
  if (type === 'end' && selectEndMarker) {
    try { selectEndMarker.setMap(null); } catch {}
    selectEndMarker = null;
  }
}

function clearAllSelectMarkers() {
  clearSelectMarker('start');
  clearSelectMarker('end');
}

function createSelectMarker(pos: [number, number], type: 'start' | 'end', label: string) {
  const map = (window as any).__campusMapInstance;
  if (!map || !window.AMap) return;
  const color = type === 'start' ? '#1a5fb4' : '#e83e3e';
  const marker = new window.AMap.Marker({
    position: pos,
    content: `<div style="width:28px;height:28px;background:${color};border:2px solid rgba(0,0,0,0.8);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${label}</div>`,
    offset: new window.AMap.Pixel(-14, -14),
    zIndex: 170,
  });
  marker.setMap(map);
  if (type === 'start') { clearSelectMarker('start'); selectStartMarker = marker; }
  else { clearSelectMarker('end'); selectEndMarker = marker; }
}

export default function NavigationPanel() {
  const { state: mapState } = useMapContext();
  const [panelState, setPanelState] = useState<'closed' | 'open' | 'mini'>('closed');
  const [mode, setMode] = useState<NavMode>('walking');
  const [startPos, setStartPos] = useState<[number, number] | null>(null);
  const [endPos, setEndPos] = useState<[number, number] | null>(null);
  const [startLabel, setStartLabel] = useState('');
  const [endLabel, setEndLabel] = useState('');
  const [routes, setRoutes] = useState<RouteObj[]>([]);
  const [tip, setTip] = useState('');
  const [expandedRoute, setExpandedRoute] = useState<number | null>(null);
  const [navigating, setNavigating] = useState(false);
  const navMarkerRef = useRef<any>(null);
  const navIntervalRef = useRef<any>(null);
  const selectingRef = useRef<'none' | 'start' | 'end'>('none');

  // Listen for external nav requests (from POI detail or infrastructure)
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d) return;
      if (d.type === 'start' && d.pos) {
        setStartPos(d.pos);
        setStartLabel(d.label || '起点');
        createSelectMarker(d.pos, 'start', '起');
        setPanelState('open');
      }
      if (d.type === 'end' && d.pos) {
        setEndPos(d.pos);
        setEndLabel(d.label || '终点');
        createSelectMarker(d.pos, 'end', '终');
        setPanelState('open');
      }
    };
    window.addEventListener('set-nav-point', handler);
    return () => window.removeEventListener('set-nav-point', handler);
  }, []);

  // Listen for open-nav-panel (from left toolbar navigate button)
  useEffect(() => {
    const handler = () => setPanelState('open');
    window.addEventListener('open-nav-panel', handler);
    return () => window.removeEventListener('open-nav-panel', handler);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setRoutes([...routeObjects]), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (mapState.activeMode !== 'route') {
      clearAllSelectMarkers();
      selectingRef.current = 'none';
      setTip('');
    }
  }, [mapState.activeMode]);

  useEffect(() => {
    const handler = (e: Event) => {
      const sel = selectingRef.current;
      if (sel === 'none') return;
      const d = (e as CustomEvent).detail;
      if (!d?.lnglat) return;
      const pos = d.lnglat as [number, number];
      const nextId = getNextId();
      if (sel === 'start') {
        setStartPos(pos); setStartLabel(`点${nextId}-起点`);
        createSelectMarker(pos, 'start', `${nextId}-起`);
        // Auto-switch to end selection
        selectingRef.current = 'end';
        setTip('请在地图上点击选择终点（按ESC取消）');
        window.dispatchEvent(new CustomEvent('nav-selecting', { detail: { type: 'end' } }));
      } else {
        setEndPos(pos); setEndLabel(`点${nextId}-终点`);
        createSelectMarker(pos, 'end', `${nextId}-终`);
        selectingRef.current = 'none'; setTip('');
        window.dispatchEvent(new CustomEvent('nav-selecting', { detail: { type: 'none' } }));
      }
    };
    window.addEventListener('campus-map-click', handler);
    return () => window.removeEventListener('campus-map-click', handler);
  }, []);

  const startSelect = useCallback((type: 'start' | 'end') => {
    selectingRef.current = type;
    setPanelState('mini');
    setTip(`请在地图上点击选择${type === 'start' ? '起点' : '终点'}（按ESC取消）`);
    window.dispatchEvent(new CustomEvent('nav-selecting', { detail: { type } }));
  }, []);

  const cancelSelect = useCallback(() => {
    selectingRef.current = 'none'; setTip('');
    window.dispatchEvent(new CustomEvent('nav-selecting', { detail: { type: 'none' } }));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectingRef.current !== 'none') {
        selectingRef.current = 'none'; setTip('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clearPanel = useCallback(() => {
    setPanelState('closed');
    selectingRef.current = 'none'; setTip('');
    window.dispatchEvent(new CustomEvent('nav-selecting', { detail: { type: 'none' } }));
    clearAllSelectMarkers();
    routeObjects.forEach(r => {
      try { r.line.setMap(null); } catch {}
      try { r.startMarker.setMap(null); } catch {}
      try { r.endMarker.setMap(null); } catch {}
      r.nodeMarkers.forEach((n: any) => { try { n.setMap(null); } catch {} });
    });
    routeObjects.length = 0;
    setRoutes([]);
    setStartPos(null); setStartLabel('');
    setEndPos(null); setEndLabel('');
    setExpandedRoute(null);
  }, []);

  const handleSwap = useCallback(() => {
    const tp = startPos, tl = startLabel;
    setStartPos(endPos); setStartLabel(endLabel);
    setEndPos(tp); setEndLabel(tl);
  }, [startPos, endPos, startLabel, endLabel]);

  // Start navigation simulation with MoveAnimation
  const startNavigation = useCallback((route: RouteObj) => {
    const map = (window as any).__campusMapInstance;
    if (!map || !window.AMap) return;

    // Stop existing navigation
    if (navMarkerRef.current) {
      navMarkerRef.current.stopMove();
      navMarkerRef.current.setMap(null);
    }
    if (navIntervalRef.current) {
      clearInterval(navIntervalRef.current);
    }

    // Create navigation marker
    const el = document.createElement('div');
    el.style.cssText = `width:24px;height:24px;background:#1a5fb4;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
    el.innerText = '▲';

    const marker = new window.AMap.Marker({
      position: route.path[0],
      content: el,
      offset: new window.AMap.Pixel(-12, -12),
      zIndex: 300,
    });
    marker.setMap(map);
    navMarkerRef.current = marker;
    setNavigating(true);

    // Use MoveAnimation for smooth movement along route
    try {
      marker.moveAlong(route.path, {
        duration: Math.max(5000, route.distance * 10), // speed based on distance
        autoRotation: true,
        circlable: false,
      });

      // Listen for move end
      marker.on('moveend', () => {
        setNavigating(false);
      });

      // Real-time: center map on marker position
      marker.on('moving', () => {
        const pos = marker.getPosition();
        if (pos) map.setCenter([pos.lng, pos.lat]);
      });
    } catch {
      // Fallback: simple interval-based animation
      let idx = 0;
      navIntervalRef.current = setInterval(() => {
        if (idx >= route.path.length) {
          clearInterval(navIntervalRef.current);
          setNavigating(false);
          return;
        }
        marker.setPosition(route.path[idx]);
        map.setCenter(route.path[idx]);
        idx += 1;
      }, 200);
    }

    // Close navigation panel
    setPanelState('mini');
  }, []);

  // Stop navigation
  const stopNavigation = useCallback(() => {
    if (navMarkerRef.current) {
      try { navMarkerRef.current.stopMove(); } catch {}
      navMarkerRef.current.setMap(null);
      navMarkerRef.current = null;
    }
    if (navIntervalRef.current) {
      clearInterval(navIntervalRef.current);
      navIntervalRef.current = null;
    }
    setNavigating(false);
  }, []);

  const handleNavigate = useCallback(() => {
    if (!startPos || !endPos) { alert('请选择起点和终点'); return; }
    const map = (window as any).__campusMapInstance;
    if (!map || !window.AMap) return;
    const doSearch = () => {
      try {
        const searchFn = mode === 'walking'
          ? new window.AMap.Walking({})
          : new window.AMap.Driving({});
        searchFn.search(
          new window.AMap.LngLat(startPos[0], startPos[1]),
          new window.AMap.LngLat(endPos[0], endPos[1]),
          (status: string, result: any) => {
            if (status === 'complete' && result.routes?.[0]) {
              const r = result.routes[0];
              const path: [number, number][] = [];
              const steps: RouteStep[] = [];
              r.steps.forEach((s: any) => {
                s.path.forEach((p: any) => path.push([p.lng, p.lat]));
                steps.push({ instruction: s.instruction || '', distance: s.distance || 0, road: s.road, action: s.action });
              });
              clearAllSelectMarkers();
              const id = getNextId();
              const sm = new window.AMap.Marker({
                position: startPos,
                content: `<div style="width:28px;height:28px;background:#1a5fb4;border:2px solid rgba(0,0,0,0.8);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${id}-起</div>`,
                offset: new window.AMap.Pixel(-14, -14), zIndex: 160,
              });
              sm.on('click', () => handleDeleteRoute(id)); sm.setMap(map);
              const em = new window.AMap.Marker({
                position: endPos,
                content: `<div style="width:28px;height:28px;background:#e83e3e;border:2px solid rgba(0,0,0,0.8);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${id}-终</div>`,
                offset: new window.AMap.Pixel(-14, -14), zIndex: 160,
              });
              em.on('click', () => handleDeleteRoute(id)); em.setMap(map);
              const line = new window.AMap.Polyline({
                path, strokeColor: '#1a5fb4', strokeWeight: 5,
                strokeStyle: mode === 'walking' ? 'dashed' : 'solid',
                strokeDasharray: mode === 'walking' ? [10, 8] : undefined,
                cursor: 'pointer', lineCap: 'round',
                showDir: true, // Show direction arrows on route
              });
              line.on('click', () => handleDeleteRoute(id));
              line.on('mouseover', () => line.setOptions({ strokeWeight: 7, strokeColor: '#e83e3e' }));
              line.on('mouseout', () => line.setOptions({ strokeWeight: 5, strokeColor: '#1a5fb4' }));
              line.setMap(map);
              const nodes: any[] = [];
              const stepSize = Math.max(1, Math.floor(path.length / 5));
              for (let i = stepSize; i < path.length - 1; i += stepSize) {
                const n = new window.AMap.Marker({
                  position: path[i],
                  content: '<div style="width:8px;height:8px;background:#e83e3e;border:1.5px solid #000;cursor:pointer;"></div>',
                  offset: new window.AMap.Pixel(-4, -4),
                });
                n.on('click', () => handleDeleteRoute(id)); n.setMap(map); nodes.push(n);
              }
              routeObjects.push({
                id, start: startPos, end: endPos,
                startLabel: startLabel || `路线${id}起点`,
                endLabel: endLabel || `路线${id}终点`,
                distance: r.distance, time: r.time, mode, path, line, startMarker: sm, endMarker: em, nodeMarkers: nodes, steps,
              });
              setRoutes([...routeObjects]);
              map.setFitView([line, sm, em], true, [80, 80, 80, 80]);
              setPanelState('mini');
            } else { alert(`未找到${mode === 'walking' ? '步行' : '驾车'}路线`); }
          }
        );
      } catch { setTimeout(doSearch, 500); }
    };
    if ((window as any).__amapPluginsReady) doSearch();
    else { const w = setInterval(() => { if ((window as any).__amapPluginsReady) { clearInterval(w); doSearch(); } }, 200); setTimeout(() => clearInterval(w), 5000); }
  }, [startPos, endPos, startLabel, endLabel, mode]);

  const handleDeleteRoute = useCallback((id: number) => {
    const idx = routeObjects.findIndex(r => r.id === id);
    if (idx < 0) return;
    const r = routeObjects[idx];
    try { r.line.setMap(null); } catch {}
    try { r.startMarker.setMap(null); } catch {}
    try { r.endMarker.setMap(null); } catch {}
    r.nodeMarkers.forEach(n => { try { n.setMap(null); } catch {} });
    routeObjects.splice(idx, 1);
    compactIds();
    setExpandedRoute(prev => routeObjects.some(ro => ro.id === prev) ? prev : null);
    setRoutes([...routeObjects]);
  }, []);

  if (panelState === 'closed') return null;

  if (panelState === 'mini') {
    return (
      <div className="absolute bottom-4 left-[50%] translate-x-[-30%] z-[50] flex flex-col gap-2" style={{ pointerEvents: 'auto', maxWidth: 320 }}>
        {tip && (
          <div className="py-2 px-3 text-center text-xs font-bold animate-pulse glass-card" style={{ background: '#e83e3e', color: '#fff' }}>
            {tip} <button onClick={cancelSelect} className="ml-2 underline">取消</button>
          </div>
        )}
        <div className="glass-card flex items-center gap-2 px-3 py-2">
          <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--blue-standard)' }}>{routes.length}条路线</span>
          <div className="flex-1 flex gap-1 overflow-x-auto">
            {routes.map(r => (
              <span key={r.id} className="text-[9px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--blue-pale)', color: 'var(--blue-standard)' }}>
                {r.id}: {(r.distance / 1000).toFixed(2)}km
              </span>
            ))}
          </div>
          <button onClick={() => setPanelState('open')} className="btn-solid p-1.5 flex-shrink-0" style={{ borderRadius: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
          </button>
          <button onClick={() => { handleClearAllRoutes(); setRoutes([]); }} className="p-1.5 flex-shrink-0" style={{ color: '#e83e3e' }}>
            <Trash2 size={16} />
          </button>
          <button onClick={clearPanel} className="p-1.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-start justify-center pt-[80px]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0 backdrop-modern" onClick={() => { cancelSelect(); setPanelState('mini'); }} />
      <div className="relative mx-4 w-full max-w-[380px] max-h-[80vh] flex flex-col glass-card" style={{ overflow: 'hidden' }}>
        <div className="gold-line" />
        <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--navy-deep)' }}>
          <div className="flex gap-1">
            <button onClick={() => setMode('walking')} className="px-3 py-1.5 text-sm font-bold flex items-center gap-1 rounded-lg transition-all" style={{ background: mode === 'walking' ? 'var(--blue-standard)' : 'rgba(255,255,255,0.1)', color: '#fff' }}><Footprints size={16} />步行</button>
            <button onClick={() => setMode('driving')} className="px-3 py-1.5 text-sm font-bold flex items-center gap-1 rounded-lg transition-all" style={{ background: mode === 'driving' ? 'var(--blue-standard)' : 'rgba(255,255,255,0.1)', color: '#fff' }}><Car size={16} />驾车</button>
          </div>
          <button onClick={() => { cancelSelect(); setPanelState('mini'); }} className="p-1" style={{ color: 'rgba(255,255,255,0.7)' }}><X size={18} /></button>
        </div>

        {tip && (
          <div className="mx-4 mt-2 py-1.5 px-3 text-center text-xs font-bold animate-pulse glass-card" style={{ background: '#e83e3e', color: '#fff' }}>
            {tip} <button onClick={cancelSelect} className="ml-2 underline">取消</button>
          </div>
        )}

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#1a5fb4', color: '#fff' }}>
              <span className="text-xs font-bold">起</span>
            </div>
            <div className="flex-1 flex items-center gap-1">
              <select className="text-xs py-2 px-2 flex-1 rounded-lg" style={{ border: '1.5px solid var(--border-light)', background: '#fff', color: 'var(--text-primary)' }}
                value="" onChange={e => {
                  const v = e.target.value;
                  if (v === '__mypos__') { handleQuickLocate(setStartPos, setStartLabel); }
                  else if (v === '__map__') { startSelect('start'); }
                  else if (v) { const p = campusPOIs.find(x => x.name === v); if (p) { setStartPos(p.position); setStartLabel(p.name); createSelectMarker(p.position, 'start', '起'); } }
                }}>
                <option value="">{startLabel || '选择起点...'}</option>
                <option value="__mypos__">📍 我的位置</option>
                <option value="__map__">🗺️ 地图选点</option>
                <optgroup label="校内地点">{campusPOIs.map(p => <option key={'s-'+p.name} value={p.name}>{p.name}</option>)}</optgroup>
              </select>
              {startPos && <button onClick={() => { setStartPos(null); setStartLabel(''); clearSelectMarker('start'); }} className="text-[10px] px-1" style={{ color: '#e83e3e' }}>清除</button>}
            </div>
          </div>
          <div className="flex justify-center -my-0.5"><button onClick={handleSwap} className="p-0.5 rounded" style={{ color: 'var(--text-muted)' }}><ArrowUpDown size={12} /></button></div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#e83e3e', color: '#fff' }}>
              <span className="text-xs font-bold">终</span>
            </div>
            <div className="flex-1 flex items-center gap-1">
              <select className="text-xs py-2 px-2 flex-1 rounded-lg" style={{ border: '1.5px solid var(--border-light)', background: '#fff', color: 'var(--text-primary)' }}
                value="" onChange={e => {
                  const v = e.target.value;
                  if (v === '__map__') { startSelect('end'); }
                  else if (v) { const p = campusPOIs.find(x => x.name === v); if (p) { setEndPos(p.position); setEndLabel(p.name); createSelectMarker(p.position, 'end', '终'); } }
                }}>
                <option value="">{endLabel || '选择终点...'}</option>
                <option value="__map__">🗺️ 地图选点</option>
                <optgroup label="校内地点">{campusPOIs.map(p => <option key={'e-'+p.name} value={p.name}>{p.name}</option>)}</optgroup>
              </select>
              {endPos && <button onClick={() => { setEndPos(null); setEndLabel(''); clearSelectMarker('end'); }} className="text-[10px] px-1" style={{ color: '#e83e3e' }}>清除</button>}
            </div>
          </div>
        </div>

        <div className="px-4 pb-2">
          <button onClick={handleNavigate} className="w-full py-2.5 text-sm font-bold text-white btn-solid">开始导航</button>
        </div>

        {routes.length > 0 && (
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-2" style={{ maxHeight: '35vh' }}>
            {routes.map(r => {
              const isExpanded = expandedRoute === r.id;
              return (
                <div key={r.id} className="mb-2 glass-card" style={{ overflow: 'hidden' }}>
                  <div className="flex items-center justify-between px-3 py-2 cursor-pointer" style={{ background: 'var(--blue-pale)' }} onClick={() => setExpandedRoute(isExpanded ? null : r.id)}>
                    <span className="text-[11px] font-bold" style={{ color: 'var(--blue-standard)' }}>{r.id}: {r.startLabel} → {r.endLabel} {(r.distance/1000).toFixed(2)}km</span>
                    <div className="flex items-center gap-1">
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteRoute(r.id); }} style={{ color: '#e83e3e' }}><X size={12} /></button>
                    </div>
                  </div>
                  {isExpanded && r.steps.length > 0 && (
                    <div className="px-3 py-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      <div className="text-[10px] font-bold mb-1" style={{ color: 'var(--blue-standard)' }}>总距离：{(r.distance/1000).toFixed(2)}公里（{r.mode === 'walking' ? '步行' : '驾车'}）</div>
                      {r.steps.filter(s => s.instruction).map((s, idx) => (
                        <div key={idx} className="py-1" style={{ borderBottom: idx < r.steps.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                          <div className="text-[10px] font-medium" style={{ color: 'var(--text-primary)' }}>{idx + 1}. {s.instruction}</div>
                        </div>
                      ))}
                      {/* Start navigation button */}
                      {navigating ? (
                        <button onClick={stopNavigation} className="w-full mt-2 py-2 text-[10px] font-bold text-white rounded-lg" style={{ background: '#e83e3e' }}>
                          停止导航
                        </button>
                      ) : (
                        <button onClick={() => startNavigation(r)} className="w-full mt-2 py-2 text-[10px] font-bold text-white rounded-lg" style={{ background: 'var(--blue-standard)' }}>
                          ▶ 开始导航
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="px-4 pb-3 flex flex-wrap gap-1.5" style={{ borderTop: '1px solid var(--divider)', paddingTop: 8 }}>
          {PRESET_ROUTES.map(r => (
            <button key={r.name} onClick={() => { setStartPos(r.start); setStartLabel(r.name.split('→')[0]); setEndPos(r.end); setEndLabel(r.name.split('→')[1]); }} className="text-[10px] px-2 py-1 font-medium rounded-md" style={{ background: 'var(--blue-pale)', color: 'var(--blue-standard)' }}>{r.name}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function handleClearAllRoutes() {
  routeObjects.forEach(r => {
    try { r.line.setMap(null); } catch {}
    try { r.startMarker.setMap(null); } catch {}
    try { r.endMarker.setMap(null); } catch {}
    r.nodeMarkers.forEach(n => { try { n.setMap(null); } catch {} });
  });
  routeObjects.length = 0;
  clearAllSelectMarkers();
}

function handleQuickLocate(setPos: (p: [number, number]) => void, setLabel: (l: string) => void) {
  // 1. Already saved → use directly (already GCJ-02)
  const saved = (window as any).__userLocation;
  if (saved) {
    setPos(saved);
    setLabel('我的位置');
    return;
  }

  // 2. Try AMap.Geolocation first (auto converts to GCJ-02)
  const geo = (window as any).__geolocationInstance;
  if (geo) {
    try {
      geo.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete' && result.position) {
          const pos: [number, number] = [result.position.getLng(), result.position.getLat()];
          (window as any).__userLocation = pos;
          setPos(pos);
          setLabel('我的位置');
        } else {
          browserFallback(setPos, setLabel);
        }
      });
      return;
    } catch { /* fallback */ }
  }

  // 3. Browser GPS with WGS84→GCJ02 conversion
  browserFallback(setPos, setLabel);
}

/** WGS-84 → GCJ-02 conversion */
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

function browserFallback(setPos: (p: [number, number]) => void, setLabel: (l: string) => void) {
  if (!navigator.geolocation) { setLabel('浏览器不支持定位'); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      // Convert WGS-84 to GCJ-02 for AMap
      const gcj = wgs84ToGcj02(pos.coords.longitude, pos.coords.latitude);
      (window as any).__userLocation = gcj;
      setPos(gcj);
      setLabel('我的位置');
    },
    (err) => {
      let msg = '定位失败';
      if (err.code === 1) msg = '定位权限被拒绝';
      else if (err.code === 2) msg = '位置不可用';
      else if (err.code === 3) msg = '定位超时';
      setLabel(msg);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}
