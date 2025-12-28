import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { validateCredentials, DemoAccount } from "../constants/demoAccounts";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "announcer" | "admin";
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "@auth_user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from AsyncStorage on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (userJson) {
        const user: AuthUser = JSON.parse(userJson);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Error loading user from storage:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const account = validateCredentials(email, password);

    if (account) {
      const user: AuthUser = {
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role,
      };

      setCurrentUser(user);

      // Persist to AsyncStorage
      try {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } catch (error) {
        console.error("Error saving user to storage:", error);
      }

      return true;
    }

    return false;
  };

  const logout = async () => {
    setCurrentUser(null);
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error("Error removing user from storage:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: currentUser !== null,
        currentUser,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
