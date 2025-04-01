/**
 * Map Components
 * 
 * This file exports map-related components and utilities.
 * We now use Google Maps as our primary mapping solution.
 */

import GoogleMapView, { 
  MapMarker, 
  RouteLayer, 
  UserLocationDot, 
  FallbackMap, 
  GoogleMapViewMethods
} from '../GoogleMapView';
import { ViewStyle } from 'react-native';

// Re-define the props interface here to avoid import issues
export interface GoogleMapViewProps {
  style?: ViewStyle;
  initialCoordinates: [number, number];
  zoomLevel?: number;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  compassEnabled?: boolean;
  children?: React.ReactNode;
  onMapReady?: () => void;
  onAvailabilityChange?: (isAvailable: boolean) => void;
}

/**
 * Re-export all map components with their original names
 * This allows us to replace the mapping library without updating all consuming code
 */
export {
  GoogleMapView as MapView,
  MapMarker,
  RouteLayer,
  UserLocationDot,
  FallbackMap,
  GoogleMapViewMethods
};

/**
 * Export a function to get the Google Maps API key
 */
export const getGoogleMapsApiKey = () => {
  // Use the actual API key directly instead of relying on environment variables
  return 'AIzaSyAsWqi7xMdpO1mwKbB-2Acbe9m4piPddb0';
};

/**
 * Export the main map component as default
 */
export default GoogleMapView; 