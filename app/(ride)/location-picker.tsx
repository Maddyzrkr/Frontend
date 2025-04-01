import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPlaceSuggestions, getPlaceDetails } from '../../services/GoogleMapsService';
import { LocationSuggestion } from '../../services/LocationService';
import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY } from '../../utils/config';
import debounce from 'lodash/debounce';

// Interface for recent location storage
interface SavedLocation {
  id: string;
  name: string;
  fullAddress: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timestamp: number;
}

export default function LocationPicker() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; text?: string }>();
  console.log('LocationPicker params:', params);
  
  const [searchText, setSearchText] = useState(params.text || '');
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentLocations, setRecentLocations] = useState<SavedLocation[]>([]);
  
  const locationType = params.type || 'pickup'; // 'pickup' or 'destination'
  console.log('LocationPicker type:', locationType);
  
  // Add a function to get current location
  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please grant location permission to use this feature.'
        );
        setLoading(false);
        return;
      }
      
      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      // Get the address using Google reverse geocoding
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        
        // Create a location object from current position
        const locationData: SavedLocation = {
          id: 'current-location',
          name: result.formatted_address.split(',')[0],
          fullAddress: result.formatted_address,
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          },
          timestamp: Date.now()
        };
        
        // Save the selected location and return to the main screen
        await saveAndReturn(locationData);
      } else {
        Alert.alert('Error', 'Could not determine your current address.');
      }
      
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not get your current location.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load recent locations from storage
  useEffect(() => {
    console.log('Loading recent locations');
    const loadRecentLocations = async () => {
      try {
        const savedLocations = await AsyncStorage.getItem('recentLocations');
        if (savedLocations) {
          const parsedLocations = JSON.parse(savedLocations);
          console.log('Loaded recent locations:', parsedLocations.length);
          setRecentLocations(parsedLocations);
        } else {
          console.log('No recent locations found');
        }
      } catch (error) {
        console.error('Error loading recent locations:', error);
      }
    };
    
    loadRecentLocations();
  }, []);
  
  // Create a debounced search function
  const debouncedSearch = useCallback(
    debounce(async (text: string) => {
      if (text.trim().length > 2) {
        setLoading(true);
        try {
          console.log('Getting place suggestions for query:', text);
          const suggestions = await getPlaceSuggestions(text);
          setResults(suggestions);
        } catch (error) {
          console.error('Error getting place suggestions:', error);
          Alert.alert('Error', 'Failed to get location suggestions');
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300),
    []
  );
  
  // Perform search when user types using Google Places API
  useEffect(() => {
    debouncedSearch(searchText);
    return () => debouncedSearch.cancel();
  }, [searchText, debouncedSearch]);
  
  // Save and return function
  const saveAndReturn = async (location: SavedLocation) => {
    try {
      // Save to recent locations
      const newRecentLocations = [
        location, 
        ...recentLocations.filter(item => item.id !== location.id)
      ].slice(0, 5); // Keep only 5 recent locations
      
      await AsyncStorage.setItem('recentLocations', JSON.stringify(newRecentLocations));
      console.log('Saved to recent locations');
      
      // Save the selected location and type
      await AsyncStorage.setItem('selectedLocation', JSON.stringify(location));
      await AsyncStorage.setItem('selectedLocationType', locationType);
      
      // Return to previous screen
      router.back();
    } catch (error) {
      console.error('Error saving location:', error);
      Alert.alert('Error', 'Could not save location. Please try again.');
    }
  };
  
  // Handle location selection with detailed validation
  const handleSelectLocation = async (location: LocationSuggestion) => {
    console.log('handleSelectLocation called with:', location);
    setLoading(true);
    
    try {
      // Get detailed information including accurate coordinates
      const placeDetails = await getPlaceDetails(location.id);
      
      if (!placeDetails) {
        throw new Error('Could not get location details');
      }
      
      // Create a SavedLocation object with the details
      const savedLocation: SavedLocation = {
        id: placeDetails.id,
        name: placeDetails.name,
        fullAddress: placeDetails.fullAddress,
        coordinates: placeDetails.coordinates,
        timestamp: Date.now()
      };
      
      await saveAndReturn(savedLocation);
    } catch (error) {
      console.error('Error processing location:', error);
      Alert.alert('Error', 'Could not validate this location. Please try another one.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle recent location selection
  const handleSelectRecentLocation = (location: SavedLocation) => {
    // Update the timestamp and save
    const updatedLocation = { ...location, timestamp: Date.now() };
    saveAndReturn(updatedLocation);
  };
  
  // Clear search and return to previous screen
  const handleCancel = () => {
    router.back();
  };

  const renderLocationItem = ({ item }: { item: LocationSuggestion }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleSelectLocation(item)}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons 
          name={locationType === 'pickup' ? "trip-origin" : "place"}
          size={24} 
          color={locationType === 'pickup' ? "#4CAF50" : "#F44336"} 
        />
      </View>
      <View style={styles.locationTextContainer}>
        <Text style={styles.locationName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.locationAddress} numberOfLines={1}>{item.fullAddress}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderRecentLocationItem = ({ item }: { item: SavedLocation }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleSelectRecentLocation(item)}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons name="history" size={24} color="#757575" />
      </View>
      <View style={styles.locationTextContainer}>
        <Text style={styles.locationName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.locationAddress} numberOfLines={1}>{item.fullAddress}</Text>
      </View>
    </TouchableOpacity>
  );

  // Render header for sections
  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.title}>
          {locationType === 'pickup' ? 'Enter Pickup Location' : 'Enter Destination'}
        </Text>
      </View>
      
      <View style={styles.searchBox}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder={locationType === 'pickup' ? "Where from?" : "Where to?"}
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
            clearButtonMode="while-editing"
          />
          {loading && <ActivityIndicator size="small" color="#0066CC" />}
        </View>
      </View>
      
      {locationType === 'pickup' && (
        <TouchableOpacity 
          style={styles.currentLocationButton}
          onPress={getCurrentLocation}
        >
          <View style={styles.currentLocationIconContainer}>
            <MaterialIcons name="my-location" size={20} color="#0066CC" />
          </View>
          <Text style={styles.currentLocationText}>Use current location</Text>
          <MaterialIcons name="chevron-right" size={20} color="#757575" style={styles.arrowIcon} />
        </TouchableOpacity>
      )}
      
      {loading && results.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Finding locations...</Text>
        </View>
      )}
      
      {results.length > 0 ? (
        <>
          {renderSectionHeader("SEARCH RESULTS")}
          <FlatList
            data={results}
            keyExtractor={(item) => `search-${item.id}`}
            renderItem={renderLocationItem}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : recentLocations.length > 0 ? (
        <>
          {renderSectionHeader("RECENT LOCATIONS")}
          <FlatList
            data={recentLocations}
            keyExtractor={(item) => `recent-${item.id}`}
            renderItem={renderRecentLocationItem}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={40} color="#CCCCCC" />
          <Text style={styles.emptyText}>Search for a location or select "Use current location"</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 15,
    color: '#333333',
  },
  searchBox: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 45,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    height: '100%',
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  currentLocationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  currentLocationText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  arrowIcon: {
    marginLeft: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 3,
  },
  locationAddress: {
    fontSize: 14,
    color: '#757575',
  },
  sectionHeader: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
  },
  list: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 10,
    color: '#666666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 20,
    color: '#999999',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
