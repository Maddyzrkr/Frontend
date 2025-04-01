import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  ViewStyle,
  Platform,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { getPlaceSuggestions, getPlaceDetails } from '../services/GoogleMapsService';
import { LocationSuggestion } from '../services/LocationService';

interface GooglePlacesAutocompleteProps {
  placeholder?: string;
  value: string;
  onLocationSelect: (location: LocationSuggestion) => void;
  onChangeText?: (text: string) => void;
  style?: ViewStyle;
  inputStyle?: ViewStyle;
  listStyle?: ViewStyle;
  showCurrentLocation?: boolean;
  onRequestCurrentLocation?: () => void;
  autoFocus?: boolean;
  isDestination?: boolean;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  placeholder = 'Search for a location',
  value,
  onLocationSelect,
  onChangeText,
  style,
  inputStyle,
  listStyle,
  showCurrentLocation = false,
  onRequestCurrentLocation,
  autoFocus = false,
  isDestination = false,
}) => {
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [touchedInput, setTouchedInput] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidLocation, setIsValidLocation] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const locationRef = useRef<LocationSuggestion | null>(null);

  // Auto focus the input if autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 500);
    }
  }, [autoFocus]);

  // Reset validation state when input changes
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setIsValidLocation(false);
      setValidationError(null);
    }
  }, [searchQuery]);

  // Update local state when value prop changes
  useEffect(() => {
    if (value !== searchQuery && !touchedInput) {
      setSearchQuery(value || '');
      // If value is present but different from current query, validate it
      if (value && value.trim().length > 0) {
        validateLocationOnBlur(value);
      }
    }
  }, [value, touchedInput]);

  // Fetch suggestions when search query changes with improved error handling
  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only search if we have 2 or more characters
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setValidationError(null);
      return;
    }

    setIsLoading(true);
    setValidationError(null);

    // Add a debounce to prevent too many API calls
    timeoutRef.current = setTimeout(async () => {
      try {
        const results = await getPlaceSuggestions(searchQuery);
        setSuggestions(results);
        
        // If no suggestions found, show a validation error
        if (results.length === 0) {
          setValidationError(`No locations found for "${searchQuery}"`);
          setIsValidLocation(false);
        } else {
          setValidationError(null);
        }
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
        setSuggestions([]);
        setValidationError('Error fetching location suggestions');
        setIsValidLocation(false);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    // Cleanup the timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Keyboard listeners to handle keyboard hiding
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Don't hide suggestions immediately to allow for selection
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
        }
        blurTimeoutRef.current = setTimeout(() => {
          if (!isFocused) {
            setShowSuggestions(false);
            // When keyboard hides and no valid location is selected, validate
            if (searchQuery.trim().length > 0 && !isValidLocation) {
              validateLocationOnBlur(searchQuery);
            }
          }
        }, 300);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, [isFocused, isValidLocation, searchQuery]);

  const validateLocationOnBlur = async (query: string) => {
    if (query.trim().length < 2) {
      setValidationError(null);
      setIsValidLocation(false);
      return;
    }

    setIsLoading(true);
    setValidationError(null);

    try {
      // Try to get suggestions for the query
      const results = await getPlaceSuggestions(query);
      
      if (results.length > 0) {
        // Get details for the first suggestion to fully validate
        const placeDetails = await getPlaceDetails(results[0].id);
        
        if (placeDetails && placeDetails.coordinates.latitude !== 0) {
          setIsValidLocation(true);
          locationRef.current = placeDetails;
          setSearchQuery(placeDetails.name);
          setValidationError(null);
          
          // Automatically select this valid location
          if (onChangeText) {
            onChangeText(placeDetails.name);
          }
          onLocationSelect(placeDetails);
        } else {
          setIsValidLocation(false);
          setValidationError('Could not validate this location');
        }
      } else {
        setIsValidLocation(false);
        setValidationError(`"${query}" is not a valid location`);
      }
    } catch (error) {
      console.error('Error validating location:', error);
      setIsValidLocation(false);
      setValidationError('Error validating location');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
    setTouchedInput(true);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    
    // Validate location on blur
    if (searchQuery.trim().length > 0 && !isValidLocation) {
      validateLocationOnBlur(searchQuery);
    }
    
    // Add a delay before hiding suggestions to allow for selection
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      if (!isFocused) {
        setShowSuggestions(false);
      }
    }, 300);
  };

  const handleChangeText = (text: string) => {
    setSearchQuery(text);
    setShowSuggestions(true);
    
    // Reset validation status when text changes
    if (locationRef.current && locationRef.current.name !== text) {
      setIsValidLocation(false);
    }
    
    if (onChangeText) {
      onChangeText(text);
    }
  };

  const handleLocationSelect = async (location: LocationSuggestion) => {
    // For Google Places, we need to get the coordinates from the place_id
    setIsLoading(true);
    try {
      const placeDetails = await getPlaceDetails(location.id);
      if (placeDetails && placeDetails.coordinates.latitude !== 0) {
        // We have valid coordinates
        setSearchQuery(placeDetails.name);
        setShowSuggestions(false);
        Keyboard.dismiss();
        setIsValidLocation(true);
        locationRef.current = placeDetails;
        onLocationSelect(placeDetails);
      } else {
        // If we couldn't get valid coordinates, try again with the original location
        setSearchQuery(location.name);
        setShowSuggestions(false);
        Keyboard.dismiss();
        setIsValidLocation(false);
        setValidationError('Could not get coordinates for this location');
        onLocationSelect(location);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      // Fall back to the original location
      setSearchQuery(location.name);
      setShowSuggestions(false);
      Keyboard.dismiss();
      setIsValidLocation(false);
      setValidationError('Error getting location details');
      onLocationSelect(location);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCurrentLocationPress = () => {
    if (onRequestCurrentLocation) {
      onRequestCurrentLocation();
      setShowSuggestions(false);
      Keyboard.dismiss();
      setIsValidLocation(true);
      setValidationError(null);
    }
  };

  const handleClearText = () => {
    setSearchQuery('');
    setIsValidLocation(false);
    setValidationError(null);
    locationRef.current = null;
    if (onChangeText) {
      onChangeText('');
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const renderSuggestionItem = ({ item }: { item: LocationSuggestion }) => (
    <TouchableOpacity 
      style={styles.suggestionItem} 
      onPress={() => handleLocationSelect(item)}
      activeOpacity={0.7}
    >
      <Ionicons name="location" size={20} color="#0066CC" style={styles.locationIcon} />
      <View>
        <Text style={styles.suggestionTitle}>{item.name}</Text>
        <Text style={styles.suggestionSubtitle}>{item.fullAddress}</Text>
      </View>
    </TouchableOpacity>
  );

  // Calculate the maximum height for suggestions list based on the number of items
  const getMaxHeight = () => {
    const itemHeight = 60; // Approximate height of each suggestion item
    const maxItems = 4; // Maximum number of items to show before scrolling
    const currentLocationHeight = showCurrentLocation ? itemHeight : 0;
    const loadingHeight = 50; // Height of the loading container
    const errorHeight = validationError ? 50 : 0; // Height for error message
    
    const totalSuggestions = suggestions.length;
    
    if (isLoading) {
      return loadingHeight + currentLocationHeight;
    }
    
    if (totalSuggestions === 0 && searchQuery.trim().length >= 2) {
      return 50 + currentLocationHeight + errorHeight; // Height for "No results" message
    }
    
    return Math.min(totalSuggestions, maxItems) * itemHeight + currentLocationHeight + errorHeight;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[
        styles.inputContainer, 
        inputStyle,
        !isValidLocation && searchQuery.length > 0 && styles.invalidInput
      ]}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          value={searchQuery}
          onChangeText={handleChangeText}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearText}
          >
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
        {isValidLocation && searchQuery.length > 0 && (
          <Ionicons name="checkmark-circle" size={18} color="green" style={styles.validIcon} />
        )}
      </View>

      {validationError && !isLoading && !showSuggestions && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{validationError}</Text>
        </View>
      )}

      {showSuggestions && (
        <View 
          style={[
            styles.suggestionsContainer, 
            listStyle,
            { maxHeight: getMaxHeight() }
          ]}
        >
          {showCurrentLocation && (
            <TouchableOpacity
              style={styles.currentLocationItem}
              onPress={handleCurrentLocationPress}
              activeOpacity={0.7}
            >
              <Ionicons name="locate" size={20} color="#0066CC" style={styles.locationIcon} />
              <Text style={styles.currentLocationText}>Use current location</Text>
            </TouchableOpacity>
          )}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0066CC" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : suggestions.length > 0 ? (
            <FlatList
              data={suggestions}
              renderItem={renderSuggestionItem}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={suggestions.length > 4}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.suggestionsListContent}
            />
          ) : searchQuery.trim().length >= 2 ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                No locations found for "{searchQuery}"
              </Text>
              <Text style={styles.noResultsHint}>
                Try a more specific search or check spelling
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 10,
    height: 48,
  },
  invalidInput: {
    borderColor: '#f44336',
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  validIcon: {
    marginLeft: 4,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 6,
  },
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    overflow: 'hidden',
    zIndex: 20,
  },
  suggestionsListContent: {
    paddingVertical: 0,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationIcon: {
    marginRight: 10,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  currentLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f9f9f9',
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0066CC',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  noResultsContainer: {
    padding: 12,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  noResultsHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
  },
});

export default GooglePlacesAutocomplete; 