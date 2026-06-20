import { useCallback } from 'react';
import { useMapContext } from '../hooks/useMapContext';
import { MapPin } from 'lucide-react';

export default function CoordDisplay() {
  const { state, setActiveMode, setCoordPickResult } = useMapContext();
  const { map } = state;

  const center = map ? [map.getCenter().lng, map.getCenter().lat] : [103.738, 36.101];
  const coord = state.coordPickResult || (center as [number, number]);
  const isCoordMode = state.activeMode === 'coord';

  const handleClick = useCallback(() => {
    if (isCoordMode) {
      setActiveMode('none');
      setCoordPickResult(null);
    } else {
      setActiveMode('coord');
    }
  }, [isCoordMode, setActiveMode, setCoordPickResult]);

  return (
    <button
      onClick={handleClick}
      onTouchStart={(e) => e.stopPropagation()}
      className="absolute bottom-[100px] left-3 z-[50] no-select"
      style={{
        background: isCoordMode ? '#e83e3e' : '#0f2650',
        border: '2px solid #000',
        boxShadow: isCoordMode ? '0px 0px 0px 0px' : '3px 3px 0 #000',
        borderRadius: 6,
        padding: '5px 10px',
        pointerEvents: 'auto',
        touchAction: 'manipulation',
        transform: isCoordMode ? 'translate(3px, 3px)' : 'none',
        transition: 'transform 0.1s, box-shadow 0.1s, background 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
      title={isCoordMode ? '点击关闭坐标拾取' : '点击查看地图坐标'}
    >
      <MapPin size={13} color={isCoordMode ? '#fff' : '#c9a96e'} />
      <div className="text-left">
        <p className="text-[9px] font-bold leading-tight" style={{ color: isCoordMode ? '#fff' : '#c9a96e' }}>
          {isCoordMode ? '坐标拾取中' : '地图中心'}
        </p>
        <p className="font-mono-coord text-[11px] leading-tight" style={{ color: '#fff' }}>
          {coord[0].toFixed(4)}, {coord[1].toFixed(4)}
        </p>
      </div>
    </button>
  );
}
