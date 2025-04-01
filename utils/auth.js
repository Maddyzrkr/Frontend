import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://localhost:5000/api/auth";

export const loginUser = async (email, password) => {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (data.token) {
      await AsyncStorage.setItem("token", data.token);
      return { success: true, token: data.token };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    return { success: false, message: "Login failed" };
  }
};

// Add default export with all named exports
export default {
  loginUser,
  // Include any other exported functions here
};
