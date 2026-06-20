import { useState, useCallback, useEffect } from 'react';
import { useMapContext } from '../hooks/useMapContext';
import { INFRASTRUCTURE_CATEGORIES } from '../types';
import {
  X, MapPin, Navigation, ArrowLeft, Building2, Flower2,
  School, Utensils, Home, Landmark, Dumbbell, BookOpen,
  Stethoscope, DoorOpen, Building, Microscope, Coffee,
  Check,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  'door-open': DoorOpen,
  'school': School,
  'building': Building,
  'utensils': Utensils,
  'home': Home,
  'flower-2': Flower2,
  'landmark': Landmark,
  'dumbbell': Dumbbell,
  'microscope': Microscope,
  'coffee': Coffee,
  'stethoscope': Stethoscope,
  'book-open': BookOpen,
};

export default function BottomGuidePanel() {
  const { state, toggleCategory, clearAllCategories, showAllCategories, selectPOI, flyTo } = useMapContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => { setDialogOpen(true); setSelectedCategory(null); };
    window.addEventListener('toggle-infrastructure', handler);
    return () => window.removeEventListener('toggle-infrastructure', handler);
  }, []);

  const handleClose = useCallback(() => { setDialogOpen(false); setSelectedCategory(null); }, []);
  const handleBack = useCallback(() => setSelectedCategory(null), []);

  const handleCategoryClick = useCallback((key: string) => {
    setSelectedCategory(key);
    if (!state.activeCategories.includes(key)) toggleCategory(key);
  }, [state.activeCategories, toggleCategory]);

  const handleToggleCategoryFilter = useCallback((key: string) => {
    toggleCategory(key);
  }, [toggleCategory]);

  const handlePOIClick = useCallback((poi: any) => {
    selectPOI(poi); flyTo(poi.position, 18); setDialogOpen(false);
  }, [selectPOI, flyTo]);

  const handleNavFrom = useCallback((poi: any) => {
    window.dispatchEvent(new CustomEvent('set-nav-point', { detail: { type: 'start', pos: poi.position, label: poi.name } }));
    setDialogOpen(false);
  }, []);

  const handleNavTo = useCallback((poi: any) => {
    window.dispatchEvent(new CustomEvent('set-nav-point', { detail: { type: 'end', pos: poi.position, label: poi.name } }));
    setDialogOpen(false);
  }, []);

  const groupedPOIs = state.pois.reduce((acc, poi) => {
    if (!acc[poi.type]) acc[poi.type] = [];
    acc[poi.type].push(poi);
    return acc;
  }, {} as Record<string, typeof state.pois>);

  return (
    <>
      {/* Bottom buttons - moved up to avoid covering map scale */}
      <div className="absolute left-3 z-[50] flex gap-2" style={{ pointerEvents: 'auto', bottom: 60 }}>
        <button onClick={() => { setDialogOpen(true); setSelectedCategory(null); }} className="tool-btn-float flex items-center gap-2 px-3 py-2" style={{ width: 'auto', height: 40 }}>
          <Building2 size={16} /> <span className="text-xs font-medium">基础设施</span>
        </button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('open-scenery'))} className="tool-btn-float flex items-center gap-2 px-3 py-2" style={{ width: 'auto', height: 40 }}>
          <Flower2 size={16} /> <span className="text-xs font-medium">校园风光</span>
        </button>
      </div>

      {/* Infrastructure Dialog */}
      {dialogOpen && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center" style={{ pointerEvents: 'auto' }}>
          <div className="backdrop-modern absolute inset-0" onClick={handleClose} />
          <div className="relative w-full dialog-modern animate-slide-up-elastic" style={{ maxHeight: '65vh', zIndex: 61 }}>
            <div className="gold-line" />
            <div className="flex items-center px-4 py-3" style={{ background: 'var(--navy-deep)' }}>
              {selectedCategory && (
                <button onClick={handleBack} className="mr-2" style={{ color: '#fff' }}><ArrowLeft size={20} /></button>
              )}
              <Building2 size={18} style={{ color: 'var(--gold)' }} className="mr-2" />
              <h2 className="flex-1 text-base font-bold text-white">
                {selectedCategory ? (INFRASTRUCTURE_CATEGORIES.find(c => c.key === selectedCategory)?.label || '基础设施') : '基础设施'}
              </h2>
              <button onClick={handleClose} className="p-1" style={{ color: 'rgba(255,255,255,0.7)' }}><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3" style={{ background: '#fff' }}>
              {!selectedCategory ? (
                <>
                  {/* Category filter checkboxes */}
                  <div className="mb-3 px-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>地图显示筛选</p>
                      {state.activeCategories.length > 0 ? (
                        <button
                          onClick={clearAllCategories}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-all"
                          style={{ background: '#fee2e2', color: '#e83e3e', border: '1px solid #fecaca' }}
                        >
                          都不显示
                        </button>
                      ) : state.categoryFilterActive ? (
                        <button
                          onClick={() => showAllCategories(Object.keys(groupedPOIs))}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-all"
                          style={{ background: 'var(--blue-pale)', color: 'var(--blue-standard)', border: '1px solid var(--blue-standard)' }}
                        >
                          显示全部
                        </button>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {INFRASTRUCTURE_CATEGORIES.filter(cat => groupedPOIs[cat.key]).map(cat => {
                        const isActive = state.activeCategories.includes(cat.key);
                        const Icon = ICON_MAP[cat.icon] || Building2;
                        return (
                          <button
                            key={cat.key}
                            onClick={() => handleToggleCategoryFilter(cat.key)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all"
                            style={{
                              background: isActive ? cat.color + '18' : 'var(--bg-gray-50)',
                              border: isActive ? `1.5px solid ${cat.color}` : '1.5px solid var(--border-light)',
                              color: isActive ? cat.color : 'var(--text-muted)',
                            }}
                          >
                            <Icon size={12} />
                            <span>{cat.label}</span>
                            {isActive && <Check size={10} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category grid */}
                  <div className="grid grid-cols-4 gap-3">
                    {INFRASTRUCTURE_CATEGORIES.filter(cat => groupedPOIs[cat.key]).map(cat => {
                      const Icon = ICON_MAP[cat.icon] || Building2;
                      return (
                        <button
                          key={cat.key}
                          onClick={() => handleCategoryClick(cat.key)}
                          className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                          style={{ background: 'var(--bg-gray-50)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--blue-pale)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-gray-50)'; }}
                        >
                          <div className="flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: cat.color + '12', border: `2px solid ${cat.color}30` }}>
                            <Icon size={20} style={{ color: cat.color }} />
                          </div>
                          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{cat.label}</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{groupedPOIs[cat.key]?.length}个</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div>
                  {groupedPOIs[selectedCategory]?.map((poi, idx) => (
                    <div
                      key={`${poi.name}-${idx}`}
                      className="flex items-center gap-3 py-2.5 px-2 transition-colors"
                      style={{ borderBottom: idx < (groupedPOIs[selectedCategory]?.length || 0) - 1 ? '1px solid var(--divider)' : 'none' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-gray-50)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div className="flex-1 min-w-0">
                        <button onClick={() => handlePOIClick(poi)} className="text-left w-full">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{poi.name}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{poi.info || poi.type}</p>
                        </button>
                        <div className="flex items-center gap-3 mt-1">
                          <button onClick={() => handleNavFrom(poi)} className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--blue-standard)' }}>
                            <MapPin size={10} /> 出发
                          </button>
                          <button onClick={() => handleNavTo(poi)} className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--blue-standard)' }}>
                            <Navigation size={10} /> 到这去
                          </button>
                        </div>
                      </div>
                      {(poi.currentImages?.[0] || poi.pastImages?.[0]) && (
                        <button onClick={() => handlePOIClick(poi)} className="flex-shrink-0">
                          <img src={poi.currentImages?.[0] || poi.pastImages?.[0]} alt="" className="object-cover" style={{ width: 56, height: 56, borderRadius: 8, border: '1px solid var(--border-light)' }} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'var(--bg-gray-50)', borderTop: '1px solid var(--divider)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {selectedCategory ? `${groupedPOIs[selectedCategory]?.length || 0} 个地点` : `共 ${state.pois.length} 个地点`}
              </span>
              <button onClick={handleClose} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: 'var(--navy-deep)', color: '#fff' }}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
