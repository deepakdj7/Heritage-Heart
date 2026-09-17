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
  prompt: 'select_account',
  access_type: 'offline'
});

// Standard 30-day session threshold (30 days * 24h * 60m * 60s * 1000ms)
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Checks whether the current login session has exceeded the 30-day window.
 * If expired, automatically signs out and returns false so the app asks for re-login.
 */
export function checkAndEnforceSessionExpiry(): boolean {
  const sessionStarted = localStorage.getItem('auth_session_started_at');
  if (sessionStarted) {
    const elapsed = Date.now() - parseInt(sessionStarted, 10);
    if (elapsed > THIRTY_DAYS_MS) {
      console.log('Session older than 30 days. Auto-logging out per policy.');
      logOut();
      return false;
    }
  }
  return true;
}

/**
 * Helper for Google Sign In & Extracting OAuth Access Token
 */
export async function signInWithGoogleOAuth(): Promise<{ user: User; accessToken: string | null }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;
    
    // Mark session start timestamp for 30-day session maintenance
    localStorage.setItem('auth_session_started_at', Date.now().toString());

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
  localStorage.removeItem('auth_session_started_at');
  await signOut(auth);
}

/**
 * Returns whether the cached Google Drive OAuth token is still fresh (under 55 minutes old).
 */
export function isDriveTokenFresh(): boolean {
  const token = localStorage.getItem('google_drive_access_token');
  const timestamp = localStorage.getItem('google_drive_token_timestamp');
  if (!token || !timestamp) return false;
  const elapsed = Date.now() - parseInt(timestamp, 10);
  return elapsed < 55 * 60 * 1000;
}

export function getStoredDriveAccessToken(): string | null {
  return localStorage.getItem('google_drive_access_token') || null;
}
