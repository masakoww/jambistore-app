'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence to local storage
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting persistence:', error);
});

// Auth Context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: string;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  userRole: '',
  signIn: async () => { throw new Error('AuthProvider not initialized'); },
  signUp: async () => { throw new Error('AuthProvider not initialized'); },
  signOut: async () => { throw new Error('AuthProvider not initialized'); },
});

// Fallback admin emails (in case database check fails)
const FALLBACK_ADMIN_EMAILS = [
  'krmendusa@gmail.com',
  'nadaffasakho@gmail.com'
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Check database for role
        try {
          // Check users collection first
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData?.role || '';
            setUserRole(role);
            // Owner, developer, and admin all have admin access
            if (['owner', 'developer', 'admin'].includes(role)) {
              setIsAdmin(true);
              setLoading(false);
              return;
            }
          }
          
          // Also check admins collection
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            const role = adminData?.role || '';
            setUserRole(role);
            if (['owner', 'developer', 'admin'].includes(role)) {
              setIsAdmin(true);
              setLoading(false);
              return;
            }
          }
          
          // Fallback to hardcoded emails
          if (FALLBACK_ADMIN_EMAILS.includes(user.email || '')) {
            setIsAdmin(true);
            setUserRole('admin');
          } else {
            setIsAdmin(false);
            setUserRole('user');
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          // Fallback to email check
          if (FALLBACK_ADMIN_EMAILS.includes(user.email || '')) {
            setIsAdmin(true);
            setUserRole('admin');
          } else {
            setIsAdmin(false);
            setUserRole('user');
          }
        }
      } else {
        setIsAdmin(false);
        setUserRole('');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const signUp = async (email: string, password: string): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const signOut = async (): Promise<void> => {
    await firebaseSignOut(auth);
  };

  const value = {
    user,
    loading,
    isAdmin,
    userRole,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export Firebase instances
export { auth, db, app };
