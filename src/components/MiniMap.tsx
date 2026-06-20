import { useEffect, useRef } from 'react';

export default function MiniMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<any>(null);

  useEffect(() => {
    const map = (window as any).__campusMapInstance;
    if (!map || !window.AMap || !containerRef.current) return;

    const initMiniMap = () => {
      try {
        // Create an overview map (鹰眼)
        const overview = new window.AMap.OverView({
          visible: true,
          isOpen: true,
        });
        overview.open();

        // Create a small custom mini map
        const miniMap = new window.AMap.Map(containerRef.current, {
          center: map.getCenter(),
          zoom: 10,
          zooms: [3, 18],
          dragEnable: false,
          scrollWheel: false,
          doubleClickZoom: false,
          keyboardEnable: false,
          touchZoom: false,
        });

        miniMap.addControl(overview);
        miniMapRef.current = miniMap;

        // Sync center with main map
        const syncCenter = () => {
          if (miniMapRef.current) {
            miniMapRef.current.setCenter(map.getCenter());
          }
        };
        map.on('moveend', syncCenter);
        map.on('zoomend', syncCenter);

        return () => {
          map.off('moveend', syncCenter);
          map.off('zoomend', syncCenter);
          if (miniMapRef.current) {
            miniMapRef.current.destroy();
            miniMapRef.current = null;
          }
        };
      } catch {
        // Fallback: just show a static map tile image
        if (containerRef.current) {
          containerRef.current.style.background = 'var(--bg-gray-100)';
          containerRef.current.style.display = 'flex';
          containerRef.current.style.alignItems = 'center';
          containerRef.current.style.justifyContent = 'center';
          containerRef.current.innerHTML = '<span style="font-size:10px;color:var(--text-muted)">地图</span>';
        }
      }
    };

    if ((window as any).__amapPluginsReady) {
      initMiniMap();
    } else {
      const timer = setInterval(() => {
        if ((window as any).__amapPluginsReady) {
          clearInterval(timer);
          initMiniMap();
        }
      }, 200);
      setTimeout(() => clearInterval(timer), 5000);
    }
  }, []);

  return (
    <div
      className="mini-map-container"
      ref={containerRef}
      style={{ pointerEvents: 'auto' }}
    />
  );
}
