import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

// Configuration loaded dynamically from config file or env
import configJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: configJson.apiKey,
  authDomain: configJson.authDomain,
  projectId: configJson.projectId,
  storageBucket: configJson.storageBucket,
  messagingSenderId: configJson.messagingSenderId,
  appId: configJson.appId,
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Google Provider with Drive Scope
export const googleProvider = new GoogleAuthProvider();
// Full drive permissions allow reading recipes uploaded/copied by the user directly in Drive UI
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.setCustomParameters({
  prompt: 'consent select_account',
  access_type: 'offline'
});

// Helper for Google Sign In & Extracting OAuth Access Token
export async function signInWithGoogleOAuth(): Promise<{ user: User; accessToken: string | null }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;
    if (accessToken) {
      localStorage.setItem('google_drive_access_token', accessToken);
      localStorage.setItem('google_drive_token_timestamp', Date.now().toString());
    }
    return { user: result.user, accessToken };
  } catch (error: any) {
    console.error('Sign-in error:', error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  localStorage.removeItem('google_drive_access_token');
  localStorage.removeItem('google_drive_token_timestamp');
  await signOut(auth);
}

export function getStoredDriveAccessToken(): string | null {
  const token = localStorage.getItem('google_drive_access_token');
  const timestamp = localStorage.getItem('google_drive_token_timestamp');
  if (!token || !timestamp) return null;
  // Tokens expire in ~1 hour (3600 seconds)
  const elapsed = Date.now() - parseInt(timestamp, 10);
  if (elapsed > 55 * 60 * 1000) {
    // nearing expiration, return token anyway or let caller prompt refresh
    return token;
  }
  return token;
}
