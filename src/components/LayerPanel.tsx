import { useState, useCallback, useEffect } from 'react';
import { X, Layers, Sun, Moon, Satellite, Map as MapIcon } from 'lucide-react';

export default function LayerPanel() {
  const [open, setOpen] = useState(false);
  const [isSatellite, setIsSatellite] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Listen for open event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-layer-panel', handler);
    return () => window.removeEventListener('open-layer-panel', handler);
  }, []);

  // Toggle satellite / standard map
  const toggleMapType = useCallback((satellite: boolean) => {
    const map = (window as any).__campusMapInstance;
    if (!map) return;
    const satLayer = (window as any).__satLayer;
    if (satLayer) satLayer.setOpacity(satellite ? 1 : 0);
    const style = isDarkMode ? 'amap://styles/dark' : (satellite ? 'amap://styles/whitesmoke' : 'amap://styles/normal');
    try { map.setMapStyle(style); } catch {}
    setIsSatellite(satellite);
  }, [isDarkMode]);

  // Toggle dark mode
  const toggleDarkMode = useCallback((dark: boolean) => {
    const map = (window as any).__campusMapInstance;
    if (!map) return;
    const style = dark ? 'amap://styles/dark' : (isSatellite ? 'amap://styles/whitesmoke' : 'amap://styles/normal');
    try { map.setMapStyle(style); } catch {}
    setIsDarkMode(dark);
  }, [isSatellite]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center" style={{ pointerEvents: 'auto' }}>
      <div className="backdrop-modern absolute inset-0" onClick={() => setOpen(false)} />
      <div className="relative w-full dialog-modern animate-slide-up-elastic" style={{ maxHeight: '55vh', zIndex: 61 }}>
        <div className="gold-line" />
        {/* Header */}
        <div className="flex items-center px-4 py-3" style={{ background: 'var(--navy-deep)' }}>
          <Layers size={18} className="mr-2" style={{ color: 'var(--gold)' }} />
          <h2 className="flex-1 text-base font-bold text-white">图层设置</h2>
          <button onClick={() => setOpen(false)} className="p-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-4" style={{ background: '#fff' }}>
          {/* Map Type */}
          <div className="mb-4">
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>地图类型</p>
            <div className="flex gap-2">
              <button onClick={() => toggleMapType(false)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: !isSatellite ? 'var(--blue-pale)' : 'var(--bg-gray-50)', border: !isSatellite ? '1.5px solid var(--blue-standard)' : '1.5px solid var(--border-light)', color: !isSatellite ? 'var(--blue-standard)' : 'var(--text-muted)' }}>
                <MapIcon size={14} /> 标准地图
              </button>
              <button onClick={() => toggleMapType(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: isSatellite ? 'var(--blue-pale)' : 'var(--bg-gray-50)', border: isSatellite ? '1.5px solid var(--blue-standard)' : '1.5px solid var(--border-light)', color: isSatellite ? 'var(--blue-standard)' : 'var(--text-muted)' }}>
                <Satellite size={14} /> 卫星影像
              </button>
            </div>
          </div>

          {/* Appearance */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>外观</p>
            <div className="flex gap-2">
              <button onClick={() => toggleDarkMode(false)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: !isDarkMode ? '#FFF8E1' : 'var(--bg-gray-50)', border: !isDarkMode ? '1.5px solid #FFB300' : '1.5px solid var(--border-light)', color: !isDarkMode ? '#FF8F00' : 'var(--text-muted)' }}>
                <Sun size={14} /> 白天模式
              </button>
              <button onClick={() => toggleDarkMode(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: isDarkMode ? '#E8EAF6' : 'var(--bg-gray-50)', border: isDarkMode ? '1.5px solid #3F51B5' : '1.5px solid var(--border-light)', color: isDarkMode ? '#3F51B5' : 'var(--text-muted)' }}>
                <Moon size={14} /> 黑夜模式
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 flex-shrink-0" style={{ background: 'var(--bg-gray-50)', borderTop: '1px solid var(--divider)' }}>
          <button onClick={() => setOpen(false)} className="w-full text-xs font-medium py-2 rounded-lg" style={{ background: 'var(--navy-deep)', color: '#fff' }}>关闭</button>
        </div>
      </div>
    </div>
  );
}
