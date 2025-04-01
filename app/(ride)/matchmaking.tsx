import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
  RefreshControl,
  SafeAreaView,
  Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io, { Socket } from 'socket.io-client';

// Types
interface MatchingUser {
  id: string;
  name: string;
  rating: number;
  gender: string;
  destination?: {
    address: string;
    coordinates: [number, number];
  };
  profileImage?: string;
}

interface MatchmakingParams {
  gender?: string;
  destination?: string;
  destinationCoords?: string; // JSON stringified coordinates
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.106:5000";

export default function MatchmakingScreen() {
  const params = useLocalSearchParams<MatchmakingParams>();
  const [matchingUsers, setMatchingUsers] = useState<MatchingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [connectionMessage, setConnectionMessage] = useState('Connecting to matchmaking...');
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [searching, setSearching] = useState(false);
  
  let destinationCoords: [number, number] | null = null;
  
  // Parse destination coordinates if available
  if (params.destinationCoords) {
    try {
      destinationCoords = JSON.parse(params.destinationCoords) as [number, number];
    } catch (error) {
      console.error('Error parsing destination coordinates:', error);
    }
  }
  
  // Initialize socket connection
  useEffect(() => {
    initializeSocket();
    
    return () => {
      // Disconnect when component unmounts
      if (socket) {
        console.log('Disconnecting socket on unmount');
        socket.disconnect();
      }
    };
  }, []);
  
  const initializeSocket = async () => {
    try {
      setConnectionStatus('connecting');
      setConnectionMessage('Connecting to matchmaking server...');
      
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.warn('No auth token available for socket connection');
        setConnectionStatus('error');
        setConnectionMessage('Authentication required for matchmaking. Please log in.');
        setLoading(false);
        return;
      }
      
      // For debugging - print API URL and token info
      console.log('API URL for socket connection:', API_URL);
      console.log('Token available (truncated):', token.substring(0, 15) + '...');
      
      // Also check for user info to help with debugging
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('name');
      console.log('Current user from storage - ID:', userId, 'Name:', userName);
      
      // Try to validate token before connecting
      try {
        const validateResponse = await fetch(`${API_URL}/api/auth/validate`, {
          headers: { 'Authorization': `Bearer ${token}` },
          method: 'GET'
        });
        
        if (!validateResponse.ok) {
          console.warn('Token validation failed:', await validateResponse.text());
          setConnectionStatus('error');
          setConnectionMessage('Authentication error. Please log in again.');
          setLoading(false);
          return;
        }
      } catch (validationError) {
        console.error('Error validating token:', validationError);
        // Continue anyway - the socket will handle auth errors
      }
      
      // Disconnect existing socket if there is one
      if (socket) {
        console.log('Disconnecting existing socket before creating new one');
        socket.disconnect();
      }
      
      // Connect to socket with authentication
      const newSocket = io(`${API_URL}`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 15000,
        autoConnect: true,
        query: {
          screen: 'matchmaking',
          deviceId: `device_${Math.random().toString(36).substring(2, 10)}`
        }
      });
      
      // Add connect_error handler
      newSocket.on('connect_error', (error) => {
        console.error('Socket connect error:', error);
        setConnectionStatus('error');
        setConnectionMessage(`Connection error: ${error.message}. Pull down to refresh.`);
        setLoading(false);
      });
      
      // Socket event listeners
      newSocket.on('connect', () => {
        console.log('Socket connected successfully with ID:', newSocket.id);
        setConnectionStatus('connected');
        setConnectionMessage('Connected to matchmaking server.');
        
        // Join matchmaking on connection
        joinMatchmaking(newSocket);
        
        // Ping the server to check connectivity
        console.log('Sending ping to server to test connection');
        newSocket.emit('ping_server', { timestamp: Date.now() });
      });
      
      // Add a ping response listener
      newSocket.on('pong_server', (data) => {
        console.log('Received pong from server:', data);
        const roundTripTime = Date.now() - data.timestamp;
        console.log(`Socket round-trip time: ${roundTripTime}ms`);
      });
      
      // Handle matchmaking joined event
      newSocket.on('matchmakingJoined', (data) => {
        console.log('Joined matchmaking:', data);
        setActiveUsersCount(data.usersCount || 0);
        setLoading(false);
      });
      
      // Handle updateUsers event
      newSocket.on('updateUsers', (data) => {
        console.log('Active users updated:', data);
        setActiveUsersCount(data.count || 0);
      });
      
      // Handle matchingUsers event
      newSocket.on('matchingUsers', (data) => {
        console.log('Received matching users:', data);
        if (data && data.matches) {
          setMatchingUsers(data.matches);
        }
        setSearching(false);
        setLoading(false);
      });
      
      // Handle match accepted event
      newSocket.on('matchAccepted', (data) => {
        console.log('Match accepted:', data);
        Alert.alert(
          'Match Accepted!',
          `${data.partner.name} has accepted your request to match!`,
          [
            { 
              text: 'View Profile',
              onPress: () => {
                // Navigate to profile or chat
                router.push({
                  pathname: '/(tabs)/profile',
                  params: { userId: data.partner.id }
                });
              }
            },
            { text: 'OK', style: 'default' }
          ]
        );
      });
      
      // Handle match confirmed event
      newSocket.on('matchConfirmed', (data) => {
        console.log('Match confirmed:', data);
        Alert.alert(
          'Match Confirmed!',
          `You and ${data.partner.name} are now matched! You can start planning your ride.`,
          [
            { 
              text: 'View Profile',
              onPress: () => {
                // Navigate to profile or chat
                router.push({
                  pathname: '/(tabs)/profile',
                  params: { userId: data.partner.id }
                });
              }
            },
            { text: 'OK', style: 'default' }
          ]
        );
      });
      
      // Error handling
      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        setConnectionStatus('error');
        setConnectionMessage(`Error: ${error.message}. Pull down to refresh.`);
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
        setConnectionMessage('Reconnected! Rejoining matchmaking...');
        
        // Re-join matchmaking after reconnection
        joinMatchmaking(newSocket);
      });
      
      setSocket(newSocket);
    } catch (error) {
      console.error('Error initializing socket:', error);
      setConnectionStatus('error');
      setConnectionMessage('Error connecting to server. Pull down to refresh.');
      setLoading(false);
    }
  };
  
  const joinMatchmaking = (socketInstance: Socket) => {
    try {
      // Prepare user data for matchmaking
      const userData = {
        preferences: {
          gender: params.gender
        },
        destination: params.destination ? {
          address: params.destination,
          coordinates: destinationCoords
        } : undefined,
        // Add client info for debugging
        client: {
          version: '1.0',
          platform: Platform.OS,
          screen: 'matchmaking'
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('Joining matchmaking with data:', JSON.stringify(userData, null, 2));
      
      // Emit joinMatchmaking event
      socketInstance.emit('joinMatchmaking', userData);
      
      // Also find partners immediately
      setTimeout(() => {
        if (socketInstance.connected) {
          findPartners();
        }
      }, 2000); // Wait 2 seconds for join to complete
    } catch (error) {
      console.error('Error joining matchmaking:', error);
      Alert.alert('Error', 'Failed to join matchmaking. Please try again.');
    }
  };
  
  const findPartners = () => {
    if (!socket || !socket.connected) {
      Alert.alert('Connection Error', 'Not connected to matchmaking server. Please try again.');
      return;
    }
    
    setSearching(true);
    
    // Prepare search criteria
    const criteria = {
      gender: params.gender || 'Any', // Use 'Any' as default
      destination: params.destination ? {
        address: params.destination,
        coordinates: destinationCoords
      } : undefined
    };
    
    console.log('Finding partners with criteria:', JSON.stringify(criteria));
    
    // Emit findPartner event
    socket.emit('findPartner', criteria);
  };
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    
    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      initializeSocket();
    } else if (socket && socket.connected) {
      findPartners();
    }
    
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, [connectionStatus, socket]);
  
  const handleAcceptMatch = (userId: string) => {
    if (!socket || !socket.connected) {
      Alert.alert('Connection Error', 'Not connected to matchmaking server. Please try again.');
      return;
    }
    
    console.log('Accepting match with user:', userId);
    
    // Emit acceptMatch event
    socket.emit('acceptMatch', { partnerId: userId });
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
  
  const renderUserItem = ({ item }: { item: MatchingUser }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {item.profileImage ? (
              <Image source={{ uri: item.profileImage }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={30} color="#0066CC" />
            )}
          </View>
          <View>
            <Text style={styles.userName}>{item.name}</Text>
            {renderRatingStars(item.rating)}
            <Text style={styles.userGender}>{item.gender}</Text>
          </View>
        </View>
      </View>
      
      {item.destination && (
        <View style={styles.destinationContainer}>
          <Ionicons name="navigate" size={16} color="#F44336" />
          <Text style={styles.destinationText}>
            <Text style={styles.destinationLabel}>Going to: </Text>
            {item.destination.address}
          </Text>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.matchButton}
        onPress={() => handleAcceptMatch(item.id)}
      >
        <Text style={styles.matchButtonText}>Match with this User</Text>
      </TouchableOpacity>
    </View>
  );
  
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={48} color="#CCC" />
      {searching ? (
        <>
          <ActivityIndicator size="large" color="#0066CC" style={{ marginTop: 16 }} />
          <Text style={styles.emptyText}>Searching for matching users...</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyText}>No matching users found</Text>
          <Text style={styles.emptySubtext}>
            Try searching again or changing your preferences
          </Text>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={findPartners}
          >
            <Ionicons name="search" size={16} color="#0066CC" />
            <Text style={styles.searchButtonText}>Search Again</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Ride Partners</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={20} color="#0066CC" />
          <Text style={styles.statText}>{activeUsersCount} active users</Text>
        </View>
        
        <View style={[
          styles.connectionIndicator,
          connectionStatus === 'connected' ? styles.connected :
          connectionStatus === 'connecting' ? styles.connecting :
          styles.disconnected
        ]}>
          <View style={styles.connectionDot} />
          <Text style={styles.connectionText}>
            {connectionStatus === 'connected' ? 'Connected' :
             connectionStatus === 'connecting' ? 'Connecting...' :
             'Disconnected'}
          </Text>
        </View>
      </View>
      
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>Your Preferences</Text>
        <View style={styles.filterChips}>
          {params.gender && (
            <View style={styles.filterChip}>
              <Ionicons name="person" size={16} color="#0066CC" />
              <Text style={styles.filterChipText}>{params.gender}</Text>
            </View>
          )}
          {params.destination && (
            <View style={styles.filterChip}>
              <Ionicons name="navigate" size={16} color="#F44336" />
              <Text style={styles.filterChipText}>{params.destination}</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.findButton}
          onPress={findPartners}
          disabled={searching || connectionStatus !== 'connected'}
        >
          <Text style={styles.findButtonText}>
            {searching ? 'Searching...' : 'Find Matching Partners'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.matchesContainer}>
        <Text style={styles.sectionTitle}>Matching Users</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Connecting to matchmaking...</Text>
          </View>
        ) : (
          <FlatList
            data={matchingUsers}
            renderItem={renderUserItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
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
      
      {/* Debug button in development */}
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connected: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  connecting: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  disconnected: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipText: {
    fontSize: 14,
    color: '#0066CC',
    marginLeft: 6,
  },
  findButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  findButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  matchesContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    flexGrow: 1,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  userHeader: {
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E6F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userGender: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 4,
    color: '#666',
  },
  destinationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  destinationText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  destinationLabel: {
    fontWeight: '500',
  },
  matchButton: {
    backgroundColor: '#0066CC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  matchButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 16,
  },
  searchButtonText: {
    color: '#0066CC',
    fontWeight: '500',
    marginLeft: 8,
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