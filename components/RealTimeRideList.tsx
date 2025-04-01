import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io, { Socket } from 'socket.io-client';

// Define types
interface Driver {
  id: string;
  name: string;
  rating: number;
  gender: string;
  languages: string[];
  profileImage?: string;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Location {
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
}

interface Ride {
  id: string;
  driver: Driver;
  provider: string;
  pickup: {
    address: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  destination: {
    address: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  fare: string;
  startTime: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  distance?: string;
  duration?: string;
}

interface RealTimeRideListProps {
  userLocation: Coordinates;
  onRideSelect: (ride: Ride) => void;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.106:5000";

const RealTimeRideList: React.FC<RealTimeRideListProps> = ({ userLocation, onRideSelect }) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [requestedRides, setRequestedRides] = useState<string[]>([]);
  
  // Initialize socket connection
  useEffect(() => {
    initializeSocket();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);
  
  // Fetch initial rides
  useEffect(() => {
    fetchRides();
  }, [userLocation]);
  
  const initializeSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.warn('No auth token available for socket connection');
        return;
      }
      
      // Connect to socket with authentication
      const newSocket = io(`${API_URL}`, {
        auth: { token },
        transports: ['websocket'],
        autoConnect: true
      });
      
      // Socket event listeners
      newSocket.on('connect', () => {
        console.log('Socket connected');
      });
      
      newSocket.on('new_ride_available', (data) => {
        console.log('New ride available:', data);
        
        // Convert to the right format
        const newRide: Ride = {
          id: data.ride._id,
          driver: {
            id: data.driver._id || data.ride.user,
            name: data.driver.name,
            rating: data.driver.rating || 5.0,
            gender: data.driver.gender || 'Unknown',
            languages: data.driver.languages || ['English'],
            profileImage: data.driver.profileImage
          },
          provider: data.ride.provider,
          pickup: {
            address: data.ride.pickup.address,
            coordinates: data.ride.pickup.location.coordinates
          },
          destination: {
            address: data.ride.destination.address,
            coordinates: data.ride.destination.location.coordinates
          },
          fare: data.ride.fare,
          startTime: data.ride.startTime,
          status: data.ride.status
        };
        
        // Add to rides list
        setRides(prevRides => {
          // Check if ride already exists
          const exists = prevRides.some(r => r.id === newRide.id);
          if (exists) return prevRides;
          
          return [newRide, ...prevRides];
        });
      });
      
      newSocket.on('request_response', (data) => {
        if (data.status === 'accepted') {
          Alert.alert(
            'Request Accepted',
            'Your ride request was accepted! You can now join the ride.',
            [{ text: 'Great!', style: 'default' }]
          );
        } else {
          Alert.alert(
            'Request Declined',
            'Your ride request was declined.',
            [{ text: 'OK', style: 'default' }]
          );
          
          // Remove from requested rides
          setRequestedRides(prev => prev.filter(id => id !== data.rideId));
        }
      });
      
      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        Alert.alert('Error', error.message || 'An error occurred');
      });
      
      // Disconnect handling
      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });
      
      setSocket(newSocket);
    } catch (error) {
      console.error('Error initializing socket:', error);
    }
  };
  
  const fetchRides = async () => {
    try {
      setLoading(true);
      
      // Get auth token
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.warn('No auth token available');
        setLoading(false);
        return;
      }
      
      // API call to get nearby rides
      const response = await fetch(
        `${API_URL}/api/rides/nearby?longitude=${userLocation.longitude}&latitude=${userLocation.latitude}&maxDistance=5000`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setRides(data.rides || []);
      } else {
        console.warn('Failed to fetch rides');
        
        // Use mock data as fallback
        setRides([
          {
            id: '1',
            driver: {
              id: 'driver1',
              name: 'Rahul S.',
              rating: 4.8,
              gender: 'Male',
              languages: ['Hindi', 'English']
            },
            provider: 'Uber',
            pickup: {
              address: 'Andheri Metro Station',
              coordinates: [72.8513, 19.1195]
            },
            destination: {
              address: 'Bandra Kurla Complex',
              coordinates: [72.8689, 19.0662]
            },
            fare: '₹350',
            startTime: new Date().toISOString(),
            status: 'scheduled',
            distance: '7.5 km',
            duration: '22 mins'
          },
          {
            id: '2',
            driver: {
              id: 'driver2',
              name: 'Priya M.',
              rating: 4.7,
              gender: 'Female',
              languages: ['English', 'Marathi']
            },
            provider: 'Ola',
            pickup: {
              address: 'Juhu Beach',
              coordinates: [72.8296, 19.0883]
            },
            destination: {
              address: 'Lower Parel',
              coordinates: [72.8331, 18.9977]
            },
            fare: '₹280',
            startTime: new Date().toISOString(),
            status: 'scheduled',
            distance: '12.2 km',
            duration: '35 mins'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching rides:', error);
      // Set fallback data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };
  
  const handleJoinRequest = async (rideId: string) => {
    try {
      // Check if already requested
      if (requestedRides.includes(rideId)) {
        Alert.alert('Already Requested', 'You have already requested to join this ride.');
        return;
      }
      
      // Get auth token
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Auth Error', 'Please log in again.');
        return;
      }
      
      if (socket) {
        // Send join request via socket
        socket.emit('request_to_join', { rideId });
        
        // Add to requested rides
        setRequestedRides(prev => [...prev, rideId]);
        
        Alert.alert(
          'Request Sent',
          'Your request to join this ride has been sent. Please wait for the driver to accept.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        // Fallback to REST API
        const response = await fetch(`${API_URL}/api/rides/join-request/${rideId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          // Add to requested rides
          setRequestedRides(prev => [...prev, rideId]);
          
          Alert.alert(
            'Request Sent',
            'Your request to join this ride has been sent. Please wait for the driver to accept.',
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          const error = await response.json();
          Alert.alert('Error', error.message || 'Failed to send join request');
        }
      }
    } catch (error) {
      console.error('Error sending join request:', error);
      Alert.alert('Error', 'Failed to send join request. Please try again.');
    }
  };
  
  const renderRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    
    return (
      <View style={styles.ratingContainer}>
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return <Ionicons key={i} name="star" size={16} color="#FFD700" />;
          } else if (i === fullStars && halfStar) {
            return <Ionicons key={i} name="star-half" size={16} color="#FFD700" />;
          } else {
            return <Ionicons key={i} name="star-outline" size={16} color="#FFD700" />;
          }
        })}
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };
  
  const renderRideItem = ({ item }: { item: Ride }) => (
    <TouchableOpacity 
      style={styles.rideCard}
      onPress={() => onRideSelect(item)}
    >
      <View style={styles.rideHeader}>
        <View style={styles.driverInfo}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={24} color="#0066CC" />
          </View>
          <View>
            <Text style={styles.driverName}>{item.driver.name}</Text>
            {renderRatingStars(item.driver.rating)}
          </View>
        </View>
        <View style={styles.providerTag}>
          <Text style={styles.providerText}>{item.provider}</Text>
        </View>
      </View>
      
      <View style={styles.rideDetails}>
        <View style={styles.locationItem}>
          <Ionicons name="location" size={16} color="#4CAF50" />
          <Text style={styles.locationText}>
            <Text style={styles.locationLabel}>From: </Text>
            {item.pickup.address}
          </Text>
        </View>
        
        <View style={styles.locationItem}>
          <Ionicons name="navigate" size={16} color="#F44336" />
          <Text style={styles.locationText}>
            <Text style={styles.locationLabel}>To: </Text>
            {item.destination.address}
          </Text>
        </View>
        
        <View style={styles.rideInfoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{item.fare}</Text>
          </View>
          
          {item.distance && (
            <View style={styles.infoItem}>
              <Ionicons name="map-outline" size={16} color="#666" />
              <Text style={styles.infoText}>{item.distance}</Text>
            </View>
          )}
          
          {item.duration && (
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.infoText}>{item.duration}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[
            styles.joinButton, 
            requestedRides.includes(item.id) && styles.requestedButton
          ]}
          onPress={() => handleJoinRequest(item.id)}
          disabled={requestedRides.includes(item.id)}
        >
          <Text style={styles.joinButtonText}>
            {requestedRides.includes(item.id) ? 'Request Sent' : 'Join Ride'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={48} color="#CCC" />
      <Text style={styles.emptyText}>No rides available nearby</Text>
      <Text style={styles.emptySubtext}>Pull down to refresh or try again later</Text>
    </View>
  );
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Finding rides nearby...</Text>
      </View>
    );
  }
  
  return (
    <FlatList
      data={rides}
      renderItem={renderRideItem}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={renderEmptyList}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#0066CC']}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    flexGrow: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  rideCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2
  },
  providerTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E6F0FF'
  },
  providerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0066CC'
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666'
  },
  rideDetails: {
    marginBottom: 12
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1
  },
  locationLabel: {
    fontWeight: '500'
  },
  rideInfoRow: {
    flexDirection: 'row',
    marginTop: 8
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  infoText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666'
  },
  actionButtons: {
    marginTop: 8
  },
  joinButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  requestedButton: {
    backgroundColor: '#9E9E9E'
  },
  joinButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center'
  }
});

export default RealTimeRideList; 