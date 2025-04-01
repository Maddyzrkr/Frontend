/**
 * Application configuration settings
 * Contains API keys, endpoints, and other environment-specific settings
 */

// Get API keys from environment variables
const getEnvVariable = (key: string, defaultValue: string = ''): string => {
  return typeof process !== 'undefined' && process.env && process.env[key] 
    ? process.env[key] as string 
    : defaultValue;
};

// Google Maps API Keys
// Use the actual key directly since environment variables aren't loading correctly
export const GOOGLE_MAPS_API_KEY = 'AIzaSyAsWqi7xMdpO1mwKbB-2Acbe9m4piPddb0';

// Function to check if API key is valid format (for client-side validation only)
export const isValidApiKeyFormat = () => {
  return GOOGLE_MAPS_API_KEY && 
         GOOGLE_MAPS_API_KEY.startsWith('AIza') && 
         GOOGLE_MAPS_API_KEY.length > 30;
};

export const GOOGLE_OAUTH_ID = getEnvVariable('GOOGLE_OAUTH_ID', '754972955626-08ra1odvmr3hgapmnbjgfske260opjb5.apps.googleusercontent.com');

// Map styles for different themes
export const MAP_STYLES = {
  DEFAULT: 'standard',
  DARK: 'night-mode',
  SATELLITE: 'satellite',
  TERRAIN: 'terrain',
  FALLBACK1: 'standard', // Default fallback style
  FALLBACK2: 'terrain'
};

// API endpoints configuration
export const API_CONFIG = {
  BASE_URL: 'http://192.168.0.106:5000/api',
  TIMEOUT: 10000, // 10 seconds
};

// Ride fare calculation constants
export const FARE_CONSTANTS = {
  UBER: {
    BASE_FARE: 75, // Base fare in rupees
    COST_PER_KM: 11, // Cost per kilometer in rupees
    COST_PER_MINUTE: 2, // Cost per minute in traffic in rupees
    BOOKING_FEE: 25, // Fixed booking fee in rupees
    SURGE_MULTIPLIER: 1.2, // Default surge multiplier (peak time)
    TAX_RATE: 0.05, // 5% tax rate
  },
  OLA: {
    BASE_FARE: 70, // Base fare in rupees
    COST_PER_KM: 10, // Cost per kilometer in rupees
    COST_PER_MINUTE: 1.5, // Cost per minute in traffic in rupees
    ACCESS_FEE: 20, // Access fee in rupees
    PEAK_PRICING_MULTIPLIER: 1.15, // Default peak pricing multiplier
    TAX_RATE: 0.05, // 5% tax rate
  }
};

export default {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_OAUTH_ID,
  API_CONFIG,
  FARE_CONSTANTS
}; 