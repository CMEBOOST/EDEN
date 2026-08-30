import { createContext, useContext, useEffect, useState } from "react";
import { apiGet, apiLogin } from "../lib/api";
import { clearToken, getToken, setToken } from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // โหลด user จาก token ที่มีอยู่ (ตอนเปิดเว็บ / refresh)
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await apiGet("/auth/me");
        if (!cancelled) setUser(me);
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  // api.js ยิง event นี้เมื่อเจอ 401
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  async function login(username, password) {
    const { access_token } = await apiLogin(username, password);
    setToken(access_token);
    const me = await apiGet("/auth/me");
    setUser(me);
    return me;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
