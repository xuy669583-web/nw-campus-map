import { MapProvider, useMapContext } from './hooks/useMapContext';
import AMapContainer from './components/AMapContainer';
import MapOverlay from './components/MapOverlay';
import TopNavigationBar from './components/TopNavigationBar';
import ToolPanel from './components/ToolPanel';
import NavigationPanel from './components/NavigationPanel';
import BottomGuidePanel from './components/BottomGuidePanel';
import CampusSceneryButton from './components/CampusSceneryButton';
import FloatingToolbar from './components/FloatingToolbar';
import POIDetailSheet from './components/POIDetailSheet';
import PublicTransitDialog from './components/PublicTransitDialog';
import LayerPanel from './components/LayerPanel';

function MapApp() {
  const { state } = useMapContext();

  return (
    <div className="fixed inset-0 w-full h-screen overflow-hidden" style={{ background: '#f0f2f5' }}>
      {/* Layer 0: Map canvas */}
      <AMapContainer />

      {/* Layer 1: Map overlays (markers, boundary, routes, measure, draw) */}
      <MapOverlay />

      {/* ===== UI Layer 2: Each function appears EXACTLY ONCE ===== */}

      {/* Top: Brand + Search (no function buttons) */}
      <TopNavigationBar />

      {/* Left: Core map tools (navigation/measure/coord/nearby/annotation/layer) */}
      <FloatingToolbar />

      {/* Right: Zoom + MiniMap (utility controls only) */}
      {/* (included inside FloatingToolbar's right column) */}

      {/* Bottom left: Content browsing (infrastructure + campus scenery) */}
      <BottomGuidePanel />
      <CampusSceneryButton />

      {/* Annotation sub-panel (triggered by left annotation button) */}
      <ToolPanel />

      {/* Navigation panel (route planning UI) */}
      <NavigationPanel />

      {/* Public transit dialog */}
      <PublicTransitDialog />

      {/* Layer panel */}
      <LayerPanel />

      {/* Detail modal */}
      {state.detailSheetOpen && state.selectedPOI && (
        <div className="absolute inset-0 z-[70]">
          <POIDetailSheet />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <MapProvider>
      <MapApp />
    </MapProvider>
  );
}
