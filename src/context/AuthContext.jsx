import { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";
import { io } from "socket.io-client";
import { BASE_URL } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("ht_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify token on mount
    const token = localStorage.getItem("ht_token");
    if (token) {
      api
        .get("/api/auth/me")
        .then((u) => {
          const userData = { ...u, id: u._id };
          setUser(userData);
          localStorage.setItem("ht_user", JSON.stringify(userData));
        })
        .catch((err) => {
          // Only invalidate session on explicit auth failure (401/403).
          // Network errors (err.status undefined) keep the stored user intact.
          if (err.status === 401 || err.status === 403) {
            localStorage.removeItem("ht_token");
            localStorage.removeItem("ht_user");
            setUser(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("ht_token");
    if (token && user) {
      const s = io(BASE_URL, { auth: { token } });
      setSocket(s);
      return () => s.disconnect();
    }
  }, [user?.id]);

  function login(token, userData) {
    localStorage.setItem("ht_token", token);
    const normalized = { ...userData, id: userData.id || userData._id };
    localStorage.setItem("ht_user", JSON.stringify(normalized));
    setUser(normalized);
  }

  function logout() {
    localStorage.removeItem("ht_token");
    localStorage.removeItem("ht_user");
    setUser(null);
    if (socket) socket.disconnect();
    setSocket(null);
  }

  function refreshUser() {
    const token = localStorage.getItem("ht_token");
    if (token) {
      return api
        .get("/api/auth/me")
        .then((u) => {
          const userData = { ...u, id: u._id };
          setUser(userData);
          localStorage.setItem("ht_user", JSON.stringify(userData));
          return userData;
        })
        .catch((err) => {
          if (err.status === 401 || err.status === 403) {
            logout();
          }
          throw err;
        });
    }
    return Promise.resolve(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, socket, loading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
