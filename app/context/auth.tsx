import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserContextType {
  userId: string | null;
  setUserId: (id: string | null) => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserIdState] = useState<string | null>(null);

  const setUserId = async (id: string | null) => {
    try {
      if (id) {
        await AsyncStorage.setItem("userId", id);
      } else {
        await AsyncStorage.removeItem("userId");
      }
      setUserIdState(id);
    } catch (error) {
      console.error("Error storing userId:", error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("userId");
      setUserIdState(null);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <UserContext.Provider value={{ userId, setUserId, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export default UserContext; 