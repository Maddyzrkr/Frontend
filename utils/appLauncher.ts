/**
 * App Launcher Utility
 * Handles opening ride share apps or directing to app stores if not installed
 */

import { Linking, Platform } from 'react-native';

// Interface for app info
interface AppInfo {
  name: string;
  packageName: string; // Android package name
  appStoreId: string; // iOS App Store ID
  universalLink: string; // Universal/App Link
  playStoreUrl: string; // Google Play Store URL
  appStoreUrl: string; // iOS App Store URL
}

// App configuration for Uber and Ola
const appConfigs: Record<string, AppInfo> = {
  'Uber': {
    name: 'Uber',
    packageName: 'com.ubercab',
    appStoreId: '368677368',
    universalLink: 'uber://',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.ubercab',
    appStoreUrl: 'https://apps.apple.com/app/uber/id368677368'
  },
  'Ola': {
    name: 'Ola',
    packageName: 'com.olacabs.customer',
    appStoreId: '539179365',
    universalLink: 'olacabs://',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.olacabs.customer',
    appStoreUrl: 'https://apps.apple.com/app/ola-cabs/id539179365'
  }
};

/**
 * Check if an app is installed on the device
 * @param appName Name of the app ('Uber' or 'Ola')
 * @returns Promise that resolves to boolean indicating if app is installed
 */
export const isAppInstalled = async (appName: string): Promise<boolean> => {
  if (!appConfigs[appName]) {
    console.warn(`Unknown app: ${appName}`);
    return false;
  }

  const app = appConfigs[appName];

  try {
    // Try to open the app URL scheme
    const canOpen = await Linking.canOpenURL(app.universalLink);
    return canOpen;
  } catch (error) {
    console.error(`Error checking if ${appName} is installed:`, error);
    return false;
  }
};

/**
 * Open app or redirect to app store if not installed
 * @param appName Name of the app ('Uber' or 'Ola')
 * @param params Optional parameters to pass to the app
 */
export const openApp = async (appName: string, params: Record<string, string> = {}): Promise<void> => {
  if (!appConfigs[appName]) {
    console.warn(`Unknown app: ${appName}`);
    return;
  }

  const app = appConfigs[appName];
  
  try {
    console.log(`Attempting to open ${appName} app`);
    
    // Build deep link URL with parameters if provided
    let deepLinkUrl;
    if (appName === 'Uber') {
      deepLinkUrl = `uber://`;
      // Check if we have all coordinates for a complete ride request
      if (params['pickup[latitude]'] && params['dropoff[latitude]']) {
        deepLinkUrl = getUberDeepLink(
          parseFloat(params['pickup[latitude]']),
          parseFloat(params['pickup[longitude]']),
          parseFloat(params['dropoff[latitude]']),
          parseFloat(params['dropoff[longitude]'])
        );
      }
    } else if (appName === 'Ola') {
      deepLinkUrl = `olacabs://`;
      // Check if we have all coordinates for a complete ride request
      if (params['lat'] && params['drop_lat']) {
        deepLinkUrl = getOlaDeepLink(
          parseFloat(params['lat']),
          parseFloat(params['lng']),
          parseFloat(params['drop_lat']),
          parseFloat(params['drop_lng'])
        );
      }
    } else {
      deepLinkUrl = app.universalLink;
    }
    
    console.log(`Trying to open with deep link: ${deepLinkUrl}`);
    
    // First check if we can open the URL
    const canOpen = await Linking.canOpenURL(deepLinkUrl);
    
    if (canOpen) {
      console.log(`${appName} app can be opened with deep link`);
      try {
        await Linking.openURL(deepLinkUrl);
        console.log(`${appName} opened successfully`);
        return;
      } catch (openError) {
        console.error(`Error opening ${appName} with deep link:`, openError);
        // Proceed to open store
      }
    } else {
      console.log(`${appName} app not installed or deep link not supported`);
    }
    
    // If we're here, either the app is not installed or deep link failed
    // Let's open the appropriate store
    const storeUrl = Platform.OS === 'ios' ? app.appStoreUrl : app.playStoreUrl;
    console.log(`Opening ${appName} on ${Platform.OS === 'ios' ? 'App Store' : 'Play Store'}: ${storeUrl}`);
    
    // Ensure the store URL can be opened
    const canOpenStore = await Linking.canOpenURL(storeUrl);
    if (canOpenStore) {
      await Linking.openURL(storeUrl);
      console.log(`${Platform.OS === 'ios' ? 'App Store' : 'Play Store'} opened successfully`);
    } else {
      console.error(`Cannot open ${Platform.OS === 'ios' ? 'App Store' : 'Play Store'} URL: ${storeUrl}`);
    }
    
  } catch (error) {
    console.error(`Error in openApp flow for ${appName}:`, error);
  }
};

/**
 * Generate a deep link for Uber
 * @param pickupLat Pickup latitude
 * @param pickupLng Pickup longitude
 * @param dropoffLat Dropoff latitude
 * @param dropoffLng Dropoff longitude
 * @returns Uber deep link URL
 */
export const getUberDeepLink = (
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number
): string => {
  return `uber://?action=setPickup&pickup[latitude]=${pickupLat}&pickup[longitude]=${pickupLng}&dropoff[latitude]=${dropoffLat}&dropoff[longitude]=${dropoffLng}`;
};

/**
 * Generate a deep link for Ola
 * @param pickupLat Pickup latitude
 * @param pickupLng Pickup longitude
 * @param dropoffLat Dropoff latitude
 * @param dropoffLng Dropoff longitude
 * @returns Ola deep link URL
 */
export const getOlaDeepLink = (
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number
): string => {
  return `olacabs://?lat=${pickupLat}&lng=${pickupLng}&drop_lat=${dropoffLat}&drop_lng=${dropoffLng}`;
};

/**
 * Open Uber app with ride parameters
 * @param pickupLat Pickup latitude
 * @param pickupLng Pickup longitude
 * @param dropoffLat Dropoff latitude
 * @param dropoffLng Dropoff longitude
 */
export const openUberWithRide = async (
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number
): Promise<void> => {
  const params = {
    'action': 'setPickup',
    'pickup[latitude]': pickupLat.toString(),
    'pickup[longitude]': pickupLng.toString(),
    'dropoff[latitude]': dropoffLat.toString(),
    'dropoff[longitude]': dropoffLng.toString(),
  };
  
  await openApp('Uber', params);
};

/**
 * Open Ola app with ride parameters
 * @param pickupLat Pickup latitude
 * @param pickupLng Pickup longitude
 * @param dropoffLat Dropoff latitude
 * @param dropoffLng Dropoff longitude
 */
export const openOlaWithRide = async (
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number
): Promise<void> => {
  const params = {
    'lat': pickupLat.toString(),
    'lng': pickupLng.toString(),
    'drop_lat': dropoffLat.toString(),
    'drop_lng': dropoffLng.toString(),
  };
  
  await openApp('Ola', params);
};

export default {
  isAppInstalled,
  openApp,
  getUberDeepLink,
  getOlaDeepLink,
  openUberWithRide,
  openOlaWithRide
}; 