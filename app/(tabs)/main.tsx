import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Linking, ActivityIndicator, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserList from '../../components/UserList';
import RouteDirections from '../../components/RouteDirections';
// Import Google Map components
import GoogleMapView, { GoogleMapViewMethods } from '../../components/GoogleMapView';
import { Marker, Polyline } from 'react-native-maps';
// Import Google Places Autocomplete
import GooglePlacesAutocomplete from '../../components/GooglePlacesAutocomplete';
// Import RideCompare component
import RideCompare from '../../components/RideCompare';
// Import the app launcher utility
import { openUberWithRide, openOlaWithRide } from '../../utils/appLauncher';
import MapAttribution from '../../components/MapAttribution';
import { MAP_STYLES } from '../../utils/config';
import { calculateDistance } from '../../services/LocationService';
import { getAddressFromCoordinates } from '../../services/GoogleMapsService';

// Define interfaces for your types
interface ProviderData {
  name: string;
  eta: string;
  fare: string;
  distance: string;
}

interface RideData {
  provider: string;
  distance: string;
  from: string;
  to: string;
  fare: string;
  id?: string; // Add ride ID for tracking
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

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

interface InviteData {
  userId: string;
  rideId: string;
  status: 'pending' | 'accepted' | 'rejected';
}

// Add route-related interfaces
interface RouteCoordinates {
  type: string;
  coordinates: [number, number][];
  googleMapsFormat?: Array<{latitude: number; longitude: number}>;
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

interface RouteData {
  geometry: RouteCoordinates;
  duration: number; // in seconds
  distance: number; // in meters
  steps: RouteStep[]; // Add steps for directions
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.106:5000";

// Enhanced route helper function with steps
const getRoute = async (startCoord: [number, number], endCoord: [number, number]): Promise<RouteData | null> => {
  try {
    // Using the OSRM demo server - in production, consider setting up your own OSRM instance
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}?overview=full&geometries=geojson&steps=true&annotations=true`
    );
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      // Process and simplify steps from OSRM response
      const processedSteps = data.routes[0].legs[0].steps.map((step: any) => ({
        instruction: step.maneuver.type === 'depart' ? 'Start driving' : step.maneuver.instruction || step.name,
        distance: step.distance,
        duration: step.duration
      }));
      
      // Transform coordinates to the format expected by Google Maps
      const googleMapsCoordinates = data.routes[0].geometry.coordinates.map(
        (coord: [number, number]) => ({
          latitude: coord[1],
          longitude: coord[0]
        })
      );
      
      // Store both the original and transformed coordinates
      return {
        geometry: {
          ...data.routes[0].geometry,
          googleMapsFormat: googleMapsCoordinates
        },
        duration: data.routes[0].duration,
        distance: data.routes[0].distance,
        steps: processedSteps
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
};

// Helper function to format distance
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
};

// Helper function to format duration
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
  }
  
  return `${minutes} min`;
};

// Add a helper function to handle API calls with proper error handling
const safeApiCall = async (apiCall: () => Promise<any>, fallbackData: any) => {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);
    return fallbackData;
  }
};

// Helper function to handle network timeouts and errors
const safeNetworkRequest = async <T,>(
  apiCall: () => Promise<T>,
  fallbackData: T,
  timeoutMs: number = 15000,  // Increase default timeout to 15 seconds
  maxRetries: number = 2     // Add retry capability
): Promise<T> => {
  let lastError: any = null;
  
  // Try the request up to maxRetries + 1 times
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${maxRetries}...`);
        // Add exponential backoff - wait longer between retries
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
      
      // Set up a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error(`Network request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Race the API call with the timeout
      const result = await Promise.race([
        apiCall(),
        timeoutPromise
      ]);
      
      console.log('Network request succeeded');
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`Network request failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
      
      // If this was our last attempt, break out of the loop
      if (attempt === maxRetries) {
        break;
      }
    }
  }
  
  // If we've used all retries, log and return fallback
  console.error('Network request failed after all retry attempts:', lastError);
  return fallbackData;
};

const Main = () => {
  // Reference to Google map
  const mapRef = useRef<GoogleMapViewMethods>(null);
  
  const [location, setLocation] = useState({
    latitude: 19.1136,  // Mumbai default
    longitude: 72.8697,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [pickupLocation, setPickupLocation] = useState('Current Location');
  const [destination, setDestination] = useState('');
  const [showProviders, setShowProviders] = useState(false);
  const [currentRide, setCurrentRide] = useState<RideData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [destinationCoords, setDestinationCoords] = useState<Coordinates>({
    latitude: 0,
    longitude: 0,
  });
  // Add route state
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  
  const [providers, setProviders] = useState<ProviderData[]>([
    { name: 'Uber', eta: '5 mins', fare: '₹350', distance: '12 miles' },
    { name: 'Ola', eta: '4 mins', fare: '₹330', distance: '12 miles' },
  ]);
  const [availablePartners, setAvailablePartners] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [invites, setInvites] = useState<InviteData[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);
  const [isFareSplit, setIsFareSplit] = useState(false);
  const [showPartners, setShowPartners] = useState(false);
  
  // Add state for showing directions
  const [showDirections, setShowDirections] = useState(false);

  // Add state to track map library availability
  const [isMapLibraryAvailable, setIsMapLibraryAvailable] = useState(false);
  
  // Add a state to track initialization
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Add a new state for tracking if destination is confirmed
  const [isDestinationConfirmed, setIsDestinationConfirmed] = useState(false);
  
  // Add state for address
  const [pickupAddress, setPickupAddress] = useState<string>('');
  
  // Add state to track if pickup is from current location
  const [pickupFromCurrentLocation, setPickupFromCurrentLocation] = useState(true);
  
  // Add rideCompareProps to state
  const [rideCompareProps, setRideCompareProps] = useState<{
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
    onClose: () => void;
  } | null>(null);
  
  // Function to render map content (markers, routes, etc.)
  const renderMapContent = () => {
    console.log('Rendering map content...');
    
    return (
      <GoogleMapView
        ref={mapRef}
        style={styles.map}
        initialCoordinates={[location.longitude, location.latitude]}
        zoomLevel={15}
        showsUserLocation={true}
        followsUserLocation={true}
        compassEnabled={true}
        onMapReady={() => {
          console.log('Map is ready');
          setIsMapLibraryAvailable(true);
        }}
        onAvailabilityChange={(isAvailable) => {
          console.log('Map availability changed:', isAvailable);
          setIsMapLibraryAvailable(isAvailable);
        }}
      >
        {/* Display route if available */}
        {routeData && routeData.geometry && routeData.geometry.googleMapsFormat && (
          <Polyline 
            coordinates={routeData.geometry.googleMapsFormat}
            strokeWidth={5}
            strokeColor="#0066FF"
          />
        )}
        
        {/* Display destination marker if coordinates are set */}
        {destinationCoords && destinationCoords.latitude !== 0 && (
          <Marker
            coordinate={{
              latitude: destinationCoords.latitude,
              longitude: destinationCoords.longitude
            }}
          >
            <View style={styles.markerContainer}>
              <Ionicons name="location" size={24} color="#FF3B30" />
            </View>
          </Marker>
        )}
      </GoogleMapView>
    );
  };
  
  // Add initialization effect - runs once on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load saved location from AsyncStorage first (fallback)
        await loadSavedLocation();
        
        // Get current location using the existing location retrieval code
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            // Create a custom timeout with AbortController
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              console.warn("Location request timed out after 15 seconds");
              controller.abort();
            }, 15000);

            try {
              // Get current position
              const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
              });
              
              // Clear the timeout
              clearTimeout(timeoutId);

              // Update location state with retrieved coordinates
              setLocation({
                ...location,
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
              });
              
              console.log('Successfully retrieved current location');
            } catch (locationError) {
              console.warn('Error getting location in initialize:', locationError);
              // Continue with default location
            }
          } else {
            console.log('Location permission denied, using default location');
          }
        } catch (locationError) {
          console.warn('Error in location retrieval:', locationError);
        }
        
        // IMPORTANT: Force map library to be available immediately and ensure we use the right style
        setIsMapLibraryAvailable(true);
        console.log('MAP STYLE SET TO:', MAP_STYLES.FALLBACK1);

        // Mark initialization as complete
        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsInitialized(true); // Still mark as initialized so UI shows something
      }
    };
    
    initialize();
    
    return () => {
      // Cleanup function
    };
  }, []);

  // Load saved location when component mounts
  const loadSavedLocation = async () => {
    console.log('Checking for saved destination in AsyncStorage');
    try {
      // Check for pickup location
      const savedPickup = await AsyncStorage.getItem('selectedPickupLocation');
      if (savedPickup) {
        try {
          const pickupData = JSON.parse(savedPickup);
          
          // Make sure we have a name, not just coordinates
          if (pickupData.name && pickupData.name !== 'undefined' && 
              !pickupData.name.includes(',') && !pickupData.name.startsWith('(')) {
            setPickupLocation(pickupData.name);
            
            // Set the full address if available
            if (pickupData.fullAddress) {
              setPickupAddress(pickupData.fullAddress);
            } else {
              setPickupAddress(pickupData.name);
            }
          } else if (pickupData.fullAddress) {
            // Use full address if the name is invalid
            setPickupLocation(pickupData.fullAddress);
            setPickupAddress(pickupData.fullAddress);
          } else {
            // If all else fails, try to get an address from coordinates
            try {
              const address = await getAddressFromCoordinates({
                latitude: pickupData.latitude,
                longitude: pickupData.longitude,
              });
              
              if (address) {
                setPickupLocation(address.name || address.fullAddress);
                setPickupAddress(address.fullAddress);
              } else {
                setPickupLocation('Selected Location');
                setPickupAddress('Selected Location');
              }
            } catch (geoError) {
              console.error('Error getting address for pickup:', geoError);
              setPickupLocation('Selected Location');
              setPickupAddress('Selected Location');
            }
          }
          
          // Only set location if it's not current location
          if (pickupData.name !== 'Current Location') {
            setLocation({
              latitude: pickupData.latitude,
              longitude: pickupData.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            });
          }
        } catch (parseError) {
          console.error('Error parsing pickup data:', parseError);
        }
        
        // Clear the saved data
        await AsyncStorage.removeItem('selectedPickupLocation');
      }
      
      // Check for destination
      const savedDestination = await AsyncStorage.getItem('selectedDestination');
      if (savedDestination) {
        try {
          const destData = JSON.parse(savedDestination);
          
          // Make sure we have a name, not just coordinates
          if (destData.name && destData.name !== 'undefined' && 
              !destData.name.includes(',') && !destData.name.startsWith('(')) {
            setDestination(destData.name);
          } else if (destData.fullAddress) {
            // Use full address if the name is invalid
            setDestination(destData.fullAddress);
          } else {
            // If all else fails, try to get an address from coordinates
            try {
              const address = await getAddressFromCoordinates({
                latitude: destData.latitude,
                longitude: destData.longitude,
              });
              
              if (address) {
                setDestination(address.name || address.fullAddress);
              } else {
                setDestination('Selected Destination');
              }
            } catch (geoError) {
              console.error('Error getting address for destination:', geoError);
              setDestination('Selected Destination');
            }
          }
          
          setDestinationCoords({
            latitude: destData.latitude,
            longitude: destData.longitude,
          });
          
          // Mark destination as confirmed
          setIsDestinationConfirmed(true);
          
          // Clear the saved data
          await AsyncStorage.removeItem('selectedDestination');
          
          // If we have both pickup and destination, fetch the route
          if ((savedPickup || pickupLocation === 'Current Location') && savedDestination) {
            try {
              // Parse pickup data safely
              const pickupCoords = savedPickup ? JSON.parse(savedPickup) : null;
              
              const startCoords: [number, number] = [
                pickupLocation === 'Current Location' ? location.longitude : (pickupCoords?.longitude || location.longitude),
                pickupLocation === 'Current Location' ? location.latitude : (pickupCoords?.latitude || location.latitude)
              ];
              
              const endCoords: [number, number] = [
                destData.longitude,
                destData.latitude
              ];
              
              const route = await getRoute(startCoords, endCoords);
              if (route) {
                setRouteData(route);
                
                // Update provider info with actual route data
                const updatedProviders = providers.map(provider => ({
                  ...provider,
                  distance: formatDistance(route.distance),
                  eta: formatDuration(route.duration)
                }));
                
                setProviders(updatedProviders);
                setShowProviders(true);
              }
            } catch (parseError) {
              console.error('Error parsing location data:', parseError);
            }
          }
        } catch (parseError) {
          console.error('Error parsing destination data:', parseError);
        }
      }
    } catch (error) {
      console.error('Error loading saved location:', error);
    }
  };

  // Function to handle showing location picker for both pickup and destination
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

  // Function to handle selecting destination directly from main screen
  const handleDestinationSelect = () => {
    handleLocationSelect('destination');
  };

  // Function to handle getting current location and its address
  const getCurrentLocationAndAddress = async () => {
      setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
        if (status !== 'granted') {
        Alert.alert(
          'Permission denied',
          'Permission to access location was denied. Please enable location in settings.'
        );
        setPickupLocation('Select pickup location');
        setIsLoading(false);
          return;
        }

      // Get the current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      // Update the coordinates state
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      
      // Get the address from the coordinates
      try {
        const address = await getAddressFromCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        
        if (address) {
          // Use the address name as the pickup location
          setPickupLocation(address.fullAddress);
          // Also cache the current location address for later use
          await AsyncStorage.setItem('currentLocationAddress', address.fullAddress);
        } else {
          setPickupLocation('Current Location');
        }
      } catch (geoError) {
        console.error('Error getting address from coordinates:', geoError);
        // Set a friendly default instead of showing coordinates
        setPickupLocation('Current Location');
      }
      
      setPickupFromCurrentLocation(true);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not get your current location. Please try again or select a location manually.');
      setPickupLocation('Select pickup location');
    } finally {
      setIsLoading(false);
    }
  };

  // Validation for pickup and destination
  const validateLocations = () => {
    if (!destination) {
      Alert.alert('Error', 'Please enter a destination');
      return false;
    }
    
    // Check if pickup and destination are the same
    if (isDestinationConfirmed && pickupAddress && destination) {
      // Compare first part of address which typically has the most specific location info
      const pickupMainPart = pickupAddress.split(',')[0].trim().toLowerCase();
      const destMainPart = destination.split(',')[0].trim().toLowerCase();
      
      if (pickupMainPart === destMainPart) {
        Alert.alert('Invalid Route', 'Pickup and destination locations cannot be the same');
        return false;
      }
      
      // Also check coordinates if available
      if (destinationCoords.latitude !== 0 && 
          Math.abs(location.latitude - destinationCoords.latitude) < 0.001 && 
          Math.abs(location.longitude - destinationCoords.longitude) < 0.001) {
        Alert.alert('Invalid Route', 'Pickup and destination locations are too close');
        return false;
      }
    }
    
    return true;
  };

  // Function to handle finding rides
  const handleFindRides = () => {
    console.log("Find Rides button clicked - DEBUG");
    
    // Validate destination
    if (!destination) {
      Alert.alert('Error', 'Please enter a destination');
      return;
    }
    
    // Validate destination coordinates
    if (!destinationCoords || 
        destinationCoords.latitude === 0 || 
        destinationCoords.longitude === 0) {
      Alert.alert(
        'Invalid Location',
        'The destination location could not be found. Please enter a valid location.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Validate pickup location coordinates
    if (!location || location.latitude === 0 || location.longitude === 0) {
      Alert.alert(
        'Invalid Location',
        'Your current location could not be determined. Please try again or select a different pickup location.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Calculate rough distance to check if coordinates are valid
    const distanceKm = calculateDistance(
      { latitude: location.latitude, longitude: location.longitude },
      { latitude: destinationCoords.latitude, longitude: destinationCoords.longitude }
    );
    
    // If distance is unreasonably large (e.g., more than 500km), it might be an invalid location
    if (distanceKm > 500) {
      Alert.alert(
        'Location Too Far',
        'The destination appears to be very far away. Please confirm this is the correct location.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue Anyway', 
            onPress: () => {
              showRideOptions();
            }
          }
        ]
      );
      return;
    }
    
    showRideOptions();
  };

  // Keep this function for when we explicitly want to navigate to find partners
  const navigateToFindPartners = () => {
    try {
      // Convert coordinates to strings for URL parameters
      const pickupCoords = `${location.latitude},${location.longitude}`;
      const destCoords = `${destinationCoords.latitude},${destinationCoords.longitude}`;
      
      // Use the router to navigate to the find-partners page
      router.push({
        pathname: '/(ride)/find-partners',
        params: {
          pickup: pickupCoords,
          destination: destCoords
        }
      });
    } catch (error) {
      console.error('Error navigating to find partners:', error);
      Alert.alert('Error', 'Could not navigate to find partners. Please try again.');
      
      // Fallback to showing ride options inline
      showRideOptions();
    }
  };

  // Helper function to show ride options and handle loading state
  const showRideOptions = () => {
    // Set loading state
    setIsLoading(true);
    
    // Set a definite timeout to force completion regardless of API response
    const forceCompleteTimeout = setTimeout(() => {
      console.log('Force completing loading state after maximum timeout');
      setIsLoading(false);
    }, 15000); // 15 seconds absolute maximum timeout
    
    // Create a clean-up function to handle both closing and timeout clearing
    const handleProvidersClose = () => {
      console.log('Closing providers view and cleaning up timeouts');
      // Clear timeouts
      clearTimeout(forceCompleteTimeout);
      // Hide the providers panel
      setShowProviders(false);
      // Ensure loading is off
      setIsLoading(false);
    };
    
    // Update the rideCompareProps
    const props = {
      origin: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      destination: destinationCoords,
      onClose: handleProvidersClose
    };
    
    // Store the props for use in the render function
    setRideCompareProps(props);
    
    // Show the providers panel with slight delay to ensure UI responsiveness
    setTimeout(() => {
      setShowProviders(true);
    }, 100);
  };

  const selectRideProvider = async (provider: ProviderData) => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token || !userId) {
        Alert.alert('Error', 'You need to be logged in to book a ride');
        setIsLoading(false);
        return;
      }
      
      // Try to book the ride with the API
      try {
        // Create an AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${API_URL}/api/rides/book`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId,
            provider: provider.name,
            pickup: pickupLocation,
            destination,
            fare: provider.fare,
            distance: provider.distance
          }),
          signal: controller.signal
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error('Failed to book ride');
        }
        
        const result = await response.json();
        
        // Set the current ride with the API-provided ID
        setCurrentRide({
          provider: provider.name,
          distance: provider.distance,
          from: pickupLocation,
          to: destination,
          fare: provider.fare,
          id: result.rideId
        });
        
        console.log('Ride booked successfully with ID:', result.rideId);
      } catch (error) {
        console.error('API call failed:', error);
        
        // Create a temporary ride ID
        const tempRideId = `temp-${Date.now()}`;
        
        // Set the current ride with a temporary ID
        setCurrentRide({
          provider: provider.name,
          distance: provider.distance,
          from: pickupLocation,
          to: destination,
          fare: provider.fare,
          id: tempRideId
        });
        
        console.log('Created temporary ride with ID:', tempRideId);
      }
    } catch (error) {
      console.error('Error in ride booking process:', error);
      Alert.alert('Error', 'Failed to book ride. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const findRidePartners = async () => {
    // Validate that we have necessary ride data
    if (!destination || !isDestinationConfirmed) {
      Alert.alert('Error', 'Please confirm your destination first.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Create a clean timestamp-based ID if needed
      const fallbackRideId = `ride_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Get token for authentication
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token || !userId) {
        Alert.alert('Authentication Error', 'Please log in again to continue.');
        return;
      }
      
      // Ensure we have valid values to pass
      // IMPORTANT: Make sure we have valid non-empty values for pickup and destination
      const pickup = pickupLocation || pickupAddress || 'Current Location';
      const dest = destination || 'Selected Destination';
      
      // Add detailed logging to verify the values
      console.log('Before encoding - Source values for find-partners navigation:', {
        pickup: pickup,
        destination: dest,
        rideId: fallbackRideId,
        pickupLength: pickup.length,
        destinationLength: dest.length
      });
      
      // Properly encode the pickup and destination for URL parameters
      const encodedPickup = encodeURIComponent(pickup);
      const encodedDestination = encodeURIComponent(dest);
      
      // Verify the encoded values
      console.log('After encoding - Encoded values for find-partners navigation:', {
        encodedPickup,
        encodedDestination,
        encodedPickupLength: encodedPickup.length,
        encodedDestinationLength: encodedDestination.length
      });
      
      // Test decoding to ensure data integrity
      const testDecodePickup = decodeURIComponent(encodedPickup);
      const testDecodeDestination = decodeURIComponent(encodedDestination);
      
      console.log('Test decode - Verifying round-trip encoding/decoding:', {
        decodedPickup: testDecodePickup,
        decodedDestination: testDecodeDestination,
        pickupMatches: testDecodePickup === pickup,
        destinationMatches: testDecodeDestination === dest
      });
      
      // Prepare ride data for API
      const rideData = {
        userId,
        provider: currentRide?.provider || 'direct',
        fare: currentRide?.fare || '0',
        pickup: {
          address: pickup,
          latitude: location.latitude,
          longitude: location.longitude
        },
        destination: {
          address: dest,
          latitude: destinationCoords.latitude,
          longitude: destinationCoords.longitude
        }
      };
      
      try {
        // Create the ride via API
        console.log('Attempting to create ride via API...');
        const response = await fetch(`${API_URL}/api/rides`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(rideData)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create ride: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Ride created successfully:', data.ride);
        
        // Navigate to the ride partners screen with the ride ID and encoded locations
        console.log('Navigating to find-partners with:', {
          rideId: data.ride._id,
          pickup: encodedPickup,
          destination: encodedDestination
        });
        
        router.push({
          pathname: "/(ride)/find-partners",
          params: { 
            rideId: data.ride._id || fallbackRideId,
            pickup: encodedPickup,
            destination: encodedDestination
          }
        });
      } catch (apiError) {
        console.error('API error when creating ride:', apiError);
        
        // Even if the API fails, navigate to the partners screen with fallback data and encoded locations
        console.log('API failed, navigating with fallback data:', {
          rideId: fallbackRideId,
          pickup: encodedPickup,
          destination: encodedDestination
        });
        
        Alert.alert(
          'Connection Issue',
          'We encountered a problem connecting to the server, but you can still proceed.',
          [
            { 
              text: 'Continue', 
              onPress: () => {
                // Navigate without waiting for API
                router.push({
                  pathname: "/(ride)/find-partners",
                  params: { 
                    rideId: fallbackRideId,
                    pickup: encodedPickup,
                    destination: encodedDestination
                  }
                });
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error finding ride partners:', error);
      
      Alert.alert(
        'Error',
        'Failed to find ride partners. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchAvailableUsers = async () => {
    // Don't attempt to fetch if initialization hasn't completed
    if (!isInitialized) {
      console.log('Skipping fetchAvailableUsers - not yet initialized');
      return [];
    }
    
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      
      // Mock data for fallback with explicit type casting
      const mockPartners = [
        {
          _id: '1',
          name: 'Rahul S.',
          username: 'rahul_s',
          profileImage: undefined,
          location: 'Andheri',
          languages: ['Hindi', 'English'],
          gender: 'Male',
          rating: 4.8,
          distance: '0.3 km',
          mode: 'seeking' as 'seeking'
        },
        {
          _id: '2',
          name: 'Priya M.',
          username: 'priya_m',
          profileImage: undefined,
          location: 'Bandra',
          languages: ['English', 'Marathi'],
          gender: 'Female',
          rating: 4.7,
          distance: '0.7 km',
          mode: 'seeking' as 'seeking'
        },
        {
          _id: '3',
          name: 'Amit K.',
          username: 'amit_k',
          profileImage: undefined,
          location: 'Dadar',
          languages: ['Hindi', 'English', 'Gujarati'],
          gender: 'Male',
          rating: 4.5,
          distance: '1.2 km',
          mode: 'seeking' as 'seeking'
        }
      ] as User[];
      
      if (!token || !userId) {
        console.log('No token or userId found, using mock data');
        setAvailablePartners(mockPartners);
        return mockPartners;
      }
      
      // Don't make a network request if there are no coordinates
      if (!location || location.latitude === 0 || location.longitude === 0) {
        console.log('Invalid location coordinates, using mock data');
        setAvailablePartners(mockPartners);
        return mockPartners;
      }
      
      // Implement a timeout for the network call
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Network request timeout')), 5000);
      });
      
      try {
        // Race between actual API call and timeout
        const result = await Promise.race([
          safeApiCall(
            async () => {
              console.log(`Fetching available partners from ${API_URL}/api/users/available-partners`);
              console.log('Request payload:', {
                userId,
                location: {
                  latitude: location.latitude,
                  longitude: location.longitude
                },
                destination: destination,
                maxDistance: 2
              });
            
              const response = await fetch(`${API_URL}/api/users/available-partners`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  userId,
                  location: {
                    latitude: location.latitude,
                    longitude: location.longitude
                  },
                  destination: destination,
                  maxDistance: 2 // 2km radius
                })
              });
              
              if (!response.ok) {
                throw new Error(`Failed to fetch available partners: ${response.status}`);
              }
              
              return await response.json();
            },
            null
          ),
          timeoutPromise
        ]);
        
        if (result && result.users && result.users.length > 0) {
          console.log('Successfully fetched', result.users.length, 'partners from API');
          setAvailablePartners(result.users);
          return result.users;
        } else {
          console.log('No partners found from API or empty response, using mock data');
          throw new Error('Empty or invalid response from API');
        }
      } catch (networkError) {
        console.warn('Network error in fetchAvailableUsers:', networkError);
        console.log('Using mock data due to network issue');
        setAvailablePartners(mockPartners);
        return mockPartners;
      }
    } catch (error) {
      console.error('Error in fetchAvailableUsers process:', error);
      // Use mock data for demo with explicit type casting
      const fallbackPartners = [
        {
          _id: '1',
          name: 'Rahul S.',
          username: 'rahul_s',
          profileImage: undefined,
          location: 'Andheri',
          languages: ['Hindi', 'English'],
          gender: 'Male',
          rating: 4.8,
          distance: '0.3 km',
          mode: 'seeking' as 'seeking'
        },
        {
          _id: '2',
          name: 'Priya M.',
          username: 'priya_m',
          profileImage: undefined,
          location: 'Bandra',
          languages: ['English', 'Marathi'],
          gender: 'Female',
          rating: 4.7,
          distance: '0.7 km',
          mode: 'seeking' as 'seeking'
        }
      ] as User[];
      
      setAvailablePartners(fallbackPartners);
      return fallbackPartners;
    } finally {
      setLoading(false);
    }
  };

  const sendRideInvite = async (userId: string) => {
    if (!currentRide || !currentRide.id) {
      Alert.alert('Error', 'No active ride to share');
      return;
    }
    
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      const result = await safeApiCall(
        async () => {
          const response = await fetch(`${API_URL}/api/rides/invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              rideId: currentRide.id,
              userId: userId
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to send invite');
          }
          
          return await response.json();
        },
        { success: true, inviteId: `invite-${Date.now()}` }
      );
      
      // Add the new invite to the invites state
      const newInvite = {
        userId,
        rideId: currentRide.id,
        status: 'pending' as 'pending'
      };
      
      setInvites([...invites, newInvite]);
      
      Alert.alert('Success', 'Ride invitation sent successfully');
      console.log('Invite sent to partner', userId);
    } catch (error) {
      console.error('Error sending ride invite:', error);
      Alert.alert('Error', 'Failed to send ride invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const acceptRideInvite = async (inviteId: string) => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/rides/accept-invite/${inviteId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to accept invite');
      }
      
      // Update the invite status in the state
      setInvites(invites.map(invite => 
        invite.userId === inviteId ? { ...invite, status: 'accepted' } : invite
      ));
      
      // Show payment modal
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error accepting ride invite:', error);
      Alert.alert('Error', 'Failed to accept ride invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const validatePayment = async (partnerId: string) => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      // First check if partner is nearby (within 100 meters)
      const response = await fetch(`${API_URL}/api/rides/validate-proximity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          partnerId,
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate proximity');
      }
      
      const data = await response.json();
      
      if (data.isNearby) {
        // If nearby, proceed with payment validation
        setIsFareSplit(true);
        setSelectedPartner(availablePartners.find(partner => partner._id === partnerId) || null);
        Alert.alert('Success', 'Payment validated and fare split successfully');
      } else {
        Alert.alert('Error', 'Payment validation failed. You must be near your ride partner to split the fare.');
      }
    } catch (error) {
      console.error('Error validating payment:', error);
      Alert.alert('Error', 'Failed to validate payment');
      
      // For demo purposes, still set fare as split
      setIsFareSplit(true);
    } finally {
      setIsLoading(false);
      setShowPaymentModal(false);
    }
  };

  const rateRidePartner = async (partnerId: string, rating: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/users/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: partnerId,
          rating,
          rideId: currentRide?.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit rating');
      }
      
      Alert.alert('Thank You', 'Your rating has been submitted');
    } catch (error) {
      console.error('Error rating partner:', error);
      Alert.alert('Error', 'Failed to submit rating');
    }
  };

  const openProviderApp = async (providerName: string) => {
    try {
      if (!location || !destinationCoords) {
        Alert.alert('Error', 'Please select a valid pickup and drop-off location');
        return;
      }

      if (providerName === 'Uber') {
        await openUberWithRide(
          location.latitude,
          location.longitude,
          destinationCoords.latitude,
          destinationCoords.longitude
        );
      } else if (providerName === 'Ola') {
        await openOlaWithRide(
          location.latitude,
          location.longitude,
          destinationCoords.latitude,
          destinationCoords.longitude
        );
      } else {
        console.warn(`Unknown provider: ${providerName}`);
      }
    } catch (error) {
      console.error(`Error opening ${providerName}:`, error);
      Alert.alert('Error', `Unable to open ${providerName} app`);
    }
  };

  const fetchMatchingUsers = useCallback(async () => {
    // Define mock data once at the top for reuse
    const mockUsers = [
      {
        _id: '1',
        name: 'Rahul S.',
        username: 'rahul_s',
        profileImage: undefined,
        location: 'Andheri',
        languages: ['Hindi', 'English'],
        gender: 'Male',
        rating: 4.8,
        distance: '0.3 km',
        mode: 'seeking' as 'seeking'
      },
      {
        _id: '2',
        name: 'Priya M.',
        username: 'priya_m',
        profileImage: undefined,
        location: 'Bandra',
        languages: ['English', 'Marathi'],
        gender: 'Female',
        rating: 4.7,
        distance: '0.7 km',
        mode: 'seeking' as 'seeking'
      }
    ] as User[];
    
    try {
      setLoading(true);
      console.log('Fetching matching users...');
      
      // Get auth data
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      if (!token || !userId) {
        console.log('No token or userId found, using mock data');
        setUsers(mockUsers);
        return;
      }

      // Use the enhanced network request with retry
      const result = await safeNetworkRequest(
        async () => {
          // Create an abort controller for the timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

          try {
            const response = await fetch(
              `${API_URL}/api/auth/matching-users/${userId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                signal: controller.signal, // Use controller's signal instead of AbortSignal.timeout
              }
            );
            
            // Clear the timeout to prevent memory leaks
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
              throw new Error(errorData.message || `HTTP error ${response.status}`);
            }

            const data = await response.json();
            if (!data || !data.users) {
              throw new Error('Invalid response format');
            }
            
            return data;
          } catch (err) {
            // Clear the timeout if there's an error
            clearTimeout(timeoutId);
            throw err;
          }
        },
        { users: mockUsers },
        20000, // 20 second overall timeout
        3      // Allow 3 retries
      );

      // Process the result, whether from API or fallback
      if (result && result.users && Array.isArray(result.users)) {
        console.log('Successfully fetched users:', result.users.length);
        setUsers(result.users);
      } else {
        console.warn('API returned invalid user data format, using mock data');
        setUsers(mockUsers);
      }
    } catch (error) {
      console.error('Unexpected error in fetchMatchingUsers:', error);
      // Fall back to mock data in all error cases
      setUsers(mockUsers);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMatchingUsers();
  }, [fetchMatchingUsers]);

  // Fetch users when the component mounts
  useEffect(() => {
    fetchMatchingUsers();
  }, [fetchMatchingUsers]);

  // Handle directions button press
  const handleShowDirections = () => {
    if (routeData) {
      setShowDirections(true);
    } else {
      Alert.alert('No Route', 'Please set a destination and search for routes first.');
    }
  };
  
  // Handle close directions
  const handleCloseDirections = () => {
    setShowDirections(false);
  };

  // Handle receiving data from the location picker
  useEffect(() => {
    const checkLocationData = async () => {
      try {
        const savedLocationData = await AsyncStorage.getItem('selectedLocation');
        const savedLocationType = await AsyncStorage.getItem('selectedLocationType');
        
        if (savedLocationData && savedLocationType) {
          const locationData = JSON.parse(savedLocationData);
          console.log('Received location data:', locationData, 'for type:', savedLocationType);
          
          if (savedLocationType === 'pickup') {
            setPickupLocation(locationData.name);
            setPickupFromCurrentLocation(false);
            
            if (locationData.coordinates) {
              setLocation({
                latitude: locationData.coordinates.latitude,
                longitude: locationData.coordinates.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              });
            }
          } else if (savedLocationType === 'destination') {
            setDestination(locationData.name);
            
            if (locationData.coordinates) {
              setDestinationCoords(locationData.coordinates);
              setIsDestinationConfirmed(true);
            }
          }
          
          // Clear the data after using it
          await AsyncStorage.multiRemove(['selectedLocation', 'selectedLocationType']);
        }
      } catch (error) {
        console.error('Error retrieving location data:', error);
      }
    };
    
    checkLocationData();
  }, []);

  // Add debug info before rendering the map
  useEffect(() => {
    console.log("Current destination:", destination);
    console.log("Destination coords:", destinationCoords);
    console.log("Is destination confirmed:", isDestinationConfirmed);
    
    // Remove the OpenFreeMap fallback timer since it's causing issues
    return () => {};
  }, [destination, destinationCoords, isDestinationConfirmed]);

  // Add effect to update map view when destination changes
  useEffect(() => {
    // Only update if the map is initialized and destination coordinates exist
    if (isInitialized && mapRef.current && destinationCoords.latitude !== 0 && destinationCoords.longitude !== 0) {
      console.log("Updating map view for destination:", destinationCoords);
      
      try {
        // If we have both origin and destination, fit the bounds to show both
        if (isDestinationConfirmed) {
          // Create points for both locations (in [lng, lat] format for GoogleMapView)
          const ne: [number, number] = [
            Math.max(location.longitude, destinationCoords.longitude) + 0.01, 
            Math.max(location.latitude, destinationCoords.latitude) + 0.01
          ];
          const sw: [number, number] = [
            Math.min(location.longitude, destinationCoords.longitude) - 0.01, 
            Math.min(location.latitude, destinationCoords.latitude) - 0.01
          ];
          
          mapRef.current.fitBounds(ne, sw, 50);
        } else {
          // If only destination, center on it
          mapRef.current.setCamera({
            centerCoordinate: [destinationCoords.longitude, destinationCoords.latitude],
            zoomLevel: 15,
            animationDuration: 500,
            animationMode: 'flyTo'
          });
        }
      } catch (e) {
        console.warn('Error updating map for destination:', e);
      }
    }
  }, [isInitialized, destinationCoords, location, isDestinationConfirmed]);

  // Add effect to update route when destination changes
  useEffect(() => {
    // Only fetch route if we have both destination and origin points
    if (isDestinationConfirmed && 
        destinationCoords.latitude !== 0 && 
        destinationCoords.longitude !== 0) {
      
      console.log("Fetching route for destination:", destinationCoords);
      
      const fetchRoute = async () => {
        try {
          const startCoords: [number, number] = [location.longitude, location.latitude];
          const endCoords: [number, number] = [destinationCoords.longitude, destinationCoords.latitude];
          
          // Only fetch if points are not too close
          if (Math.abs(startCoords[0] - endCoords[0]) > 0.001 || 
              Math.abs(startCoords[1] - endCoords[1]) > 0.001) {
            
            console.log("Getting route from", startCoords, "to", endCoords);
            const route = await getRoute(startCoords, endCoords);
            
            if (route) {
              console.log("Route fetched successfully");
              setRouteData(route);
              
              // Also update provider ETAs
              if (providers.length > 0) {
                const updatedProviders = providers.map(provider => ({
                  ...provider,
                  distance: formatDistance(route.distance),
                  eta: formatDuration(route.duration)
                }));
                
                setProviders(updatedProviders);
              }
            }
          } else {
            console.log("Origin and destination too close, not fetching route");
          }
        } catch (error) {
          console.error("Error fetching route:", error);
        }
      };
      
      fetchRoute();
    }
  }, [isDestinationConfirmed, destinationCoords, location]);

  // Add an interval to check for saved destination data periodically
  useEffect(() => {
    // This function will check AsyncStorage for a saved destination
    const checkForSavedDestination = async () => {
      console.log("Checking for saved destination in AsyncStorage");
      try {
        // Check both selectedLocation and selectedLocationType
        const [savedLocationData, savedLocationType] = await Promise.all([
          AsyncStorage.getItem('selectedLocation'),
          AsyncStorage.getItem('selectedLocationType')
        ]);
        
        // Check if we have both pieces of data needed
        if (savedLocationData && savedLocationType) {
          const locationData = JSON.parse(savedLocationData);
          console.log('Found saved location data:', locationData, 'for type:', savedLocationType);
          
          if (savedLocationType === 'destination') {
            // Update UI with destination data
            setDestination(locationData.name);
            
            if (locationData.coordinates) {
              setDestinationCoords(locationData.coordinates);
              setIsDestinationConfirmed(true);
            }
            
            // Clear the saved data to prevent reloading
            await AsyncStorage.multiRemove(['selectedLocation', 'selectedLocationType']);
            console.log("Destination updated from saved data");
          } else if (savedLocationType === 'pickup') {
            // Handle pickup location
            setPickupLocation(locationData.name);
            setPickupFromCurrentLocation(false);
            
            if (locationData.coordinates) {
              setLocation({
                latitude: locationData.coordinates.latitude,
                longitude: locationData.coordinates.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              });
            }
            
            // Clear the saved data
            await AsyncStorage.multiRemove(['selectedLocation', 'selectedLocationType']);
            console.log("Pickup updated from saved data");
          }
        }
        
        // Legacy check for selectedDestination key
        const savedDestination = await AsyncStorage.getItem('selectedDestination');
        if (savedDestination) {
          console.log("Found saved destination:", savedDestination);
          const destData = JSON.parse(savedDestination);
          
          // Update UI with destination data
          setDestination(destData.name);
          setDestinationCoords({
            latitude: destData.latitude,
            longitude: destData.longitude,
          });
          
          // Mark destination as confirmed
          setIsDestinationConfirmed(true);
          
          // Clear the saved data to prevent reloading
          await AsyncStorage.removeItem('selectedDestination');
          
          console.log("Destination updated from legacy saved data");
        }
      } catch (error) {
        console.error('Error checking for saved destination:', error);
      }
    };
    
    // Check initially
    checkForSavedDestination();
    
    // Set up interval to check every 5 seconds instead of every 1 second
    const intervalId = setInterval(() => {
      checkForSavedDestination();
    }, 5000);
    
    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Remove the map style fallback useEffect as it's causing issues
  useEffect(() => {
    // No longer trying to switch map styles automatically
    console.log("Map initialized:", isInitialized);
  }, [isInitialized]);

  return (
    <View style={styles.container}>
      <View style={styles.statusBarSpacing} />
      
      {/* Map Container */}
      <View style={styles.mapContainer}>
        {isInitialized ? (
          <>
            {renderMapContent()}
            
            {/* Map center button */}
            <TouchableOpacity
              style={styles.centerMapButton}
              onPress={() => {
                if (mapRef.current) {
                  try {
                    mapRef.current.setCamera({
                      centerCoordinate: [location.longitude, location.latitude],
                      zoomLevel: 15,
                      animationDuration: 500,
                      animationMode: 'flyTo'
                    });
                  } catch (e) {
                    console.warn('Error centering on location:', e);
                  }
                }
              }}
            >
              <Ionicons name="navigate" size={28} color="#0066CC" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}
      </View>
      
      {/* Scrollable Content Area - containing all components below the map */}
      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Input Section */}
        <View style={styles.searchContainer}>
          <View style={styles.inputContainer}>
            {/* Pickup Input */}
            <TouchableOpacity
              style={styles.input}
              onPress={() => handleLocationSelect('pickup')}
            >
              <Ionicons name="location" size={20} color="#0066CC" />
              <Text style={styles.inputText}>
                {pickupLocation || 'Select pickup location'}
              </Text>
              {pickupFromCurrentLocation && (
                <View style={styles.currentLocationButton}>
                  <Ionicons name="navigate" size={12} color="#0066CC" />
                  <Text style={styles.currentLocationText}>Current</Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* Destination Input */}
            <TouchableOpacity
              style={styles.input}
              onPress={() => handleLocationSelect('destination')}
            >
              <Ionicons name="location-outline" size={20} color="#0066CC" />
              <Text style={styles.inputText}>
                {destination || 'Where to?'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={[
                styles.optionButton, 
                styles.compareRidesButton,
                (!destination || destinationCoords.latitude === 0) && styles.disabledButton
              ]}
              onPress={handleFindRides}
              disabled={!destination || destinationCoords.latitude === 0}
            >
              <Ionicons name="car" size={16} color="white" />
              <Text style={styles.optionButtonText}>Find Rides</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Provider Comparison Section */}
        {showProviders && rideCompareProps && (
          <RideCompare
            origin={rideCompareProps.origin}
            destination={rideCompareProps.destination}
            onClose={rideCompareProps.onClose}
          />
        )}
        
        {/* Current Ride Section */}
        {currentRide && (
          <View style={styles.currentRideContainer}>
            <Text style={styles.currentRideTitle}>Current Ride</Text>
            <View style={styles.rideDetailsCard}>
              <View style={styles.rideHeader}>
                <View style={styles.rideProviderContainer}>
                  <Text style={styles.rideProviderName}>{currentRide.provider}</Text>
                </View>
                <Text style={styles.rideFare}>₹{currentRide.fare}</Text>
              </View>
              <View style={styles.rideRouteContainer}>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={16} color="#0066CC" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {currentRide.from}
                  </Text>
                </View>
                <View style={styles.locationDivider} />
                <View style={styles.locationRow}>
                  <Ionicons name="flag" size={16} color="#D83C54" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {currentRide.to}
                  </Text>
                </View>
              </View>
              <View style={styles.rideActions}>
                <TouchableOpacity
                  style={styles.rideActionButton}
                  onPress={findRidePartners}
                >
                  <Ionicons name="people" size={18} color="white" />
                  <Text style={styles.rideActionText}>Find Partners</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rideActionButton, styles.openAppButton]}
                  onPress={() => openProviderApp(currentRide.provider)}
                >
                  <Ionicons name="open-outline" size={18} color="white" />
                  <Text style={styles.rideActionText}>Open in App</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        
        {/* Partners Section */}
        {showPartners && availablePartners.length > 0 && (
          <View style={styles.availablePartnersContainer}>
            <Text style={styles.sectionTitle}>Available Ride Partners</Text>
            <UserList
              users={availablePartners}
              loading={loading}
              onRefresh={() => fetchAvailableUsers()}
              refreshing={refreshing}
              onInvite={sendRideInvite}
              invites={invites}
            />
          </View>
        )}

        {/* Extra padding at bottom */}
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
}

// The default export that Expo Router expects
export default Main;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  statusBarSpacing: {
    height: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: '#F8F9FA',
  },
  mapContainer: {
    height: '40%', // Reduce map height to 40% to give more room for scrollable content
    width: '100%',
    zIndex: 1,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flex: 1,
    zIndex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  searchContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  inputText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  placeholderText: {
    color: '#999',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  compareRidesButton: {
    backgroundColor: '#0066CC',
  },
  findPartnersButton: {
    backgroundColor: '#28a745',
  },
  disabledButton: {
    backgroundColor: '#99CCFF', // Lighter color when disabled
    opacity: 0.7,
  },
  optionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  zoomControlsContainer: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 90 : 70,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
  },
  zoomButton: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'white',
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  currentLocationText: {
    color: '#0066CC',
    fontSize: 12,
    marginLeft: 3,
    fontWeight: '500',
  },
  providerContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  providerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  providerList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  providerCard: {
    flex: 0.48,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
  },
  providerDetails: {
    marginTop: 4,
  },
  fareText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  distanceText: {
    color: '#666',
    fontSize: 14,
  },
  currentRideContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  currentRideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  rideDetailsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rideProviderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideProviderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  rideFare: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  rideRouteContainer: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  locationText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#555',
  },
  locationDivider: {
    height: 20,
    width: 2,
    backgroundColor: '#CCCCCC',
    marginLeft: 7,
    marginVertical: 2,
  },
  rideActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rideActionButton: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  openAppButton: {
    backgroundColor: '#28a745',
  },
  rideActionText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  availablePartnersContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  bottomPadding: {
    height: 20,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  confirmedDestination: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 10,
  },
  destinationInputContainer: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  centerMapButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'white',
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  autocompleteContainer: {
    flex: 1,
  },
  autocompleteList: {
    // Add appropriate styles for the autocomplete list
  },
});