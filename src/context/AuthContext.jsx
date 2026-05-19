import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, setCurrentUser, isOnboarded, markOnboarded, logoutUser } from '../utils/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getCurrentUser());
  const [onboarded, setOnboarded] = useState(user ? isOnboarded(user) : false);

  useEffect(() => {
    setOnboarded(user ? isOnboarded(user) : false);
  }, [user]);

  function login(username) {
    setUser(username);
    setOnboarded(isOnboarded(username));
  }

  function logout() {
    logoutUser();
    setUser(null);
    setOnboarded(false);
  }

  function completeOnboarding() {
    if (user) {
      markOnboarded(user);
      setOnboarded(true);
    }
  }

  return (
    <AuthContext.Provider value={{ user, onboarded, login, logout, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
