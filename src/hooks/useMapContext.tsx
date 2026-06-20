import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { POI, AppState, ActiveMode, MapLayer } from '../types';
import { campusPOIs } from '../data/pois';

const initialState: AppState = {
  map: null,
  pois: [],
  filteredPOIs: [],
  selectedPOI: null,
  activeCategories: [],
  categoryFilterActive: false,
  searchQuery: '',
  searchResults: [],
  activeMode: 'none',
  routeStart: null,
  routeEnd: null,
  routePath: null,
  routeDistance: 0,
  measurePoints: [],
  measureTotal: 0,
  userLocation: null,
  locationError: null,
  mapLayer: 'satellite',
  bottomPanelOpen: false,
  detailSheetOpen: false,
  coordPickResult: null,
};

interface MapContextType {
  state: AppState;
  setMap: (map: any) => void;
  selectPOI: (poi: POI | null) => void;
  toggleCategory: (category: string) => void;
  clearAllCategories: () => void;
  showAllCategories: (categories: string[]) => void;
  setSearchQuery: (query: string) => void;
  setActiveMode: (mode: ActiveMode) => void;
  setMapLayer: (layer: MapLayer) => void;
  setBottomPanelOpen: (open: boolean) => void;
  setDetailSheetOpen: (open: boolean) => void;
  setRouteStart: (pos: [number, number] | null) => void;
  setRouteEnd: (pos: [number, number] | null) => void;
  setRoutePath: (path: any) => void;
  setRouteDistance: (d: number) => void;
  addMeasurePoint: (pos: [number, number]) => void;
  clearMeasure: () => void;
  setMeasureTotal: (d: number) => void;
  setUserLocation: (loc: [number, number] | null) => void;
  setLocationError: (err: string | null) => void;
  setCoordPickResult: (coord: [number, number] | null) => void;
  resetRoute: () => void;
  flyTo: (center: [number, number], zoom?: number) => void;
}

const MapContext = createContext<MapContextType | null>(null);

export function MapProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const mapRef = useRef<any>(null);

  // Load POI data from JSON at runtime
  useEffect(() => {
    fetch('/data/pois.json')
      .then(res => res.json())
      .then((pois: POI[]) => {
        if (pois && pois.length > 0) {
          setState(prev => ({
            ...prev,
            pois,
            filteredPOIs: pois,
          }));
        } else {
          // Fallback to hardcoded data
          setState(prev => ({
            ...prev,
            pois: campusPOIs,
            filteredPOIs: campusPOIs,
          }));
        }
      })
      .catch(() => {
        setState(prev => ({
          ...prev,
          pois: campusPOIs,
          filteredPOIs: campusPOIs,
        }));
      });
  }, []);

  const setMap = useCallback((map: any) => {
    mapRef.current = map;
    setState(prev => ({ ...prev, map }));
  }, []);

  const selectPOI = useCallback((poi: POI | null) => {
    setState(prev => ({
      ...prev,
      selectedPOI: poi,
      detailSheetOpen: poi !== null,
    }));
  }, []);

  const clearAllCategories = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeCategories: [],
      categoryFilterActive: true,
      filteredPOIs: [],
    }));
  }, []);

  const showAllCategories = useCallback((categories: string[]) => {
    setState(prev => ({
      ...prev,
      activeCategories: categories,
      categoryFilterActive: true,
      filteredPOIs: prev.pois.filter(p => categories.includes(p.type)),
    }));
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setState(prev => {
      const exists = prev.activeCategories.includes(category);
      const newCategories = exists
        ? prev.activeCategories.filter(c => c !== category)
        : [...prev.activeCategories, category];
      const isFilterActive = true; // Once user touches categories, filter is active
      const filtered = newCategories.length > 0
        ? prev.pois.filter(p => newCategories.includes(p.type))
        : [];
      return {
        ...prev,
        activeCategories: newCategories,
        categoryFilterActive: isFilterActive,
        filteredPOIs: filtered,
      };
    });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => {
      const results = query.trim()
        ? prev.pois.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.type.includes(query)
          )
        : [];
      return {
        ...prev,
        searchQuery: query,
        searchResults: results,
      };
    });
  }, []);

  const setActiveMode = useCallback((mode: ActiveMode) => {
    setState(prev => ({
      ...prev,
      activeMode: mode,
      measurePoints: mode === 'measure' ? prev.measurePoints : [],
      coordPickResult: mode === 'coord' ? prev.coordPickResult : null,
    }));
  }, []);

  const setMapLayer = useCallback((layer: MapLayer) => {
    setState(prev => ({ ...prev, mapLayer: layer }));
  }, []);

  const setBottomPanelOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, bottomPanelOpen: open }));
  }, []);

  const setDetailSheetOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, detailSheetOpen: open }));
  }, []);

  const setRouteStart = useCallback((pos: [number, number] | null) => {
    setState(prev => ({ ...prev, routeStart: pos }));
  }, []);

  const setRouteEnd = useCallback((pos: [number, number] | null) => {
    setState(prev => ({ ...prev, routeEnd: pos }));
  }, []);

  const setRoutePath = useCallback((path: any) => {
    setState(prev => ({ ...prev, routePath: path }));
  }, []);

  const setRouteDistance = useCallback((d: number) => {
    setState(prev => ({ ...prev, routeDistance: d }));
  }, []);

  const addMeasurePoint = useCallback((pos: [number, number]) => {
    setState(prev => ({
      ...prev,
      measurePoints: [...prev.measurePoints, pos],
    }));
  }, []);

  const clearMeasure = useCallback(() => {
    setState(prev => ({
      ...prev,
      measurePoints: [],
      measureTotal: 0,
    }));
  }, []);

  const setMeasureTotal = useCallback((d: number) => {
    setState(prev => ({ ...prev, measureTotal: d }));
  }, []);

  const setUserLocation = useCallback((loc: [number, number] | null) => {
    setState(prev => ({ ...prev, userLocation: loc }));
  }, []);

  const setLocationError = useCallback((err: string | null) => {
    setState(prev => ({ ...prev, locationError: err }));
  }, []);

  const setCoordPickResult = useCallback((coord: [number, number] | null) => {
    setState(prev => ({ ...prev, coordPickResult: coord }));
  }, []);

  const resetRoute = useCallback(() => {
    setState(prev => ({
      ...prev,
      routeStart: null,
      routeEnd: null,
      routePath: null,
      routeDistance: 0,
    }));
  }, []);

  const flyTo = useCallback((center: [number, number], zoom?: number) => {
    if (mapRef.current) {
      mapRef.current.setZoomAndCenter(zoom || 18, center);
    }
  }, []);

  return (
    <MapContext.Provider
      value={{
        state,
        setMap,
        selectPOI,
        toggleCategory,
        clearAllCategories,
        showAllCategories,
        setSearchQuery,
        setActiveMode,
        setMapLayer,
        setBottomPanelOpen,
        setDetailSheetOpen,
        setRouteStart,
        setRouteEnd,
        setRoutePath,
        setRouteDistance,
        addMeasurePoint,
        clearMeasure,
        setMeasureTotal,
        setUserLocation,
        setLocationError,
        setCoordPickResult,
        resetRoute,
        flyTo,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used within MapProvider');
  return ctx;
}
