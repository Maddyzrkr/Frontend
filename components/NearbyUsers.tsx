import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Define the API URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.106:5000";

// Define interfaces for type safety
interface NearbyUser {
  _id: string;
  name: string;
  username: string;
  gender: string;
  languages: string[];
  rating: number;
  profileImage?: string;
  distance: string;
  rideStatus: 'idle' | 'seeking' | 'booking';
  currentRide?: {
    provider: string;
    destination: string;
    fare: string;
  };
}

interface NearbyUsersProps {
  maxDistance?: number;
  destination?: string;
  onUserSelect?: (user: NearbyUser) => void;
  filterMode?: 'all' | 'seeking' | 'booking';
}

const NearbyUsers: React.FC<NearbyUsersProps> = ({
  maxDistance = 2,
  destination,
  onUserSelect,
  filterMode = 'all',
}) => {
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Request location permission and get current location
  useEffect(() => {
    (async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
          setError('Permission to access location was denied');
          setLoading(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        setLocation(currentLocation);
        fetchNearbyUsers(currentLocation);
      } catch (err) {
        console.error('Error getting location:', err);
        setError('Failed to get your location. Please try again.');
        setLoading(false);
      }
    })();
  }, []);

  // Refetch when filter props change
  useEffect(() => {
    if (location) {
      fetchNearbyUsers(location);
    }
  }, [filterMode, maxDistance, destination]);

  // Function to fetch nearby users based on current location
  const fetchNearbyUsers = async (currentLocation: Location.LocationObject | null) => {
    if (!currentLocation) {
      setError('Location not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token || !userId) {
        setError('You need to be logged in to see nearby users');
        setLoading(false);
        return;
      }
      
      // Determine which API endpoint to use based on filterMode
      let endpoint = '/nearby';
      if (filterMode === 'seeking') {
        endpoint = '/nearby-partners';
      } else if (filterMode === 'booking') {
        endpoint = '/nearby-booked-rides';
      }

      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(`${API_URL}/api/users${endpoint}/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            maxDistance,
            destination,
          }),
          signal: controller.signal
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error('Failed to fetch nearby users');
        }
        
        const data = await response.json();
        setUsers(data.users || []);
        setError(null);
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    } catch (err) {
      console.error('Error fetching nearby users:', err);
      setError('Failed to fetch nearby users. Please try again later.');
      
      // Show a helpful error message
      Alert.alert(
        'Connection Error',
        'Could not connect to the server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (location) {
      await fetchNearbyUsers(location);
    } else {
      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(currentLocation);
        await fetchNearbyUsers(currentLocation);
      } catch (err) {
        console.error('Error getting location on refresh:', err);
        setError('Failed to get your location. Please try again.');
        setRefreshing(false);
      }
    }
  };

  // Handle user selection
  const handleUserPress = (user: NearbyUser) => {
    if (onUserSelect) {
      onUserSelect(user);
    } else {
      // Navigate to user profile or chat
      try {
        router.push({
          pathname: "/chat/[id]" as const,
          params: { id: user._id }
        });
      } catch (error) {
        console.error('Error navigating to chat:', error);
        Alert.alert('Navigation Error', 'Could not open chat with this user.');
      }
    }
  };

  // Send ride invite
  const sendRideInvite = async (userId: string) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const currentUserId = await AsyncStorage.getItem('userId');
      
      if (!token || !currentUserId) {
        Alert.alert('Error', 'You need to be logged in to send invites');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/rides/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          inviterId: currentUserId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send invite');
      }
      
      Alert.alert('Success', 'Ride invitation sent successfully');
    } catch (error) {
      console.error('Error sending ride invite:', error);
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render user item
  const renderUserItem = ({ item }: { item: NearbyUser }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleUserPress(item)}
    >
      <View style={styles.userHeader}>
        <View style={styles.userProfile}>
          <View style={styles.avatarContainer}>
            {item.profileImage ? (
              <Image
                source={{ uri: item.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <Ionicons name="person" size={24} color="#0066CC" />
            )}
          </View>
          <View>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userDistance}>{item.distance} away</Text>
          </View>
        </View>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      </View>
      
      <View style={styles.userDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="person" size={16} color="#666" />
          <Text style={styles.detailText}>Gender: {item.gender}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="chatbubble-ellipses" size={16} color="#666" />
          <Text style={styles.detailText}>Languages: {item.languages.join(', ')}</Text>
        </View>
        {item.rideStatus === 'booking' && item.currentRide && (
          <>
            <View style={styles.detailItem}>
              <Ionicons name="car" size={16} color="#666" />
              <Text style={styles.detailText}>Provider: {item.currentRide.provider}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="navigate" size={16} color="#666" />
              <Text style={styles.detailText}>Going to: {item.currentRide.destination}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="cash" size={16} color="#666" />
              <Text style={styles.detailText}>Fare: {item.currentRide.fare}</Text>
            </View>
          </>
        )}
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.messageButton}
          onPress={() => {
            try {
              router.push({
                pathname: "/chat/[id]" as const,
                params: { id: item._id }
              });
            } catch (error) {
              console.error('Error navigating to chat:', error);
              Alert.alert('Chat Unavailable', 'Chat functionality is not available right now');
            }
          }}
        >
          <Ionicons name="chatbubble" size={18} color="#0066CC" />
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.inviteButton}
          onPress={() => sendRideInvite(item._id)}
        >
          <Text style={styles.inviteButtonText}>Send Invite</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people" size={60} color="#CCCCCC" />
      <Text style={styles.emptyText}>No nearby users found</Text>
      <Text style={styles.emptySubtext}>
        {locationPermission
          ? 'Try adjusting your search radius or check back later'
          : 'Location permission is required to find nearby users'}
      </Text>
      {!locationPermission && (
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status === 'granted');
            if (status === 'granted') {
              const currentLocation = await Location.getCurrentPositionAsync({});
              setLocation(currentLocation);
              fetchNearbyUsers(currentLocation);
            }
          }}
        >
          <Text style={styles.permissionButtonText}>Grant Location Permission</Text>
      </TouchableOpacity>
      )}
    </View>
  );

  // Main render
  return (
    <View style={styles.container}>
      {/* Status text */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {location
            ? `Showing users within ${maxDistance} km of your location`
            : 'Getting your location...'}
        </Text>
        {destination && (
          <Text style={styles.destinationText}>
            Destination: {destination}
          </Text>
        )}
      </View>
      
      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Loading indicator */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Finding users near you...</Text>
        </View>
      )}

      {/* User list */}
      {!loading && (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  statusContainer: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusText: {
    fontSize: 14,
    color: '#555',
  },
  destinationText: {
    fontSize: 14,
    color: '#0066CC',
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 5,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  listContainer: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 5,
  },
  permissionButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDistance: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    marginLeft: 3,
    color: '#333',
    fontWeight: '500',
  },
  userDetails: {
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    marginLeft: 8,
    color: '#555',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
    marginRight: 8,
  },
  messageButtonText: {
    color: '#0066CC',
    fontWeight: '500',
    marginLeft: 5,
  },
  inviteButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 8,
  },
  inviteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default NearbyUsers; 