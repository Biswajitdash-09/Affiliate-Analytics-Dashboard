"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Failed to parse auth data from localStorage:", error);
        // Clear potentially corrupted data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Save to state
        setToken(data.token);
        setUser(data.user);

        // Save to localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        return { success: true };
      } else {
        return { success: false, error: data.error || data.message || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const register = async (userData) => {
    try {
      // 1. Register the user
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        // 2. Registration successful
        // Return success with indication that verification is required
        return {
          success: true,
          requiresVerification: true,
          email: userData.email
        };
      } else {
        return { success: false, error: data.error || "Registration failed" };
      }
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const verifyEmail = async (email, otp) => {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Verification error:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const logout = async () => {
    try {
      // Clear cookie on server
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout API error:", error);
    }

    // Clear state
    setUser(null);
    setToken(null);

    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Redirect to login
    router.push("/login");
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    verifyEmail,
    logout,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;