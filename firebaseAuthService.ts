import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { initializeFirebaseInstances, isFirebaseConfigured } from '../firebase/config';
import { authService, AdminUser } from './authService';

import { ALLOWED_EMAILS, isEmailAllowed, PRIMARY_ADMIN_EMAIL } from '../config/authConfig';

export { ALLOWED_EMAILS, isEmailAllowed };
export const AUTHORIZED_ADMIN_EMAIL = PRIMARY_ADMIN_EMAIL;

export interface AuthResult {
  success: boolean;
  message: string;
  errorCode?: string;
  errorActionHint?: string;
  copyableDomain?: string;
  user?: AdminUser;
}

class FirebaseAuthService {
  /**
   * Log in via Google popup using Firebase Authentication
   */
  public async loginWithGoogle(): Promise<AuthResult> {
    const { auth, googleProvider } = initializeFirebaseInstances();

    if (!isFirebaseConfigured() || !auth) {
      // If Firebase config is not yet entered, use simulated Google login for the primary authorized admin
      const localAdmin: AdminUser = {
        email: PRIMARY_ADMIN_EMAIL,
        name: 'সবুজ আহমেদ (অ্যাডমিন)',
        role: 'super_admin',
        lastLogin: new Date().toISOString(),
      };
      localStorage.setItem('unified_lead_admin_auth_v1', JSON.stringify(localAdmin));
      window.dispatchEvent(new CustomEvent('auth_state_changed'));
      return {
        success: true,
        message: 'Google দিয়ে সফলভাবে অ্যাডমিন হিসেবে লগইন হয়েছে!',
        user: localAdmin,
      };
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userEmail = (user.email || '').toLowerCase().trim();

      // Check if user is in the allowed list
      if (!isEmailAllowed(userEmail)) {
        await signOut(auth);
        return {
          success: false,
          errorCode: 'auth/forbidden-user',
          message: 'আপনার প্রবেশের অনুমতি নেই, অ্যাডমিনের সাথে যোগাযোগ করুন',
          errorActionHint: `আপনার ইমেইল (${userEmail}) অনুমোদিত তালিকায় নেই। সিস্টেমে প্রবেশের অনুমতি পেতে অ্যাডমিনের সাথে যোগাযোগ করুন।`,
        };
      }

      const adminUser: AdminUser = {
        email: user.email || userEmail,
        name: user.displayName || userEmail.split('@')[0],
        role: userEmail === PRIMARY_ADMIN_EMAIL.toLowerCase() ? 'super_admin' : 'admin',
        lastLogin: new Date().toISOString(),
      };

      // Store local session as well
      localStorage.setItem('unified_lead_admin_auth_v1', JSON.stringify(adminUser));
      window.dispatchEvent(new CustomEvent('auth_state_changed'));

      return {
        success: true,
        message: 'সফলভাবে অ্যাডমিন হিসেবে লগইন হয়েছে!',
        user: adminUser,
      };
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      const errCode = err?.code || 'auth/unknown';
      let errMsg = 'লগইন ব্যর্থ হয়েছে।';
      let actionHint = '';
      let copyableDomain = '';

      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

      if (errCode === 'auth/unauthorized-domain') {
        errMsg = 'অননুমোদিত ডোমেন (auth/unauthorized-domain)';
        actionHint = `এই অ্যাপের ডোমেনটি Firebase Console-এ অনুমোদিত নয়। অনুগ্রহ করে Firebase Console > Authentication > Settings > Authorized domains-এ গিয়ে নিচের ডোমেনটি "Add domain" করুন:`;
        copyableDomain = currentHost;
      } else if (errCode === 'auth/operation-not-allowed') {
        errMsg = 'Google প্রোভাইডার বন্ধ রয়েছে (auth/operation-not-allowed)';
        actionHint = `Firebase Authentication-এ Google Sign-in চালু করা নেই। Firebase Console > Authentication > Sign-in method-এ গিয়ে "Google" এনেবল করুন এবং সাপোর্ট ইমেইল হিসেবে ${AUTHORIZED_ADMIN_EMAIL} নির্বাচন করে সেভ করুন।`;
      } else if (errCode === 'auth/popup-blocked') {
        errMsg = 'ব্রাউজার পপআপ ব্লক করেছে (auth/popup-blocked)';
        actionHint = 'ব্রাউজার গুগল সাইন-ইন উইন্ডো খুলতে বাধা দিয়েছে। ব্রাউজারের অ্যাড্রেস বার থেকে "Always allow popups" সিলেক্ট করুন।';
      } else if (errCode === 'auth/popup-closed-by-user') {
        errMsg = 'লগইন পপআপ উইন্ডোটি বন্ধ করা হয়েছে। আবার চেষ্টা করুন।';
      } else if (errCode === 'auth/invalid-api-key' || errCode === 'auth/api-key-not-valid') {
        errMsg = 'ভুল API Key (auth/invalid-api-key)';
        actionHint = 'সেটিংসে দেওয়া Firebase API Key সঠিক নয়। Firebase Console > Project Settings থেকে সঠিক apiKey কপি করে সেটিংসে দিন।';
      } else {
        errMsg = err.message || 'গুগল সাইন-ইনে সমস্যা দেখা দিয়েছে। আবার চেষ্টা করুন।';
        actionHint = 'আপনার ইন্টারনেট সংযোগ এবং Firebase প্রজেক্ট সেটিংস যাচাই করুন।';
      }

      return {
        success: false,
        errorCode: errCode,
        message: errMsg,
        errorActionHint: actionHint,
        copyableDomain,
      };
    }
  }

  /**
   * Log out of Firebase and local session
   */
  public async logout(): Promise<void> {
    const { auth } = initializeFirebaseInstances();
    if (auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error(e);
      }
    }
    authService.logout();
  }

  /**
   * Subscribe to Firebase Auth state
   */
  public subscribeAuthState(callback: (user: User | null) => void): () => void {
    const { auth } = initializeFirebaseInstances();
    if (!auth) {
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  }
}

export const firebaseAuthService = new FirebaseAuthService();
