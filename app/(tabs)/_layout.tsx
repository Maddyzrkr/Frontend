// import { Tabs } from 'expo-router';
// import { FontAwesome5 } from '@expo/vector-icons';

// export default function TabLayout() {
//   return (
//     <Tabs
//       screenOptions={({ route }) => ({
//         headerShown: false,
//         tabBarIcon: ({ focused, color, size }) => {
//           let iconName;
//           switch (route.name) {
//             case 'main': iconName = 'home'; break;
//             case 'rides': iconName = 'car'; break;
//             case 'partners': iconName = 'users'; break;
//             case 'profile': iconName = 'user'; break;
//             case 'home': iconName = 'circle'; break;
//             case 'explore': iconName = 'compass'; break;
//             default: iconName = 'circle';
//           }
//           return <FontAwesome5 name={iconName} size={size} color={color} />;
//         },
//         tabBarActiveTintColor: '#4a90e2',
//         tabBarInactiveTintColor: '#8e8e93',
//       })}
//     >
//       <Tabs.Screen
//         name="main"
//         options={{
//           title: 'Home'
//         }}
//       />
//       <Tabs.Screen name="rides" options={{ title: 'Rides' }} />
//       <Tabs.Screen name="partners" options={{ title: 'Partners' }} />
//       <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      
//       Hide these tabs but keep them accessible
//       <Tabs.Screen 
//         name="home" 
//         options={{ 
//           tabBarButton: () => null,
//           // href: null // This prevents it from being a target in navigation
//         }} 
//       />
//       <Tabs.Screen 
//         name="explore" 
//         options={{ 
//           tabBarButton: () => null,
//           // href: null // This prevents it from being a target in navigation
//         }} 
//       />
//     </Tabs>
//   );
// }

// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="main"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: 'My Rides',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="car" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="partners"
        options={{
          title: 'Partners',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}