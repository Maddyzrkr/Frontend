/**
 * Map Utilities
 * 
 * This file contains shared functions for working with maps, routes, and location data.
 */
import { GOOGLE_MAPS_API_KEY } from './config';
import { LocationSuggestion } from '../services/LocationService';
import { getPlaceSuggestions, getPlaceDetails } from '../services/GoogleMapsService';

/**
 * Interface for route coordinates
 */
export interface RouteCoordinates {
  type: string;
  coordinates: [number, number][];
}

/**
 * Interface for individual route steps
 */
export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

/**
 * Interface for route data returned from routing service
 */
export interface RouteData {
  geometry: RouteCoordinates;
  duration: number; // in seconds
  distance: number; // in meters
  steps: RouteStep[]; // Steps for directions
}

/**
 * Search for locations using Google Places API
 * @param query Search query string
 * @returns Promise with location results
 */
export const searchLocations = async (query: string): Promise<LocationSuggestion[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    return await getPlaceSuggestions(query);
  } catch (error) {
    console.error('Error searching locations:', error);
    return [];
  }
};

/**
 * Get location details including coordinates
 * @param placeId Google Place ID
 * @returns Promise with location details
 */
export const getLocationDetails = async (placeId: string): Promise<LocationSuggestion | null> => {
  if (!placeId) {
    return null;
  }

  try {
    return await getPlaceDetails(placeId);
  } catch (error) {
    console.error('Error getting location details:', error);
    return null;
  }
};

/**
 * Get a route between two points using Google Directions API
 */
export const getRoute = async (startCoord: [number, number], endCoord: [number, number]): Promise<RouteData | null> => {
  try {
    // Use Google Directions API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${startCoord[1]},${startCoord[0]}&destination=${endCoord[1]},${endCoord[0]}&key=${GOOGLE_MAPS_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      // Process Google Directions response
      const route = data.routes[0];
      
      // Decode Google's polyline format
      const points = decodePolyline(route.overview_polyline.points);
      
      // Process steps
      const processedSteps = route.legs[0].steps.map((step: any) => ({
        instruction: stripHtmlTags(step.html_instructions),
        distance: step.distance.value,
        duration: step.duration.value
      }));
      
      return {
        geometry: {
          type: 'LineString',
          coordinates: points.map(point => [point[1], point[0]]) // Convert to [lng, lat] format
        },
        duration: route.legs[0].duration.value,
        distance: route.legs[0].distance.value,
        steps: processedSteps
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
};

/**
 * Decode Google Maps polyline format
 * @param encoded Encoded polyline string
 * @returns Array of [lat, lng] coordinates
 */
function decodePolyline(encoded: string): number[][] {
  const points: number[][] = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

/**
 * Remove HTML tags from a string
 * @param html String with HTML tags
 * @returns Cleaned string
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Format distance in a human-readable format
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
};

/**
 * Format duration in a human-readable format
 */
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hr ${remainingMinutes > 0 ? remainingMinutes + ' min' : ''}`;
};

/**
 * Calculate the bounding box for a set of coordinates
 */
export const calculateBoundingBox = (coordinates: [number, number][]): {
  ne: [number, number];
  sw: [number, number];
} => {
  if (!coordinates.length) {
    throw new Error('Empty coordinates array');
  }
  
  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];
  
  coordinates.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });
  
  // Add padding
  const lngPadding = (maxLng - minLng) * 0.1 || 0.01;
  const latPadding = (maxLat - minLat) * 0.1 || 0.01;
  
  return {
    ne: [maxLng + lngPadding, maxLat + latPadding],
    sw: [minLng - lngPadding, minLat - latPadding]
  };
};

// Add default export with all util functions
export default {
  searchLocations,
  getLocationDetails,
  getRoute,
  formatDistance,
  formatDuration,
  calculateBoundingBox
}; 