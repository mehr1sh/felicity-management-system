import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      const data = res.data;

      
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user || null));
        setUser(data.user || null);
        return data.user || null;
      }

      throw new Error("Login failed: No token received");
    } catch (error) {
      
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);

      
      throw error;
    }
  };

  const register = async (data) => {
    try {
      const sanitizedData = {
        ...data,
        email: data.email.toLowerCase().trim()
      };

      const res = await api.post("/auth/register-participant", sanitizedData);
      const dataResponse = res.data;

      if (dataResponse.token) {
        localStorage.setItem("token", dataResponse.token);
        localStorage.setItem("user", JSON.stringify(dataResponse.user || null));
        
        sessionStorage.setItem("justRegistered", "1");
        setUser(dataResponse.user || null);
        return dataResponse.user || null;
      }

      throw new Error("Registration failed: No token received");
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
