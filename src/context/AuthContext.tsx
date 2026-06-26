import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { auth, checkAdminAuth } from '../utils/firebase';

interface AuthContextValue {
  isLoggedIn: boolean;
  authLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = checkAdminAuth((user) => {
      if (user) {
        setIsLoggedIn(true);
      } else if (localStorage.getItem('admin_logged_in') === 'true') {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Gagal logout dari Firebase:', error);
    } finally {
      localStorage.removeItem('admin_logged_in');
      setIsLoggedIn(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, authLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  }
  return ctx;
}