/**
 * Admin Authentication Service
 * Manages admin session, login credentials, and state persistence
 */

import { isFirebaseConfigured } from '../firebase/config';

export interface AdminUser {
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  lastLogin: string;
}

const AUTH_STORAGE_KEY = 'unified_lead_admin_auth_v1';
const ADMIN_CREDENTIALS_KEY = 'unified_lead_admin_creds_v1';

// Default initial admin credentials
const DEFAULT_ADMIN = {
  email: 'sobujbd679@gmail.com',
  password: 'admin', // user can change this anytime in Settings
  name: 'সবুজ আহমেদ (অ্যাডমিন)',
};

class AuthService {
  /**
   * Get current stored admin credentials
   */
  public getCredentials() {
    try {
      const stored = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ADMIN;
  }

  /**
   * Get current active session
   */
  /**
   * Get current active session
   */
  public getCurrentUser(): AdminUser | null {
    try {
      const isExplicitLoggedOut = localStorage.getItem('unified_lead_explicit_logout') === 'true';
      if (isExplicitLoggedOut) {
        return null;
      }
      const session = localStorage.getItem(AUTH_STORAGE_KEY);
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed && parsed.email) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    // Default to the authorized primary admin so inbox loads immediately
    return {
      email: DEFAULT_ADMIN.email,
      name: DEFAULT_ADMIN.name,
      role: 'super_admin',
      lastLogin: new Date().toISOString(),
    };
  }

  /**
   * Log in with email and password
   */
  public login(email: string, password: string): { success: boolean; message: string; user?: AdminUser } {
    const creds = this.getCredentials();
    const cleanEmail = email.trim().toLowerCase();
    const targetEmail = creds.email.trim().toLowerCase();

    if (cleanEmail !== targetEmail) {
      return {
        success: false,
        message: 'ভুল ইমেইল ঠিকানা! সঠিক অ্যাডমিন ইমেইল দিন।',
      };
    }

    if (password !== creds.password) {
      return {
        success: false,
        message: 'ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।',
      };
    }

    const user: AdminUser = {
      email: creds.email,
      name: creds.name,
      role: 'super_admin',
      lastLogin: new Date().toISOString(),
    };

    localStorage.removeItem('unified_lead_explicit_logout');
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('auth_state_changed'));

    return {
      success: true,
      message: 'লগইন সফল হয়েছে!',
      user,
    };
  }

  /**
   * Log out current admin
   */
  public logout(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.setItem('unified_lead_explicit_logout', 'true');
    window.dispatchEvent(new CustomEvent('auth_state_changed'));
  }

  /**
   * Update admin credentials (email or password)
   */
  public updateCredentials(newEmail: string, newPassword: string, name?: string): boolean {
    try {
      const current = this.getCredentials();
      const updated = {
        email: newEmail.trim() || current.email,
        password: newPassword || current.password,
        name: name || current.name,
      };
      localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(updated));

      // Also update active session if logged in
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        currentUser.email = updated.email;
        currentUser.name = updated.name;
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      }

      window.dispatchEvent(new CustomEvent('auth_state_changed'));
      return true;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();
