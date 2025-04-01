declare module '@maplibre/maplibre-react-native' {
  // Common component props
  interface CommonComponentProps {
    id?: string;
    style?: any;
    [key: string]: any;
  }

  // MapView component
  export interface MapViewProps extends CommonComponentProps {
    styleURL?: string;
    compassEnabled?: boolean;
    attributionEnabled?: boolean;
    logoEnabled?: boolean;
    onDidFinishLoadingMap?: () => void;
    onRegionDidChange?: () => void;
    onDidFailLoadingMap?: () => void;
    [key: string]: any;
  }
  
  // Camera component props
  export interface CameraProps extends CommonComponentProps {
    zoomLevel?: number;
    centerCoordinate?: [number, number];
    animationMode?: 'flyTo' | 'easeTo' | 'moveTo' | 'none';
    animationDuration?: number;
    [key: string]: any;
  }
  
  // Point annotation props
  export interface PointAnnotationProps extends CommonComponentProps {
    coordinate: [number, number];
    [key: string]: any;
  }
  
  // Shape source props
  export interface ShapeSourceProps extends CommonComponentProps {
    shape?: any;
    url?: string;
    [key: string]: any;
  }
  
  // Line layer props
  export interface LineLayerProps extends CommonComponentProps {
    style?: any;
    [key: string]: any;
  }
  
  // User location props
  export interface UserLocationProps extends CommonComponentProps {
    visible?: boolean;
    showsUserHeadingIndicator?: boolean;
    [key: string]: any;
  }

  // Export top level components
  export const MapView: React.ComponentType<MapViewProps>;
  export const Camera: React.ComponentType<CameraProps> & {
    bubblingEventTypes?: Record<string, any>;
  };
  export const PointAnnotation: React.ComponentType<PointAnnotationProps>;
  export const ShapeSource: React.ComponentType<ShapeSourceProps>;
  export const LineLayer: React.ComponentType<LineLayerProps>;
  export const UserLocation: React.ComponentType<UserLocationProps>;
  export const Transition: any;
  
  // Export event types
  export let EventTypes: {
    onPress: string;
    onLongPress: string;
    onRegionWillChange: string;
    onRegionIsChanging: string;
    onRegionDidChange: string;
    onUserLocationUpdate: string;
    onWillStartLoadingMap: string;
    onDidFinishLoadingMap: string;
    onDidFailLoadingMap: string;
    [key: string]: string;
  };
  
  // Export the default object that contains all components
  interface MapLibreGL {
    MapView: typeof MapView;
    Camera: typeof Camera;
    PointAnnotation: typeof PointAnnotation;
    ShapeSource: typeof ShapeSource;
    LineLayer: typeof LineLayer;
    UserLocation: typeof UserLocation;
    Transition: typeof Transition;
    EventTypes: typeof EventTypes;
    [key: string]: any;
  }
  
  const MapLibreGL: MapLibreGL;
  export default MapLibreGL;
} 