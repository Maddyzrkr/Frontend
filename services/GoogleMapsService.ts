/**
 * GoogleMapsService.ts
 * Service for interacting with Google Maps APIs for location search, geocoding, and routing
 */

import { GOOGLE_MAPS_API_KEY } from '../utils/config';
import { apiRequest, formatQueryParams } from '../utils/networkUtils';
import { Coordinates, AddressResult, LocationSuggestion } from './LocationService';
import { FARE_CONSTANTS } from '../utils/config';

// Interface for Google Place Autocomplete results
interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

// Interface for Google Place Details results
interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

// Interface for Google Distance Matrix results
interface GoogleDistanceMatrixResult {
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  duration_in_traffic?: {
    text: string;
    value: number; // in seconds with traffic
  };
  status: string;
}

// Interface for route details including traffic
export interface RouteDetails {
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  durationInTraffic?: {
    text: string;
    value: number; // in seconds with traffic
  };
  fare: {
    uber: number;
    ola: number;
  };
}

/**
 * Get place suggestions from Google Place Autocomplete API
 * @param query User input for location search
 * @returns Promise with array of location suggestions
 */
export const getPlaceSuggestions = async (query: string): Promise<LocationSuggestion[]> => {
  if (!query || query.trim().length < 2) {
    console.log('Query too short for place suggestions');
    return [];
  }

  const sanitizedQuery = query.trim();
  
  console.log(`Getting place suggestions for query: "${sanitizedQuery}"`);
  
  // Add specific location context if the query doesn't already contain it
  // This helps for generic location names like "Kandivali" to get more accurate results
  const enhancedQuery = /mumbai|delhi|india/i.test(sanitizedQuery) 
    ? sanitizedQuery 
    : `${sanitizedQuery}, India`;

  // Simplify the parameters to only use what's absolutely necessary
  const params = {
    input: enhancedQuery,
    key: GOOGLE_MAPS_API_KEY,
    language: 'en',
    sessiontoken: generateSessionToken(),
  };

  console.log('Using Google Maps API key:', GOOGLE_MAPS_API_KEY);
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${formatQueryParams(params)}`;
  console.log('Place autocomplete URL:', url);

  try {
    console.log('Sending place suggestions request...');
    const response = await apiRequest<{ predictions: GooglePlacePrediction[], status: string }>(url);
    console.log('Place suggestions response status:', response.status);
    
    if (response.status === 'REQUEST_DENIED') {
      console.error('Google API request denied. Check API key restrictions.');
      return [];
    }
    
    if (response.status === 'INVALID_REQUEST') {
      console.error('Invalid request to Google Places API. Check parameters.');
      return [];
    }
    
    if (response.status === 'OVER_QUERY_LIMIT') {
      console.error('Google Places API query limit exceeded.');
      return [];
    }

    if (!response.predictions || response.predictions.length === 0) {
      console.log('No predictions returned for query:', enhancedQuery);
      // If no results with enhanced query, try with original query
      if (enhancedQuery !== sanitizedQuery) {
        console.log('Trying fallback with original query:', sanitizedQuery);
        const fallbackParams = {
          ...params,
          input: sanitizedQuery,
        };
        
        const fallbackUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${formatQueryParams(fallbackParams)}`;
        console.log('Fallback URL:', fallbackUrl);
        
        const fallbackResponse = await apiRequest<{ predictions: GooglePlacePrediction[], status: string }>(fallbackUrl);
        console.log('Fallback response status:', fallbackResponse.status);
        
        if (!fallbackResponse.predictions) {
          console.log('No results from fallback query');
          return [];
        }
        
        console.log(`Found ${fallbackResponse.predictions.length} results from fallback query`);
        return fallbackResponse.predictions.map(prediction => ({
          id: prediction.place_id,
          name: prediction.structured_formatting.main_text,
          fullAddress: prediction.description,
          coordinates: { latitude: 0, longitude: 0 }, // Will be filled when selected
        }));
      }
      
      return [];
    }

    console.log(`Found ${response.predictions.length} suggestions for query: "${sanitizedQuery}"`);
    return response.predictions.map(prediction => ({
      id: prediction.place_id,
      name: prediction.structured_formatting.main_text,
      fullAddress: prediction.description,
      coordinates: { latitude: 0, longitude: 0 }, // Will be filled when selected
    }));
  } catch (error) {
    console.error('Error getting place suggestions:', error);
    return [];
  }
};

/**
 * Get place details from Google Place Details API
 * @param placeId Google Place ID
 * @returns Promise with place details including coordinates
 */
export const getPlaceDetails = async (placeId: string): Promise<LocationSuggestion | null> => {
  if (!placeId) {
    console.error('Invalid place ID provided');
    return null;
  }

  console.log(`Getting place details for place ID: ${placeId}`);

  const params = {
    place_id: placeId,
    key: GOOGLE_MAPS_API_KEY,
    fields: 'name,formatted_address,geometry,address_component',
    language: 'en',
    sessiontoken: generateSessionToken(), // Use the same session token for billing optimization
  };

  const url = `https://maps.googleapis.com/maps/api/place/details/json?${formatQueryParams(params)}`;
  console.log('Place details URL:', url.replace(new RegExp(GOOGLE_MAPS_API_KEY, 'g'), 'API_KEY_HIDDEN'));

  try {
    console.log('Sending place details request...');
    // Increase the timeout for this request to 20 seconds
    const response = await apiRequest<{ result: GooglePlaceDetails, status: string }>(url, {}, 20000, 2);
    console.log('Place details response status:', response.status);

    if (response.status === 'REQUEST_DENIED') {
      console.error('Google API request denied. Check API key restrictions.');
      return null;
    }
    
    if (response.status === 'INVALID_REQUEST') {
      console.error('Invalid request to Google Place Details API. Check parameters.');
      return null;
    }
    
    if (response.status === 'OVER_QUERY_LIMIT') {
      console.error('Google Place Details API query limit exceeded.');
      return null;
    }
    
    if (!response.result || response.status !== 'OK') {
      console.error('Invalid response from Google Place Details API:', response.status);
      return null;
    }
    
    // Extract city for additional context
    let city = '';
    if (response.result.address_components) {
      for (const component of response.result.address_components) {
        if (component.types.includes('locality') || 
            component.types.includes('administrative_area_level_2')) {
          city = component.long_name;
          break;
        }
      }
    }

    // Create a more user-friendly name with city context if available
    let displayName = response.result.name;
    if (city && !displayName.includes(city)) {
      displayName = `${displayName}, ${city}`;
    }

    const details = {
      id: response.result.place_id,
      name: displayName,
      fullAddress: response.result.formatted_address,
      coordinates: {
        latitude: response.result.geometry.location.lat,
        longitude: response.result.geometry.location.lng,
      },
    };

    console.log(`Successfully retrieved details for "${displayName}"`);
    return details;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
};

/**
 * Generate session token for Google API requests
 * Each session token should be used for a complete set of Place API requests (autocomplete and details)
 * @returns Random session token string
 */
const generateSessionToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Get human-readable address from coordinates
 * @param coordinates Latitude and longitude
 * @returns Promise with address details or null on error
 */
export const getAddressFromCoordinates = async (coordinates: Coordinates): Promise<AddressResult | null> => {
  const params = {
    latlng: `${coordinates.latitude},${coordinates.longitude}`,
    key: GOOGLE_MAPS_API_KEY,
    language: 'en',
  };

  const url = `https://maps.googleapis.com/maps/api/geocode/json?${formatQueryParams(params)}`;
  console.log('Reverse geocoding URL:', url.replace(new RegExp(GOOGLE_MAPS_API_KEY, 'g'), 'API_KEY_HIDDEN'));

  try {
    // Use a longer timeout and more retries for this critical function
    const response = await apiRequest<any>(url, {}, 15000, 3);

    // Handle no results
    if (!response.results || response.results.length === 0) {
      console.warn('No results found for reverse geocoding');
      return null;
    }

    const result = response.results[0];
    
    // Get address components
    const addressComponents = result.address_components || [];
    let city = '';
    let country = '';
    let postalCode = '';
    let streetName = '';
    
    // Extract address components
    addressComponents.forEach((component: any) => {
      const types = component.types || [];
      if (types.includes('locality')) {
        city = component.long_name;
      } else if (types.includes('country')) {
        country = component.long_name;
      } else if (types.includes('postal_code')) {
        postalCode = component.long_name;
      } else if (types.includes('route')) {
        streetName = component.long_name;
      }
    });
    
    // Create a more user-friendly short name
    const shortName = streetName || result.formatted_address.split(',')[0];
    
    return {
      name: shortName,
      fullAddress: result.formatted_address,
      city,
      country,
      postalCode,
    };
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    
    // Return a friendly fallback instead of null
    return {
      name: 'Selected Location',
      fullAddress: `Location (${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)})`,
      city: '',
      country: '',
      postalCode: '',
    };
  }
};

/**
 * Get route with traffic information between origin and destination
 * @param origin Starting coordinates
 * @param destination Ending coordinates
 * @returns Promise with route details or null on error
 */
export const getRouteWithTraffic = async (
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteDetails | null> => {
  console.log(`Getting route with traffic from (${origin.latitude},${origin.longitude}) to (${destination.latitude},${destination.longitude})`);
  
  // Validate input coordinates
  if (!origin || !destination ||
      typeof origin.latitude !== 'number' || typeof origin.longitude !== 'number' ||
      typeof destination.latitude !== 'number' || typeof destination.longitude !== 'number' ||
      isNaN(origin.latitude) || isNaN(origin.longitude) ||
      isNaN(destination.latitude) || isNaN(destination.longitude)) {
    console.error('Invalid coordinates provided to getRouteWithTraffic');
    return null;
  }
  
  const params = {
    origins: `${origin.latitude},${origin.longitude}`,
    destinations: `${destination.latitude},${destination.longitude}`,
    departure_time: 'now', // Use current time for traffic info
    key: GOOGLE_MAPS_API_KEY,
    traffic_model: 'best_guess', // best_guess, pessimistic, or optimistic
  };

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${formatQueryParams(params)}`;
  console.log('Distance Matrix API URL (without key):', url.replace(/key=[^&]+/, 'key=REDACTED'));

  try {
    // Use a shorter timeout for the Distance Matrix API - 8 seconds
    const response = await apiRequest<any>(url, {}, 8000);
    console.log('Distance Matrix API response status:', response.status);
    
    // Check for API errors
    if (response.status === 'REQUEST_DENIED') {
      console.error('Google API request denied. Check API key restrictions.');
      return null;
    }
    
    if (response.status === 'INVALID_REQUEST') {
      console.error('Invalid request to Google Distance Matrix API. Check parameters.');
      return null;
    }
    
    if (response.status === 'OVER_QUERY_LIMIT') {
      console.error('Google Distance Matrix API query limit exceeded.');
      return null;
    }

    if (
      !response.rows ||
      response.rows.length === 0 ||
      !response.rows[0].elements ||
      response.rows[0].elements.length === 0
    ) {
      console.error('No valid route data returned from Distance Matrix API');
      return null;
    }
    
    if (response.rows[0].elements[0].status !== 'OK') {
      console.error('Route status not OK:', response.rows[0].elements[0].status);
      return null;
    }

    const result: GoogleDistanceMatrixResult = response.rows[0].elements[0];
    console.log('Successfully retrieved route data:', JSON.stringify(result));
    
    // Calculate fares based on distance and time in traffic
    const distanceInKm = result.distance.value / 1000; // Convert meters to km
    const durationInMinutes = result.duration_in_traffic
      ? result.duration_in_traffic.value / 60
      : result.duration.value / 60; // Convert seconds to minutes

    // Calculate Uber fare
    const uberFare = calculateUberFare(distanceInKm, durationInMinutes);
    
    // Calculate Ola fare
    const olaFare = calculateOlaFare(distanceInKm, durationInMinutes);
    
    return {
      distance: result.distance,
      duration: result.duration,
      durationInTraffic: result.duration_in_traffic,
      fare: {
        uber: uberFare,
        ola: olaFare,
      },
    };
  } catch (error) {
    console.error('Error getting route with traffic:', error);
    
    // Log additional context for troubleshooting
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.message.includes('timed out') || error.message.includes('timeout')) {
        console.error('The request timed out. Network issues may be preventing the API call.');
      }
    }
    
    return null;
  }
};

/**
 * Calculate Uber fare based on distance, time, and surge pricing
 * @param distanceInKm Distance in kilometers
 * @param durationInMinutes Duration in minutes
 * @param surgeFactor Optional surge pricing factor (default from config)
 * @returns Calculated fare in rupees (INR)
 */
const calculateUberFare = (
  distanceInKm: number,
  durationInMinutes: number,
  surgeFactor: number = FARE_CONSTANTS.UBER.SURGE_MULTIPLIER
): number => {
  const { BASE_FARE, COST_PER_KM, COST_PER_MINUTE, BOOKING_FEE, TAX_RATE } = FARE_CONSTANTS.UBER;
  
  // Calculate fare components
  const distanceFare = COST_PER_KM * distanceInKm;
  const timeFare = COST_PER_MINUTE * durationInMinutes;
  
  // Apply surge pricing to the variable components
  const variableFare = (distanceFare + timeFare) * surgeFactor;
  
  // Calculate pre-tax fare
  const preTaxFare = BASE_FARE + variableFare + BOOKING_FEE;
  
  // Apply tax
  const totalFare = preTaxFare * (1 + TAX_RATE);
  
  // Round to nearest rupee
  return Math.round(totalFare);
};

/**
 * Calculate Ola fare based on distance, time, and peak pricing
 * @param distanceInKm Distance in kilometers
 * @param durationInMinutes Duration in minutes
 * @param peakFactor Optional peak pricing factor (default from config)
 * @returns Calculated fare in rupees (INR)
 */
const calculateOlaFare = (
  distanceInKm: number,
  durationInMinutes: number,
  peakFactor: number = FARE_CONSTANTS.OLA.PEAK_PRICING_MULTIPLIER
): number => {
  const { BASE_FARE, COST_PER_KM, COST_PER_MINUTE, ACCESS_FEE, TAX_RATE } = FARE_CONSTANTS.OLA;
  
  // Calculate fare components
  const distanceFare = COST_PER_KM * distanceInKm;
  const timeFare = COST_PER_MINUTE * durationInMinutes;
  
  // Apply peak pricing to the variable components
  const variableFare = (distanceFare + timeFare) * peakFactor;
  
  // Calculate pre-tax fare
  const preTaxFare = BASE_FARE + variableFare + ACCESS_FEE;
  
  // Apply tax
  const totalFare = preTaxFare * (1 + TAX_RATE);
  
  // Round to nearest rupee
  return Math.round(totalFare);
};

export default {
  getPlaceSuggestions,
  getPlaceDetails,
  getAddressFromCoordinates,
  getRouteWithTraffic
}; 