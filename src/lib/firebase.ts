import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
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

// Explicitly ensure standard local browser persistence for long-term sign-in sessions
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Could not set auth persistence to browserLocalPersistence:', err);
});

// Configure Google Provider with Drive Scope
export const googleProvider = new GoogleAuthProvider();
// Full drive permissions allow reading recipes uploaded/copied by the user directly in Drive UI
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.setCustomParameters({
  access_type: 'offline'
});

// 4-month session threshold (120 days = 120 * 24h * 60m * 60s * 1000ms)
export const FOUR_MONTHS_MS = 120 * 24 * 60 * 60 * 1000;
export const THIRTY_DAYS_MS = FOUR_MONTHS_MS; // backwards compatibility

/**
 * Checks whether the current login session has exceeded the 4-month (120-day) window.
 * If expired, automatically signs out and returns false so the app asks for re-login.
 */
export function checkAndEnforceSessionExpiry(): boolean {
  const sessionStarted = localStorage.getItem('auth_session_started_at');
  if (sessionStarted) {
    const elapsed = Date.now() - parseInt(sessionStarted, 10);
    if (elapsed > FOUR_MONTHS_MS) {
      console.log('Session older than 120 days. Auto-logging out per policy.');
      logOut();
      return false;
    }
  }
  return true;
}

/**
 * Retrieves cached user session details synchronously to eliminate loading flicker and login prompts.
 */
export function getCachedUser(): any | null {
  try {
    const raw = localStorage.getItem('heritage_heart_user_profile');
    const sessionStarted = localStorage.getItem('auth_session_started_at');
    if (!raw || !sessionStarted) return null;
    
    const elapsed = Date.now() - parseInt(sessionStarted, 10);
    if (elapsed > FOUR_MONTHS_MS) {
      return null;
    }
    
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Helper for Google Sign In & Extracting OAuth Access Token
 */
export async function signInWithGoogleOAuth(): Promise<{ user: User; accessToken: string | null }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;
    
    // Mark session start timestamp for 4-month (120 days) session maintenance
    localStorage.setItem('auth_session_started_at', Date.now().toString());
    localStorage.setItem('heritage_heart_user_profile', JSON.stringify({
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    }));
    localStorage.setItem('google_drive_connected', 'true');

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
  localStorage.removeItem('google_drive_connected');
  localStorage.removeItem('auth_session_started_at');
  localStorage.removeItem('heritage_heart_user_profile');
  await signOut(auth);
}

/**
 * Returns whether the Google Drive connection is active.
 */
export function isDriveTokenFresh(): boolean {
  const token = localStorage.getItem('google_drive_access_token');
  return !!token;
}

export function getStoredDriveAccessToken(): string | null {
  return localStorage.getItem('google_drive_access_token') || null;
}
