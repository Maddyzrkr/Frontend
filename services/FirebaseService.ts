import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push, update, remove, get, child, query, orderByChild, equalTo } from 'firebase/database';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAQ0ibqGHFYwY3c1j8ObGgX-BmVKM47cGI",
  authDomain: "matchmyride-37a78.firebaseapp.com",
  databaseURL: "https://matchmyride-37a78-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "matchmyride-37a78",
  storageBucket: "matchmyride-37a78.firebasestorage.app",
  messagingSenderId: "931010530268",
  appId: "1:931010530268:android:b8fa9fd2b6b6454e96dd19"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Helper to get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Listen for authentication state changes
export const listenForAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// User Matching Service

// Save user location and preferences for ride matching
export const updateUserRideProfile = async (
  userId: string, 
  data: {
    location: { lat: number, lng: number },
    destination?: { lat: number, lng: number },
    preferences?: object,
    status: 'active' | 'inactive' | 'matched'
  }
) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, {
      ...data,
      lastUpdated: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error updating user ride profile:', error);
    return false;
  }
};

// Find potential matches based on location and preferences
export const findPotentialMatches = async (
  userId: string,
  maxDistance: number = 5, // km
  maxResults: number = 10
) => {
  try {
    // Get all active users
    const usersRef = ref(database, 'users');
    const activeUsersQuery = query(
      usersRef,
      orderByChild('status'),
      equalTo('active')
    );
    
    const snapshot = await get(activeUsersQuery);
    if (!snapshot.exists()) {
      return [];
    }
    
    interface UserData {
      location: { lat: number, lng: number },
      destination?: { lat: number, lng: number },
      preferences?: object,
      status: 'active' | 'inactive' | 'matched',
      lastUpdated: string
    }
    
    const users = snapshot.val() as Record<string, UserData>;
    const currentUser = users[userId];
    
    if (!currentUser || !currentUser.location) {
      return [];
    }
    
    // Filter out users based on distance and other criteria
    // This is a simple implementation - in a real app, you'd likely
    // use a more sophisticated algorithm or Firebase GeoFire
    const matches = Object.entries(users)
      .filter(([id, userData]: [string, UserData]) => {
        // Skip current user and users without location
        if (id === userId || !userData.location) return false;
        
        // Calculate distance (simplified version)
        // In a real app, use a proper distance calculation
        const distance = calculateDistance(
          currentUser.location.lat, 
          currentUser.location.lng,
          userData.location.lat,
          userData.location.lng
        );
        
        return distance <= maxDistance;
      })
      .map(([id, userData]: [string, UserData]) => ({
        id,
        ...userData,
        distance: calculateDistance(
          currentUser.location.lat, 
          currentUser.location.lng,
          userData.location.lat,
          userData.location.lng
        )
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxResults);
    
    return matches;
  } catch (error) {
    console.error('Error finding potential matches:', error);
    return [];
  }
};

// Simple distance calculation using Haversine formula
const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Create a ride match
export const createMatch = async (
  userId1: string,
  userId2: string,
  details: {
    startLocation: { lat: number, lng: number },
    destination: { lat: number, lng: number },
    estimatedDuration: number, // in minutes
    estimatedDistance: number, // in km
  }
) => {
  try {
    const matchesRef = ref(database, 'matches');
    const newMatchRef = push(matchesRef);
    
    const match = {
      users: {
        [userId1]: true,
        [userId2]: true
      },
      status: 'pending', // pending, accepted, rejected, completed
      details,
      timestamp: new Date().toISOString(),
    };
    
    await set(newMatchRef, match);
    
    // Update both users' status
    const user1Ref = ref(database, `users/${userId1}`);
    const user2Ref = ref(database, `users/${userId2}`);
    
    await update(user1Ref, { 
      status: 'matched',
      currentMatch: newMatchRef.key
    });
    
    await update(user2Ref, { 
      status: 'matched',
      currentMatch: newMatchRef.key
    });
    
    return newMatchRef.key;
  } catch (error) {
    console.error('Error creating match:', error);
    return null;
  }
};

// Get current user's matches
export const getUserMatches = async (userId: string) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      return [];
    }
    
    const userData = userSnapshot.val();
    
    if (!userData.currentMatch) {
      return [];
    }
    
    const matchRef = ref(database, `matches/${userData.currentMatch}`);
    const matchSnapshot = await get(matchRef);
    
    if (!matchSnapshot.exists()) {
      return [];
    }
    
    return { id: userData.currentMatch, ...matchSnapshot.val() };
  } catch (error) {
    console.error('Error getting user matches:', error);
    return [];
  }
};

export default {
  app,
  database,
  auth,
  getCurrentUser,
  listenForAuthChanges,
  updateUserRideProfile,
  findPotentialMatches,
  createMatch,
  getUserMatches
}; 