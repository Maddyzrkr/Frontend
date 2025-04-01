import { Stack } from 'expo-router';

export default function RideLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: true,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen 
        name="ride-seeker" 
        options={{ 
          title: 'Find a Ride',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="location-picker" 
        options={{ 
          title: 'Select Location',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="destination-picker" 
        options={{ 
          title: 'Select Destination',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="find-partners" 
        options={{ 
          title: 'Available Partners',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="ride-details" 
        options={{ 
          title: 'Ride Details',
          headerShown: true 
        }} 
      />
    </Stack>
  );
} 