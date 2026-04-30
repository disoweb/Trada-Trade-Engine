import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey, setAuthTokenGetter, User } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

setAuthTokenGetter(() => localStorage.getItem("trada_token"));

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  setToken: (token: string) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [token, setTokenState] = useState<string | null>(localStorage.getItem("trada_token"));

  const { data: user, isLoading: isUserLoading, error } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    },
  });

  const setToken = (newToken: string) => {
    localStorage.setItem("trada_token", newToken);
    setTokenState(newToken);
  };

  const logout = () => {
    localStorage.removeItem("trada_token");
    setTokenState(null);
    setLocation("/login");
  };

  useEffect(() => {
    if (error) {
      logout();
    }
  }, [error]);

  const isLoading = !!token && isUserLoading;

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, logout, setToken }}>
      {isLoading ? (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && adminOnly && user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation, adminOnly]);

  if (isLoading || !user || (adminOnly && user.role !== "admin")) {
    return null;
  }

  return <>{children}</>;
}
