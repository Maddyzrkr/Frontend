import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '../hooks/useColorScheme';
import { UserProvider } from './context/auth';
import { View, ActivityIndicator, Platform, Text } from 'react-native';

// Import Google Maps configuration
import { GOOGLE_MAPS_API_KEY } from '../utils/config';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore error */
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize Google Maps
  useEffect(() => {
    // Log that we're using Google Maps
    console.log('Initializing Google Maps API');
    
    // On Android, we can check if Google Play Services are available
    if (Platform.OS === 'android') {
      try {
        // In a real implementation, we might use a library like
        // react-native-device-info or @react-native-community/google-signin
        // to check for Google Play Services availability
        console.log('Google Maps API Key configured:', 
          GOOGLE_MAPS_API_KEY ? 'Yes' : 'No');
      } catch (e) {
        console.warn('Error checking Google Play Services:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      // Hide splash screen once fonts are loaded
      SplashScreen.hideAsync().catch(() => {
        /* ignore error */
      });
    }
  }, [loaded]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#2e78b7" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <UserProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(ride)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </UserProvider>
    </ThemeProvider>
  );
}