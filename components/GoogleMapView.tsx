import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { StyleSheet, View, ViewStyle, Platform, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region, LatLng, Camera } from 'react-native-maps';
import { GOOGLE_MAPS_API_KEY } from '../utils/config';

// Interface for component methods that can be called from parent
export interface GoogleMapViewMethods {
  setCamera: (options: {
    centerCoordinate: [number, number];
    zoomLevel?: number;
    animationDuration?: number;
    animationMode?: 'flyTo' | 'easeTo' | 'moveTo';
  }) => void;
  fitBounds: (ne: [number, number], sw: [number, number], padding?: number) => void;
}

interface GoogleMapViewProps {
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

// Map marker component props
interface MapMarkerProps {
  id: string;
  coordinate: [number, number];
  children?: React.ReactElement | null;
}

// Route layer component props
interface RouteLayerProps {
  id: string;
  coordinates: [number, number][];
  color?: string;
  width?: number;
}

// User location dot component props
interface UserLocationDotProps {
  visible: boolean;
  showHeading?: boolean;
}

// Convert [lng, lat] format (used in MapLibre) to { latitude, longitude } format (used in react-native-maps)
const convertCoordinates = (coords: [number, number]): LatLng => {
  return {
    latitude: coords[1],
    longitude: coords[0]
  };
};

// Convert array of [lng, lat] coordinates to array of { latitude, longitude } coordinates
const convertCoordinatesArray = (coordsArray: [number, number][]): LatLng[] => {
  return coordsArray.map(coords => ({
    latitude: coords[1],
    longitude: coords[0]
  }));
};

// Fallback map implementation (similar to the original implementation)
export const FallbackMap = ({ 
  style, 
  initialCoordinates,
  children
}: { 
  style?: ViewStyle, 
  initialCoordinates: [number, number],
  children?: React.ReactNode
}) => {
  return (
    <View style={[styles.fallbackContainer, style]}>
      <View style={styles.fallbackMapView}>
        <Text style={styles.fallbackTitle}>Map</Text>
        <View style={styles.coordinateBox}>
          <Text style={styles.fallbackCoordinates}>
            Location: {initialCoordinates[1].toFixed(4)}, {initialCoordinates[0].toFixed(4)}
          </Text>
        </View>
        
        {/* Simplified representation of children */}
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return null;
          
          // Try to identify what kind of marker it is based on props
          if ('id' in child.props && 'coordinate' in child.props) {
            return (
              <View key={`marker-${index}`} style={styles.fallbackMarker}>
                <Text style={styles.fallbackMarkerText}>📍 Marker: {child.props.id}</Text>
              </View>
            );
          }
          
          if ('coordinates' in child.props) {
            return (
              <View key={`route-${index}`} style={styles.fallbackRoute}>
                <Text style={styles.fallbackRouteText}>📏 Route: {child.props.id}</Text>
              </View>
            );
          }
          
          return null;
        })}
      </View>
    </View>
  );
};

// Main Google Maps implementation
const GoogleMapView = forwardRef<GoogleMapViewMethods, GoogleMapViewProps>((props, ref) => {
  const {
    style,
    initialCoordinates,
    zoomLevel = 14,
    showsUserLocation = true,
    followsUserLocation = true,
    compassEnabled = true,
    children,
    onMapReady,
    onAvailabilityChange,
  } = props;
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);
  
  // Initial region state
  const initialRegion: Region = {
    latitude: initialCoordinates[1],
    longitude: initialCoordinates[0],
    latitudeDelta: 0.0922 / (zoomLevel / 10),
    longitudeDelta: 0.0421 / (zoomLevel / 10),
  };
  
  // Configure camera position
  const initialCamera: Camera = {
    center: {
      latitude: initialCoordinates[1],
      longitude: initialCoordinates[0],
    },
    pitch: 0,
    heading: 0,
    altitude: 0,
    zoom: zoomLevel,
  };
  
  // Handle map initialization
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if Google Maps is available in this environment
        if (Platform.OS === 'web') {
          // Google Maps may not be fully supported on web
          console.warn('Google Maps may have limited functionality on web platform');
        }
        
        setIsLoading(false);
        
        if (onAvailabilityChange) {
          onAvailabilityChange(true);
        }
      } catch (e) {
        console.error('Error initializing Google Maps:', e);
        setError(`Error initializing map: ${e}`);
        setIsLoading(false);
        
        if (onAvailabilityChange) {
          onAvailabilityChange(false);
        }
      }
    };
    
    initialize();
  }, [onAvailabilityChange]);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => {
    return {
      setCamera: (options) => {
        if (mapRef.current) {
          try {
            const { centerCoordinate, zoomLevel = 14, animationDuration = 500 } = options;
            
            mapRef.current.animateCamera({
              center: {
                latitude: centerCoordinate[1],
                longitude: centerCoordinate[0],
              },
              zoom: zoomLevel,
            }, { duration: animationDuration });
          } catch (e) {
            console.warn('Error in setCamera:', e);
          }
        }
      },
      
      fitBounds: (ne, sw, padding = 50) => {
        if (mapRef.current) {
          try {
            // Calculate the region that includes both points
            const region = {
              latitude: (ne[1] + sw[1]) / 2, // Average of latitudes
              longitude: (ne[0] + sw[0]) / 2, // Average of longitudes
              latitudeDelta: Math.abs(ne[1] - sw[1]) * 1.2, // Latitude span with padding
              longitudeDelta: Math.abs(ne[0] - sw[0]) * 1.2, // Longitude span with padding
            };
            
            mapRef.current.animateToRegion(region, 500);
          } catch (e) {
            console.warn('Error in fitBounds:', e);
          }
        }
      }
    };
  }, []);
  
  // Handle map loading state
  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text>Loading map...</Text>
      </View>
    );
  }
  
  // Handle error state
  if (error) {
    console.log('Rendering fallback map due to:', error);
    return (
      <FallbackMap 
        style={style} 
        initialCoordinates={initialCoordinates}
        children={children}
      />
    );
  }
  
  // Render Google Maps
  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        initialCamera={initialCamera}
        showsUserLocation={showsUserLocation}
        followsUserLocation={followsUserLocation}
        showsCompass={compassEnabled}
        showsTraffic={true}
        showsBuildings={true}
        showsIndoors={true}
        loadingEnabled={true}
        loadingIndicatorColor="#0066CC"
        loadingBackgroundColor="#FFFFFF"
        showsScale={true}
        showsPointsOfInterest={true}
        rotateEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        zoomEnabled={true}
        onMapReady={() => {
          console.log('Google Map is ready');
          if (onMapReady) onMapReady();
        }}
      >
        {children}
      </MapView>
    </View>
  );
});

// Map marker component
export const MapMarker: React.FC<MapMarkerProps> = ({ id, coordinate, children }) => {
  try {
    return (
      <Marker
        identifier={id}
        coordinate={convertCoordinates(coordinate)}
      >
        {children}
      </Marker>
    );
  } catch (error) {
    console.warn('Error rendering MapMarker:', error);
    return null;
  }
};

// Route layer component
export const RouteLayer: React.FC<RouteLayerProps> = ({ 
  id, 
  coordinates, 
  color = '#0066CC', 
  width = 4 
}) => {
  try {
    return (
      <Polyline
        key={id}
        coordinates={convertCoordinatesArray(coordinates)}
        strokeColor={color}
        strokeWidth={width}
        lineCap="round"
        lineJoin="round"
      />
    );
  } catch (error) {
    console.warn('Error rendering RouteLayer:', error);
    return null;
  }
};

// User location dot (not needed as Google Maps has built-in user location)
export const UserLocationDot: React.FC<UserLocationDotProps> = ({ visible, showHeading = false }) => {
  // Google Maps has built-in user location dot, so this is just a stub
  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  fallbackMapView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  coordinateBox: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  fallbackCoordinates: {
    fontSize: 14,
  },
  fallbackMarker: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 5,
    borderRadius: 5,
    margin: 5,
  },
  fallbackMarkerText: {
    fontSize: 12,
  },
  fallbackRoute: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 5,
    borderRadius: 5,
    margin: 5,
  },
  fallbackRouteText: {
    fontSize: 12,
  },
});

export default GoogleMapView; 