// // app/find-partners.tsx
// import React, { useState, useEffect } from 'react';
// import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image } from 'react-native';
// import { router } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
// import axios from 'axios';

// // Define the Partner interface
// interface Partner {
//   id: string;
//   name: string;
//   distance: string;
//   rating: number;
//   destination: string;
//   preferences: { 
//     gender: string;
//     language: string;
//   };
//   eta: string;
// }

// export default function FindPartnersScreen() {
//   const [partners, setPartners] = useState<Partner[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // Simulate fetching partners data
//     setTimeout(() => {
//       const mockPartners: Partner[] = [
//         {
//           id: '1',
//           name: 'Rahul S.',
//           distance: '0.3 km away',
//           rating: 4.8,
//           destination: 'Airport',
//           preferences: { gender: 'Male', language: 'Hindi, English' },
//           eta: '5 mins',
//         },
//         {
//           id: '2',
//           name: 'Priya M.',
//           distance: '0.7 km away',
//           rating: 4.7,
//           destination: 'Airport',
//           preferences: { gender: 'Female', language: 'English, Marathi' },
//           eta: '5 mins',
//         },
//         {
//           id: '3',
//           name: 'Amit K.',
//           distance: '0.9 km away',
//           rating: 4.5,
//           destination: 'Airport',
//           preferences: { gender: 'Male', language: 'Hindi, English' },
//           eta: '7 mins',
//         },
//       ];
      
//       setPartners(mockPartners);
//       setLoading(false);
//     }, 1000);
//   }, []);

//   const renderPartnerItem = ({ item }: { item: Partner }) => (
//     <TouchableOpacity style={styles.partnerCard}>
//       <View style={styles.partnerHeader}>
//         <View style={styles.partnerProfile}>
//           <View style={styles.avatarContainer}>
//             <Ionicons name="person" size={24} color="#0066CC" />
//           </View>
//           <View>
//             <Text style={styles.partnerName}>{item.name}</Text>
//             <Text style={styles.partnerDistance}>{item.distance}</Text>
//           </View>
//         </View>
//         <View style={styles.ratingContainer}>
//           <Ionicons name="star" size={16} color="#FFD700" />
//           <Text style={styles.ratingText}>{item.rating}</Text>
//         </View>
//       </View>
      
//       <View style={styles.partnerDetails}>
//         <View style={styles.detailItem}>
//           <Ionicons name="navigate" size={16} color="#666" />
//           <Text style={styles.detailText}>Going to: {item.destination}</Text>
//         </View>
//         <View style={styles.detailItem}>
//           <Ionicons name="person" size={16} color="#666" />
//           <Text style={styles.detailText}>Gender: {item.preferences.gender}</Text>
//         </View>
//         <View style={styles.detailItem}>
//           <Ionicons name="chatbubble-ellipses" size={16} color="#666" />
//           <Text style={styles.detailText}>Languages: {item.preferences.language}</Text>
//         </View>
//         <View style={styles.detailItem}>
//           <Ionicons name="time" size={16} color="#666" />
//           <Text style={styles.detailText}>ETA: {item.eta}</Text>
//         </View>
//       </View>
      
//       <View style={styles.actionButtons}>
//         <TouchableOpacity style={styles.messageButton}>
//           <Ionicons name="chatbubble" size={18} color="#0066CC" />
//           <Text style={styles.messageButtonText}>Message</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.inviteButton}>
//           <Text style={styles.inviteButtonText}>Send Invite</Text>
//         </TouchableOpacity>
//       </View>
//     </TouchableOpacity>
//   );

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
//           <Ionicons name="arrow-back" size={24} color="#333" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Find Ride Partners</Text>
//       </View>
      
//       <View style={styles.filterContainer}>
//         <Text style={styles.filterTitle}>Showing partners within 1km for Airport</Text>
//         <TouchableOpacity style={styles.filterButton}>
//           <Ionicons name="options" size={20} color="#0066CC" />
//           <Text style={styles.filterButtonText}>Filter</Text>
//         </TouchableOpacity>
//       </View>
      
//       {loading ? (
//         <View style={styles.loadingContainer}>
//           <Text>Searching for partners...</Text>
//         </View>
//       ) : (
//         <FlatList
//           data={partners}
//           renderItem={renderPartnerItem}
//           keyExtractor={item => item.id}
//           contentContainerStyle={styles.partnersList}
//         />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F5F5F5',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingTop: 50,
//     paddingBottom: 15,
//     paddingHorizontal: 15,
//     backgroundColor: 'white',
//     borderBottomWidth: 1,
//     borderBottomColor: '#EEEEEE',
//   },
//   backButton: {
//     padding: 5,
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginLeft: 15,
//   },
//   filterContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 15,
//     backgroundColor: 'white',
//     borderBottomWidth: 1,
//     borderBottomColor: '#EEEEEE',
//   },
//   filterTitle: {
//     fontSize: 14,
//     color: '#666',
//   },
//   filterButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   filterButtonText: {
//     color: '#0066CC',
//     marginLeft: 5,
//     fontWeight: '500',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   partnersList: {
//     padding: 15,
//   },
//   partnerCard: {
//     backgroundColor: 'white',
//     borderRadius: 12,
//     padding: 15,
//     marginBottom: 15,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   partnerHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 15,
//   },
//   partnerProfile: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   avatarContainer: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#E6F0FF',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 10,
//   },
//   partnerName: {
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   partnerDistance: {
//     fontSize: 14,
//     color: '#666',
//   },
//   ratingContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FFF9E6',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   ratingText: {
//     marginLeft: 3,
//     color: '#333',
//     fontWeight: '500',
//   },
//   partnerDetails: {
//     backgroundColor: '#F8F9FA',
//     borderRadius: 8,
//     padding: 12,
//     marginBottom: 15,
//   },
//   detailItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   detailText: {
//     marginLeft: 8,
//     color: '#333',
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   messageButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#E6F0FF',
//     paddingVertical: 10,
//     paddingHorizontal: 15,
//     borderRadius: 8,
//     flex: 0.48,
//     justifyContent: 'center',
//   },
//   messageButtonText: {
//     color: '#0066CC',
//     fontWeight: '500',
//     marginLeft: 5,
//   },
//   inviteButton: {
//     backgroundColor: '#0066CC',
//     paddingVertical: 10,
//     paddingHorizontal: 15,
//     borderRadius: 8,
//     flex: 0.48,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   inviteButtonText: {
//     color: 'white',
//     fontWeight: '500',
//   },
// });

// app/(ride)/find-partners.tsx
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io, { Socket } from 'socket.io-client';

// Define types
interface User {
  id: string;
  name: string;
  profileImage?: string;
  distance: string;
  rating: number;
  gender: string;
  languages: string[];
  destination?: string;
}

interface JoinRequest {
  id: string;
  user: User;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: Date;
}

interface FindPartnersScreenParams {
  rideId: string;
  pickup: string;
  destination: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.106:5000";

export default function FindPartnersScreen() {
  const params = useLocalSearchParams<FindPartnersScreenParams>();
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [rideDetails, setRideDetails] = useState({
    id: params.rideId || '',
    pickup: '',  // Start with empty string to avoid showing placeholder text
    destination: ''  // Start with empty string to avoid placeholder text
  });
  
  // Debug log for incoming parameters
  console.log('URL params received in find-partners.tsx:', JSON.stringify({
    rideId: params.rideId,
    pickup: params.pickup,
    destination: params.destination
  }));

  // Add a loading state specifically for location data
  const [locationsLoading, setLocationsLoading] = useState(true);

  // Add a connection status state
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [connectionMessage, setConnectionMessage] = useState('Connecting to server...');
  
  // Immediately try to set location values from URL params 
  // This runs on component mount and ensures we have values even if API fails
  useEffect(() => {
    setLocationsLoading(true);
    
    if (params.pickup && params.destination) {
      try {
        const decodedPickup = decodeURIComponent(params.pickup as string);
        const decodedDestination = decodeURIComponent(params.destination as string);
        
        console.log('Decoded locations from URL params:', {
          pickup: decodedPickup,
          destination: decodedDestination
        });
        
        // Set locations from URL parameters, ensuring we don't use "undefined" text
        if (decodedPickup !== 'undefined') {
          setRideDetails(prev => ({
            ...prev,
            pickup: decodedPickup
          }));
        }
        
        if (decodedDestination !== 'undefined') {
          setRideDetails(prev => ({
            ...prev,
            destination: decodedDestination
          }));
        }
      } catch (error) {
        console.error('Error decoding URL parameters:', error);
      }
    }
    
    setLocationsLoading(false);
  }, [params.pickup, params.destination]);

  // Initialize socket connection and fetch initial data
  useEffect(() => {
    console.log('Initializing ride details and socket connection...');
    fetchRideDetails();
    initializeSocket();
    
    // Set up an interval to refresh ride details and check for new requests
    const intervalId = setInterval(() => {
      fetchRideDetails();
    }, 8000); // Every 8 seconds
    
    return () => {
      if (socket) {
        console.log('Disconnecting socket on component unmount');
        socket.disconnect();
      }
      clearInterval(intervalId);
    };
  }, []);

  // Function to handle pull-to-refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchRideDetails();
      
      // Reconnect socket if disconnected
      if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
        console.log('Attempting to reconnect socket on manual refresh');
        initializeSocket();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [connectionStatus]);

  const initializeSocket = async () => {
    try {
      setConnectionStatus('connecting');
      setConnectionMessage('Connecting to server...');
      
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.warn('No auth token available for socket connection');
        setConnectionStatus('error');
        setConnectionMessage('Authentication required for real-time updates');
        return;
      }
      
      console.log('Initializing socket connection to:', API_URL);
      
      // Disconnect existing socket if there is one
      if (socket) {
        console.log('Disconnecting existing socket before creating new one');
        socket.disconnect();
      }
      
      // Connect to socket with authentication
      const newSocket = io(`${API_URL}`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 10000,
        autoConnect: true,
        // Add extra parameters to help with debugging
        query: {
          screen: 'find-partners',
          rideId: params.rideId || 'unknown',
          deviceId: `device_${Math.random().toString(36).substring(2, 10)}`
        }
      });
      
      // Add connect_error handler
      newSocket.on('connect_error', (error) => {
        console.error('Socket connect error:', error);
        setConnectionStatus('error');
        setConnectionMessage(`Connection error: ${error.message}. Pull down to refresh.`);
      });
      
      // Socket event listeners
      newSocket.on('connect', () => {
        console.log('Socket connected successfully with ID:', newSocket.id);
        setConnectionStatus('connected');
        setConnectionMessage('Connected! Waiting for ride requests...');
        
        // Join ride-specific channel
        if (params.rideId) {
          console.log(`Joining ride channel for ride ID: ${params.rideId}`);
          newSocket.emit('join_ride_channel', { 
            rideId: params.rideId,
            // Add additional context for debugging
            context: {
              screen: 'find-partners',
              device: Platform.OS
            }
          });
          
          // Ping the server to check connectivity
          console.log('Sending ping to server to test connection');
          newSocket.emit('ping_server', { timestamp: Date.now() });
        } else {
          console.warn('No ride ID available, cannot join ride channel');
        }
      });
      
      // Add a ping response listener
      newSocket.on('pong_server', (data) => {
        console.log('Received pong from server:', data);
        const roundTripTime = Date.now() - data.timestamp;
        console.log(`Socket round-trip time: ${roundTripTime}ms`);
      });
      
      // Listen for join requests with enhanced logging
      newSocket.on('join_request', (data) => {
        console.log('Join request received:', JSON.stringify(data));
        
        if (!data || !data.user || !data.user.id) {
          console.error('Received invalid join request data:', data);
          return;
        }
        
        // Add the new request to the list
        const newRequest: JoinRequest = {
          id: data.user.id,
          user: {
            id: data.user.id,
            name: data.user.name || 'Unknown User',
            rating: data.user.rating || 5.0,
            gender: data.user.gender || 'Unknown',
            languages: data.user.languages || ['English'],
            profileImage: data.user.profileImage,
            distance: data.distance || 'Nearby'
          },
          status: 'pending',
          timestamp: new Date()
        };
        
        console.log('Creating new request object:', newRequest);
        
        setJoinRequests(prev => {
          // Check if request already exists
          const exists = prev.some(req => req.id === newRequest.id);
          if (exists) {
            console.log('Request already exists, skipping');
            return prev;
          }
          
          console.log('Adding new request to state');
          return [newRequest, ...prev];
        });
        
        // Show notification
        Alert.alert(
          'New Join Request',
          `${newRequest.user.name} wants to join your ride.`,
          [{ text: 'View', style: 'default' }]
        );
      });
      
      // Listen for request status changes
      newSocket.on('request_update', (data) => {
        console.log('Request update received:', data);
        if (data && data.userId) {
          setJoinRequests(prev => prev.map(req => 
            req.user.id === data.userId 
              ? { ...req, status: data.status } 
              : req
          ));
        }
      });
      
      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        setConnectionStatus('error');
        setConnectionMessage('Error connecting to server. Pull down to refresh.');
      });
      
      // Disconnect handling
      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected - reason:', reason);
        setConnectionStatus('disconnected');
        setConnectionMessage(`Disconnected from server (${reason}). Pull down to refresh.`);
      });
      
      // Add reconnect listeners
      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`Socket reconnected after ${attemptNumber} attempts`);
        setConnectionStatus('connected');
        setConnectionMessage('Reconnected! Waiting for ride requests...');
        
        // Re-join ride channel after reconnection
        if (params.rideId) {
          newSocket.emit('join_ride_channel', { rideId: params.rideId });
        }
      });
      
      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Socket reconnection attempt #${attemptNumber}`);
        setConnectionMessage(`Reconnecting (attempt ${attemptNumber})...`);
      });
      
      newSocket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error);
        setConnectionStatus('error');
        setConnectionMessage('Error reconnecting. Pull down to refresh.');
      });
      
      newSocket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed after all attempts');
        setConnectionStatus('error');
        setConnectionMessage('Failed to reconnect after multiple attempts. Pull down to refresh.');
      });
      
      setSocket(newSocket);
    } catch (error) {
      console.error('Error initializing socket:', error);
      setConnectionStatus('error');
      setConnectionMessage('Error connecting to server. Pull down to refresh.');
    }
  };
  
  const fetchRideDetails = async () => {
    try {
      console.log('Fetching ride details...');
      setLoading(true);
      
      // Get auth token
      const token = await AsyncStorage.getItem('token');
      
      // First, always set values from URL parameters if available
      // This ensures we always have a fallback if the API call fails
      if (params.pickup && params.destination) {
        try {
          const decodedPickup = decodeURIComponent(params.pickup as string);
          const decodedDestination = decodeURIComponent(params.destination as string);
          
          console.log('Using decoded URL parameters for ride details:', {
            pickup: decodedPickup,
            destination: decodedDestination
          });
          
          // Ensure we don't use "undefined" text
          if (decodedPickup !== 'undefined') {
            setRideDetails(prev => ({
              ...prev,
              pickup: decodedPickup
            }));
          }
          
          if (decodedDestination !== 'undefined') {
            setRideDetails(prev => ({
              ...prev,
              destination: decodedDestination
            }));
          }
        } catch (error) {
          console.error('Error decoding URL parameters in fetchRideDetails:', error);
        }
      }
      
      if (!token) {
        console.warn('No auth token available for API call');
        setLoading(false);
        return;
      }
      
      if (!params.rideId) {
        console.warn('No ride ID available for API call');
        setLoading(false);
        return;
      }
      
      try {
        // API call to get ride details with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        console.log(`Fetching ride details from API for ride ID: ${params.rideId}`);
        const response = await fetch(
          `${API_URL}/api/rides/${params.rideId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Ride details API response:', data);
          
          // Update ride details from API response
          if (data.ride) {
            // Get valid address strings from API response
            let pickupAddress = '';
            let destinationAddress = '';
            
            // Check for pickup address in API response
            if (data.ride.pickup && typeof data.ride.pickup.address === 'string' && 
                data.ride.pickup.address !== 'undefined' && data.ride.pickup.address.trim() !== '') {
              pickupAddress = data.ride.pickup.address;
            }
            
            // Check for destination address in API response
            if (data.ride.destination && typeof data.ride.destination.address === 'string' && 
                data.ride.destination.address !== 'undefined' && data.ride.destination.address.trim() !== '') {
              destinationAddress = data.ride.destination.address;
            }
            
            // Set the ride details, but DO NOT overwrite existing URL parameter values if API returns empty
            const currentDetails = { ...rideDetails };
            setRideDetails({
              id: data.ride._id || params.rideId || '',
              pickup: pickupAddress || currentDetails.pickup || '',
              destination: destinationAddress || currentDetails.destination || ''
            });
            
            // Process existing join requests if any
            if (data.ride.partners && data.ride.partners.length > 0) {
              const existingRequests: JoinRequest[] = data.ride.partners.map((partner: any) => ({
                id: partner.user._id,
                user: {
                  id: partner.user._id,
                  name: partner.user.name,
                  profileImage: partner.user.profileImage,
                  rating: partner.user.rating || 5.0,
                  gender: partner.user.gender || 'Unknown',
                  languages: partner.user.languages || ['English'],
                  distance: 'Nearby'
                },
                status: partner.status,
                timestamp: new Date(partner.joinedAt)
              }));
              
              setJoinRequests(existingRequests);
            }
          }
        } else {
          console.warn('Failed to fetch ride details from API, status:', response.status);
        }
      } catch (apiError) {
        console.error('API error in fetchRideDetails:', apiError);
      }
    } catch (error) {
      console.error('Error fetching ride details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRequestResponse = async (userId: string, status: 'accepted' | 'rejected') => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'You need to be logged in to respond to join requests.');
        return;
      }
      
      if (!params.rideId) {
        Alert.alert('Error', 'Ride ID is missing.');
        return;
      }
      
      // Update UI optimistically
      setJoinRequests(prev => 
        prev.map(req => 
          req.user.id === userId ? { ...req, status } : req
        )
      );
      
      // Log the status update we're attempting
      console.log(`Updating request status for user ${userId} to ${status}`);
      
      // Send the status update to the server using the socket
      if (socket && socket.connected) {
        console.log('Emitting request_response via socket');
        socket.emit('request_response', {
          rideId: params.rideId,
          userId,
          status
        });
      } else {
        console.warn('Socket not connected, falling back to API call');
        // Fall back to API if socket is not available
        const response = await fetch(
          `${API_URL}/api/rides/${params.rideId}/join-requests/${userId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status })
          }
        );
        
        if (!response.ok) {
          console.error('API request failed:', await response.text());
          throw new Error('Failed to update request status');
        }
      }
      
      // Show confirmation
      Alert.alert(
        'Success', 
        `You have ${status === 'accepted' ? 'accepted' : 'declined'} the ride request.`
      );
      
    } catch (error) {
      console.error('Error updating request status:', error);
      
      // Revert UI change if there was an error
      fetchRideDetails();
      
      Alert.alert(
        'Error',
        'Failed to update request status. Please try again.'
      );
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

  const renderRequestItem = ({ item }: { item: JoinRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={24} color="#0066CC" />
          </View>
          <View>
            <Text style={styles.userName}>{item.user.name}</Text>
            {renderRatingStars(item.user.rating)}
          </View>
        </View>
        <View style={[
          styles.statusTag,
          item.status === 'accepted' ? styles.acceptedTag :
          item.status === 'rejected' ? styles.rejectedTag :
          styles.pendingTag
        ]}>
          <Text style={styles.statusText}>
            {item.status === 'accepted' ? 'Accepted' :
             item.status === 'rejected' ? 'Rejected' :
             'Pending'}
          </Text>
        </View>
      </View>
      
      <View style={styles.userDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="person" size={16} color="#666" />
          <Text style={styles.detailText}>Gender: {item.user.gender}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="chatbubble-ellipses" size={16} color="#666" />
          <Text style={styles.detailText}>Languages: {item.user.languages.join(', ')}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.detailText}>Requested: {new Date(item.timestamp).toLocaleTimeString()}</Text>
        </View>
      </View>
      
      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.rejectButton}
            onPress={() => handleRequestResponse(item.user.id, 'rejected')}
          >
            <Text style={styles.rejectButtonText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={() => handleRequestResponse(item.user.id, 'accepted')}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render an enhanced empty list component with connection status
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={
          connectionStatus === 'connected' ? "people-outline" :
          connectionStatus === 'connecting' ? "sync" :
          connectionStatus === 'disconnected' ? "cloud-offline" : 
          "alert-circle"
        } 
        size={48} 
        color={
          connectionStatus === 'connected' ? "#CCC" :
          connectionStatus === 'connecting' ? "#0066CC" :
          connectionStatus === 'disconnected' ? "#FF9800" : 
          "#F44336"
        } 
      />
      <Text style={styles.emptyText}>
        {connectionStatus === 'connected' ? 'No join requests yet' : 'Connection Status'}
      </Text>
      <Text style={styles.emptySubtext}>
        {connectionStatus === 'connected' 
          ? 'Users looking for rides will appear here when they request to join your ride'
          : connectionMessage}
      </Text>
      <TouchableOpacity 
        style={styles.refreshEmptyButton}
        onPress={onRefresh}
      >
        <Ionicons name="refresh" size={16} color="#0066CC" />
        <Text style={styles.refreshEmptyText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Ride Partners</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.rideDetailsCard}>
        <Text style={styles.rideDetailsTitle}>Your Active Ride</Text>
        {locationsLoading ? (
          <View style={styles.loadingLocationsContainer}>
            <ActivityIndicator size="small" color="#0066CC" />
            <Text style={styles.loadingText}>Loading ride details...</Text>
          </View>
        ) : (
          <View style={styles.routeContainer}>
            <View style={styles.routeInfo}>
              <View style={styles.routePoint}>
                <View style={[styles.routeMarker, styles.startMarker]} />
                <Text style={styles.routeText} numberOfLines={1}>
                  From: {rideDetails.pickup || 'No pickup location specified'}
                </Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <View style={[styles.routeMarker, styles.endMarker]} />
                <Text style={styles.routeText} numberOfLines={1}>
                  To: {rideDetails.destination || 'No destination specified'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
      
      <View style={styles.joinRequestsContainer}>
        <View style={styles.joinRequestsHeader}>
          <Text style={styles.sectionTitle}>Join Requests</Text>
          {connectionStatus === 'connected' && (
            <View style={styles.connectedIndicator}>
              <View style={styles.connectionDot} />
              <Text style={styles.connectedText}>Live</Text>
            </View>
          )}
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : (
          <FlatList
            data={joinRequests}
            renderItem={renderRequestItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.requestsList}
            ListEmptyComponent={renderEmptyList}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={["#0066CC"]}
                tintColor="#0066CC"
              />
            }
          />
        )}
      </View>

      {/* Add debug button for socket connectivity in dev mode */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => {
            if (socket && socket.connected) {
              console.log('Sending manual ping to server');
              socket.emit('ping_server', { timestamp: Date.now() });
              Alert.alert('Debug', `Socket ID: ${socket.id}\nConnected: ${socket.connected}`);
            } else {
              Alert.alert('Debug', 'Socket not connected', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reconnect', onPress: initializeSocket }
              ]);
            }
          }}
        >
          <Ionicons name="bug" size={16} color="#666" />
          <Text style={styles.debugButtonText}>Test Socket</Text>
        </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingTop: 50, // Fixed padding that works for both platforms
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
  refreshButton: {
    padding: 8,
  },
  rideDetailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rideDetailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeInfo: {
    flex: 1,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  startMarker: {
    backgroundColor: '#4CAF50',
  },
  endMarker: {
    backgroundColor: '#F44336',
  },
  routeLine: {
    width: 1,
    height: 20,
    backgroundColor: '#CCCCCC',
    marginLeft: 6,
    marginBottom: 10,
  },
  routeText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  joinRequestsContainer: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  requestsList: {
    padding: 16,
    paddingTop: 0,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
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
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingTag: {
    backgroundColor: '#FFF9C4',
  },
  acceptedTag: {
    backgroundColor: '#C8E6C9',
  },
  rejectedTag: {
    backgroundColor: '#FFCDD2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  userDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  rejectButtonText: {
    color: '#F44336',
    fontWeight: '500',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginVertical: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
    lineHeight: 20,
  },
  refreshEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0FF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 15,
  },
  refreshEmptyText: {
    color: '#0066CC',
    fontWeight: '500',
    marginLeft: 5,
  },
  loadingLocationsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  joinRequestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  connectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 5,
  },
  
  connectedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  debugButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  debugButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});