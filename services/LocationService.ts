/**
 * LocationService.ts
 * A service for handling geocoding and location-related functionality
 * using the Nominatim API (OpenStreetMap).
 */

import { apiRequest, formatQueryParams } from '../utils/networkUtils';

// Interface for coordinates
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Interface for the address result from Nominatim
export interface AddressResult {
  name: string;
  fullAddress: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

// Interface for search result
export interface LocationSearchResult {
  id: string;
  name: string;
  fullAddress: string;
  coordinates: Coordinates;
  type?: string;
}

// Interface for providing location suggestion
export interface LocationSuggestion {
  id: string;
  name: string;
  fullAddress: string;
  coordinates: Coordinates;
  distance?: number;
}

// Define the Nominatim API response format
interface NominatimSearchResult {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    state?: string;
    country?: string;
    postcode?: string;
    [key: string]: string | undefined;
  };
  [key: string]: any;
}

// Base URL for Nominatim API
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Search for locations using Nominatim API
 * @param query Search query string
 * @returns Promise with an array of LocationSearchResult
 */
export const searchLocations = async (query: string): Promise<LocationSearchResult[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const sanitizedQuery = query.trim();
  const params = {
    q: sanitizedQuery,
    format: 'json',
    addressdetails: 1,
    limit: 10,
  };

  const url = `${NOMINATIM_BASE_URL}/search?${formatQueryParams(params)}`;
  
  try {
    const response = await apiRequest<NominatimSearchResult[]>(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'MatchMyRide/1.0',
        'Accept-Language': 'en-US,en',
      },
    });

    // Map the response to our expected format
    return response.map((item: NominatimSearchResult) => ({
      id: item.place_id.toString(),
      name: item.display_name.split(',')[0],
      fullAddress: item.display_name,
      coordinates: {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      },
      type: item.type,
    }));
  } catch (error) {
    console.error('Error searching locations:', error);
    throw error;
  }
};

/**
 * Get address details from coordinates (reverse geocoding)
 * @param coordinates Latitude and longitude
 * @returns Promise with address information
 */
export const getAddressFromCoordinates = async (coordinates: Coordinates): Promise<AddressResult | null> => {
  const params = {
    lat: coordinates.latitude,
    lon: coordinates.longitude,
    format: 'json',
    addressdetails: 1,
    zoom: 18,
  };

  const url = `${NOMINATIM_BASE_URL}/reverse?${formatQueryParams(params)}`;
  
  try {
    const response = await apiRequest<any>(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'MatchMyRide/1.0',
        'Accept-Language': 'en-US,en',
      },
    });

    // Handle no results
    if (!response || !response.display_name) {
      return null;
    }

    // Extract address components
    const address = response.address || {};
    const displayName = response.display_name || '';
    const nameParts = displayName.split(',');
    
    return {
      name: nameParts[0] || displayName,
      fullAddress: displayName,
      city: address.city || address.town || address.village || address.hamlet,
      country: address.country,
      postalCode: address.postcode,
    };
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return null; // Return null on error instead of throwing
  }
};

/**
 * Get location suggestions based on partial input
 * @param query User input text
 * @returns Promise with array of location suggestions
 */
export const getLocationSuggestions = async (query: string): Promise<LocationSuggestion[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const results = await searchLocations(query);
    
    return results.map((item) => ({
      id: item.id,
      name: item.name,
      fullAddress: item.fullAddress,
      coordinates: item.coordinates,
    }));
  } catch (error) {
    console.error('Error getting location suggestions:', error);
    return []; // Return empty array on error instead of throwing
  }
};

/**
 * Calculate distance between two geographical points in kilometers
 * @param coords1 First coordinates
 * @param coords2 Second coordinates
 * @returns Distance in kilometers
 */
export const calculateDistance = (coords1: Coordinates, coords2: Coordinates): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  
  const R = 6371; // Earth radius in kilometers
  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coords1.latitude)) *
      Math.cos(toRad(coords2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default {
  searchLocations,
  getAddressFromCoordinates,
  getLocationSuggestions,
  calculateDistance
}; 