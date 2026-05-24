/**
 * KnoVault — Firebase Utility
 *
 * Handles:
 *  - Firebase Auth state management
 *  - Google Sign-In flow
 *  - Firebase ID token retrieval for backend sync
 */
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { env } from '../config/env';

// ── Google Sign-In Configuration ─────────────────────────────────────
// The webClientId must match the OAuth 2.0 Web Client ID from Firebase Console
// Firebase Console → Authentication → Sign-in method → Google → Web client ID
let _googleSignInConfigured = false;

export function configureGoogleSignIn() {
  if (_googleSignInConfigured) return;

  try {
    // console.log('[Firebase] Configuring Google Sign-In with Web Client ID:', env.GOOGLE_WEB_CLIENT_ID);
    GoogleSignin.configure({
      webClientId: env.GOOGLE_WEB_CLIENT_ID,
    });
    _googleSignInConfigured = true;
    // console.log('[Firebase] ✅ Google Sign-In configured');
  } catch (error) {
    console.error('[Firebase] ❌ Google Sign-In configuration failed:', error);
  }
}

// ── Google Sign-In ───────────────────────────────────────────────────

/**
 * Perform the full Google Sign-In flow:
 *  1. Sign in with Google
 *  2. Get Google credential
 *  3. Sign in to Firebase Auth with that credential
 *  4. Return the Firebase user
 */
export async function signInWithGoogle(): Promise<FirebaseAuthTypes.User | null> {
  try {
    configureGoogleSignIn();

    // Check Play Services availability
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sign in with Google
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      // console.log('[Firebase] Google Sign-In cancelled');
      return null;
    }

    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error('Google Sign-In succeeded but no ID token returned');
    }

    // Create Firebase credential from Google token
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    // Sign in to Firebase with the Google credential
    const userCredential = await auth().signInWithCredential(googleCredential);
    // console.log('[Firebase] ✅ Google Sign-In success:', userCredential.user.email);

    return userCredential.user;
  } catch (error: any) {
    console.error('[Firebase] Google Sign-In error:', error);

    // Handle specific error codes
    if (error?.code === 'SIGN_IN_CANCELLED' || error?.code === '12501') {
      // User cancelled - not an error
      return null;
    }

    throw error;
  }
}

// ── Firebase Auth Helpers ────────────────────────────────────────────

/**
 * Get the current Firebase user's ID token for backend API calls.
 * Returns null if no user is signed in.
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  const user = auth().currentUser;
  if (!user) return null;

  try {
    const token = await user.getIdToken(true); // force refresh
    return token;
  } catch (error) {
    console.error('[Firebase] Failed to get ID token:', error);
    return null;
  }
}

/**
 * Sign out of Firebase Auth (both Firebase and Google Sign-In)
 */
export async function signOutFirebase(): Promise<void> {
  try {
    // Sign out of Firebase
    await auth().signOut();

    // Sign out of Google (so the account picker shows next time)
    try {
      await GoogleSignin.signOut();
    } catch {
      // Google Sign-In may not have been used
    }

    // console.log('[Firebase] ✅ Signed out');
  } catch (error) {
    console.error('[Firebase] Sign-out error:', error);
  }
}

/**
 * Get the current Firebase Auth user, or null if not signed in.
 */
export function getCurrentFirebaseUser(): FirebaseAuthTypes.User | null {
  return auth().currentUser;
}

/**
 * Subscribe to Firebase Auth state changes.
 * Returns an unsubscribe function.
 */
export function onFirebaseAuthStateChanged(
  callback: (user: FirebaseAuthTypes.User | null) => void
): () => void {
  return auth().onAuthStateChanged(callback);
}
