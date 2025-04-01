import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { MapLibreViewMethods } from './map';
import mapLibreInit from '../utils/mapLibreInit';

// Define interface for the map view props
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
 * A wrapper component for MapLibre that safely loads the native module
 * and provides fallback UI if loading fails.
 */
const MapView = forwardRef<MapLibreViewMethods, MapViewProps>((props, ref) => {
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
    styleURL = mapLibreInit.getDefaultStyleURL(),
  } = props;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isMapAvailable, setIsMapAvailable] = useState(false);
  const mapRef = useRef<any>(null);
  const mountedRef = useRef<boolean>(true);

  // Get the MapLibre module using our utility
  const getMapLibreModule = () => {
    try {
      // Try to initialize/get MapLibre
      const isInitialized = mapLibreInit.isMapLibreInitialized();
      const MapLibreGL = mapLibreInit.getMapLibreGL();
      
      if (!isInitialized || !MapLibreGL || !MapLibreGL.MapView) {
        throw new Error('MapLibre not properly initialized');
      }
      
      return MapLibreGL;
    } catch (e) {
      throw new Error(`Failed to get MapLibre: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  // Check if MapLibre is available
  useEffect(() => {
    // Mark component as mounted
    mountedRef.current = true;
    
    try {
      // Check if we're on web (MapLibre is not supported on web)
      if (Platform.OS === 'web') {
        throw new Error('MapLibre is not supported on web');
      }

      console.log('MapView - Checking MapLibre availability');
      // Use our utility to get MapLibre
      const MapLibreGL = getMapLibreModule();
      
      // If we got here, MapLibre is available
      if (mountedRef.current) {
        console.log('MapView - MapLibre is available');
        setIsMapAvailable(true);
        setIsLoading(false);
        if (onAvailabilityChange) onAvailabilityChange(true);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('MapView: MapLibre not available:', err);
      const errorObj = err instanceof Error ? err : new Error('Unknown error initializing MapLibre');
      
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
        if (mapRef.current && typeof mapRef.current.setCamera === 'function') {
          mapRef.current.setCamera(options);
        }
      } catch (e) {
        console.warn('Error calling setCamera:', e);
      }
    },
    fitBounds: (ne: [number, number], sw: [number, number], padding?: number) => {
      try {
        if (mapRef.current && typeof mapRef.current.fitBounds === 'function') {
          // Convert padding to expected format if needed
          const paddingArray = padding ? [padding, padding, padding, padding] as [number, number, number, number] : undefined;
          mapRef.current.fitBounds(ne, sw, paddingArray);
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

  // Attempt to render the MapLibre map with error boundary
  try {
    // Get the MapLibre module
    const MapLibreGL = getMapLibreModule();
    
    // Double check for required components before rendering
    if (!MapLibreGL || !MapLibreGL.MapView) {
      throw new Error('MapLibre components not available');
    }
    
    return (
      <View style={[styles.container, style]}>
        <MapLibreGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL={styleURL}
          compassEnabled={true}
          attributionEnabled={true}
          logoEnabled={false}
          zoomEnabled={true}
          scrollEnabled={true}
          rotateEnabled={true}
          pitchEnabled={true}
          showUserLocation={true}
          regionDidChangeDebounceTime={50}
          animated={true}
          renderToHardwareTextureAndroid={true}
          scaleBarEnabled={true}
          showsScale={true}
          zoomControlEnabled={true}
          onDidFinishLoadingMap={() => {
            console.log('Map finished loading completely');
            if (onMapReady) onMapReady();
          }}
          onMapLoaded={() => {
            console.log('Map loading event fired');
          }}
          onDidFailLoadingMap={(error: any) => {
            console.error('Failed to load map style:', error);
            
            // Try recovery by using fallback style
            if (mapRef.current && styleURL !== mapLibreInit.getFallbackStyleURL()) {
              try {
                console.log('Attempting to set fallback style...');
                // @ts-ignore - accessing property directly
                mapRef.current.setStyleURL(mapLibreInit.getFallbackStyleURL());
              } catch (e) {
                console.error('Failed to set fallback style during load failure:', e);
              }
            }
          }}
          onDidFailRenderFrame={(e: any) => {
            console.warn('Frame render failed:', e);
            
            // Try recovery by using fallback style
            if (mapRef.current && styleURL !== mapLibreInit.getFallbackStyleURL()) {
              try {
                // @ts-ignore - accessing property directly
                mapRef.current.setStyleURL(mapLibreInit.getFallbackStyleURL());
              } catch (e) {
                console.error('Failed to set fallback style during render failure:', e);
              }
            }
          }}
        >
          {MapLibreGL.Camera && (
            <MapLibreGL.Camera
              zoomLevel={zoomLevel}
              centerCoordinate={initialCoordinates}
              animationMode="flyTo"
              animationDuration={300}
              maxZoomLevel={20}
              minZoomLevel={2}
            />
          )}
          {children}
        </MapLibreGL.MapView>
      </View>
    );
  } catch (renderError) {
    console.error('Error rendering MapLibre:', renderError);
    
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

export default MapView; 