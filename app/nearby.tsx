import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MapView, MapMarker, UserLocationDot, GoogleMapViewMethods } from '../components/map';
import LocationAutocomplete from '../components/LocationAutocomplete';
import { getAddressFromCoordinates, LocationSuggestion } from '../services/LocationService';

// API URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.106:5000";

// Define user type
interface User {
  _id: string;
  name: string;
  username: string;
  profileImage?: string;
  location: string;
  languages: string[];
  gender: string;
  rating: number;
  distance: string;
  mode: 'booking' | 'seeking';
  ride?: {
    provider: string;
    destination: string;
    fare: string;
    time: string;
  };
}

const NearbyScreen = () => {
  const mapRef = useRef<GoogleMapViewMethods>(null);
  
  // State for handling location and map
  const [myLocation, setMyLocation] = useState({
    latitude: 19.1136, // Mumbai default
    longitude: 72.8697,
  });
  const [pickupLocation, setPickupLocation] = useState<LocationSuggestion | null>(null);
  const [pickupInput, setPickupInput] = useState('Current Location');
  const [destination, setDestination] = useState<LocationSuggestion | null>(null);
  const [destinationInput, setDestinationInput] = useState('');
  const [isDestinationConfirmed, setIsDestinationConfirmed] = useState(false);
  
  // State for users and UI
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  // Get current location on component mount
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Location Permission Denied',
            'Please enable location services to find nearby riders.'
          );
          return;
        }

        // Create a timeout for location request
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const timeoutPromise = new Promise((_, reject) => {
          const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error('Location request timed out'));
          }, 15000);
        });

        try {
          // Race between location request and timeout
          const location = await Promise.race([
            locationPromise,
            timeoutPromise,
          ]) as Location.LocationObject;

          // Set the location and reverse geocode to get address
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setMyLocation(coords);
          
          // Center the map on the location
          if (mapRef.current) {
            mapRef.current.setCamera({
              centerCoordinate: [coords.longitude, coords.latitude],
              zoomLevel: 14,
            });
          }
          
          // Reverse geocode to get the address
          const address = await getAddressFromCoordinates(coords);
          if (address) {
            console.log('Current location address:', address.name);
            setPickupInput(address.name);
            setPickupLocation({
              id: 'current-location',
              name: address.name,
              fullAddress: address.fullAddress,
              coordinates: coords
            });
          }
        } catch (locationError) {
          console.warn('Error getting location:', locationError);
          Alert.alert(
            'Location Error',
            'Could not get your current location. Using default location instead.'
          );
        }
      } catch (error) {
        console.error('Location permission error:', error);
      } finally {
        // Don't fetch nearby users initially
        setLoading(false);
      }
    };

    getCurrentLocation();
  }, []);

  // Load saved locations when returning from location picker
  useEffect(() => {
    const checkSavedLocation = async () => {
      try {
        const savedLocationJson = await AsyncStorage.getItem('selectedLocation');
        const locationType = await AsyncStorage.getItem('selectedLocationType');
        
        // Clear the saved location after reading it
        await AsyncStorage.removeItem('selectedLocation');
        await AsyncStorage.removeItem('selectedLocationType');
        
        if (savedLocationJson && locationType) {
          const location = JSON.parse(savedLocationJson);
          
          if (locationType === 'pickup') {
            setPickupLocation(location);
            setPickupInput(location.name);
            
            // Update map if needed
            if (mapRef.current && location.coordinates) {
              mapRef.current.setCamera({
                centerCoordinate: [location.coordinates.longitude, location.coordinates.latitude],
                zoomLevel: 14,
              });
            }
            
            // Update current location
            if (location.coordinates) {
              setMyLocation(location.coordinates);
            }
          } else if (locationType === 'destination') {
            setDestination(location);
            setDestinationInput(location.name);
            setIsDestinationConfirmed(true);
          }
        }
      } catch (error) {
        console.error('Error loading saved location:', error);
      }
    };
    
    // Check for saved location when component mounts
    checkSavedLocation();
    
    // Set up an interval to periodically check for saved location
    // This is a workaround since we can't directly use router focus events
    const intervalId = setInterval(checkSavedLocation, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Handle refresh action
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNearbyUsers();
  }, []);

  // Fetch nearby users based on location and mode
  const fetchNearbyUsers = async () => {
    try {
      setLoading(true);
      
      // Get auth token
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token || !userId) {
        console.warn('No token or user ID available. Redirecting to login...');
        router.replace('/(auth)/login');
        return;
      }

      try {
        // Call API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${API_URL}/api/users/nearby-rides`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId,
            location: myLocation,
            destination: destination ? destination.coordinates : null,
            maxDistance: 5, // 5km radius
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.users && Array.isArray(data.users)) {
            setNearbyUsers(data.users);
            setShowResults(true); // Only show results after search
          } else {
            console.warn('API returned invalid user data');
            setNearbyUsers([]);
            setShowResults(true); // Show empty state
          }
        } else {
          console.warn('API request failed');
          setNearbyUsers([]);
          setShowResults(true); // Show empty state
        }
      } catch (apiError) {
        console.error('API error:', apiError);
        setNearbyUsers([]);
        setShowResults(true); // Show empty state
      }
    } catch (error) {
      console.error('Error fetching nearby users:', error);
      setNearbyUsers([]);
      setShowResults(true); // Show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle location selection
  const handleLocationSelect = (type = 'pickup') => {
    console.log(`Opening location picker for ${type}`);
    
    // Use a timeout to ensure the navigation happens smoothly
    setTimeout(() => {
      try {
        router.push(`/location-picker?type=${type}`);
      } catch (error) {
        console.error('Error navigating to location picker:', error);
        Alert.alert('Error', 'Could not open location picker. Please try again.');
      }
    }, 100);
  };

  const validateInputs = () => {
    if (!destination) {
      Alert.alert('Error', 'Please enter a destination');
      return false;
    }
    
    if (!pickupLocation) {
      Alert.alert('Error', 'Please enter a pickup location');
      return false;
    }
    
    // Check if pickup and destination are the same
    if (pickupLocation && destination) {
      const pickupCoords = pickupLocation.coordinates;
      const destCoords = destination.coordinates;
      
      if (pickupCoords && destCoords &&
          Math.abs(pickupCoords.latitude - destCoords.latitude) < 0.001 &&
          Math.abs(pickupCoords.longitude - destCoords.longitude) < 0.001) {
        Alert.alert('Invalid Route', 'Pickup and destination locations cannot be the same');
        return false;
      }
    }
    
    return true;
  };

  const handleFindRides = () => {
    if (validateInputs()) {
      fetchNearbyUsers();
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  const sendRideRequest = async (userId: string) => {
    try {
      setLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      const myUserId = await AsyncStorage.getItem('userId');
      
      if (!token || !myUserId) {
        Alert.alert('Authentication Error', 'Please log in again.');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/rides/request-join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: myUserId,
          rideId: userId, // In this case, userId is actually the ride ID
        }),
      });
      
      if (response.ok) {
        Alert.alert(
          'Request Sent',
          'Your request to join the ride has been sent. You will be notified when the request is accepted.',
          [{ text: 'OK' }]
        );
        
        // Close the user detail modal
        setSelectedUser(null);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to send ride request.');
      }
    } catch (error) {
      console.error('Error sending ride request:', error);
      Alert.alert('Error', 'Failed to send ride request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => handleUserSelect(item)}
    >
      <View style={styles.userHeader}>
        <View style={styles.userProfileSection}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={24} color="#0066CC" />
          </View>
          <View>
            <Text style={styles.userName}>{item.name}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          </View>
        </View>
        <View style={styles.distanceContainer}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.distanceText}>{item.distance}</Text>
        </View>
      </View>
      
      <View style={styles.rideDetails}>
        <View style={styles.rideDetailItem}>
          <Ionicons name="car" size={16} color="#666" />
          <Text style={styles.rideDetailText}>
            <Text style={styles.detailLabel}>Provider: </Text>
            {item.ride?.provider || 'Unknown'}
          </Text>
        </View>
        <View style={styles.rideDetailItem}>
          <Ionicons name="navigate" size={16} color="#666" />
          <Text style={styles.rideDetailText}>
            <Text style={styles.detailLabel}>To: </Text>
            {item.ride?.destination || 'Unknown destination'}
          </Text>
        </View>
        <View style={styles.rideDetailItem}>
          <Ionicons name="cash" size={16} color="#666" />
          <Text style={styles.rideDetailText}>
            <Text style={styles.detailLabel}>Fare: </Text>
            {item.ride?.fare || 'Not specified'}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.requestButton}
        onPress={() => sendRideRequest(item._id)}
      >
        <Text style={styles.requestButtonText}>Request to Join</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Rides</Text>
      </View>
      
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialCoordinates={[myLocation.longitude, myLocation.latitude]}
          zoomLevel={14}
        >
          <UserLocationDot 
            visible={true}
            showHeading={false}
          />
          
          {nearbyUsers.map(user => {
            // Safely parse location string to coordinates
            try {
              const locationParts = user.location.split(',');
              if (locationParts.length === 2) {
                const longitude = parseFloat(locationParts[1].trim());
                const latitude = parseFloat(locationParts[0].trim());
                if (!isNaN(longitude) && !isNaN(latitude)) {
                  return (
                    <MapMarker
                      key={user._id}
                      id={user._id}
                      coordinate={[longitude, latitude]}
                    >
                      <TouchableOpacity 
                        style={{ alignItems: 'center' }}
                        onPress={() => handleUserSelect(user)}
                      >
                        <View style={{ backgroundColor: 'white', padding: 5, borderRadius: 10 }}>
                          <Text style={{ color: 'black', fontWeight: 'bold' }}>{user.name}</Text>
                        </View>
                      </TouchableOpacity>
                    </MapMarker>
                  );
                }
              }
              return null; // Skip if location format is invalid
            } catch (error) {
              console.error('Error parsing user location:', error);
              return null;
            }
          })}
        </MapView>
      </View>
      
      <View style={styles.inputContainer}>
        {/* Pickup Location Button */}
        <TouchableOpacity 
          style={styles.inputWrapper}
          onPress={() => handleLocationSelect('pickup')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="location" size={20} color="#4CAF50" />
          </View>
          <View style={styles.textInputContainer}>
            <Text style={[styles.input, !pickupLocation && styles.placeholderText]}>
              {pickupInput || 'Current location'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        {/* Destination Location Button */}
        <TouchableOpacity 
          style={styles.inputWrapper}
          onPress={() => handleLocationSelect('destination')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="navigate" size={20} color="#F44336" />
          </View>
          <View style={styles.textInputContainer}>
            <Text style={[styles.input, !destination && styles.placeholderText]}>
              {destinationInput || 'Where to?'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.findButton}
          onPress={handleFindRides}
        >
          <Ionicons name="search" size={20} color="white" />
          <Text style={styles.findButtonText}>Find Rides</Text>
        </TouchableOpacity>
      </View>
      
      {/* Only show results after searching */}
      {showResults && (
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Available Rides</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066CC" />
              <Text style={styles.loadingText}>Finding rides...</Text>
            </View>
          ) : (
            <FlatList
              data={nearbyUsers}
              renderItem={renderUserItem}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.usersList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#0066CC']}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="car-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>No rides available</Text>
                  <Text style={styles.emptySubtext}>
                    Try changing your search criteria or try again later
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}
      
      {/* Show helper text when no search has been performed */}
      {!showResults && !loading && (
        <View style={styles.helperContainer}>
          <Ionicons name="information-circle-outline" size={64} color="#0066CC" />
          <Text style={styles.helperTitle}>Find People Going Your Way</Text>
          <Text style={styles.helperText}>
            Enter your pickup location and destination, then tap "Find Rides" to discover people traveling on a similar route.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    height: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  map: {
    flex: 1,
  },
  inputContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  textInputContainer: {
    flex: 1,
  },
  input: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  placeholderText: {
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
    marginLeft: 45,
  },
  findButton: {
    backgroundColor: '#0066CC',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 14,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  findButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  listContainer: {
    flex: 1,
    padding: 15,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  usersList: {
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    marginLeft: 4,
    color: '#666',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  rideDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  rideDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rideDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  detailLabel: {
    fontWeight: '500',
  },
  requestButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  requestButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 20,
  },
  // Helper styles when no search has been performed
  helperContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  helperTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default NearbyScreen; 