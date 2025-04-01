//code for app/(auth)/register.tsx:
import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView,
  Image
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.106:5000";

const Register = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    phone: "",
    gender: "",
    languages: [] as string[],
    location: "",
    locationCoords: null as { latitude: number; longitude: number } | null,
    profileImage: null as string | null
  });

  const LANGUAGES = [
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi" },
    { code: "mr", name: "Marathi" },
    { code: "gu", name: "Gujarati" },
    { code: "ta", name: "Tamil" },
    { code: "te", name: "Telugu" },
    { code: "kn", name: "Kannada" },
    { code: "ml", name: "Malayalam" },
    { code: "pa", name: "Punjabi" },
    { code: "bn", name: "Bengali" },
  ];

  const handleImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      // Early return if the picker was canceled or no assets
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedAsset = result.assets[0];
      setFormData(prev => ({ ...prev, profileImage: selectedAsset.uri }));
      
      const base64Image = await FileSystem.readAsStringAsync(selectedAsset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address[0]) {
        const locationString = [
          address[0].street,
          address[0].district,
          address[0].city,
          address[0].region,
          address[0].country
        ].filter(Boolean).join(", ");

        setFormData(prev => ({
          ...prev,
          location: locationString,
          locationCoords: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          }
        }));
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to get location");
    }
  };

  const handleLanguageToggle = (languageCode: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(languageCode)
        ? prev.languages.filter(code => code !== languageCode)
        : [...prev.languages, languageCode]
    }));
  };

  const handleRegister = async () => {
    if (!formData.username || !formData.email || !formData.password || 
        !formData.phone || !formData.gender || formData.languages.length === 0 || 
        !formData.location) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    // Add phone number validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return;
    }

    try {
      setLoading(true);
      
      // Register with the API
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const userData = await response.json();

      if (response.ok) {
        // Store user data in AsyncStorage
        await AsyncStorage.setItem("token", userData.token);
        await AsyncStorage.setItem("userId", userData.userId);
        await AsyncStorage.setItem("username", formData.username);
        await AsyncStorage.setItem("email", formData.email);
        await AsyncStorage.setItem("isOnboarded", "true");
        
        // Store user profile data
        const profileData = {
          phone: formData.phone,
          gender: formData.gender,
          languages: formData.languages,
          location: formData.location,
          username: formData.username
        };
        await AsyncStorage.setItem("userProfile", JSON.stringify(profileData));
        
        router.replace("/selection");
      } else {
        Alert.alert("Error", userData.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Image source={require('../../assets/images/bg1.png')} style={styles.image} />
      
      <View style={styles.formContainer}>
        <Text style={styles.title}>Create Account</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={formData.username}
          onChangeText={(text) => setFormData(prev => ({ ...prev, username: text }))}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={formData.password}
          onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={formData.phone}
          onChangeText={(text) => {
            // Only allow numbers
            const numbersOnly = text.replace(/[^0-9]/g, '');
            // Limit to 10 digits
            const limitedText = numbersOnly.slice(0, 10);
            setFormData(prev => ({ ...prev, phone: limitedText }));
          }}
          keyboardType="phone-pad"
          maxLength={10}
        />

        <View style={styles.genderContainer}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderButtons}>
            {["Male", "Female", "Other"].map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.genderButton,
                  formData.gender === gender && styles.selectedGender
                ]}
                onPress={() => setFormData(prev => ({ ...prev, gender }))}
              >
                <Text style={[
                  styles.genderText,
                  formData.gender === gender && styles.selectedGenderText
                ]}>
                  {gender}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.languagesContainer}>
          <Text style={styles.label}>Languages</Text>
          <View style={styles.languageGrid}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageButton,
                  formData.languages.includes(lang.code) && styles.selectedLanguage
                ]}
                onPress={() => handleLanguageToggle(lang.code)}
              >
                <Text style={[
                  styles.languageText,
                  formData.languages.includes(lang.code) && styles.selectedLanguageText
                ]}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
          <Text style={styles.locationButtonText}>
            {formData.location || "Get Location"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.imageButton} onPress={handleImagePicker}>
          <Text style={styles.imageButtonText}>
            {formData.profileImage ? "Change Profile Picture" : "Add Profile Picture"}
          </Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#2e78b7" />
        ) : (
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  image: {
    width: "100%",
    height: 200,
    resizeMode: "contain",
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  genderContainer: {
    marginBottom: 20,
  },
  genderButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: "center",
  },
  selectedGender: {
    backgroundColor: "#2e78b7",
    borderColor: "#2e78b7",
  },
  genderText: {
    fontSize: 16,
  },
  selectedGenderText: {
    color: "#fff",
  },
  languagesContainer: {
    marginBottom: 20,
  },
  languageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  languageButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    margin: 5,
  },
  selectedLanguage: {
    backgroundColor: "#2e78b7",
    borderColor: "#2e78b7",
  },
  languageText: {
    fontSize: 14,
  },
  selectedLanguageText: {
    color: "#fff",
  },
  locationButton: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  locationButtonText: {
    textAlign: "center",
    color: "#2e78b7",
  },
  imageButton: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  imageButtonText: {
    textAlign: "center",
    color: "#2e78b7",
  },
  registerButton: {
    backgroundColor: "#2e78b7",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default Register;
