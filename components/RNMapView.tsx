import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform, Alert } from 'react-native';
import Mapbox from '@rnmapbox/maps';

// Set access token to empty string for MapLibre usage
// You must call this before rendering any Mapbox component
try {
  Mapbox.setAccessToken('');
} catch (e) {
  console.warn('Error setting Mapbox access token:', e);
}

// Define the shape of the methods that can be called via ref
export interface MapViewMethods {
  setCamera: (options: {
    centerCoordinate: [number, number];
    zoomLevel?: number;
    animationDuration?: number;
    animationMode?: 'flyTo' | 'easeTo' | 'moveTo';
  }) => void;
  fitBounds: (ne: [number, number], sw: [number, number], padding?: number) => void;
}

// Define the props for the MapView component
interface MapViewProps {
  style?: any;
  initialCoordinates: [number, number]; // [longitude, latitude]
  zoomLevel?: number;
  children?: React.ReactNode;
  onMapReady?: () => void;
  onError?: (error: Error) => void;
  onAvailabilityChange?: (isAvailable: boolean) => void;
  compassEnabled?: boolean;
  attributionEnabled?: boolean;
  logoEnabled?: boolean;
  styleURL?: string;
}

/**
 * A wrapper component for @rnmapbox/maps that provides a simpler API
 * and handles errors gracefully.
 */
const RNMapView = forwardRef<MapViewMethods, MapViewProps>((props, ref) => {
  const {
    style,
    initialCoordinates,
    zoomLevel = 14,
    children,
    onMapReady,
    onError,
    onAvailabilityChange,
    compassEnabled = true,
    attributionEnabled = false,
    logoEnabled = false,
    styleURL = 'https://tiles.stadiamaps.com/styles/alidade_smooth.json',
  } = props;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isMapAvailable, setIsMapAvailable] = useState(false);
  const mapRef = useRef<any>(null);
  const mountedRef = useRef<boolean>(true);

  // Check if Mapbox is available
  useEffect(() => {
    // Mark component as mounted
    mountedRef.current = true;
    
    try {
      // Check if we're on web (some features are limited on web)
      if (Platform.OS === 'web') {
        console.warn('Map functionality may be limited on web');
      }

      // Check if Mapbox is available
      if (!Mapbox || !Mapbox.MapView) {
        throw new Error('Mapbox components are not available');
      }
      
      if (mountedRef.current) {
        setIsMapAvailable(true);
        setIsLoading(false);
        if (onAvailabilityChange) onAvailabilityChange(true);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('MapView: Mapbox not available:', err);
      const errorObj = err instanceof Error ? err : new Error('Unknown error initializing Mapbox');
      
      setError(errorObj);
      setIsMapAvailable(false);
      setIsLoading(false);
      
      if (onError) onError(errorObj);
      if (onAvailabilityChange) onAvailabilityChange(false);
    }
    
    return () => {
      // Mark component as unmounted
      mountedRef.current = false;
    };
  }, [onError, onAvailabilityChange]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    setCamera: (options: any) => {
      try {
        if (mapRef.current) {
          const { centerCoordinate, zoomLevel, animationDuration } = options;
          
          mapRef.current.setCamera({
            centerCoordinate,
            zoomLevel: zoomLevel || 15,
            animationDuration: animationDuration || 500,
          });
        }
      } catch (e) {
        console.warn('Error calling setCamera:', e);
      }
    },
    fitBounds: (ne: [number, number], sw: [number, number], padding = 50) => {
      try {
        if (mapRef.current) {
          const paddingConfig = {
            paddingTop: padding,
            paddingBottom: padding,
            paddingLeft: padding,
            paddingRight: padding,
          };
          
          mapRef.current.fitBounds(ne, sw, paddingConfig, 500);
        }
      } catch (e) {
        console.warn('Error calling fitBounds:', e);
      }
    }
  }), []);

  // Show loading state
  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  // Show error state with a nicer fallback
  if (error || !isMapAvailable) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.fallbackMapView}>
          <Text style={styles.errorText}>Map service unavailable</Text>
          <Text style={styles.errorDetail}>{error?.message || 'Unknown error'}</Text>
          <View style={styles.coordinateBox}>
            <Text style={styles.locationText}>
              Location: {initialCoordinates[1].toFixed(4)}, {initialCoordinates[0].toFixed(4)}
            </Text>
          </View>
          {children && (
            <View style={styles.markerInfo}>
              <Text style={styles.markerInfoText}>Map markers will appear here when service is available</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Attempt to render the map with error boundary
  try {
    // Double check for required components before rendering
    if (!Mapbox || !Mapbox.MapView) {
      throw new Error('Mapbox components are not available');
    }
    
    return (
      <View style={[styles.container, style]}>
        <Mapbox.MapView
          ref={mapRef}
          style={styles.map}
          styleURL={styleURL}
          compassEnabled={compassEnabled}
          attributionEnabled={attributionEnabled}
          logoEnabled={logoEnabled}
          onDidFinishLoadingMap={() => {
            console.log('Map finished loading');
            setIsLoading(false);
            if (onMapReady) {
              onMapReady();
            }
          }}
        >
          <Mapbox.Camera
            zoomLevel={zoomLevel}
            centerCoordinate={initialCoordinates}
            animationMode="none"
          />
          {children}
        </Mapbox.MapView>
      </View>
    );
  } catch (renderError) {
    console.error('Error rendering Mapbox:', renderError);
    
    // If rendering fails, show fallback UI
    return (
      <View style={[styles.container, style]}>
        <View style={styles.fallbackMapView}>
          <Text style={styles.errorText}>Map rendering failed</Text>
          <Text style={styles.errorDetail}>{(renderError as Error)?.message || 'Unknown error'}</Text>
          <View style={styles.coordinateBox}>
            <Text style={styles.locationText}>
              Location: {initialCoordinates[1].toFixed(4)}, {initialCoordinates[0].toFixed(4)}
            </Text>
          </View>
        </View>
      </View>
    );
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d9534f',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  coordinateBox: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 10,
    width: '90%',
  },
  locationText: {
    fontSize: 14,
    textAlign: 'center',
  },
  fallbackMapView: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 16,
  },
  markerInfo: {
    marginTop: 16,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    width: '90%',
  },
  markerInfoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default RNMapView; 