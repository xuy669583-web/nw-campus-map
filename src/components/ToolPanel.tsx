import { useState, useCallback, useEffect } from 'react';
import { useMapContext } from '../hooks/useMapContext';
import html2canvas from 'html2canvas';
import {
  AreaChart, Type, X, Flag, PenTool, Minus, Hexagon,
  Wrench, Ruler, Download, MapPin,
} from 'lucide-react';

// ===== Tab config =====
const TABS = [
  { key: 'measure', label: '测量', icon: Ruler },
  { key: 'edit', label: '编辑', icon: PenTool },
  { key: 'mark', label: '标记', icon: Flag },
  { key: 'text', label: '文本', icon: Type },
  { key: 'download', label: '下载', icon: Download },
];

// ===== Mark styles: 5 types matching MapOverlay =====
const MARK_STYLES = [
  { key: 'favorite', color: '#e83e3e', label: '收藏点', icon: '★' },
  { key: 'parking', color: '#f59e0b', label: '停车点', icon: 'P' },
  { key: 'start', color: '#1a5fb4', label: '起点', icon: '起' },
  { key: 'end', color: '#2d6a4f', label: '终点', icon: '终' },
  { key: 'hotel', color: '#8b5cf6', label: '住宿点', icon: '宿' },
];

export default function ToolPanel() {
  const { state, setActiveMode } = useMapContext();
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('measure');
  const [activeMarkStyle, setActiveMarkStyle] = useState(MARK_STYLES[0]);
  const [measurePoints, setMeasurePoints] = useState<any[]>([]);
  const [coordPoints, setCoordPoints] = useState<any[]>([]);
  const [areaData, setAreaData] = useState<any[]>([]);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  // Listen for tool-data events from MapOverlay
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d) return;
      if (d.type === 'measure' && d.points) setMeasurePoints(d.points);
      if (d.type === 'coord' && d.clear) setCoordPoints([]);
      if (d.type === 'coord' && d.pos && !d.clear) setCoordPoints(prev => [...prev, { idx: d.idx || prev.length + 1, lng: d.lng, lat: d.lat }]);
      if (d.type === 'area' && d.areas) setAreaData(d.areas);
    };
    window.addEventListener('tool-data', handler);
    return () => window.removeEventListener('tool-data', handler);
  }, []);

  // Listen for toggle event
  useEffect(() => {
    const handler = () => setPanelOpen(prev => !prev);
    window.addEventListener('toggle-annotation', handler);
    return () => window.removeEventListener('toggle-annotation', handler);
  }, []);

  // Sync measure points from context (fallback polling)
  useEffect(() => {
    const interval = setInterval(() => {
      const md = (window as any).__measureData;
      if (md && Array.isArray(md) && md.length !== measurePoints.length) setMeasurePoints(md);
      const ad = (window as any).__areaData;
      if (ad && Array.isArray(ad) && ad.length !== areaData.length) setAreaData(ad);
    }, 500);
    return () => clearInterval(interval);
  }, [measurePoints.length, areaData.length]);

  const handleTool = useCallback((key: string) => {
    if (state.activeMode === key) setActiveMode('none');
    else setActiveMode(key as any);
  }, [state.activeMode, setActiveMode]);

  const handleMarkStyle = useCallback((style: typeof MARK_STYLES[0]) => {
    setActiveMarkStyle(style);
    // Set the key that MapOverlay reads
    (window as any).__markType = style.key;
    setActiveMode('mark');
  }, [setActiveMode]);

  // ===== Map download: html2canvas with preserveDrawingBuffer (set in AMap init) =====
  const handleDownload = useCallback(async () => {
    setDownloadStatus('loading');
    const mainMap = (window as any).__campusMapInstance;
    if (!mainMap) { setDownloadStatus('error'); setTimeout(() => setDownloadStatus('idle'), 3000); return; }

    try {
      const container = mainMap.getContainer() as HTMLElement;

      // Wait for map tiles to fully load
      await new Promise<void>(r => setTimeout(r, 1000));

      // Hide controls
      const toHide = container.querySelectorAll('.amap-controls, .amap-logo, .amap-copyright');
      const originals: [HTMLElement, string][] = [];
      toHide.forEach((el: Element) => { const he = el as HTMLElement; originals.push([he, he.style.display]); he.style.display = 'none'; });

      // html2canvas with preserveDrawingBuffer already set via HTMLCanvasElement.prototype.getContext
      const canvas = await html2canvas(container, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f0f2f5',
        scale: 2,
        logging: false,
        foreignObjectRendering: false,
        imageTimeout: 15000,
      });

      // Restore controls
      originals.forEach(([el, d]) => { el.style.display = d; });

      const link = document.createElement('a');
      link.download = '校园地图.png'; link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link); link.click();
      setTimeout(() => document.body.removeChild(link), 100);
      setDownloadStatus('done'); setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch (err: any) {
      console.error('下载失败:', err);
      setDownloadStatus('error'); setTimeout(() => setDownloadStatus('idle'), 3000);
    }
  }, []);

  if (!panelOpen) return null;

  const isActive = (key: string) => state.activeMode === key;

  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center" style={{ pointerEvents: 'auto' }}>
      <div className="backdrop-modern absolute inset-0" onClick={() => setPanelOpen(false)} />
      <div className="relative w-full dialog-modern animate-slide-up-elastic" style={{ maxHeight: '65vh', zIndex: 61 }}>
        <div className="gold-line" />
        <div className="flex items-center px-4 py-3" style={{ background: 'var(--navy-deep)' }}>
          <Wrench size={18} style={{ color: 'var(--gold)' }} className="mr-2" />
          <h2 className="flex-1 text-base font-bold text-white">工具箱</h2>
          <button onClick={() => setPanelOpen(false)} className="p-1" style={{ color: 'rgba(255,255,255,0.7)' }}><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ background: 'var(--bg-gray-50)', borderBottom: '1px solid var(--divider)' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-all"
                style={{
                  color: activeTab === tab.key ? 'var(--blue-standard)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab.key ? '2px solid var(--blue-standard)' : '2px solid transparent',
                  background: activeTab === tab.key ? '#fff' : 'transparent',
                }}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="px-4 py-3 overflow-y-auto custom-scrollbar" style={{ background: '#fff', maxHeight: '45vh' }}>

          {/* ===== MEASURE TAB ===== */}
          {activeTab === 'measure' && (
            <div>
              {/* Tool buttons */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={() => handleTool('measure')}
                  className="flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all"
                  style={{
                    background: isActive('measure') ? 'var(--blue-pale)' : 'var(--bg-gray-50)',
                    border: isActive('measure') ? '1.5px solid var(--blue-standard)' : '1.5px solid var(--border-light)',
                  }}
                >
                  <Ruler size={22} style={{ color: isActive('measure') ? 'var(--blue-standard)' : 'var(--text-secondary)' }} />
                  <span className="text-sm font-medium" style={{ color: isActive('measure') ? 'var(--blue-standard)' : 'var(--text-primary)' }}>测距</span>
                </button>
                <button
                  onClick={() => handleTool('measureArea')}
                  className="flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all"
                  style={{
                    background: isActive('measureArea') ? 'var(--blue-pale)' : 'var(--bg-gray-50)',
                    border: isActive('measureArea') ? '1.5px solid var(--blue-standard)' : '1.5px solid var(--border-light)',
                  }}
                >
                  <AreaChart size={22} style={{ color: isActive('measureArea') ? 'var(--blue-standard)' : 'var(--text-secondary)' }} />
                  <span className="text-sm font-medium" style={{ color: isActive('measureArea') ? 'var(--blue-standard)' : 'var(--text-primary)' }}>测面积</span>
                </button>
              </div>

              {/* Measure property table */}
              {measurePoints.length > 0 && (
                <div className="animate-fade-in mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>| 测距数据</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--blue-standard)' }}>
                      总长: {measurePoints[measurePoints.length - 1]?.cumDist?.toFixed(1) || 0} m
                    </span>
                  </div>
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr style={{ background: 'var(--navy-deep)' }}>
                          <th className="px-2 py-1.5 text-left text-white font-medium">编号</th>
                          <th className="px-2 py-1.5 text-left text-white font-medium">经度</th>
                          <th className="px-2 py-1.5 text-left text-white font-medium">纬度</th>
                          <th className="px-2 py-1.5 text-right text-white font-medium">段距(m)</th>
                          <th className="px-2 py-1.5 text-right text-white font-medium">累计(m)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {measurePoints.map((p: any, idx: number) => (
                          <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : 'var(--bg-gray-50)', borderBottom: idx < measurePoints.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                            <td className="px-2 py-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>{p.idx}</td>
                            <td className="px-2 py-1.5 font-mono-coord" style={{ color: 'var(--text-secondary)' }}>{p.coord[0].toFixed(6)}</td>
                            <td className="px-2 py-1.5 font-mono-coord" style={{ color: 'var(--text-secondary)' }}>{p.coord[1].toFixed(6)}</td>
                            <td className="px-2 py-1.5 text-right" style={{ color: 'var(--text-primary)' }}>{p.segDist > 0 ? p.segDist.toFixed(1) : '-'}</td>
                            <td className="px-2 py-1.5 text-right font-medium" style={{ color: 'var(--blue-standard)' }}>{p.cumDist.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Area property table */}
              {areaData.length > 0 && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>| 测面积数据</span>
                  </div>
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr style={{ background: 'var(--navy-deep)' }}>
                          <th className="px-2 py-1.5 text-left text-white font-medium">编号</th>
                          <th className="px-2 py-1.5 text-right text-white font-medium">点数</th>
                          <th className="px-2 py-1.5 text-right text-white font-medium">面积(m²)</th>
                          <th className="px-2 py-1.5 text-right text-white font-medium">面积(亩)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {areaData.map((a: any, idx: number) => (
                          <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : 'var(--bg-gray-50)', borderBottom: idx < areaData.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                            <td className="px-2 py-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>{a.idx}</td>
                            <td className="px-2 py-1.5 text-right" style={{ color: 'var(--text-secondary)' }}>{a.pointCount}</td>
                            <td className="px-2 py-1.5 text-right font-medium" style={{ color: 'var(--blue-standard)' }}>{a.area.toFixed(1)}</td>
                            <td className="px-2 py-1.5 text-right" style={{ color: 'var(--text-primary)' }}>{(a.area * 0.0015).toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== EDIT TAB ===== */}
          {activeTab === 'edit' && (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  { key: 'drawPoint', icon: PenTool, label: '画点' },
                  { key: 'drawLine', icon: Minus, label: '画线' },
                  { key: 'drawPolygon', icon: Hexagon, label: '画面' },
                  { key: 'coord', icon: MapPin, label: '坐标拾取' },
                ].map(tool => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.key}
                      onClick={() => handleTool(tool.key)}
                      className="flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all"
                      style={{
                        background: isActive(tool.key) ? 'var(--blue-pale)' : 'var(--bg-gray-50)',
                        border: isActive(tool.key) ? '1.5px solid var(--blue-standard)' : '1.5px solid var(--border-light)',
                      }}
                    >
                      <Icon size={22} style={{ color: isActive(tool.key) ? 'var(--blue-standard)' : 'var(--text-secondary)' }} />
                      <span className="text-sm font-medium" style={{ color: isActive(tool.key) ? 'var(--blue-standard)' : 'var(--text-primary)' }}>{tool.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Coord property table */}
              {coordPoints.length > 0 && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>| 坐标记录</span>
                    <button
                      onClick={() => setCoordPoints([])}
                      className="text-[10px] px-2 py-0.5 rounded"
                      style={{ color: '#e83e3e', background: '#fee2e2' }}
                    >
                      清空
                    </button>
                  </div>
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr style={{ background: 'var(--navy-deep)' }}>
                          <th className="px-2 py-1.5 text-left text-white font-medium">编号</th>
                          <th className="px-2 py-1.5 text-left text-white font-medium">经度</th>
                          <th className="px-2 py-1.5 text-left text-white font-medium">纬度</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coordPoints.map((p: any, idx: number) => (
                          <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : 'var(--bg-gray-50)', borderBottom: idx < coordPoints.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                            <td className="px-2 py-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>{p.idx}</td>
                            <td className="px-2 py-1.5 font-mono-coord" style={{ color: 'var(--text-secondary)' }}>{p.lng.toFixed(6)}</td>
                            <td className="px-2 py-1.5 font-mono-coord" style={{ color: 'var(--text-secondary)' }}>{p.lat.toFixed(6)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== MARK TAB ===== */}
          {activeTab === 'mark' && (
            <div>
              <p className="text-xs font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>| 标记类型</p>
              <div className="grid grid-cols-5 gap-2">
                {MARK_STYLES.map(style => (
                  <button
                    key={style.key}
                    onClick={() => handleMarkStyle(style)}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all"
                    style={{
                      background: activeMarkStyle.key === style.key ? style.color + '12' : 'var(--bg-gray-50)',
                      border: activeMarkStyle.key === style.key ? `2px solid ${style.color}` : '1.5px solid var(--border-light)',
                    }}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: style.color, color: '#fff' }}>
                      {style.icon}
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: activeMarkStyle.key === style.key ? style.color : 'var(--text-primary)' }}>
                      {style.label}
                    </span>
                  </button>
                ))}
              </div>
              {isActive('mark') && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg animate-fade-in" style={{ background: 'var(--blue-pale)' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: activeMarkStyle.color, color: '#fff' }}>
                    {activeMarkStyle.icon}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--blue-standard)' }}>
                    当前标记：{activeMarkStyle.label}（点击地图放置）
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ===== TEXT TAB ===== */}
          {activeTab === 'text' && (
            <div>
              <button
                onClick={() => handleTool('text')}
                className="w-full flex flex-col items-center gap-1.5 py-6 rounded-xl transition-all"
                style={{
                  background: isActive('text') ? 'var(--blue-pale)' : 'var(--bg-gray-50)',
                  border: isActive('text') ? '1.5px solid var(--blue-standard)' : '1.5px solid var(--border-light)',
                }}
              >
                <Type size={24} style={{ color: isActive('text') ? 'var(--blue-standard)' : 'var(--text-secondary)' }} />
                <span className="text-sm font-medium" style={{ color: isActive('text') ? 'var(--blue-standard)' : 'var(--text-primary)' }}>文本标注</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>点击地图添加文字</span>
              </button>
            </div>
          )}

          {/* ===== DOWNLOAD TAB ===== */}
          {activeTab === 'download' && (
            <div>
              <button
                onClick={handleDownload}
                disabled={downloadStatus === 'loading'}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-medium text-white transition-all"
                style={{
                  background: downloadStatus === 'loading' ? 'var(--text-muted)' : downloadStatus === 'done' ? '#2d6a4f' : downloadStatus === 'error' ? '#e83e3e' : 'var(--navy-deep)',
                }}
              >
                {downloadStatus === 'loading' ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 生成中...</>
                ) : downloadStatus === 'done' ? (
                  <><Download size={18} /> 下载已开始</>
                ) : downloadStatus === 'error' ? (
                  <><Download size={18} /> 下载失败，点击重试</>
                ) : (
                  <><Download size={18} /> 下载地图标注图片</>
                )}
              </button>
              <p className="text-[11px] text-center mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                下载包含地图底图与所有测量点、坐标拾取点、标记的完整图片
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'var(--bg-gray-50)', borderTop: '1px solid var(--divider)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {state.activeMode !== 'none' ? `当前：${state.activeMode}` : '选择工具'}
          </span>
          <button onClick={() => { setActiveMode('none'); setPanelOpen(false); }} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: 'var(--navy-deep)', color: '#fff' }}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
