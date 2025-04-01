import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import FirebaseService from '../services/FirebaseService';

// TypeScript interfaces
interface UserLocation {
  lat: number;
  lng: number;
}

interface MatchedUser {
  id: string;
  distance: number;
  name?: string;
  location: UserLocation;
  status: 'active' | 'inactive' | 'matched';
}

const UserMatching = () => {
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<UserLocation | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [potentialMatches, setPotentialMatches] = useState<MatchedUser[]>([]);
  const [matchSearchRadius, setMatchSearchRadius] = useState(5); // 5km default

  // Get user location and set up Firebase with user data
  useEffect(() => {
    const setupUserAndLocation = async () => {
      try {
        setLoading(true);
        
        // Get current user or create a temporary one for testing
        const currentUser = FirebaseService.getCurrentUser();
        const tempUserId = currentUser?.uid || `temp-user-${Date.now()}`;
        setUserId(tempUserId);
        
        // Get device location
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required for matching with nearby users.');
          setLoading(false);
          return;
        }
        
        const location = await Location.getCurrentPositionAsync({});
        const userLocation = {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        };
        
        setCurrentLocation(userLocation);
        
        // Update user profile in Firebase with current location and active status
        await FirebaseService.updateUserRideProfile(tempUserId, {
          location: userLocation,
          status: 'active'
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error setting up user and location:', error);
        Alert.alert('Error', 'Failed to set up location and Firebase profile.');
        setLoading(false);
      }
    };
    
    setupUserAndLocation();
    
    // Cleanup function
    return () => {
      // If we have a userId, update status to inactive when component unmounts
      if (userId) {
        FirebaseService.updateUserRideProfile(userId, {
          status: 'inactive',
          location: currentLocation || { lat: 0, lng: 0 }
        }).catch(err => console.error('Error updating user status on unmount:', err));
      }
    };
  }, []);
  
  // Function to find potential matches
  const findMatches = async () => {
    if (!userId || !currentLocation) {
      Alert.alert('Not Ready', 'Location data and user profile must be initialized first.');
      return;
    }
    
    setLoading(true);
    
    try {
      const matches = await FirebaseService.findPotentialMatches(
        userId,
        matchSearchRadius
      );
      
      setPotentialMatches(matches);
    } catch (error) {
      console.error('Error finding matches:', error);
      Alert.alert('Error', 'Failed to find matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to create a match with a selected user
  const createMatchWithUser = async (matchedUserId: string) => {
    if (!userId || !currentLocation) {
      Alert.alert('Not Ready', 'Your profile must be initialized first.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Find the matched user's data
      const matchedUser = potentialMatches.find(user => user.id === matchedUserId);
      
      if (!matchedUser || !matchedUser.location) {
        throw new Error('Matched user not found or has no location data');
      }
      
      // Simple destination (for demo purposes)
      const destination = {
        lat: currentLocation.lat + 0.1, // Just a dummy destination
        lng: currentLocation.lng + 0.1
      };
      
      // Simplified distance calculation (actual app would use Google Maps API)
      const estimatedDistance = 
        calculateDistance(
          currentLocation.lat, 
          currentLocation.lng, 
          destination.lat, 
          destination.lng
        );
      
      // Create the match
      const matchId = await FirebaseService.createMatch(
        userId,
        matchedUserId,
        {
          startLocation: currentLocation,
          destination,
          estimatedDuration: Math.round(estimatedDistance * 2), // Approx 2 min per km
          estimatedDistance
        }
      );
      
      if (matchId) {
        Alert.alert('Success', `Match created with ${matchedUser.name || 'user'}!`);
        // In a real app, you would navigate to a match details screen
      } else {
        throw new Error('Failed to create match');
      }
    } catch (error) {
      console.error('Error creating match:', error);
      Alert.alert('Error', 'Failed to create match. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Simple distance calculation helper
  const calculateDistance = (
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  };
  
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };
  
  // Render a potential match item
  const renderMatchItem = ({ item }: { item: MatchedUser }) => (
    <View style={styles.matchItem}>
      <Text style={styles.matchName}>{item.name || `User ${item.id.substring(0, 8)}`}</Text>
      <Text>Distance: {item.distance.toFixed(2)} km</Text>
      <Button
        title="Match with this user"
        onPress={() => createMatchWithUser(item.id)}
      />
    </View>
  );
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Matching</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <Text style={styles.infoText}>
            {currentLocation 
              ? `Your Location: ${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}` 
              : 'Getting your location...'}
          </Text>
          
          <View style={styles.actionButtons}>
            <Button
              title="Find Matches Nearby"
              onPress={findMatches}
              disabled={!userId || !currentLocation}
            />
          </View>
          
          {potentialMatches.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>
                Potential Matches ({potentialMatches.length})
              </Text>
              <FlatList
                data={potentialMatches}
                renderItem={renderMatchItem}
                keyExtractor={(item) => item.id}
                style={styles.matchesList}
              />
            </>
          ) : (
            <Text style={styles.emptyText}>
              No matches found. Try increasing your search radius or try again later.
            </Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  matchesList: {
    flex: 1,
  },
  matchItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
  },
  matchName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
    color: '#666',
  }
});

export default UserMatching; 