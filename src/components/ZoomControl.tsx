import { useCallback } from 'react';
import { Plus, Minus, ChevronUp, ChevronDown } from 'lucide-react';

export default function ZoomControl() {
  const handleZoomIn = useCallback(() => {
    const map = (window as any).__campusMapInstance;
    if (map) map.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    const map = (window as any).__campusMapInstance;
    if (map) map.zoomOut();
  }, []);

  const handlePitchUp = useCallback(() => {
    const map = (window as any).__campusMapInstance;
    if (map) {
      const current = map.getPitch();
      map.setPitch(Math.min(current + 10, 83));
    }
  }, []);

  const handlePitchDown = useCallback(() => {
    const map = (window as any).__campusMapInstance;
    if (map) {
      const current = map.getPitch();
      map.setPitch(Math.max(current - 10, 0));
    }
  }, []);

  return (
    <div className="zoom-control flex flex-col" style={{ pointerEvents: 'auto' }}>
      {/* Pitch up */}
      <button onClick={handlePitchUp} className="zoom-btn" title="抬高视角">
        <ChevronUp size={16} strokeWidth={2.5} />
      </button>
      <div style={{ height: 1, background: 'var(--divider)' }} />
      {/* Zoom in */}
      <button onClick={handleZoomIn} className="zoom-btn" title="放大">
        <Plus size={18} strokeWidth={2.5} />
      </button>
      <div style={{ height: 1, background: 'var(--divider)' }} />
      {/* Zoom out */}
      <button onClick={handleZoomOut} className="zoom-btn" title="缩小">
        <Minus size={18} strokeWidth={2.5} />
      </button>
      <div style={{ height: 1, background: 'var(--divider)' }} />
      {/* Pitch down */}
      <button onClick={handlePitchDown} className="zoom-btn" title="降低视角">
        <ChevronDown size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}
