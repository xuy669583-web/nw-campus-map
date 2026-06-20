import { useState, useEffect, useCallback } from 'react';
import { X, Bus, MapPin, Navigation } from 'lucide-react';
import { getMapInstance } from './AMapContainer';
import { getBusStopData } from './FloatingToolbar';

// Fallback bus stop data (approximate) - used when API search fails
const FALLBACK_STOPS: BusStop[] = [
  { id: 'bs001', name: '西北师大站', type: '公交站点', address: '安宁东路西北师范大学北门附近', lng: 103.7359, lat: 36.1006, distance: 120, routes: '121路,166路,66路,TB1路' },
  { id: 'bs002', name: '西北师大站(BRT)', type: 'BRT站点', address: '安宁东路BRT快速公交专用道', lng: 103.7362, lat: 36.1004, distance: 150, routes: 'B1路,TB1路' },
  { id: 'bs003', name: '省党校家属院', type: '公交站点', address: '安宁东路省党校家属院门口', lng: 103.7375, lat: 36.0998, distance: 260, routes: '72路' },
  { id: 'bs004', name: '省委党校', type: '公交站点', address: '安宁东路省委党校正门东侧', lng: 103.7392, lat: 36.0989, distance: 380, routes: '602路,72路' },
  { id: 'bs005', name: '政法大学', type: '公交站点', address: '安宁西路甘肃政法大学门前', lng: 103.7408, lat: 36.0975, distance: 520, routes: '121路,66路,166路' },
  { id: 'bs007', name: '培黎广场', type: '公交站点', address: '安宁区培黎广场南侧', lng: 103.7318, lat: 36.1032, distance: 720, routes: '15路,72路,121路,131路' },
  { id: 'bs009', name: '交通大学', type: '公交站点', address: '安宁西路兰州交通大学门前', lng: 103.7425, lat: 36.0962, distance: 680, routes: '66路,121路,166路,B1路' },
  { id: 'bs010', name: '安宁区医院', type: '公交站点', address: '安宁区健康路区医院门口', lng: 103.7345, lat: 36.0978, distance: 450, routes: '72路,602路' },
  { id: 'bs012', name: '兰天公寓', type: '公交站点', address: '长新路兰天学生公寓门口', lng: 103.7410, lat: 36.0995, distance: 350, routes: 'TB1路' },
  { id: 'bs014', name: '幸福巷', type: '公交站点', address: '安宁东路幸福巷口', lng: 103.7380, lat: 36.1012, distance: 280, routes: '602路,72路' },
];

interface BusStop {
  id: string;
  name: string;
  type: string;
  address: string;
  lng: number;
  lat: number;
  distance: number;
  routes: string;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export default function PublicTransitDialog() {
  const [open, setOpen] = useState(false);
  const [showStops, setShowStops] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<BusStop | null>(null);
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Listen for open dialog event
  useEffect(() => {
    const handler = () => { setOpen(true); };
    window.addEventListener('open-transit-dialog', handler);
    return () => window.removeEventListener('open-transit-dialog', handler);
  }, []);

  // Listen for bus stop data loaded from FloatingToolbar
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.stops && d.stops.length > 0) {
        setBusStops(d.stops);
        setDataLoaded(true);
      }
    };
    window.addEventListener('bus-stops-loaded', handler);
    return () => window.removeEventListener('bus-stops-loaded', handler);
  }, []);

  // Get stop list: prefer API data, fallback to hardcoded
  const getStopList = useCallback((): BusStop[] => {
    if (busStops.length > 0) return busStops;
    // Try to get from global
    const global = getBusStopData();
    if (global.length > 0) return global;
    return FALLBACK_STOPS;
  }, [busStops]);

  // Handle checkbox toggle
  const handleToggle = useCallback((checked: boolean) => {
    setShowStops(checked);
    window.dispatchEvent(new CustomEvent('transit-toggle', { detail: { show: checked } }));
  }, []);

  // Handle close - only close the dialog, does NOT hide markers
  const handleClose = useCallback(() => {
    setOpen(false);
    setSelectedPoi(null);
  }, []);

  const handlePoiClick = useCallback((poi: BusStop) => {
    setSelectedPoi(poi);
    const map = getMapInstance();
    if (map) {
      map.setZoomAndCenter(17, [poi.lng, poi.lat]);
    }
  }, []);

  const handleNavTo = useCallback((poi: BusStop) => {
    window.dispatchEvent(new CustomEvent('set-nav-point', {
      detail: { type: 'end', pos: [poi.lng, poi.lat] as [number, number], label: poi.name }
    }));
    handleClose();
  }, [handleClose]);

  // Listen for marker click from FloatingToolbar map markers
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.poi) {
        const stops = getStopList();
        const matched = stops.find(s => s.id === d.poi.id || s.name === d.poi.name);
        const loc = d.poi.location || {};
        const poi: BusStop = {
          id: matched?.id || d.poi.id || '',
          name: matched?.name || d.poi.name || '',
          type: matched?.type || d.poi.type || '公交站点',
          address: matched?.address || d.poi.address || '',
          lng: loc.lng || matched?.lng || 0,
          lat: loc.lat || matched?.lat || 0,
          distance: matched?.distance || d.poi.distance || 0,
          routes: matched?.routes || '',
        };
        setSelectedPoi(poi);
        setOpen(false); // Close dialog, show detail on map directly
      }
    };
    window.addEventListener('transit-select', handler);
    return () => window.removeEventListener('transit-select', handler);
  }, [getStopList]);

  const stops = getStopList();

  // Standalone detail panel (map marker click - shown directly on map)
  if (selectedPoi && !open) {
    return (
      <div className="absolute inset-0 z-[60] flex items-end justify-center" style={{ pointerEvents: 'auto' }}>
        <div className="backdrop-modern absolute inset-0" onClick={() => setSelectedPoi(null)} />
        <div className="relative w-full dialog-modern animate-slide-up-elastic" style={{ maxHeight: '60vh', zIndex: 61 }}>
          <div className="gold-line" />
          <div className="flex items-center px-4 py-3" style={{ background: 'var(--navy-deep)' }}>
            <Bus size={18} className="mr-2" style={{ color: 'var(--gold)' }} />
            <h2 className="flex-1 text-base font-bold text-white">站点详情</h2>
            <button onClick={() => setSelectedPoi(null)} className="p-1 mr-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <X size={18} />
            </button>
          </div>
          <div className="px-4 py-4" style={{ background: '#fff' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#2d6a4f15', border: '2px solid #2d6a4f' }}>
                <Bus size={20} style={{ color: '#2d6a4f' }} />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--navy-deep)' }}>{selectedPoi.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#2d6a4f15', color: '#2d6a4f' }}>{selectedPoi.type}</span>
              </div>
            </div>

            {selectedPoi.routes && (
              <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-gray-50)' }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>途经线路</p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{selectedPoi.routes}</p>
              </div>
            )}

            <p className="text-sm mb-2 flex items-start gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <MapPin size={14} className="flex-shrink-0 mt-0.5" /> {selectedPoi.address}
            </p>

            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
              距校园中心约 {formatDistance(selectedPoi.distance)}
            </p>

            <p className="font-mono-coord text-[11px] mb-4" style={{ color: 'var(--gold)' }}>
              {selectedPoi.lng.toFixed(6)}, {selectedPoi.lat.toFixed(6)}
            </p>

            <button
              onClick={() => handleNavTo(selectedPoi)}
              className="w-full py-2.5 text-xs font-bold text-white btn-solid flex items-center justify-center gap-1.5"
              style={{ background: '#e83e3e', boxShadow: '0 2px 6px rgba(232,62,62,0.3)' }}
            >
              <Navigation size={14} /> 导航到这里
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Detail panel inside dialog (list item click)
  if (selectedPoi && open) {
    return (
      <div className="absolute inset-0 z-[60] flex items-end justify-center" style={{ pointerEvents: 'auto' }}>
        <div className="backdrop-modern absolute inset-0" onClick={() => setSelectedPoi(null)} />
        <div className="relative w-full dialog-modern animate-slide-up-elastic" style={{ maxHeight: '60vh', zIndex: 61 }}>
          <div className="gold-line" />
          <div className="flex items-center px-4 py-3" style={{ background: 'var(--navy-deep)' }}>
            <Bus size={18} className="mr-2" style={{ color: 'var(--gold)' }} />
            <h2 className="flex-1 text-base font-bold text-white">站点详情</h2>
            <button onClick={() => setSelectedPoi(null)} className="p-1 mr-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <X size={18} />
            </button>
          </div>
          <div className="px-4 py-4" style={{ background: '#fff' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#2d6a4f15', border: '2px solid #2d6a4f' }}>
                <Bus size={20} style={{ color: '#2d6a4f' }} />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--navy-deep)' }}>{selectedPoi.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#2d6a4f15', color: '#2d6a4f' }}>{selectedPoi.type}</span>
              </div>
            </div>

            {selectedPoi.routes && (
              <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-gray-50)' }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>途经线路</p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{selectedPoi.routes}</p>
              </div>
            )}

            <p className="text-sm mb-2 flex items-start gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <MapPin size={14} className="flex-shrink-0 mt-0.5" /> {selectedPoi.address}
            </p>

            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
              距校园中心约 {formatDistance(selectedPoi.distance)}
            </p>

            <p className="font-mono-coord text-[11px] mb-4" style={{ color: 'var(--gold)' }}>
              {selectedPoi.lng.toFixed(6)}, {selectedPoi.lat.toFixed(6)}
            </p>

            <button
              onClick={() => handleNavTo(selectedPoi)}
              className="w-full py-2.5 text-xs font-bold text-white btn-solid flex items-center justify-center gap-1.5"
              style={{ background: '#e83e3e', boxShadow: '0 2px 6px rgba(232,62,62,0.3)' }}
            >
              <Navigation size={14} /> 导航到这里
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center" style={{ pointerEvents: 'auto' }}>
      <div className="backdrop-modern absolute inset-0" onClick={handleClose} />
      <div className="relative w-full dialog-modern animate-slide-up-elastic flex flex-col" style={{ maxHeight: '62vh', zIndex: 61 }}>
        <div className="gold-line" />
        {/* Header */}
        <div className="flex items-center px-4 py-3 flex-shrink-0" style={{ background: 'var(--navy-deep)' }}>
          <Bus size={18} className="mr-2" style={{ color: 'var(--gold)' }} />
          <h2 className="flex-1 text-base font-bold text-white">公共交通</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full mr-2" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            校园周边1km
          </span>
          <button onClick={handleClose} className="p-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4" style={{ background: '#fff' }}>
          {/* Toggle switch */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl mb-3 cursor-pointer transition-all"
            style={{
              background: showStops ? '#2d6a4f10' : 'var(--bg-gray-50)',
              border: showStops ? '1.5px solid #2d6a4f' : '1.5px solid var(--border-light)',
            }}
            onClick={() => handleToggle(!showStops)}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: showStops ? '#2d6a4f' : 'var(--bg-gray-100)' }}>
                <Bus size={16} style={{ color: showStops ? '#fff' : 'var(--text-muted)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>显示公交站点</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {dataLoaded ? `在地图上标注 ${stops.length} 个站点` : '在地图上标注站点位置'}
                </p>
              </div>
            </div>
            <div className="relative w-11 h-6 rounded-full transition-all" style={{ background: showStops ? '#2d6a4f' : 'var(--bg-gray-200)' }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: showStops ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>

          {/* Loading state */}
          {!dataLoaded && showStops && stops.length === 0 && (
            <div className="flex items-center justify-center py-4" style={{ color: 'var(--text-muted)' }}>
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              <span className="text-xs">正在搜索周边公交站点...</span>
            </div>
          )}

          {/* Bus stop list */}
          {stops.length > 0 && (
            <>
              <p className="text-xs font-bold mb-2 px-1" style={{ color: 'var(--text-secondary)' }}>
                站点列表 <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({stops.length}个)</span>
              </p>
              {stops.map((poi) => (
                <button
                  key={poi.id}
                  onClick={() => handlePoiClick(poi)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors"
                  style={{ background: 'var(--bg-gray-50)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2d6a4f10'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-gray-50)'; }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#2d6a4f12' }}>
                    <Bus size={14} style={{ color: '#2d6a4f' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{poi.name}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: '#2d6a4f10', color: '#2d6a4f' }}>
                        {poi.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatDistance(poi.distance)}</span>
                      <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{poi.address}</span>
                    </div>
                  </div>
                  <Navigation size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </button>
              ))}
            </>
          )}

          {stops.length === 0 && !showStops && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
              勾选上方开关以搜索并显示周边公交站点
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0" style={{ background: 'var(--bg-gray-50)', borderTop: '1px solid var(--divider)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {showStops && stops.length > 0 ? `已显示 ${stops.length} 个站点` : '勾选以在地图上显示站点'}
          </span>
          <button onClick={handleClose} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: 'var(--navy-deep)', color: '#fff' }}>关闭</button>
        </div>
      </div>
    </div>
  );
}
