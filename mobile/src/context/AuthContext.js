import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginApi, registerApi, getMeApi, logoutApi } from "../api/auth.api";

const AuthContext = createContext({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  role: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from storage on app start
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("@sewasathi_token");
        const storedUser = await AsyncStorage.getItem("@sewasathi_user");

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);

          // Verify with server in background to sync state
          try {
            const meRes = await getMeApi();
            if (meRes.success && meRes.data?.user) {
              setUser(meRes.data.user);
              await AsyncStorage.setItem(
                "@sewasathi_user",
                JSON.stringify(meRes.data.user)
              );
            }
          } catch (e) {
            // If offline, continue using stored session
          }
        }
      } catch (e) {
        console.warn("Failed to restore session", e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const res = await loginApi(credentials);
      if (res.success && res.data) {
        const { user: loggedInUser, accessToken, refreshToken } = res.data;

        await AsyncStorage.setItem("@sewasathi_token", accessToken);
        if (refreshToken) {
          await AsyncStorage.setItem("@sewasathi_refresh_token", refreshToken);
        }
        await AsyncStorage.setItem(
          "@sewasathi_user",
          JSON.stringify(loggedInUser)
        );

        setToken(accessToken);
        setUser(loggedInUser);
        return { success: true };
      }
      return { success: false, message: res.message || "Login failed" };
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Failed to log in";
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      const res = await registerApi(userData);
      if (res.success && res.data) {
        // Automatically login user after registration
        return await login({
          email: userData.email,
          password: userData.password,
        });
      }
      return { success: false, message: res.message || "Registration failed" };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to register account";
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutApi();
    } catch (e) {
      // ignore
    } finally {
      await AsyncStorage.multiRemove([
        "@sewasathi_token",
        "@sewasathi_refresh_token",
        "@sewasathi_user",
      ]);
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await getMeApi();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        await AsyncStorage.setItem(
          "@sewasathi_user",
          JSON.stringify(res.data.user)
        );
      }
    } catch (e) {
      console.warn("Failed to refresh user profile", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        role: user?.role || null,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
