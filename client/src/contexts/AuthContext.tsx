import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface AdminUser {
  email: string;
  name: string;
  role: 'main-admin' | 'co-admin' | string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AdminUser | null;
  isMainAdmin: boolean;
  login: (token: string, userData?: AdminUser) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem("adminUserData");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isMainAdmin = Boolean(
    user?.role === 'main-admin' || 
    user?.email?.toLowerCase() === 'thepersonaljaime@gmail.com'
  );

  const checkAuth = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem("adminToken");
      const isAuth = localStorage.getItem("adminAuthenticated") === "true";
      
      if (!token || !isAuth) {
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }

      // Verify token with server
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        if (data.user) {
          setUser(data.user);
          localStorage.setItem("adminUserData", JSON.stringify(data.user));
        }
        return true;
      } else {
        // Token invalid, clear storage
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminAuthenticated");
        localStorage.removeItem("adminUserData");
        localStorage.removeItem("googleUser");
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      return false;
    }
  };

  const login = (token: string, userData?: AdminUser) => {
    localStorage.setItem("adminToken", token);
    localStorage.setItem("adminAuthenticated", "true");
    if (userData) {
      setUser(userData);
      localStorage.setItem("adminUserData", JSON.stringify(userData));
    }
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (token) {
        await fetch("/api/admin/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminAuthenticated");
      localStorage.removeItem("adminUserData");
      localStorage.removeItem("googleUser");
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = "/admin/login";
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await checkAuth();
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        isMainAdmin,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
