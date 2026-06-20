import { Search, MapPin } from 'lucide-react';
import { useMapContext } from '../hooks/useMapContext';
import { useState, useCallback, useRef, useEffect } from 'react';
import { CATEGORY_MAP } from '../types';

export default function TopNavigationBar() {
  const { state, setSearchQuery, selectPOI, flyTo } = useMapContext();
  const [isOpen, setIsOpen] = useState(false);
  const [navSelecting, setNavSelecting] = useState<'none' | 'start' | 'end'>('none');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for nav selecting state
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.type) setNavSelecting(d.type);
    };
    window.addEventListener('nav-selecting', handler);
    return () => window.removeEventListener('nav-selecting', handler);
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchQuery(val);
      setIsOpen(val.trim().length > 0);
    }, 200);
  }, [setSearchQuery]);

  const handleSelect = useCallback((poi: any) => {
    selectPOI(poi);
    flyTo(poi.position, 18);
    setIsOpen(false);
    setSearchQuery('');
    if (inputRef.current) inputRef.current.value = '';
  }, [selectPOI, flyTo, setSearchQuery]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setIsOpen(false);
    if (inputRef.current) inputRef.current.value = '';
  }, [setSearchQuery]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 right-0 z-[50]"
      style={{ pointerEvents: 'none' }}
    >
      <div className="top-nav-bar flex items-center gap-3 px-3 h-[52px]" style={{ pointerEvents: 'auto' }}>
        {/* Brand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#fff', border: '1.5px solid var(--gold)' }}>
            <img
              src="/badge.png"
              alt=""
              className="w-6 h-6"
              style={{ objectFit: 'contain' }}
            />
          </div>
          <div className="hidden sm:block">
            <p className="text-white text-xs font-bold leading-tight">云亭校园地图</p>
            <p className="text-white/50 text-[9px]">西北师范大学</p>
          </div>
        </div>

        {/* Search */}
        <div className="search-box-modern flex items-center gap-2 px-3 py-1.5 flex-1 max-w-[320px]">
          <Search size={14} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索校内地点..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
            onChange={handleInput}
            onFocus={() => { if (state.searchQuery) setIsOpen(true); }}
          />
          {isOpen && (
            <button onClick={handleClear} style={{ color: 'var(--text-muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Mode indicator + Nav selecting status */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {navSelecting !== 'none' && (
            <div
              className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold text-white animate-scale-in"
              style={{ background: navSelecting === 'start' ? '#1a5fb4' : '#e83e3e' }}
            >
              <MapPin size={10} />
              {navSelecting === 'start' ? '请在地图上选择起点' : '请在地图上选择终点'}
            </div>
          )}
          {state.activeMode !== 'none' && navSelecting === 'none' && (
            <div
              className="text-[10px] px-2.5 py-1 rounded-full font-medium text-white animate-scale-in"
              style={{ background: 'var(--blue-standard)' }}
            >
              {state.activeMode === 'route' && '路线规划'}
              {state.activeMode === 'measure' && `测距 ${state.measureTotal.toFixed(0)}m`}
              {state.activeMode === 'measureArea' && '测面积'}
              {state.activeMode === 'nearby' && '公共交通'}
              {state.activeMode === 'coord' && '坐标拾取'}
              {state.activeMode === 'mark' && '标记'}
              {state.activeMode === 'text' && '文本标注'}
              {state.activeMode === 'drawPoint' && '画点'}
              {state.activeMode === 'drawLine' && '画线'}
              {state.activeMode === 'drawPolygon' && '画面'}
            </div>
          )}
        </div>
      </div>

      {/* Search results dropdown - shifted right to avoid left toolbar */}
      {isOpen && (
        <div className="px-3" style={{ pointerEvents: 'auto', maxWidth: 360, marginLeft: 56 }}>
          {/* Local POI search results */}
          {state.searchResults.length > 0 && (
            <div className="mt-1.5 max-h-[200px] overflow-y-auto custom-scrollbar glass-card animate-fade-in">
              <p className="px-3 py-1.5 text-[10px] font-bold" style={{ color: 'var(--text-muted)', background: 'var(--bg-gray-50)' }}>校内地点</p>
              {state.searchResults.map((poi, idx) => {
                const catConfig = CATEGORY_MAP[poi.type];
                const color = catConfig?.color || '#64748b';
                return (
                  <button
                    key={`${poi.name}-${idx}`}
                    className="w-full text-left px-3 py-2 flex items-center gap-3 transition-colors"
                    style={{ borderBottom: idx < state.searchResults.length - 1 ? '1px solid var(--divider)' : 'none' }}
                    onClick={() => handleSelect(poi)}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-gray-50)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{poi.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{poi.type}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {state.searchQuery && state.searchResults.length === 0 && (
            <div className="mt-1.5 py-4 text-center text-sm glass-card animate-fade-in" style={{ color: 'var(--text-muted)' }}>
              未找到相关地点
            </div>
          )}
        </div>
      )}
    </div>
  );
}
