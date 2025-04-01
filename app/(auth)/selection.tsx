// app/(auth)/selection.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// Location service import (still needed for background functionality)
import { getAddressFromCoordinates, LocationSuggestion } from '../../services/LocationService';

// Timeout for location request in milliseconds
const LOCATION_TIMEOUT = 15000;

const Selection = () => {
  const [userLocation, setUserLocation] = useState({
    latitude: 19.1136, // Mumbai default
    longitude: 72.8697,
  });
  const [destination, setDestination] = useState<LocationSuggestion | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const locationRequestRef = useRef<any>(null);

  // Get current location function - defined outside useEffect so it can be called from elsewhere
  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Denied',
          'Please enable location services for a better experience.'
        );
        setIsLoadingLocation(false);
        return;
      }

      console.log('Getting current location...');
      
      // Create a promise for location request
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      // Set up timeout to cancel location request if it takes too long
      const timeoutPromise = new Promise((_, reject) => {
        locationRequestRef.current = setTimeout(() => {
          reject(new Error('Location request timed out'));
        }, LOCATION_TIMEOUT);
      });
      
      // Race between location request and timeout
      const position = await Promise.race([
        locationPromise,
        timeoutPromise,
      ]) as Location.LocationObject;
      
      // Clear the timeout if location was obtained
      if (locationRequestRef.current) {
        clearTimeout(locationRequestRef.current);
        locationRequestRef.current = null;
      }
      
      const { latitude, longitude } = position.coords;
      console.log('Location obtained:', latitude, longitude);
      
      setUserLocation({
        latitude,
        longitude,
      });
      
      // Get address from coordinates
      try {
        const address = await getAddressFromCoordinates({
          latitude,
          longitude,
        });
        
        if (address) {
          setCurrentAddress(address.name);
        }
      } catch (addrError) {
        console.warn('Error getting address:', addrError);
      }
    } catch (error: any) {
      console.error('Error getting location:', error);
      
      if (error.message && error.message.includes('timed out')) {
        Alert.alert(
          'Location Request Timeout',
          'We were unable to get your current location. Please check your location services and try again.'
        );
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Get current location on component mount
  useEffect(() => {
    getCurrentLocation();
    
    return () => {
      // Clean up timeout if component unmounts
      if (locationRequestRef.current) {
        clearTimeout(locationRequestRef.current);
        locationRequestRef.current = null;
      }
    };
  }, []);

  const handleSelectionPress = async (mode: 'booking' | 'seeking') => {
    try {
      // If there's a current address from user location and no destination, prefill current location
      if (currentAddress && !destination) {
        setDestination({
          id: 'current-location',
          name: currentAddress,
          fullAddress: currentAddress,
          coordinates: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
        });
      }
      
      // Store the user's selection mode
      await AsyncStorage.setItem('userMode', mode);
      
      // Store destination if set
      if (destination) {
        await AsyncStorage.setItem('selectedDestination', JSON.stringify({
          name: destination.name,
          latitude: destination.coordinates.latitude,
          longitude: destination.coordinates.longitude,
        }));
      }
      
      // Navigate to the appropriate screen
      if (mode === 'booking') {
        // User wants to book a ride
        router.replace('/(tabs)/main');
      } else {
        // User is seeking to join a ride
        router.replace('/nearby');
      }
    } catch (error) {
      console.error('Error saving user mode:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>How do you want to travel today?</Text>
          <Text style={styles.subtitle}>Choose an option to continue</Text>
        </View>
        
        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => handleSelectionPress('booking')}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="car" size={40} color="#0066CC" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Book a Ride</Text>
              <Text style={styles.optionDescription}>
                Find and book a ride with popular ride providers like Uber and Ola
              </Text>
            </View>
            <View style={styles.arrow}>
              <Ionicons name="arrow-forward" size={24} color="#0066CC" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.optionCard, styles.seekingCard]}
            onPress={() => handleSelectionPress('seeking')}
          >
            <View style={[styles.iconContainer, styles.seekingIcon]}>
              <Ionicons name="people" size={40} color="#28a745" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Join a Ride</Text>
              <Text style={styles.optionDescription}>
                Find people traveling to your destination and join their ride
              </Text>
            </View>
            <View style={styles.arrow}>
              <Ionicons name="arrow-forward" size={24} color="#28a745" />
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You can always change your mode later
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 204, 0.2)',
  },
  seekingCard: {
    borderColor: 'rgba(40, 167, 69, 0.2)',
  },
  iconContainer: {
    backgroundColor: '#E6F0FF',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  seekingIcon: {
    backgroundColor: '#e6f5eb',
  },
  optionTextContainer: {
    flex: 1,
    paddingRight: 30,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 4,
  },
  arrow: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -12,
  },
  footer: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#888',
  },
});

export default Selection; 