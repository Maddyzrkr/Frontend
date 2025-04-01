import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapLibreViewMethods } from './map';

interface FallbackMapProps {
  style?: any;
  initialCoordinates: [number, number];
  children?: React.ReactNode;
  errorMessage?: string;
}

/**
 * A fallback map component when MapLibre is not available
 * This provides a simple UI representation of coordinates
 */
const FallbackMap = React.forwardRef<MapLibreViewMethods, FallbackMapProps>((props, ref) => {
  const {
    style,
    initialCoordinates,
    children,
    errorMessage,
  } = props;

  // Expose empty methods through ref
  React.useImperativeHandle(ref, () => ({
    setCamera: () => {
      console.warn('FallbackMap: setCamera method called, but no action performed');
    },
    fitBounds: () => {
      console.warn('FallbackMap: fitBounds method called, but no action performed');
    }
  }));

  return (
    <View style={[styles.container, style]}>
      <View style={styles.fallbackMapView}>
        <Text style={styles.errorText}>Map service unavailable</Text>
        {errorMessage ? (
          <Text style={styles.errorDetail}>{errorMessage}</Text>
        ) : (
          <Text style={styles.errorDetail}>
            The detailed map service couldn't load. This can happen if the map style server is unreachable 
            or if there are network issues. The app will still function with basic location features.
          </Text>
        )}
        <View style={styles.coordinateBox}>
          <Text style={styles.locationText}>
            Location: {initialCoordinates[1].toFixed(4)}, {initialCoordinates[0].toFixed(4)}
          </Text>
        </View>
        
        {children && (
          <View style={styles.childrenContainer}>
            <Text style={styles.infoText}>Map markers will appear here when service is available</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  fallbackMapView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 16,
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
  childrenContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 12,
    borderRadius: 8,
    width: '90%',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default FallbackMap; 