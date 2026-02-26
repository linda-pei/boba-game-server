import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "./useAuth";

interface AuthContextValue {
  uid: string | null;
  username: string | null;
  setUsername: (name: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
