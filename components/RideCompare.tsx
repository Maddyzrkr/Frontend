import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getRouteWithTraffic, RouteDetails } from '../services/GoogleMapsService';
import { Coordinates, calculateDistance } from '../services/LocationService';
import { openUberWithRide, openOlaWithRide } from '../utils/appLauncher';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RideCompareProps {
  origin: Coordinates;
  destination: Coordinates;
  onClose?: () => void;
}

interface RideOption {
  name: string;
  iconName: string;
  eta: string;
  fare: string;
  distance: string;
  durationInTraffic?: string;
  isEstimated?: boolean;
}

const RideCompare: React.FC<RideCompareProps> = ({ origin, destination, onClose }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [routeDetails, setRouteDetails] = useState<RouteDetails | null>(null);
  const [rideOptions, setRideOptions] = useState<RideOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Create initial estimated options immediately
  useEffect(() => {
    // Calculate rough distance for immediate display
    const initialDistance = calculateDistance(origin, destination);
    // Show estimated options immediately
    createEstimatedOptions(initialDistance);
    // Then fetch real data in background
    fetchRouteDetails();
  }, [origin, destination]);
  
  // Function to create estimated ride options for immediate display
  const createEstimatedOptions = (distanceKm: number) => {
    const fallbackDuration = Math.round(distanceKm * 3 * 60); // Rough estimate: 3 min per km
    
    const fallbackOptions: RideOption[] = [
      {
        name: 'Uber',
        iconName: 'car',
        eta: `~${Math.round(fallbackDuration / 60)} mins`,
        fare: `₹${Math.round(150 + distanceKm * 12)}`,
        distance: `~${distanceKm.toFixed(1)} km`,
        isEstimated: true
      },
      {
        name: 'Ola',
        iconName: 'car-sport',
        eta: `~${Math.round(fallbackDuration / 60)} mins`,
        fare: `₹${Math.round(120 + distanceKm * 13)}`,
        distance: `~${distanceKm.toFixed(1)} km`,
        isEstimated: true
      }
    ];
    
    setRideOptions(fallbackOptions);
  };

  const fetchRouteDetails = async () => {
    try {
      // Validate coordinates
      if (!origin || !destination || 
          !origin.latitude || !origin.longitude || 
          !destination.latitude || !destination.longitude) {
        setError('Invalid coordinates');
        return;
      }
      
      // Check if origin and destination are the same or too close
      const distance = calculateDistance(origin, destination);
      if (distance < 0.1) { // Less than 100 meters
        setError('Origin and destination are too close');
        return;
      }
      
      console.log('Fetching route details with traffic information');
      // Get route details with traffic information
      const details = await getRouteWithTraffic(origin, destination);
      
      if (!details) {
        console.log('Unable to get route details, using estimates');
        return;
      }
      
      setRouteDetails(details);
      
      // Create ride options with actual data
      const options: RideOption[] = [
        {
          name: 'Uber',
          iconName: 'car',
          eta: details.durationInTraffic 
            ? details.durationInTraffic.text 
            : details.duration.text,
          fare: `₹${details.fare.uber}`,
          distance: details.distance.text,
          durationInTraffic: details.durationInTraffic?.text
        },
        {
          name: 'Ola',
          iconName: 'car-sport',
          eta: details.durationInTraffic 
            ? details.durationInTraffic.text 
            : details.duration.text,
          fare: `₹${details.fare.ola}`,
          distance: details.distance.text,
          durationInTraffic: details.durationInTraffic?.text
        }
      ];
      
      setRideOptions(options);
      console.log('Route details successfully loaded');
    } catch (error) {
      console.error('Error fetching route details:', error);
      
      let errorMessage = 'Unable to calculate route';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    }
  };

  const handleRideSelect = async (rideName: string) => {
    try {
      if (!origin || !destination) {
        Alert.alert('Error', 'Please select a valid pickup and drop-off location');
        return;
      }
      
      if (rideName === 'Uber') {
        await openUberWithRide(
          origin.latitude,
          origin.longitude,
          destination.latitude,
          destination.longitude
        );
      } else if (rideName === 'Ola') {
        await openOlaWithRide(
          origin.latitude,
          origin.longitude,
          destination.latitude,
          destination.longitude
        );
      }
    } catch (error) {
      console.error(`Error opening ${rideName}:`, error);
      Alert.alert('Error', `Unable to open ${rideName} app`);
    }
  };

  const renderRideOption = (option: RideOption, index: number) => (
    <TouchableOpacity
      key={option.name}
      style={[
        styles.optionCard,
        index === 0 && styles.firstOption
      ]}
      onPress={() => handleRideSelect(option.name)}
      activeOpacity={0.7}
    >
      <View style={styles.optionHeader}>
        <View style={styles.optionProvider}>
          <Ionicons name={option.iconName} size={20} color="#333" />
          <Text style={styles.optionName}>{option.name}</Text>
          {option.isEstimated && (
            <View style={styles.estimatedBadge}>
              <Text style={styles.estimatedText}>Estimated</Text>
            </View>
          )}
        </View>
        <Text style={styles.optionFare}>{option.fare}</Text>
      </View>
      
      <View style={styles.optionDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{option.eta}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Ionicons name="navigate-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{option.distance}</Text>
        </View>
        
        {option.durationInTraffic && (
          <View style={styles.detailItem}>
            <Ionicons name="speedometer-outline" size={16} color="#666" />
            <Text style={styles.detailText}>With traffic: {option.durationInTraffic}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Compare Rides</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          )}
        </View>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Finding the best rides for you...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Compare Rides</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={20} color="#E53935" />
          <Text style={styles.errorText}>
            {error === 'Invalid coordinates' 
              ? 'Please select valid pickup and destination locations' 
              : 'Error calculating route. Showing estimated prices.'}
          </Text>
        </View>
      )}
      
      <View style={styles.optionsContainer}>
        {rideOptions.map((option, index) => renderRideOption(option, index))}
      </View>
      
      {routeDetails && (
        <View style={styles.routeInfoContainer}>
          <Text style={styles.routeInfoText}>
            Distance: {routeDetails.distance.text} | Normal time: {routeDetails.duration.text}
          </Text>
          {routeDetails.durationInTraffic && (
            <Text style={styles.trafficInfoText}>
              <Ionicons name="alert-circle-outline" size={14} color="#E53935" /> 
              Current traffic adds approx. {Math.round((routeDetails.durationInTraffic.value - routeDetails.duration.value) / 60)} minutes
            </Text>
          )}
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.findPartnersButton}
        onPress={async () => {
          try {
            // Show loading state
            setIsLoading(true);
            
            // Format coordinates
            const pickupCoords = `${origin.latitude},${origin.longitude}`;
            const destinationCoords = `${destination.latitude},${destination.longitude}`;
            
            // Get selected service provider (default to first option)
            const selectedProvider = rideOptions.length > 0 ? rideOptions[0].name.toLowerCase() : 'uber';
            
            // Calculate estimated fare from options
            const estimatedFare = rideOptions.length > 0 
              ? parseInt(rideOptions[0].fare.replace('₹', '')) 
              : 250;
            
            // Get auth token
            const token = await AsyncStorage.getItem('token');
            if (!token) {
              Alert.alert('Error', 'You need to be logged in to find ride partners');
              setIsLoading(false);
              return;
            }
            
            // Get API URL with fallbacks
            let API_URL = process.env.EXPO_PUBLIC_API_URL;
            
            if (!API_URL) {
              // Try to get the API URL from AsyncStorage
              const storedUrl = await AsyncStorage.getItem('apiUrl');
              if (storedUrl) {
                API_URL = storedUrl;
              } else {
                // Fallback to default URLs
                API_URL = "http://192.168.0.106:5000";
                
                // Try alternative IPs if needed
                const alternativeUrls = [
                  "http://192.168.0.105:5000",
                  "http://192.168.1.100:5000",
                  "http://localhost:5000",
                  "http://127.0.0.1:5000"
                ];
                
                // Store the original API URL for reference
                const originalUrl = API_URL;
                
                // Try to find a working URL
                for (const alternativeUrl of alternativeUrls) {
                  try {
                    console.log(`Testing alternative API URL: ${alternativeUrl}`);
                    const testResponse = await fetch(`${alternativeUrl}/api/auth/status`, {
                      method: 'GET',
                      headers: { 'Authorization': `Bearer ${token}` },
                      // Short timeout for quick checking
                      signal: AbortSignal.timeout(2000)
                    });
                    
                    if (testResponse.ok) {
                      API_URL = alternativeUrl;
                      console.log(`Found working API URL: ${API_URL}`);
                      // Save the working URL for future use
                      await AsyncStorage.setItem('apiUrl', API_URL);
                      break;
                    }
                  } catch (error) {
                    console.log(`Alternative URL ${alternativeUrl} failed:`, error);
                  }
                }
                
                if (API_URL === originalUrl) {
                  console.log('No alternative URLs worked, using original URL');
                }
              }
            }
            
            console.log(`Creating ride with API URL: ${API_URL}`);
            console.log('Ride creation payload:', JSON.stringify({
              provider: selectedProvider,
              pickupAddress: "Current Location",
              pickupCoordinates: [origin.longitude, origin.latitude],
              destinationAddress: "Destination",
              destinationCoordinates: [destination.longitude, destination.latitude],
              fare: estimatedFare,
              lookingForPartners: true
            }));
            
            // Create the request payload once to reuse in retry attempts
            const requestPayload = {
              provider: selectedProvider,
              pickupAddress: "Current Location",
              pickupCoordinates: [origin.longitude, origin.latitude],
              destinationAddress: "Destination",
              destinationCoordinates: [destination.longitude, destination.latitude],
              fare: estimatedFare,
              lookingForPartners: true
            };
            
            // Helper function for creating a ride with retry logic
            const createRideWithRetry = async (attempts = 0): Promise<any> => {
              try {
                console.log(`Attempt ${attempts + 1} to create ride...`);
                
                // Create an abort controller with a timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                // First try the modern API format (/api/rides/create)
                try {
                  console.log(`Trying endpoint: ${API_URL}/api/rides/create`);
                  const response = await fetch(`${API_URL}/api/rides/create`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(requestPayload),
                    signal: controller.signal
                  });
                  
                  // Get the response text for better error handling
                  const responseText = await response.text();
                  console.log(`Ride creation response status: ${response.status}`);
                  console.log(`Response body: ${responseText}`);
                  
                  if (response.ok) {
                    // Success with first endpoint
                    clearTimeout(timeoutId);
                    try {
                      return JSON.parse(responseText);
                    } catch (parseError) {
                      console.error('Error parsing response:', parseError);
                      throw new Error('Invalid response from server');
                    }
                  } else if (response.status === 404) {
                    // 404 means endpoint not found, try the alternative format
                    console.log('First endpoint returned 404, trying alternative endpoint...');
                  } else {
                    // Other error, might be auth or server issue
                    clearTimeout(timeoutId);
                    throw new Error(`Failed to create ride: ${response.status} - ${responseText}`);
                  }
                } catch (firstEndpointError: any) {
                  if (firstEndpointError.message && firstEndpointError.message.includes('Failed to create ride')) {
                    // If it's our custom error, rethrow it
                    clearTimeout(timeoutId);
                    throw firstEndpointError;
                  }
                  // Otherwise it's likely a network error, try the second endpoint
                  console.log('First endpoint failed, trying alternative:', firstEndpointError);
                }
                
                // Try the alternative API format (directly to /api/rides)
                console.log(`Trying alternative endpoint: ${API_URL}/api/rides`);
                
                // Convert to legacy format for direct endpoint
                const legacyPayload = {
                  provider: requestPayload.provider,
                  pickup: {
                    address: requestPayload.pickupAddress,
                    location: {
                      type: 'Point',
                      coordinates: requestPayload.pickupCoordinates
                    }
                  },
                  destination: {
                    address: requestPayload.destinationAddress,
                    location: {
                      type: 'Point',
                      coordinates: requestPayload.destinationCoordinates
                    }
                  },
                  fare: requestPayload.fare,
                  lookingForPartners: requestPayload.lookingForPartners
                };
                
                const response = await fetch(`${API_URL}/api/rides`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(legacyPayload),
                  signal: controller.signal
                });
                
                // Clear the timeout since the request completed
                clearTimeout(timeoutId);
                
                // Get the response text for better error handling
                const responseText = await response.text();
                console.log(`Alternative endpoint response status: ${response.status}`);
                console.log(`Alternative response body: ${responseText}`);
                
                if (!response.ok) {
                  // For certain error types, retry the request
                  if ((response.status >= 500 || response.status === 0) && attempts < 2) {
                    console.log(`Server error (${response.status}), retrying...`);
                    return await createRideWithRetry(attempts + 1);
                  }
                  
                  throw new Error(`Failed to create ride: ${response.status} - ${responseText}`);
                }
                
                try {
                  // Parse the JSON response
                  return JSON.parse(responseText);
                } catch (parseError) {
                  console.error('Error parsing response:', parseError);
                  throw new Error('Invalid response from server');
                }
              } catch (error) {
                // For network errors, retry the request
                if (
                  ((error instanceof TypeError || 
                   (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')) 
                  && attempts < 2)
                ) {
                  console.log(`Network error, retrying (${attempts + 1}/3)...`);
                  // Wait before retrying
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  return await createRideWithRetry(attempts + 1);
                }
                throw error;
              }
            };
            
            // Use the retry function to create the ride
            const data = await createRideWithRetry();
            
            if (!data || !data.ride || !data.ride._id) {
              console.error('Invalid ride data received:', data);
              throw new Error('Invalid ride data received from server');
            }
            
            const rideId = data.ride._id;
            console.log(`Ride created successfully with ID: ${rideId}`);
            
            // Navigate with rideId and other parameters
            router.push({
              pathname: '/find-partners',
              params: {
                rideId,
                pickup: pickupCoords,
                destination: destinationCoords
              }
            });
          } catch (error) {
            console.error('Error creating ride:', error);
            Alert.alert('Error', 'Failed to create ride. Please try again.');
          } finally {
            setIsLoading(false);
          }
        }}
      >
        <Ionicons name="people" size={16} color="white" />
        <Text style={styles.findPartnersButtonText}>Find Ride Partners</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: '75%', // Adjusted to prevent content cutoff
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#D32F2F',
    flex: 1,
  },
  optionsContainer: {
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 10, // Reduced padding
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6, // Reduced margin
  },
  optionProvider: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1, // Allow text to shrink if needed
  },
  optionName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionFare: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  optionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow wrapping to prevent overflow
    alignItems: 'center',
    marginBottom: 4, // Reduced margin
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4, // Add margin bottom for wrapped items
  },
  detailText: {
    marginLeft: 4,
    fontSize: 13, // Reduced font size
    color: '#666',
  },
  firstOption: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  estimatedBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 5,
  },
  estimatedText: {
    fontSize: 9,
    color: '#856404',
    fontWeight: '500',
  },
  routeInfoContainer: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  routeInfoText: {
    fontSize: 13,
    color: '#666',
  },
  trafficInfoText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  findPartnersButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
  },
  findPartnersButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  }
});

export default RideCompare; 