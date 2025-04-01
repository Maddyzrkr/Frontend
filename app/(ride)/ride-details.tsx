import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Image
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.106:5000";

interface RideDetails {
  id: string;
  driver: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
  };
  origin: {
    address: string;
    coordinates: [number, number];
  };
  destination: {
    address: string;
    coordinates: [number, number];
  };
  departureTime: string;
  seats: number;
  price: number;
  distance: number;
  duration: number;
}

export default function RideDetailsScreen() {
  const { rideId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [rideDetails, setRideDetails] = useState<RideDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRideDetails();
  }, [rideId]);

  const fetchRideDetails = async () => {
    if (!rideId) {
      setError('No ride ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/rides/${rideId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error fetching ride details: ${response.status}`);
      }

      const data = await response.json();
      setRideDetails(data);
    } catch (error) {
      console.error('Error fetching ride details:', error);
      setError('Failed to load ride details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRide = async () => {
    if (!rideDetails) return;

    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/rides/${rideId}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to request ride');
      }

      Alert.alert(
        'Request Sent!',
        'Your ride request has been sent to the driver. You will be notified when they respond.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error requesting ride:', error);
      Alert.alert('Error', 'Failed to request ride. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !rideDetails) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
        <Text style={styles.errorText}>{error || 'Could not find ride details'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ride Details</Text>
        </View>

        <View style={styles.driverSection}>
          <View style={styles.driverInfo}>
            <Image 
              source={rideDetails.driver.avatar 
                ? { uri: rideDetails.driver.avatar } 
                : require('../../assets/images/default-avatar.png')}
              style={styles.driverAvatar}
            />
            <View>
              <Text style={styles.driverName}>{rideDetails.driver.name}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {rideDetails.driver.rating ? rideDetails.driver.rating.toFixed(1) : 'New driver'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.rideInfoCard}>
          <View style={styles.locationInfo}>
            <View style={styles.locationRow}>
              <View style={styles.locationIconContainer}>
                <View style={[styles.locationDot, styles.startDot]} />
              </View>
              <Text style={styles.locationText}>{rideDetails.origin.address}</Text>
            </View>
            
            <View style={styles.verticalLine} />
            
            <View style={styles.locationRow}>
              <View style={styles.locationIconContainer}>
                <View style={[styles.locationDot, styles.endDot]} />
              </View>
              <Text style={styles.locationText}>{rideDetails.destination.address}</Text>
            </View>
          </View>

          <View style={styles.rideDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={20} color="#0066CC" />
              <Text style={styles.detailText}>
                {new Date(rideDetails.departureTime).toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Ionicons name="car-outline" size={20} color="#0066CC" />
              <Text style={styles.detailText}>{rideDetails.seats} seats available</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={20} color="#0066CC" />
              <Text style={styles.detailText}>${rideDetails.price.toFixed(2)}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={20} color="#0066CC" />
              <Text style={styles.detailText}>
                {Math.floor(rideDetails.duration / 60)} min ({(rideDetails.distance / 1000).toFixed(1)} km)
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.requestButton} onPress={handleRequestRide}>
          <Text style={styles.requestButtonText}>Request Ride</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  driverSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginHorizontal: 15,
    marginTop: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  rideInfoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  locationInfo: {
    marginBottom: 15,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  locationIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  startDot: {
    backgroundColor: '#4CAF50',
  },
  endDot: {
    backgroundColor: '#F44336',
  },
  verticalLine: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginLeft: 12,
  },
  locationText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  rideDetails: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  requestButton: {
    backgroundColor: '#0066CC',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  requestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 