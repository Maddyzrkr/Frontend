import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// User interface for type safety
interface RidePartner {
  id: string;
  name: string;
  distance: string;
  destination: string;
  gender: string;
  languages: string[];
  eta: string;
  rating: number;
  profileImage?: string;
}

interface Partner {
  id: string;
  name: string;
  // Add other partner properties as needed
}

export default function FindPartnersScreen() {
  const params = useLocalSearchParams();
  const destination = params.destination as string || 'Airport';
  
  const [partners, setPartners] = useState<RidePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState({
    latitude: 19.1136,
    longitude: 72.8697,
  });
  const [filterDistance, setFilterDistance] = useState(5); // in km
  const navigation = useNavigation();
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    // Get current location and username
    (async () => {
      // Get username from AsyncStorage
      const storedUsername = await AsyncStorage.getItem('username');
      const email = await AsyncStorage.getItem('email');
      setUsername(storedUsername || email?.split('@')[0] || 'User');

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      // Fetch partners after getting location
      fetchNearbyPartners();
    })();
  }, []);
  
  const fetchNearbyPartners = async () => {
    setLoading(true);
    
    try {
      // This would be replaced with your actual API call
      // Example: const response = await fetch(`https://your-api.com/partners?lat=${userLocation.latitude}&lng=${userLocation.longitude}&destination=${destination}&radius=${filterDistance}`);
      
      // Simulating API response with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would come from your backend
      const mockPartners: RidePartner[] = [
        {
          id: '1',
          name: 'Rahul S.',
          distance: '0.3',
          destination: 'Airport',
          gender: 'Male',
          languages: ['Hindi', 'English'],
          eta: '5 mins',
          rating: 4.8
        },
        {
          id: '2',
          name: 'Priya M.',
          distance: '0.7',
          destination: 'Airport',
          gender: 'Female',
          languages: ['English', 'Marathi'],
          eta: '5 mins',
          rating: 4.7
        },
        {
          id: '3',
          name: 'Amit K.',
          distance: '0.9',
          destination: 'Airport',
          gender: 'Male',
          languages: ['Hindi', 'English', 'Gujarati'],
          eta: '7 mins',
          rating: 4.5
        }
      ];
      
      setPartners(mockPartners);
    } catch (error) {
      console.error('Error fetching nearby partners:', error);
      // Handle error - maybe show a toast or alert
    } finally {
      setLoading(false);
    }
  };
  
  const openFilter = () => {
    // This would open a modal or navigate to a filter screen
    // For now, just toggle between distance filters as example
    setFilterDistance(filterDistance === 5 ? 2 : 5);
    fetchNearbyPartners();
  };
  
  const sendInvite = (partnerId: string) => {
    // In a real app, this would send an invitation via your backend
    console.log(`Invite sent to partner ${partnerId}`);
    // Show success message
    alert('Invitation sent successfully!');
  };
  
  const sendMessage = (partnerId: string) => {
    // In a real app, this would navigate to a chat screen
    console.log(`Opening chat with partner ${partnerId}`);
    router.push('/(chat)/chat' as any);
  };
  
  const handlePartnerSelect = (partner: Partner) => {
    setSelectedPartner(partner);
  };
  
  const navigateToMatchmaking = () => {
    const coords = JSON.stringify([userLocation.longitude, userLocation.latitude]);
    router.push({
      pathname: "/(ride)/matchmaking" as any,
      params: { 
        destination: destination, 
        destinationCoords: coords
      }
    });
  };

  const renderPartnerItem = ({ item }: { item: RidePartner }) => (
    <View style={styles.partnerCard}>
      <View style={styles.partnerHeader}>
        <View style={styles.profileSection}>
          <View style={styles.profileImage}>
            <Ionicons name="person" size={28} color="#0066CC" />
          </View>
          <View>
            <Text style={styles.partnerName}>{item.name}</Text>
            <Text style={styles.distanceText}>{item.distance} km away</Text>
          </View>
        </View>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      </View>
      
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="navigate" size={18} color="#666" />
          <Text style={styles.detailText}>Going to: {item.destination}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="person" size={18} color="#666" />
          <Text style={styles.detailText}>Gender: {item.gender}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="chatbubble-ellipses" size={18} color="#666" />
          <Text style={styles.detailText}>Languages: {item.languages.join(', ')}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time" size={18} color="#666" />
          <Text style={styles.detailText}>ETA: {item.eta}</Text>
        </View>
      </View>
      
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.messageButton} 
          onPress={() => sendMessage(item.id)}
        >
          <Ionicons name="chatbubble" size={20} color="#0066CC" />
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.inviteButton}
          onPress={() => sendInvite(item.id)}
        >
          <Text style={styles.inviteButtonText}>Send Invite</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hi, {username}</Text>
      </View>
      
      <View style={styles.realTimeMatchingContainer}>
        <View style={styles.realTimeMatchingContent}>
          <Ionicons name="flash" size={24} color="#FF9800" />
          <View>
            <Text style={styles.realTimeMatchingTitle}>Try Real-Time Matching!</Text>
            <Text style={styles.realTimeMatchingText}>
              Find partners instantly with our live matchmaking system
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.realTimeMatchingButton}
          onPress={navigateToMatchmaking}
        >
          <Text style={styles.realTimeMatchingButtonText}>Match Now</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.filtersContainer}>
        <Text style={styles.filterText}>
          Showing partners within {filterDistance} km for {destination}
        </Text>
        <TouchableOpacity style={styles.filterButton} onPress={openFilter}>
          <Ionicons name="options" size={20} color="#0066CC" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Finding partners near you...</Text>
        </View>
      ) : (
        <FlatList
          data={partners}
          renderItem={renderPartnerItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={60} color="#CCCCCC" />
              <Text style={styles.emptyText}>No partners found nearby</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters or check back later</Text>
            </View>
          }
        />
      )}
    </View>
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
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  realTimeMatchingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  realTimeMatchingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  realTimeMatchingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  realTimeMatchingText: {
    color: '#666',
    marginLeft: 10,
    fontSize: 13,
  },
  realTimeMatchingButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  realTimeMatchingButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  filterText: {
    fontSize: 16,
    color: '#555',
    flex: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  filterButtonText: {
    marginLeft: 4,
    color: '#0066CC',
    fontWeight: '500',
  },
  listContainer: {
    padding: 8,
  },
  partnerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E6F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  distanceText: {
    color: '#666',
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  ratingText: {
    fontWeight: 'bold',
    marginLeft: 4,
  },
  detailsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    color: '#444',
    fontSize: 15,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F0FF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 0.48,
  },
  messageButtonText: {
    color: '#0066CC',
    fontWeight: '600',
    marginLeft: 8,
  },
  inviteButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.48,
  },
  inviteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#555',
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#888',
    marginTop: 8,
  }
});