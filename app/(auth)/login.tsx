import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert,  
  StyleSheet, 
  ActivityIndicator, 
  Image 
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.106:5000";

const Login: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>("");

  const validateEmail = (email: string): boolean => /\S+@\S+\.\S+/.test(email);

  const handleLogin = async (): Promise<void> => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    try {
      setLoading(true);
      console.log(`Attempting login with email: ${email.trim()}`);
      console.log(`API URL: ${API_URL}/api/auth/login`);
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      console.log(`Login response status: ${response.status}`);
      const data = await response.json();
      console.log("Login response data:", JSON.stringify(data, null, 2));

      if (response.ok) {
        // Store user data in AsyncStorage
        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("userId", data.userId);
        await AsyncStorage.setItem("email", email.trim());
        
        // Store username if available in the response
        if (data.username) {
          await AsyncStorage.setItem("username", data.username);
          console.log(`Username stored: ${data.username}`);
        }
        
        // Redirect based on onboarding status
        if (data.isOnboarded) {
          console.log("Login successful, redirecting to selection screen");
          router.replace("/(auth)/selection");
        } else {
          console.log("Login successful, redirecting to onboarding");
          router.replace("/onboarding");
        }
      } else {
        Alert.alert("Error", data.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      Alert.alert("Error", "Network issue! Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Image at Center */}
      <Image source={require('../../assets/images/bg1.png')} style={styles.image} />

      {/* Login Form */}
      <View style={styles.formContainer}>
        <Text style={styles.title}>MatchMyRide</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          onChangeText={setEmail}
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          onChangeText={setPassword}
          value={password}
        />

        {loading ? (
          <ActivityIndicator size="large" color="#2e78b7" />
        ) : (
          <>
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.registerButton]} 
              onPress={() => router.push("/register")}
            >
              <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  image: {
    width: "100%",
    height: "50%", // Image takes 50% of the screen height
    resizeMode: "contain",
    marginBottom: 20,
  },
  formContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#2e78b7",
    paddingVertical: 12,
    width: "100%",
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
  },
  registerButton: {
    backgroundColor: "#555", // Different color for register button
  },
  buttonText: {
    fontSize: 18,
    color: "#fff",
  },
});

export default Login;
