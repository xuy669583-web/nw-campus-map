export interface POI {
  name: string;
  type: string;
  position: [number, number];
  info: string;
  description: string;
  subtype: string;
  pastImages: string[];
  currentImages: string[];
}

export interface CampusZone {
  name: string;
  color: string;
  path: [number, number][];
  info: string;
}

export type ActiveMode = 'none' | 'route' | 'measure' | 'measureArea' | 'drawPoint' | 'drawLine' | 'drawPolygon' | 'mark' | 'text' | 'nearby' | 'coord' | 'locate';
export type MapLayer = 'roadmap' | 'satellite';

export interface AppState {
  map: any | null;
  pois: POI[];
  filteredPOIs: POI[];
  selectedPOI: POI | null;
  activeCategories: string[];
  categoryFilterActive: boolean;
  searchQuery: string;
  searchResults: POI[];
  activeMode: ActiveMode;
  routeStart: [number, number] | null;
  routeEnd: [number, number] | null;
  routePath: any | null;
  routeDistance: number;
  measurePoints: [number, number][];
  measureTotal: number;
  userLocation: [number, number] | null;
  locationError: string | null;
  mapLayer: MapLayer;
  bottomPanelOpen: boolean;
  detailSheetOpen: boolean;
  coordPickResult: [number, number] | null;
}

export interface CategoryConfig {
  key: string;
  label: string;
  color: string;
  icon: string;
}

// Infrastructure categories - matching JSON types exactly
export const INFRASTRUCTURE_CATEGORIES: CategoryConfig[] = [
  { key: '校门', label: '校门', color: '#1a3a6e', icon: 'door-open' },
  { key: '教学楼', label: '教学楼', color: '#0f2650', icon: 'school' },
  { key: '办公楼', label: '办公楼', color: '#3b5998', icon: 'building' },
  { key: '食堂', label: '食堂', color: '#e83e3e', icon: 'utensils' },
  { key: '宿舍', label: '宿舍', color: '#c9a96e', icon: 'home' },
  { key: '景观', label: '景观', color: '#3b6ef5', icon: 'flower-2' },
  { key: '文化场馆', label: '文化场馆', color: '#8e8e93', icon: 'landmark' },
  { key: '体育场馆', label: '体育场馆', color: '#00c7be', icon: 'dumbbell' },
  { key: '院系', label: '院系', color: '#3b6ef5', icon: 'microscope' },
  { key: '服务设施', label: '服务设施', color: '#3b6ef5', icon: 'coffee' },
  { key: '医院', label: '医疗', color: '#dc3545', icon: 'stethoscope' },
  { key: '图书馆', label: '图书馆', color: '#2d6a4f', icon: 'book-open' },
];

export const CATEGORY_MAP: Record<string, CategoryConfig> = INFRASTRUCTURE_CATEGORIES.reduce(
  (acc, cat) => ({ ...acc, [cat.key]: cat }),
  {}
);
