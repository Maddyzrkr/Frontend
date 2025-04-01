import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FallbackMapProps {
  style?: ViewStyle;
  initialCoordinates: [number, number];
  location?: { latitude: number; longitude: number };
  destination?: { latitude: number; longitude: number };
  message?: string;
  children?: React.ReactNode;
}

/**
 * A component that displays when the MapLibre map fails to load
 * Shows a styled box with the current coordinates and any error message
 */
const FallbackMap: React.FC<FallbackMapProps> = ({ 
  style,
  initialCoordinates, 
  location, 
  destination,
  message = "Map service is currently unavailable",
  children
}) => {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="map-outline" size={40} color="#999" />
      <Text style={styles.title}>Map View</Text>
      
      {location && (
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={16} color="#0066CC" />
          <Text style={styles.locationText}>
            Current: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        </View>
      )}
      
      {!location && initialCoordinates && (
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={16} color="#0066CC" />
          <Text style={styles.locationText}>
            Current: {initialCoordinates[1].toFixed(4)}, {initialCoordinates[0].toFixed(4)}
          </Text>
        </View>
      )}
      
      {destination && destination.latitude !== 0 && (
        <View style={styles.locationContainer}>
          <Ionicons name="navigate-outline" size={16} color="#FF3B30" />
          <Text style={styles.locationText}>
            Destination: {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}
          </Text>
        </View>
      )}
      
      <Text style={styles.message}>{message}</Text>
      
      {/* Render any child components */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#333',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  locationText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 5,
  },
  message: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
});

export default FallbackMap; 