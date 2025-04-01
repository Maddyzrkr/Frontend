import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapView, MapMarker, UserLocationDot, GoogleMapViewMethods } from '../../components/map';
import LocationAutocomplete from '../../components/LocationAutocomplete';
import { getAddressFromCoordinates, LocationSuggestion } from '../../services/LocationService';
import RealTimeRideList from '../../components/RealTimeRideList';

interface Coordinates {
  latitude: number;
  longitude: number;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.106:5000";

export default function RideSeekerScreen() {
  const mapRef = useRef<GoogleMapViewMethods>(null);
  
  // Location states
  const [userLocation, setUserLocation] = useState<Coordinates>({
    latitude: 19.1136, // Mumbai default
    longitude: 72.8697,
  });
  const [destination, setDestination] = useState<LocationSuggestion | null>(null);
  const [pickupLocation, setPickupLocation] = useState<string>('');
  const [destinationLocation, setDestinationLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showRideList, setShowRideList] = useState(false);

  // Get current location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location services to find nearby rides.'
        );
        setLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      
      setUserLocation(userCoords);
      
      // Center map on user location
      if (mapRef.current) {
        mapRef.current.setCamera({
          centerCoordinate: [userCoords.longitude, userCoords.latitude],
          zoomLevel: 14,
          animationDuration: 500,
          animationMode: 'flyTo'
        });
      }
      
      // Get address for current location
      try {
        const address = await getAddressFromCoordinates(userCoords);
        if (address) {
          setPickupLocation(address.name);
        }
      } catch (error) {
        console.error('Error getting address from coordinates:', error);
      }
      
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert(
        'Location Error',
        'Could not get your current location. Please try again or enter your location manually.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePickupSelect = (suggestion: LocationSuggestion) => {
    setPickupLocation(suggestion.name);
    
    if (suggestion.coordinates) {
      setUserLocation(suggestion.coordinates);
      
      // Update map view
      if (mapRef.current) {
        mapRef.current.setCamera({
          centerCoordinate: [suggestion.coordinates.longitude, suggestion.coordinates.latitude],
          zoomLevel: 14,
          animationDuration: 500,
          animationMode: 'flyTo'
        });
      }
    }
  };
  
  const handleDestinationSelect = (suggestion: LocationSuggestion) => {
    setDestination(suggestion);
    setDestinationLocation(suggestion.name);
  };
  
  const handleFindRides = () => {
    if (!pickupLocation) {
      Alert.alert('Missing Information', 'Please select a pickup location');
      return;
    }
    
    if (!destination || !destinationLocation) {
      Alert.alert('Missing Information', 'Please select a destination');
      return;
    }
    
    // Save user's seeking destination to backend
    saveUserDestination();
    
    // Show the ride list
    setShowRideList(true);
  };
  
  const saveUserDestination = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.warn('No auth token available');
        return;
      }
      
      if (!destination || !destination.coordinates) {
        console.warn('No destination coordinates available');
        return;
      }
      
      // Update user mode and destination
      await fetch(`${API_URL}/api/users/update-mode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: 'seeking',
          seekingDestination: {
            address: destinationLocation,
            coordinates: [destination.coordinates.longitude, destination.coordinates.latitude]
          }
        })
      });
      
    } catch (error) {
      console.error('Error saving user destination:', error);
    }
  };
  
  const handleRideSelect = (ride: any) => {
    // Navigate to ride details
    router.push({
      pathname: "/(ride)/ride-details",
      params: { rideId: ride.id }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find a Ride</Text>
      </View>
      
      <View style={styles.mapContainer}>
        {!loading ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialCoordinates={[userLocation.longitude, userLocation.latitude]}
            zoomLevel={14}
          >
            <UserLocationDot visible={true} />
            
            {userLocation.latitude !== 0 && (
              <MapMarker
                id="pickup"
                coordinate={[userLocation.longitude, userLocation.latitude]}
              />
            )}
            
            {destination && destination.coordinates && (
              <MapMarker
                id="destination"
                coordinate={[destination.coordinates.longitude, destination.coordinates.latitude]}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}
      </View>
      
      {!showRideList ? (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Where are you?</Text>
          <LocationAutocomplete
            placeholder="Your current location"
            value={pickupLocation}
            onLocationSelect={handlePickupSelect}
          />
          
          <Text style={styles.inputLabel}>Where do you want to go?</Text>
          <LocationAutocomplete
            placeholder="Enter your destination"
            value={destinationLocation}
            onLocationSelect={handleDestinationSelect}
          />
          
          <TouchableOpacity
            style={styles.findButton}
            onPress={handleFindRides}
          >
            <Text style={styles.findButtonText}>Find Available Rides</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.rideListContainer}>
          <View style={styles.rideListHeader}>
            <Text style={styles.rideListTitle}>Available Rides</Text>
            <TouchableOpacity onPress={() => setShowRideList(false)}>
              <Text style={styles.backToSearch}>Change Search</Text>
            </TouchableOpacity>
          </View>
          
          <RealTimeRideList 
            userLocation={userLocation}
            onRideSelect={handleRideSelect}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  mapContainer: {
    height: 250,
    width: '100%',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  inputContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  findButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  findButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rideListContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 16,
  },
  rideListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  rideListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  backToSearch: {
    color: '#0066CC',
    fontSize: 14,
  },
});