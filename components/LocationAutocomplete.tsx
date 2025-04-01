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
  TouchableWithoutFeedback,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { getLocationSuggestions, LocationSuggestion } from '../services/LocationService';

interface LocationAutocompleteProps {
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
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
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
}) => {
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [touchedInput, setTouchedInput] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch suggestions when search query changes
  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only search if we have 2 or more characters (more lenient)
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Add a debounce to prevent too many API calls
    timeoutRef.current = setTimeout(async () => {
      try {
        const results = await getLocationSuggestions(searchQuery);
        setSuggestions(results);
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 400); // Slightly faster response

    // Cleanup the timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Update local state when value prop changes
  useEffect(() => {
    if (value !== searchQuery && !touchedInput) {
      setSearchQuery(value || '');
    }
  }, [value, touchedInput]);

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
  }, [isFocused]);

  const handleInputFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
    setTouchedInput(true);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // Add a longer delay before hiding suggestions to allow for selection
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
    if (onChangeText) {
      onChangeText(text);
    }
  };

  const handleLocationSelect = (location: LocationSuggestion) => {
    setSearchQuery(location.name);
    setShowSuggestions(false);
    Keyboard.dismiss();
    onLocationSelect(location);
  };

  const handleCurrentLocationPress = () => {
    if (onRequestCurrentLocation) {
      onRequestCurrentLocation();
      setShowSuggestions(false);
      Keyboard.dismiss();
    }
  };

  const handleClearText = () => {
    setSearchQuery('');
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
        <Text style={styles.suggestionSubtitle}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  // Calculate the maximum height for suggestions list based on the number of items
  const getMaxHeight = () => {
    const itemHeight = 60; // Approximate height of each suggestion item
    const maxItems = 4; // Maximum number of items to show before scrolling
    const currentLocationHeight = showCurrentLocation ? itemHeight : 0;
    const loadingHeight = 50; // Height of the loading container
    
    const totalSuggestions = suggestions.length;
    
    if (isLoading) {
      return loadingHeight + currentLocationHeight;
    }
    
    if (totalSuggestions === 0 && searchQuery.trim().length >= 2) {
      return 50 + currentLocationHeight; // Height for "No results" message
    }
    
    return Math.min(totalSuggestions, maxItems) * itemHeight + currentLocationHeight;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.inputContainer, inputStyle]}>
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
      </View>

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
              <Text style={styles.noResultsText}>No locations found</Text>
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
  searchIcon: {
    marginRight: 8,
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
    zIndex: 20,
  },
  suggestionsListContent: {
    flexGrow: 1,
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
    color: '#333',
    fontWeight: '500',
  },
  suggestionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  noResultsContainer: {
    padding: 15,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#666',
  },
  currentLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
  },
  currentLocationText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
  },
});

export default LocationAutocomplete; 