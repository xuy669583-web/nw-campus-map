import { useState, useCallback, useEffect } from 'react';
import { X, Navigation, MapPin } from 'lucide-react';
import { useMapContext } from '../hooks/useMapContext';
import { CATEGORY_MAP } from '../types';

export default function POIDetailSheet() {
  const { state, setDetailSheetOpen, selectPOI } = useMapContext();
  const [photoTab, setPhotoTab] = useState<'current' | 'past'>('current');
  const [photoIdx, setPhotoIdx] = useState(0);
  const [address, setAddress] = useState('');
  const poi = state.selectedPOI;

  // Reverse geocode: coordinate -> address
  useEffect(() => {
    if (!poi) return;
    if (!window.AMap || !window.AMap.Geocoder) {
      setAddress('');
      return;
    }
    try {
      const geocoder = new window.AMap.Geocoder({ radius: 200 });
      geocoder.getAddress(poi.position, (status: string, result: any) => {
        if (status === 'complete' && result.regeocode) {
          setAddress(result.regeocode.formattedAddress || '');
        } else {
          setAddress('');
        }
      });
    } catch { setAddress(''); }
  }, [poi]);

  const handleClose = useCallback(() => {
    setDetailSheetOpen(false);
    selectPOI(null);
  }, [setDetailSheetOpen, selectPOI]);

  const handleNavFrom = useCallback(() => {
    if (!poi) return;
    window.dispatchEvent(new CustomEvent('set-nav-point', { detail: { type: 'start', pos: poi.position, label: poi.name } }));
    handleClose();
  }, [poi, handleClose]);

  const handleNavTo = useCallback(() => {
    if (!poi) return;
    window.dispatchEvent(new CustomEvent('set-nav-point', { detail: { type: 'end', pos: poi.position, label: poi.name } }));
    handleClose();
  }, [poi, handleClose]);

  if (!poi || !state.detailSheetOpen) return null;

  const catConfig = CATEGORY_MAP[poi.type];
  const color = catConfig?.color || '#5a5a5a';
  const currentImages = poi.currentImages || [];
  const pastImages = poi.pastImages || [];
  const activeImages = photoTab === 'current' ? currentImages : pastImages;
  const hasPhotos = currentImages.length > 0 || pastImages.length > 0;

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end">
      <div className="backdrop-modern absolute inset-0" onClick={handleClose} />
      <div className="relative animate-slide-up-elastic flex flex-col" style={{ background: '#fff', borderRadius: '16px 16px 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', maxHeight: '72vh' }}>
        <div className="gold-line" style={{ borderRadius: '16px 16px 0 0' }} />
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-3 pb-2 flex-shrink-0">
          <div>
            <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-white mb-1 rounded" style={{ background: color }}>{poi.subtype || poi.type}</span>
            <h2 className="font-serif-title text-lg font-bold" style={{ color: 'var(--navy-deep)' }}>{poi.name}</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* Photo section - prominent, centered */}
          {hasPhotos && (
            <div className="px-4 pb-3">
              {/* Tab buttons - centered */}
              <div className="flex justify-center gap-6 mb-3" style={{ borderBottom: '1px solid var(--divider)' }}>
                {currentImages.length > 0 && (
                  <button
                    onClick={() => { setPhotoTab('current'); setPhotoIdx(0); }}
                    className="pb-2 text-sm font-bold transition-all"
                    style={{
                      color: photoTab === 'current' ? 'var(--blue-standard)' : 'var(--text-muted)',
                      borderBottom: photoTab === 'current' ? '2.5px solid var(--blue-standard)' : '2.5px solid transparent',
                      marginBottom: -1,
                    }}
                  >
                    现在照片
                  </button>
                )}
                {pastImages.length > 0 && (
                  <button
                    onClick={() => { setPhotoTab('past'); setPhotoIdx(0); }}
                    className="pb-2 text-sm font-bold transition-all"
                    style={{
                      color: photoTab === 'past' ? 'var(--blue-standard)' : 'var(--text-muted)',
                      borderBottom: photoTab === 'past' ? '2.5px solid var(--blue-standard)' : '2.5px solid transparent',
                      marginBottom: -1,
                    }}
                  >
                    过去照片
                  </button>
                )}
              </div>
              {activeImages.length > 0 && (
                <div className="relative overflow-hidden mb-2 rounded-xl mx-auto" style={{ aspectRatio: '16/9', maxHeight: '36vh', maxWidth: '100%', border: '1px solid var(--border-light)' }}>
                  <img src={activeImages[photoIdx]} alt={poi.name} className="w-full h-full object-cover" />
                  {activeImages.length > 1 && (
                    <>
                      <button onClick={() => setPhotoIdx(prev => (prev - 1 + activeImages.length) % activeImages.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg></button>
                      <button onClick={() => setPhotoIdx(prev => (prev + 1) % activeImages.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></button>
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                        {activeImages.map((_: string, i: number) => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)' }} />)}
                      </div>
                      {/* Image counter */}
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
                        {photoIdx + 1} / {activeImages.length}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="px-4 pb-2">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{poi.description || poi.info}</p>
          </div>

          {/* Address from Geocoder */}
          {address && (
            <div className="px-4 pb-2 flex items-start gap-1.5">
              <MapPin size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{address}</p>
            </div>
          )}

          {/* Coordinates */}
          <div className="px-4 py-2">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>类型：{poi.subtype || poi.type}</p>
            <p className="font-mono-coord text-[11px] mt-0.5" style={{ color: 'var(--gold)' }}>{poi.position[0].toFixed(6)}, {poi.position[1].toFixed(6)}</p>
          </div>
        </div>

        {/* Action buttons - always visible at bottom */}
        <div className="flex gap-2 px-4 pb-4 pt-1 flex-shrink-0" style={{ borderTop: '1px solid var(--divider)', background: '#fff' }}>
          <button onClick={handleNavFrom} className="btn-solid flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold">
            <Navigation size={14} /> 从这里出发
          </button>
          <button onClick={handleNavTo} className="btn-solid flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold" style={{ background: '#e83e3e', boxShadow: '0 2px 6px rgba(232,62,62,0.3)' }}>
            <Navigation size={14} /> 到这里去
          </button>
        </div>
      </div>
    </div>
  );
}
