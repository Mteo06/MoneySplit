"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: any | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, profile: null });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      // Unsubscribe from previous user's profile listener
      if (profileUnsub) { profileUnsub(); profileUnsub = null; }

      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);

        // Use onSnapshot so profile updates (avatar, name) are reflected instantly
        profileUnsub = onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            setProfile(snap.data());
          } else {
            // First-time login — create profile document
            const newProfile = {
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Utente",
              email: firebaseUser.email,
              avatar_url: null,
              created_at: new Date().toISOString(),
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
