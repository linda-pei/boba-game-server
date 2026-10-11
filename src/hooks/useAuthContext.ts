import { createContext, useContext } from "react";

export interface AuthContextValue {
  uid: string | null;
  username: string | null;
  setUsername: (name: string) => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
