import { useEffect, useRef, useState } from 'react';
import { useMapContext } from '../hooks/useMapContext';
import { getMapInstance } from './AMapContainer';

const CATEGORY_COLORS: Record<string, string> = {
  '校门': '#1a3a6e', '教学楼': '#0f2650', '办公楼': '#3b5998',
  '食堂': '#e83e3e', '宿舍': '#c9a96e', '图书馆': '#2d6a4f',
  '景观': '#3b6ef5', '文化场馆': '#8e8e93', '体育场馆': '#00c7be',
  '院系': '#3b6ef5', '服务设施': '#3b6ef5', '医院': '#dc3545',
};

// ============================================================
// GLOBAL STATE (module-level, survives re-renders)
// ============================================================

const routeState = { start: null as [number, number] | null, end: null as [number, number] | null };

// Measure: each point has idx, coord, segment dist, cumulative dist
const measureData = { points: [] as { idx: number; coord: [number, number]; segDist: number; cumDist: number }[] };

// Area: multiple polygon objects
const areaObjects = [] as { idx: number; points: [number, number][]; area: number; polygon: any; markers: any[] }[];
let areaTempPoints = [] as [number, number][]; // currently being drawn
let areaCounter = 0;

// Line: multiple line objects
const lineObjects = [] as { idx: number; points: [number, number][]; polylines: any[]; markers: any[] }[];
let lineTempPoints = [] as [number, number][];
let lineCounter = 0;

// Polygon (draw): multiple polygon objects
const drawPolyObjects = [] as { idx: number; points: [number, number][]; polygon: any; markers: any[] }[];
let drawPolyTempPoints = [] as [number, number][];
let drawPolyCounter = 0;

// Point markers
const pointMarkers = [] as any[];

// Text markers
const textObjects = [] as { idx: number; coord: [number, number]; text: string; marker: any }[];
let textCounter = 0;

// Mark markers
const markObjects = [] as any[];

// Mark type selector - matches ToolPanel keys
let currentMarkType = 'favorite'; // default

// ============================================================
// MARK TYPE DEFINITIONS (6 different visual styles)
// ============================================================

// 5 mark types matching ToolPanel: favorite/parking/start/end/hotel
const MARK_DEFS: Record<string, (color: string, label: string) => string> = {
  favorite: (c, l) => `<div style="width:32px;height:32px;background:${c};border:2px solid rgba(0,0,0,0.8);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${l}</div>`,
  parking: (c, l) => `<div style="width:28px;height:28px;background:${c};border:2px solid rgba(0,0,0,0.8);border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${l}</div>`,
  start: (c, l) => `<div style="width:32px;height:32px;background:${c};border:2px solid rgba(0,0,0,0.8);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${l}</div>`,
  end: (c, l) => `<div style="width:32px;height:32px;background:${c};border:2px solid rgba(0,0,0,0.8);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${l}</div>`,
  hotel: (c, l) => `<div style="width:30px;height:30px;background:${c};border:2px solid rgba(0,0,0,0.8);border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${l}</div>`,
};

const MARK_COLORS: Record<string, string> = {
  favorite: '#e83e3e', parking: '#f59e0b', start: '#1a5fb4', end: '#2d6a4f', hotel: '#8b5cf6',
};

const MARK_LABELS: Record<string, string> = {
  favorite: '★', parking: 'P', start: '起', end: '终', hotel: '宿',
};

// Pin SVG for coord
const PIN_SVG = (color: string) => `
  <svg width="28" height="36" viewBox="0 0 28 36" style="filter:drop-shadow(2px 2px 0 rgba(0,0,0,0.4));overflow:visible">
    <path d="M14 0 C6 0 0 6 0 14 C0 24 14 36 14 36 C14 36 28 24 28 14 C28 6 22 0 14 0 Z" fill="${color}" stroke="#000" stroke-width="2" />
    <circle cx="14" cy="12" r="5" fill="#fff" stroke="#000" stroke-width="1" />
    <circle cx="14" cy="12" r="2.5" fill="${color}" />
  </svg>
`;

// Small pin for coord pick (tool panel)
const SMALL_PIN_SVG = (color: string, label: string) => `
  <svg width="16" height="20" viewBox="0 0 16 20" style="overflow:visible">
    <path d="M8 0 C3.5 0 0 3 0 7.5 C0 12.5 8 20 8 20 C8 20 16 12.5 16 7.5 C16 3 12.5 0 8 0 Z" fill="${color}" stroke="rgba(0,0,0,0.6)" stroke-width="1" />
    <text x="8" y="9" text-anchor="middle" fill="#fff" font-size="7" font-weight="bold">${label}</text>
  </svg>
`;

// Coord pick points storage
const coordPickPoints: { coord: [number, number]; idx: number }[] = [];
let coordPickMarkers: any[] = [];

const ROUTE_ICON = (color: string, label: string) => `
  <div style="width:28px;height:28px;background:${color};border:2px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:bold;box-shadow:2px 2px 0 rgba(0,0,0,0.5);">${label}</div>
`;

// Sync mark type to window
function syncMarkType() {
  (window as any).__markType = currentMarkType;
}
function syncMeasureData() {
  (window as any).__measureData = [...measureData.points];
  window.dispatchEvent(new CustomEvent('tool-data', {
    detail: { type: 'measure', points: [...measureData.points] }
  }));
}
function syncAreaData() {
  const data = areaObjects.map(a => ({ idx: a.idx, area: a.area, pointCount: a.points.length }));
  (window as any).__areaData = data;
  window.dispatchEvent(new CustomEvent('tool-data', { detail: { type: 'area', areas: data } }));
}

export default function MapOverlay() {
  const ctx = useMapContext();
  const { state, selectPOI, flyTo } = ctx;
  const [mapReady, setMapReady] = useState(false);
  const initDoneRef = useRef(false);

  const boundaryRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const measureLinesRef = useRef<any[]>([]);
  const measureMarkersRef = useRef<any[]>([]);
  const routeLineRef = useRef<any>(null);
  const routeNodeMarkersRef = useRef<any[]>([]);
  const routeMarkersRef = useRef<any[]>([]);
  const userLocMarkerRef = useRef<any>(null);
  const coordPinRef = useRef<any>(null);
  const clickHandlerRef = useRef<any>(null);
  const rightClickHandlerRef = useRef<any>(null);
  const areaTempPolyRef = useRef<any>(null);
  const areaTempMarkersRef = useRef<any[]>([]);
  const lineTempLinesRef = useRef<any[]>([]);
  const lineTempMarkersRef = useRef<any[]>([]);
  const drawPolyTempPolyRef = useRef<any>(null);
  const drawPolyTempMarkersRef = useRef<any[]>([]);
  const drawObjectsRef = useRef<any[]>([]);

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  // ===== 1. Wait for map =====
  useEffect(() => {
    if (initDoneRef.current) return;
    const check = () => {
      if (getMapInstance() && window.AMap && (window as any).__amapPluginsReady) {
        initDoneRef.current = true;
        setMapReady(true);
        return true;
      }
      return false;
    };
    if (check()) return;
    const t = setInterval(() => { if (check()) clearInterval(t); }, 200);
    return () => clearInterval(t);
  }, []);

  // ===== 2. Campus boundary: inner highlight + outer gray mask =====
  useEffect(() => {
    if (!mapReady) return;
    const map = getMapInstance();
    if (!map || !window.AMap || boundaryRef.current) return;
    const campusPath = [[103.745596,36.098917],[103.745763,36.09885],[103.74568,36.098462],[103.745664,36.098377],[103.745613,36.098167],[103.745535,36.097777],[103.745509,36.097415],[103.745483,36.097171],[103.745466,36.096885],[103.745354,36.096586],[103.745285,36.096412],[103.745164,36.096272],[103.74494,36.096161],[103.744569,36.095966],[103.744284,36.095694],[103.744026,36.09541],[103.743888,36.095284],[103.743577,36.095103],[103.743224,36.095075],[103.742853,36.095145],[103.737343,36.096097],[103.736848,36.096131],[103.731205,36.097248],[103.731415,36.098293],[103.731468,36.098513],[103.731573,36.098776],[103.731741,36.099125],[103.731709,36.099184],[103.731877,36.100033],[103.732035,36.100441],[103.732151,36.100848],[103.732203,36.10112],[103.732245,36.101196],[103.739075,36.100067],[103.743151,36.099413],[103.744979,36.09904],[103.745305,36.09898],[103.745484,36.098946]];
    // Outer mask: a large polygon covering a wide area, with campus as a "hole"
    const outerBounds = [[103.6,36.2],[103.9,36.2],[103.9,35.9],[103.6,35.9]];
    const maskPolygon = new window.AMap.Polygon({
      path: [outerBounds, campusPath],
      fillColor: '#7a7a7a',
      fillOpacity: 0.22,
      strokeColor: 'transparent',
      strokeWeight: 0,
      bubble: true,
    });
    maskPolygon.setMap(map);
    boundaryRef.current = maskPolygon;
  }, [mapReady]);

  // ===== 3. POI markers =====
  useEffect(() => {
    if (!mapReady) return;
    const map = getMapInstance();
    if (!map || !window.AMap) return;
    markersRef.current.forEach(m => { try { m.setMap(null); } catch {} });
    markersRef.current = [];
    state.filteredPOIs.forEach((poi) => {
      const color = CATEGORY_COLORS[poi.type] || '#5a5a5a';
      const isSelected = state.selectedPOI?.name === poi.name;
      const dotSize = isSelected ? 14 : 10;
      const borderW = isSelected ? 3 : 2;
      const el = document.createElement('div');
      el.style.cssText = `display:flex;align-items:center;gap:4px;cursor:pointer;font-family:-apple-system,"PingFang SC",sans-serif;white-space:nowrap;`;
      el.innerHTML = `
        <div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${color};border:${borderW}px solid ${isSelected?'#e83e3e':'#000'};box-shadow:1px 1px 0 rgba(0,0,0,0.3);flex-shrink:0;"></div>
        <span style="font-size:11px;font-weight:bold;color:#000;text-shadow:0 0 2px #fff,0 0 2px #fff,0 0 2px #fff,0 0 2px #fff;padding:1px 3px;background:rgba(255,255,255,0.7);border-radius:2px;${isSelected?'color:#e83e3e;':''}">${poi.name}</span>
      `;
      el.title = poi.name;
      const marker = new window.AMap.Marker({
        position: poi.position,
        content: el,
        offset: new window.AMap.Pixel(8, -dotSize / 2),
        zIndex: isSelected ? 200 : 100,
      });
      marker.on('click', (e: any) => {
        const mode = window.__mapActiveMode || 'none';
        if (mode === 'measure') { e.stopPropagation?.(); doMeasure(poi.position); }
        else if (mode === 'measureArea') { e.stopPropagation?.(); doArea(poi.position); }
        else if (mode === 'drawPoint') { e.stopPropagation?.(); doDrawPoint(poi.position); }
        else if (mode === 'drawLine') { e.stopPropagation?.(); doDrawLine(poi.position); }
        else if (mode === 'drawPolygon') { e.stopPropagation?.(); doDrawPolygon(poi.position); }
        else if (mode === 'mark') { e.stopPropagation?.(); doMark(poi.position); }
        else if (mode === 'text') { e.stopPropagation?.(); doText(poi.position); }
        else if (mode === 'route') { e.stopPropagation?.(); doRoute(poi.position); }
        else if (mode === 'coord') { e.stopPropagation?.(); doCoord(poi.position); }
        else { selectPOI(poi); flyTo(poi.position, 18); }
      });
      marker.setMap(map);
      markersRef.current.push(marker);
    });
    (window as any).__poiData = state.filteredPOIs.map(poi => {
      const color = CATEGORY_COLORS[poi.type] || '#5a5a5a';
      return { coord: poi.position, color, label: poi.name };
    });
  }, [mapReady, state.filteredPOIs, state.selectedPOI, selectPOI, flyTo]);

  // ===== 4. User location =====
  useEffect(() => {
    if (!mapReady) return;
    const map = getMapInstance();
    if (!map || !window.AMap || !state.userLocation) return;
    if (userLocMarkerRef.current) { try { userLocMarkerRef.current.setMap(null); } catch {} }
    const el = document.createElement('div');
    el.innerHTML = `<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;width:40px;height:40px;background:rgba(37,99,235,0.35);border-radius:50%;animation:location-pulse 2s ease-in-out infinite;"></div><div style="position:relative;width:12px;height:12px;background:#2563eb;border:2px solid #fff;border-radius:50%;"></div></div>`;
    const marker = new window.AMap.Marker({ position: state.userLocation, content: el, offset: new window.AMap.Pixel(-20,-20), zIndex: 200 });
    marker.setMap(map);
    userLocMarkerRef.current = marker;
  }, [mapReady, state.userLocation]);

  // ===== 5. Satellite toggle =====
  useEffect(() => { const s = (window as any).__satLayer; if (s) s.setOpacity(state.mapLayer === 'satellite' ? 1 : 0); }, [state.mapLayer]);

  // ===== 6. Coord pin =====
  useEffect(() => {
    if (!mapReady) return;
    const map = getMapInstance();
    if (!map || !window.AMap) return;
    if (coordPinRef.current) { try { coordPinRef.current.setMap(null); } catch {} coordPinRef.current = null; }
    if (state.coordPickResult && state.activeMode === 'coord') {
      const pin = new window.AMap.Marker({ position: state.coordPickResult, content: PIN_SVG('#c9a96e'), offset: new window.AMap.Pixel(-14,-36), zIndex: 250 });
      pin.setMap(map);
      coordPinRef.current = pin;
    }
  }, [mapReady, state.coordPickResult, state.activeMode]);

  // ===== 7. Sync mark type from window =====
  useEffect(() => {
    const type = (window as any).__markType;
    if (type && type !== currentMarkType) {
      currentMarkType = type;
    }
  });

  // ===== 8. MAP CLICK HANDLER =====
  useEffect(() => {
    if (!mapReady) return;
    const map = getMapInstance();
    if (!map) return;
    if (clickHandlerRef.current) map.off('click', clickHandlerRef.current);

    const handler = (e: any) => {
      const lnglat = e?.lnglat;
      if (!lnglat) return;
      let lng: number, lat: number;
      if (typeof lnglat.getLng === 'function') { lng = lnglat.getLng(); lat = lnglat.getLat(); }
      else if (typeof lnglat.lng === 'number') { lng = lnglat.lng; lat = lnglat.lat; }
      else return;
      const pos: [number, number] = [lng, lat];
      const mode = window.__mapActiveMode || 'none';

      if (mode === 'measure') doMeasure(pos);
      else if (mode === 'measureArea') doArea(pos);
      else if (mode === 'drawPoint') doDrawPoint(pos);
      else if (mode === 'drawLine') doDrawLine(pos);
      else if (mode === 'drawPolygon') doDrawPolygon(pos);
      else if (mode === 'mark') doMark(pos);
      else if (mode === 'text') doText(pos);
      else if (mode === 'route') doRoute(pos);
      else if (mode === 'coord') doCoord(pos);

      // Dispatch map click event for NavigationPanel map point selection
      window.dispatchEvent(new CustomEvent('campus-map-click', { detail: { lnglat: pos } }));
    };
    clickHandlerRef.current = handler;
    map.on('click', handler);

    // RIGHT CLICK: finalize current line/area/polygon
    if (rightClickHandlerRef.current) map.off('rightclick', rightClickHandlerRef.current);
    const rightHandler = (_e: any) => {
      const mode = window.__mapActiveMode || 'none';
      if (mode === 'drawLine' && lineTempPoints.length >= 2) { finalizeLine(); }
      else if (mode === 'drawPolygon' && drawPolyTempPoints.length >= 3) { finalizeDrawPolygon(); }
      else if (mode === 'measureArea' && areaTempPoints.length >= 3) { finalizeArea(); }
    };
    rightClickHandlerRef.current = rightHandler;
    map.on('rightclick', rightHandler);

    return () => {
      if (clickHandlerRef.current) map.off('click', clickHandlerRef.current);
      if (rightClickHandlerRef.current) map.off('rightclick', rightClickHandlerRef.current);
    };
  }, [mapReady]);

  // ===== TOOL FUNCTIONS =====

  function getToolSettings() {
    return (window as any).__toolSettings || { color: '#e83e3e', lineWidth: 3, lineStyle: 'solid' };
  }

  function doCoord(pos: [number, number]) {
    const idx = coordPickPoints.length + 1;
    coordPickPoints.push({ coord: pos, idx });
    // Dispatch to tool panel
    window.dispatchEvent(new CustomEvent('tool-data', {
      detail: { type: 'coord', pos, lng: pos[0], lat: pos[1], idx }
    }));
    // Draw small pin on map
    const map = getMapInstance();
    if (map && window.AMap) {
      const marker = new window.AMap.Marker({
        position: pos,
        content: SMALL_PIN_SVG('#1a5fb4', String(idx)),
        offset: new window.AMap.Pixel(-8, -20),
        zIndex: 250,
      });
      marker.setMap(map);
      coordPickMarkers.push(marker);
    }
    ctxRef.current.setCoordPickResult(pos);
  }

  // --- Measure ---
  function doMeasure(pos: [number, number]) {
    const idx = measureData.points.length + 1;
    let segDist = 0;
    let cumDist = 0;
    if (measureData.points.length > 0) {
      const prev = measureData.points[measureData.points.length - 1];
      segDist = haversine(prev.coord, pos);
      cumDist = prev.cumDist + segDist;
    }
    measureData.points.push({ idx, coord: pos, segDist, cumDist });
    ctxRef.current.addMeasurePoint(pos);
    ctxRef.current.setMeasureTotal(cumDist);
    syncMeasureData();
    redrawMeasure();
  }
  function redrawMeasure() {
    const map = getMapInstance();
    if (!map || !window.AMap) return;
    measureLinesRef.current.forEach(l => { try { l.setMap(null); } catch {} });
    measureMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} });
    measureLinesRef.current = []; measureMarkersRef.current = [];
    const pts = measureData.points;
    for (let i = 1; i < pts.length; i++) {
      const line = new window.AMap.Polyline({ path: [pts[i-1].coord, pts[i].coord], strokeColor: '#e83e3e', strokeWeight: 3, strokeStyle: 'dashed', strokeDasharray: [8,6] });
      line.setMap(map); measureLinesRef.current.push(line);
    }
    pts.forEach((p) => {
      const m = new window.AMap.Marker({ position: p.coord, content: `<div style="width:22px;height:22px;background:#e83e3e;border:2px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:bold;">${p.idx}</div>`, offset: new window.AMap.Pixel(-11,-11) });
      m.setMap(map); measureMarkersRef.current.push(m);
    });
  }

  // --- Area (multiple objects, right-click to finalize) ---
  function doArea(pos: [number, number]) {
    areaTempPoints.push(pos);
    redrawAreaTemp();
  }
  function redrawAreaTemp() {
    const map = getMapInstance();
    if (!map || !window.AMap) return;
    if (areaTempPolyRef.current) { try { areaTempPolyRef.current.setMap(null); } catch {} areaTempPolyRef.current = null; }
    areaTempMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} });
    areaTempMarkersRef.current = [];
    const pts = areaTempPoints;
    const s = getToolSettings();
    let area = 0;
    if (pts.length >= 3) {
      const poly = new window.AMap.Polygon({ path: pts, strokeColor: s.color, strokeWeight: s.lineWidth, strokeStyle: s.lineStyle, strokeDasharray: s.lineStyle==='dashed'?[8,6]:undefined, fillColor: s.color, fillOpacity: 0.2, bubble: true });
      poly.setMap(map); areaTempPolyRef.current = poly;
      area = polygonArea(pts);
    }
    pts.forEach((pt, idx) => {
      const m = new window.AMap.Marker({ position: pt, content: `<div style="width:18px;height:18px;background:#2d6a4f;border:2px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:8px;font-weight:bold;">${idx+1}</div>`, offset: new window.AMap.Pixel(-9,-9) });
      m.setMap(map); areaTempMarkersRef.current.push(m);
    });
    // Show real-time area in window
    (window as any).__areaTemp = { pointCount: pts.length, area };
  }
  function finalizeArea() {
    const map = getMapInstance();
    if (!map || !window.AMap || areaTempPoints.length < 3) return;
    areaCounter++;
    const s = getToolSettings();
    const area = polygonArea(areaTempPoints);
    const poly = new window.AMap.Polygon({ path: [...areaTempPoints], strokeColor: s.color, strokeWeight: s.lineWidth, strokeStyle: s.lineStyle, strokeDasharray: s.lineStyle==='dashed'?[8,6]:undefined, fillColor: s.color, fillOpacity: 0.2, bubble: true });
    poly.setMap(map);
    const markers: any[] = [];
    areaTempPoints.forEach((pt) => {
      const m = new window.AMap.Marker({ position: pt, content: `<div style="width:14px;height:14px;background:${s.color};border:2px solid #000;border-radius:50%;"></div>`, offset: new window.AMap.Pixel(-7,-7) });
      m.setMap(map); markers.push(m); drawObjectsRef.current.push(m);
    });
    drawObjectsRef.current.push(poly);
    areaObjects.push({ idx: areaCounter, points: [...areaTempPoints], area, polygon: poly, markers });
    // Clear temp
    areaTempPoints = [];
    if (areaTempPolyRef.current) { try { areaTempPolyRef.current.setMap(null); } catch {} areaTempPolyRef.current = null; }
    areaTempMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} });
    areaTempMarkersRef.current = [];
    syncAreaData();
    redrawAreaTemp();
  }

  // --- Draw Line (multiple, right-click finalize) ---
  function doDrawLine(pos: [number, number]) {
    lineTempPoints.push(pos);
    redrawLineTemp();
  }
  function redrawLineTemp() {
    const map = getMapInstance();
    if (!map || !window.AMap) return;
    lineTempLinesRef.current.forEach(l => { try { l.setMap(null); } catch {} });
    lineTempMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} });
    lineTempLinesRef.current = []; lineTempMarkersRef.current = [];
    const pts = lineTempPoints;
    const s = getToolSettings();
    if (pts.length >= 2) {
      for (let i = 1; i < pts.length; i++) {
        const line = new window.AMap.Polyline({ path: [pts[i-1], pts[i]], strokeColor: s.color, strokeWeight: s.lineWidth, strokeStyle: s.lineStyle, strokeDasharray: s.lineStyle==='dashed'?[8,6]:undefined });
        line.setMap(map); lineTempLinesRef.current.push(line);
      }
    }
    pts.forEach((pt) => {
      const m = new window.AMap.Marker({ position: pt, content: `<div style="width:12px;height:12px;background:${s.color};border:2px solid #000;border-radius:50%;"></div>`, offset: new window.AMap.Pixel(-6,-6) });
      m.setMap(map); lineTempMarkersRef.current.push(m);
    });
  }
  function finalizeLine() {
    const map = getMapInstance();
    if (!map || !window.AMap || lineTempPoints.length < 2) return;
    lineCounter++;
    const s = getToolSettings();
    const polylines: any[] = [];
    const markers: any[] = [];
    for (let i = 1; i < lineTempPoints.length; i++) {
      const line = new window.AMap.Polyline({ path: [lineTempPoints[i-1], lineTempPoints[i]], strokeColor: s.color, strokeWeight: s.lineWidth, strokeStyle: s.lineStyle, strokeDasharray: s.lineStyle==='dashed'?[8,6]:undefined });
      line.setMap(map); polylines.push(line); drawObjectsRef.current.push(line);
    }
    lineTempPoints.forEach(pt => {
      const m = new window.AMap.Marker({ position: pt, content: `<div style="width:10px;height:10px;background:${s.color};border:2px solid #000;border-radius:50%;"></div>`, offset: new window.AMap.Pixel(-5,-5) });
      m.setMap(map); markers.push(m); drawObjectsRef.current.push(m);
    });
    lineObjects.push({ idx: lineCounter, points: [...lineTempPoints], polylines, markers });
    // Clear temp
    lineTempPoints = [];
    lineTempLinesRef.current.forEach(l => { try { l.setMap(null); } catch {} });
    lineTempMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} });
    lineTempLinesRef.current = []; lineTempMarkersRef.current = [];
    redrawLineTemp();
  }

  // --- Draw Polygon (multiple, right-click finalize) ---
  function doDrawPolygon(pos: [number, number]) {
    drawPolyTempPoints.push(pos);
    redrawDrawPolyTemp();
  }
  function redrawDrawPolyTemp() {
    const map = getMapInstance();
    if (!map || !window.AMap) return;
    if (drawPolyTempPolyRef.current) { try { drawPolyTempPolyRef.current.setMap(null); } catch {} drawPolyTempPolyRef.current = null; }
    drawPolyTempMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} });
    drawPolyTempMarkersRef.current = [];
    const pts = drawPolyTempPoints;
    const s = getToolSettings();
    if (pts.length >= 3) {
      const poly = new window.AMap.Polygon({ path: pts, strokeColor: s.color, strokeWeight: s.lineWidth, strokeStyle: s.lineStyle, strokeDasharray: s.lineStyle==='dashed'?[8,6]:undefined, fillColor: s.color, fillOpacity: 0.15, bubble: true });
      poly.setMap(map); drawPolyTempPolyRef.current = poly;
    }
    pts.forEach((pt) => {
      const m = new window.AMap.Marker({ position: pt, content: `<div style="width:10px;height:10px;background:${s.color};border:2px solid #000;border-radius:50%;"></div>`, offset: new window.AMap.Pixel(-5,-5) });
      m.setMap(map); drawPolyTempMarkersRef.current.push(m);
    });
  }
  function finalizeDrawPolygon() {
    const map = getMapInstance();
    if (!map || !window.AMap || drawPolyTempPoints.length < 3) return;
    drawPolyCounter++;
    const s = getToolSettings();
    const poly = new window.AMap.Polygon({ path: [...drawPolyTempPoints], strokeColor: s.color, strokeWeight: s.lineWidth, strokeStyle: s.lineStyle, strokeDasharray: s.lineStyle==='dashed'?[8,6]:undefined, fillColor: s.color, fillOpacity: 0.15, bubble: true });
    poly.setMap(map);
    const markers: any[] = [];
    drawPolyTempPoints.forEach(pt => {
      const m = new window.AMap.Marker({ position: pt, content: `<div style="width:10px;height:10px;background:${s.color};border:2px solid #000;border-radius:50%;"></div>`, offset: new window.AMap.Pixel(-5,-5) });
      m.setMap(map); markers.push(m); drawObjectsRef.current.push(m);
    });
    drawObjectsRef.current.push(poly);
    drawPolyObjects.push({ idx: drawPolyCounter, points: [...drawPolyTempPoints], polygon: poly, markers });
    // Clear temp
    drawPolyTempPoints = [];
    if (drawPolyTempPolyRef.current) { try { drawPolyTempPolyRef.current.setMap(null); } catch {} drawPolyTempPolyRef.current = null; }
    drawPolyTempMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} });
    drawPolyTempMarkersRef.current = [];
    redrawDrawPolyTemp();
  }

  // --- Draw Point ---
  function doDrawPoint(pos: [number, number]) {
    const st = getToolSettings();
    const map = getMapInstance();
    if (!map || !window.AMap) return;
    const m = new window.AMap.Marker({ position: pos, content: `<div style="width:12px;height:12px;background:${st.color};border:2px solid #000;border-radius:50%;"></div>`, offset: new window.AMap.Pixel(-6,-6), zIndex: 100 });
    m.setMap(map); drawObjectsRef.current.push(m); pointMarkers.push(m);
  }

  // --- Mark (6 different styles) ---
  function doMark(pos: [number, number]) {
    const map = getMapInstance();
    if (!map || !window.AMap) return;
    const type = (window as any).__markType || currentMarkType;
    const color = MARK_COLORS[type] || MARK_COLORS.favorite;
    const label = MARK_LABELS[type] || '★';
    const iconFn = MARK_DEFS[type] || MARK_DEFS.favorite;
    const pin = new window.AMap.Marker({ position: pos, content: iconFn(color, label), offset: new window.AMap.Pixel(-16,-16), zIndex: 120, animation: 'AMAP_ANIMATION_DROP' });
    pin.setMap(map); drawObjectsRef.current.push(pin); markObjects.push(pin);
  }

  // --- Text (inline editable DOM, no prompt) ---
  function doText(pos: [number, number]) {
    const map = getMapInstance();
    if (!map || !window.AMap) return;

    textCounter++;
    const idx = textCounter;

    // Container for text display + edit
    const container = document.createElement('div');
    container.style.cssText = 'position:relative;display:flex;flex-direction:column;align-items:center;';

    // Text display
    const label = document.createElement('div');
    label.style.cssText = `padding:3px 10px;background:#fff;border:2px solid #000;font-size:13px;font-weight:bold;color:#000;white-space:nowrap;box-shadow:2px 2px 0 rgba(0,0,0,0.3);font-family:-apple-system,'PingFang SC',sans-serif;cursor:pointer;border-radius:2px;`;
    label.innerText = '双击编辑';
    label.title = '双击编辑文字，右键删除';

    // Inline edit input (hidden initially)
    const input = document.createElement('input');
    input.type = 'text';
    input.value = '';
    input.placeholder = '输入文字...';
    input.style.cssText = 'position:absolute;top:-30px;left:50%;transform:translateX(-50%);width:100px;padding:3px 5px;border:2px solid #1a3a6e;font-size:12px;font-weight:bold;display:none;z-index:200;box-shadow:2px 2px 0 rgba(0,0,0,0.3);';

    container.appendChild(label);
    container.appendChild(input);

    const marker = new window.AMap.Marker({
      position: pos,
      content: container,
      offset: new window.AMap.Pixel(0, -20),
      zIndex: 130,
      draggable: false,
    });

    // Double-click to enter edit mode
    marker.on('click', () => {
      input.style.display = 'block';
      input.focus();
    });

    // Input blur/enter to save
    const saveText = () => {
      const val = input.value.trim();
      if (val) {
        label.innerText = val;
        const obj = textObjects.find(t => t.idx === idx);
        if (obj) obj.text = val;
      }
      input.style.display = 'none';
    };
    input.addEventListener('blur', saveText);
    input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); saveText(); } });

    // Right-click to delete
    marker.on('rightclick', (e: any) => {
      e.stopPropagation?.();
      marker.setMap(null);
      const i = textObjects.findIndex(t => t.idx === idx);
      if (i >= 0) textObjects.splice(i, 1);
      const j = drawObjectsRef.current.indexOf(marker);
      if (j >= 0) drawObjectsRef.current.splice(j, 1);
    });

    marker.setMap(map);
    drawObjectsRef.current.push(marker);
    textObjects.push({ idx, coord: pos, text: '双击编辑', marker });
  }

  // --- Route ---
  function doRoute(pos: [number, number]) {
    if (!routeState.start) {
      routeState.start = pos; ctxRef.current.setRouteStart(pos);
      addRouteMarker(pos, '#1a3a6e', '起');
    } else if (!routeState.end) {
      routeState.end = pos; ctxRef.current.setRouteEnd(pos);
      addRouteMarker(pos, '#e83e3e', '终');
      drawRoute(routeState.start, pos);
    } else {
      deleteRoute(); routeState.start = pos; routeState.end = null;
      ctxRef.current.resetRoute();
      setTimeout(() => { ctxRef.current.setRouteStart(pos); addRouteMarker(pos, '#1a3a6e', '起'); }, 50);
    }
  }
  function addRouteMarker(pos: [number, number], color: string, label: string) {
    const map = getMapInstance();
    if (!map || !window.AMap) return;
    const m = new window.AMap.Marker({ position: pos, content: ROUTE_ICON(color, label), offset: new window.AMap.Pixel(-14,-14), zIndex: 160 });
    m.on('click', (e: any) => { e.stopPropagation?.(); deleteRoute(); });
    m.setMap(map); routeMarkersRef.current.push(m);
  }
  function drawRoute(start: [number, number], end: [number, number]) {
    const map = getMapInstance();
    if (!map || !window.AMap) return;
    const trySearch = () => {
      try {
        const walking = new window.AMap.Walking({});
        walking.search(new window.AMap.LngLat(start[0],start[1]), new window.AMap.LngLat(end[0],end[1]), (status: string, result: any) => {
          if (status === 'complete' && result.routes?.[0]) {
            const route = result.routes[0];
            ctxRef.current.setRouteDistance(route.distance);
            const path: [number,number][] = [];
            route.steps.forEach((step: any) => step.path.forEach((p: any) => path.push([p.lng,p.lat])));
            ctxRef.current.setRoutePath(path);
            (window as any).__routeData = { start: routeState.start, end: routeState.end, path };
            const line = new window.AMap.Polyline({ path, strokeColor: '#000', strokeWeight: 5, strokeStyle: 'dashed', strokeDasharray: [10,8], cursor: 'pointer' });
            line.on('click', (e: any) => { e.stopPropagation?.(); deleteRoute(); });
            line.on('mouseover', () => line.setOptions({ strokeWeight: 7, strokeColor: '#e83e3e' }));
            line.on('mouseout', () => line.setOptions({ strokeWeight: 5, strokeColor: '#000' }));
            line.setMap(map); routeLineRef.current = line;
            const stepSize = Math.max(1, Math.floor(path.length/5));
            for (let i = stepSize; i < path.length-1; i += stepSize) {
              const node = new window.AMap.Marker({ position: path[i], content: '<div style="width:10px;height:10px;background:#e83e3e;border:2px solid #000;cursor:pointer;"></div>', offset: new window.AMap.Pixel(-5,-5) });
              node.on('click', (e: any) => { e.stopPropagation?.(); deleteRoute(); });
              node.setMap(map); routeNodeMarkersRef.current.push(node);
            }
          }
        });
      } catch { setTimeout(trySearch, 500); }
    };
    if ((window as any).__amapPluginsReady) trySearch();
    else { const w = setInterval(() => { if ((window as any).__amapPluginsReady) { clearInterval(w); trySearch(); } }, 200); setTimeout(() => clearInterval(w), 5000); }
  }
  function deleteRoute() {
    try { routeLineRef.current?.setMap(null); } catch {} routeLineRef.current = null;
    routeNodeMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} }); routeNodeMarkersRef.current = [];
    routeMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} }); routeMarkersRef.current = [];
    routeState.start = null; routeState.end = null;
    ctxRef.current.resetRoute();
    (window as any).__routeData = null;
  }

  // ===== Clear drawings =====
  useEffect(() => {
    (window as any).__clearDrawings = () => {
      drawObjectsRef.current.forEach(o => { try { o.setMap(null); } catch {} });
      drawObjectsRef.current = [];
      pointMarkers.length = 0;
      markObjects.length = 0;
      textObjects.length = 0; textCounter = 0;
      // Clear line objects
      lineObjects.forEach(o => { o.polylines.forEach((l: any) => { try { l.setMap(null); } catch {} }); o.markers.forEach((m: any) => { try { m.setMap(null); } catch {} }); });
      lineObjects.length = 0; lineTempPoints = []; lineCounter = 0;
      lineTempLinesRef.current.forEach(l => { try { l.setMap(null); } catch {} }); lineTempLinesRef.current = [];
      lineTempMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} }); lineTempMarkersRef.current = [];
      // Clear draw polygon objects
      drawPolyObjects.forEach(o => { try { o.polygon.setMap(null); } catch {} o.markers.forEach((m: any) => { try { m.setMap(null); } catch {} }); });
      drawPolyObjects.length = 0; drawPolyTempPoints = []; drawPolyCounter = 0;
      if (drawPolyTempPolyRef.current) { try { drawPolyTempPolyRef.current.setMap(null); } catch {} drawPolyTempPolyRef.current = null; }
      drawPolyTempMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} }); drawPolyTempMarkersRef.current = [];
      // Clear area objects
      areaObjects.forEach(o => { try { o.polygon.setMap(null); } catch {} o.markers.forEach((m: any) => { try { m.setMap(null); } catch {} }); });
      areaObjects.length = 0; areaTempPoints = []; areaCounter = 0;
      if (areaTempPolyRef.current) { try { areaTempPolyRef.current.setMap(null); } catch {} areaTempPolyRef.current = null; }
      areaTempMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} }); areaTempMarkersRef.current = [];
      // Clear measure
      measureData.points.length = 0;
      measureLinesRef.current.forEach(l => { try { l.setMap(null); } catch {} }); measureLinesRef.current = [];
      measureMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} }); measureMarkersRef.current = [];
      syncMeasureData(); syncAreaData();
    };
  }, []);

  // ===== Set mark type from window =====
  useEffect(() => {
    (window as any).__setMarkType = (type: string) => { currentMarkType = type; syncMarkType(); };
    syncMarkType();
  }, []);

  // ===== Cleanup effects =====
  useEffect(() => { if (state.activeMode !== 'measure') { measureLinesRef.current.forEach(l => { try { l.setMap(null); } catch {} }); measureMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} }); measureLinesRef.current = []; measureMarkersRef.current = []; measureData.points.length = 0; syncMeasureData(); } }, [state.activeMode]);
  useEffect(() => { if (state.activeMode !== 'coord') { coordPickMarkers.forEach(m => { try { m.setMap(null); } catch {} }); coordPickMarkers = []; coordPickPoints.length = 0; window.dispatchEvent(new CustomEvent('tool-data', { detail: { type: 'coord', clear: true } })); } }, [state.activeMode]);
  useEffect(() => { if (state.activeMode !== 'measureArea') { if (areaTempPolyRef.current) { try { areaTempPolyRef.current.setMap(null); } catch {} areaTempPolyRef.current = null; } areaTempMarkersRef.current.forEach(m => { try { m.setMap(null); } catch {} }); areaTempMarkersRef.current = []; areaTempPoints = []; (window as any).__areaTemp = null; } }, [state.activeMode]);
  useEffect(() => { if (state.activeMode !== 'route') { deleteRoute(); } }, [state.activeMode]);
  useEffect(() => { if (state.activeMode !== 'coord') { if (coordPinRef.current) { try { coordPinRef.current.setMap(null); } catch {} coordPinRef.current = null; } } }, [state.activeMode]);

  return null;
}

// Polygon area (Shoelace with haversine)
function polygonArea(pts: [number, number][]): number {
  if (pts.length < 3) return 0;
  const R = 6371000;
  const refLat = pts[0][1] * Math.PI / 180;
  const cosLat = Math.cos(refLat);
  const locals = pts.map(p => [R * p[0] * Math.PI / 180 * cosLat, R * p[1] * Math.PI / 180]);
  let area = 0;
  for (let i = 0; i < locals.length; i++) { const j = (i+1)%locals.length; area += locals[i][0]*locals[j][1] - locals[j][0]*locals[i][1]; }
  return Math.abs(area) / 2;
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = (b[1]-a[1])*Math.PI/180;
  const dLon = (b[0]-a[0])*Math.PI/180;
  const la1 = a[1]*Math.PI/180;
  const la2 = b[1]*Math.PI/180;
  const sx = Math.sin(dLat/2);
  const sy = Math.sin(dLon/2);
  const c = 2*Math.asin(Math.sqrt(sx*sx + Math.cos(la1)*Math.cos(la2)*sy*sy));
  return R*c;
}
