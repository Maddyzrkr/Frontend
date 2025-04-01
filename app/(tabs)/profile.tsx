//code for app/(tabs)/profile.tsx
import React, { useState, useEffect, useContext } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  ActivityIndicator,
  Image
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/auth';

// Define the API URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.137.88:5000";

// Define the user profile data structure
interface UserProfile {
  phone: string;
  gender: string;
  languages: string[];
  location: string;
  username?: string;
}

// Map of language codes to full names
const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'hi': 'Hindi',
  'mr': 'Marathi',
  'gu': 'Gujarati',
  'ta': 'Tamil',
  'te': 'Telugu',
  'kn': 'Kannada',
  'ml': 'Malayalam',
  'pa': 'Punjabi',
  'bn': 'Bengali'
};

const ProfileScreen: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { logout } = useUser();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");
      
      if (!token || !userId) {
        console.error("No token or userId found");
        setLoading(false);
        return;
      }
      
      // Try to get profile from server with timeout
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 5000);
        });
        
        // Create the fetch promise
        const fetchPromise = fetch(`${API_URL}/api/auth/profile/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
          
          // Update local storage with latest data
          await AsyncStorage.setItem("userProfile", JSON.stringify(data));
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error fetching profile from server:", error);
        // Continue to fallback - don't return here
      }
      
      // Fallback to local storage if API request fails
      console.log("Falling back to local storage for profile data");
      const profileData = await AsyncStorage.getItem("userProfile");
      const username = await AsyncStorage.getItem("username");
      const email = await AsyncStorage.getItem("email");
      
      if (profileData) {
        try {
          const parsedData = JSON.parse(profileData);
          setUserProfile({
            ...parsedData,
            // Use email as username if no username is available
            username: username || email?.split('@')[0] || 'User'
          });
        } catch (parseError) {
          console.error("Error parsing profile data:", parseError);
          // Create a minimal profile if parsing fails
          setUserProfile({
            phone: '',
            gender: '',
            languages: [],
            location: '',
            username: username || email?.split('@')[0] || 'User'
          });
        }
      } else {
        // Create a minimal profile if no data exists
        setUserProfile({
          phone: '',
          gender: '',
          languages: [],
          location: '',
          username: username || email?.split('@')[0] || 'User'
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      // Create a minimal profile as last resort
      const email = await AsyncStorage.getItem("email");
      setUserProfile({
        phone: '',
        gender: '',
        languages: [],
        location: '',
        username: email?.split('@')[0] || 'User'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              // Clear necessary items from AsyncStorage
              await AsyncStorage.removeItem("token");
              await AsyncStorage.removeItem("userProfile");
              await AsyncStorage.removeItem("isOnboarded");
              await AsyncStorage.removeItem("username");
              await AsyncStorage.removeItem("email");
              
              // Use the logout function from context
              await logout();
              
              // Navigate to login screen
              router.replace("/(auth)/login");
            } catch (error) {
              console.error("Error during logout:", error);
              Alert.alert("Error", "Failed to log out. Please try again.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleEditProfile = () => {
    router.push("/(profile)/edit-profile" as any);
  };

  const handleNotifications = () => {
    Alert.alert(
      "Notifications",
      "Notification settings will be available in a future update.",
      [{ text: "OK" }]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      "Privacy Settings",
      "Privacy settings will be available in a future update.",
      [{ text: "OK" }]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      "Help & Support",
      "For assistance, please contact support@matchmyride.com",
      [{ text: "OK" }]
    );
  };

  const renderLanguages = (languages: string[]) => {
    return languages.map(code => LANGUAGE_NAMES[code] || code).join(", ");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <View style={styles.profileImage}>
            <Text style={styles.profileInitial}>
              {userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : "U"}
            </Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>{userProfile?.username || 'Profile'}</Text>
      </View>

      <View style={styles.content}>
        {userProfile ? (
          <>
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="call-outline" size={24} color="#007AFF" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{userProfile.phone}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="person-outline" size={24} color="#007AFF" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoValue}>{userProfile.gender}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="language-outline" size={24} color="#007AFF" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Languages</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.languages ? renderLanguages(userProfile.languages) : "None selected"}
                  </Text>
                </View>
              </View>

              {/* <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="location-outline" size={24} color="#007AFF" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>{userProfile.location}</Text>
                </View>
              </View> */}
            </View>

            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Ionicons name="create-outline" size={20} color="#007AFF" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Settings</Text>
              
              <TouchableOpacity style={styles.settingsItem} onPress={handleNotifications}>
                <Ionicons name="notifications-outline" size={24} color="#333" />
                <Text style={styles.settingsText}>Notifications</Text>
                <Ionicons name="chevron-forward" size={24} color="#CCCCCC" style={styles.arrowIcon} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingsItem} onPress={handlePrivacy}>
                <Ionicons name="lock-closed-outline" size={24} color="#333" />
                <Text style={styles.settingsText}>Privacy</Text>
                <Ionicons name="chevron-forward" size={24} color="#CCCCCC" style={styles.arrowIcon} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingsItem} onPress={handleSupport}>
                <Ionicons name="help-circle-outline" size={24} color="#333" />
                <Text style={styles.settingsText}>Help & Support</Text>
                <Ionicons name="chevron-forward" size={24} color="#CCCCCC" style={styles.arrowIcon} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>App Version 1.0.0</Text>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="alert-circle-outline" size={60} color="#999" />
            <Text style={styles.noDataText}>No profile data found</Text>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => router.push("/(profile)/edit-profile" as any)}
            >
              <Text style={styles.buttonText}>Complete Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 10,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius:40,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  content: {
    padding: 20,
  },
  infoSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  settingsSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  arrowIcon: {
    marginLeft: 'auto',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#FFE6E6',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 16,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 30,
  },
});

export default ProfileScreen;