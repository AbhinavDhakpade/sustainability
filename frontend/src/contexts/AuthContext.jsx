import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatErr, setAuthToken, getAuthToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getAuthToken()) {
      setUser(false);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setAuthToken(null);
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.access_token) setAuthToken(data.access_token);
      setUser(data.user || data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatErr(e.response?.data?.detail) || e.message };
    }
  };

  const register = async (payload) => {
    try {
      const { data } = await api.post("/auth/register", payload);
      if (data.pending_approval) return { ok: true, pending: true };
      if (data.access_token) setAuthToken(data.access_token);
      setUser(data.user || data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatErr(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) {
      // Server-side logout is best-effort; client-side clearing always proceeds.
      console.warn("Logout request failed (continuing local logout):", e?.message || e);
    }
    setAuthToken(null);
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
