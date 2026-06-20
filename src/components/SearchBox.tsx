import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useMapContext } from '../hooks/useMapContext';
import { CATEGORY_MAP } from '../types';

export default function SearchBox() {
  const { state, setSearchQuery, selectPOI, flyTo } = useMapContext();
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      className="absolute z-[50]"
      style={{ top: 60, left: 12, pointerEvents: 'auto', width: 280 }}
    >
      <div className="search-box-modern flex items-center gap-2 px-3 py-2.5">
        <Search size={16} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
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
          <button onClick={handleClear} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && state.searchResults.length > 0 && (
        <div
          className="mt-1.5 max-h-[260px] overflow-y-auto custom-scrollbar animate-fade-in"
          style={{
            background: '#fff',
            borderRadius: 10,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
          }}
        >
          {state.searchResults.map((poi, idx) => {
            const catConfig = CATEGORY_MAP[poi.type];
            const color = catConfig?.color || '#64748b';
            return (
              <button
                key={`${poi.name}-${idx}`}
                className="w-full text-left px-3 py-2 flex items-center gap-3 transition-colors"
                style={{
                  borderBottom: idx < state.searchResults.length - 1 ? '1px solid var(--divider)' : 'none',
                  background: 'transparent',
                }}
                onClick={() => handleSelect(poi)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-gray-50)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{poi.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{poi.type}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && state.searchQuery && state.searchResults.length === 0 && (
        <div
          className="mt-1.5 py-4 text-center text-sm animate-fade-in"
          style={{
            background: '#fff',
            borderRadius: 10,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            color: 'var(--text-muted)',
          }}
        >
          未找到相关地点
        </div>
      )}
    </div>
  );
}
