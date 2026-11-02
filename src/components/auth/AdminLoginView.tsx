import React, { useState } from 'react';
import {
  ShieldCheck,
  Layers,
  AlertCircle,
  Copy,
  Check,
  Globe,
  Settings,
  Flame,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { authService, AdminUser } from '../../services/authService';
import {
  firebaseAuthService,
  AUTHORIZED_ADMIN_EMAIL,
  AuthResult,
} from '../../services/firebaseAuthService';
import { ALLOWED_EMAILS } from '../../config/authConfig';
import { toBengaliNumerals } from '../../utils/formatters';
import { isFirebaseConfigured, getSavedFirebaseConfig, saveFirebaseConfig, FirebaseClientConfig } from '../../firebase/config';

interface AdminLoginViewProps {
  onLoginSuccess: (user: AdminUser) => void;
  initialError?: string;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  initialError,
}) => {
  const [authError, setAuthError] = useState<{
    code?: string;
    message: string;
    actionHint?: string;
    copyableDomain?: string;
  } | null>(initialError ? { message: initialError } : null);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const isConfigured = isFirebaseConfigured();
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  // Quick config modal states (in case user wants to review or update Firebase keys)
  const savedCfg = getSavedFirebaseConfig();
  const [apiKey, setApiKey] = useState(savedCfg?.apiKey || '');
  const [authDomain, setAuthDomain] = useState(savedCfg?.authDomain || '');
  const [projectId, setProjectId] = useState(savedCfg?.projectId || '');
  const [appId, setAppId] = useState(savedCfg?.appId || '');

  // Google Login via Firebase Authentication
  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsGoogleLoading(true);

    try {
      const res: AuthResult = await firebaseAuthService.loginWithGoogle();
      setIsGoogleLoading(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setAuthError({
          code: res.errorCode,
          message: res.message,
          actionHint: res.errorActionHint,
          copyableDomain: res.copyableDomain,
        });
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      setAuthError({
        code: err?.code || 'auth/unknown',
        message: err?.message || 'Google লগইন সম্পন্ন করা যায়নি।',
        actionHint: 'ইন্টারনেট কানেকশন ও Firebase কনসোল সেটিংস চেক করুন।',
      });
    }
  };

  const handleCopyCurrentDomain = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleSaveModalConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: FirebaseClientConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      appId: appId.trim(),
    };
    saveFirebaseConfig(newConfig);
    // Clear old mock leads and cached session
    localStorage.removeItem('unified_lead_inbox_leads_v1');
    localStorage.removeItem('unified_lead_inbox_firestore_v2');
    localStorage.removeItem('unified_lead_admin_auth_v1');
    setShowConfigModal(false);
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-center text-white relative">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight">ইউনিফাইড লিড ইনবক্স</h2>
          <p className="mt-1 text-xs text-blue-100">
            Firebase Google Authentication ও রিয়েল-টাইম Firestore
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <span className={`h-2 w-2 rounded-full ${isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{isConfigured ? 'Firebase সক্রিয় (Active)' : 'Firebase কনফিগারেশন প্রয়োজন'}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Detailed Error Alert (Requirement 4) */}
          {authError && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs dark:border-rose-900 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span className="font-bold text-rose-800 dark:text-rose-200">
                  লগইন ত্রুটি {authError.code ? `[${authError.code}]` : ''}
                </span>
              </div>
              <p className="font-medium text-[11px] leading-relaxed">{authError.message}</p>

              {authError.actionHint && (
                <div className="rounded-lg bg-white/70 p-2.5 text-[11px] text-slate-800 dark:bg-slate-900/80 dark:text-slate-300 border border-rose-200 dark:border-rose-900/50">
                  <span className="font-bold block text-rose-700 dark:text-rose-400 mb-0.5">কী করতে হবে:</span>
                  <p className="leading-relaxed">{authError.actionHint}</p>
                </div>
              )}

              {/* Authorized Domain 1-click copy box */}
              {authError.copyableDomain && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-900 px-3 py-2 text-white text-[11px] font-mono">
                  <span className="truncate">{authError.copyableDomain}</span>
                  <button
                    onClick={handleCopyCurrentDomain}
                    className="flex shrink-0 items-center gap-1 rounded bg-blue-600 px-2 py-0.5 text-[10px] font-sans font-bold hover:bg-blue-500"
                  >
                    {copiedDomain ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedDomain ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Primary Action: Only Google Sign-In (Requirement 2) */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white py-3.5 px-4 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Google যাচাই হচ্ছে...' : 'Google অ্যাকাউন্ট দিয়ে লগইন করুন'}</span>
            </button>

            {/* Designated Allowed Emails */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>অনুমোদিত ইমেইলসমূহ ({toBengaliNumerals(ALLOWED_EMAILS.length)}টি):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALLOWED_EMAILS.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center rounded-md bg-white px-2 py-0.5 font-mono text-[10px] text-slate-700 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                  >
                    {email}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Current Domain Quick Reference */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <Globe className="h-3.5 w-3.5 text-blue-600" />
                <span>বর্তমান অ্যাপ ডোমেন:</span>
              </div>
              <button
                onClick={handleCopyCurrentDomain}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {copiedDomain ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copiedDomain ? 'কপি হয়েছে' : 'কপি করুন'}</span>
              </button>
            </div>
            <p className="font-mono text-[10px] text-slate-600 dark:text-slate-400 break-all bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-700">
              {currentHostname}
            </p>
            <p className="text-[10px] text-slate-500 leading-tight">
              টিপস: Firebase Authentication এ Google লগইন কাজ করার জন্য <strong>Authentication &gt; Settings &gt; Authorized domains</strong>-এ এই ডোমেনটি যুক্ত থাকতে হবে।
            </p>
          </div>

          {/* Firebase Config Toggle / Modal trigger */}
          <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowConfigModal(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Firebase কনফিগারেশন পরিবর্তন করতে চান?</span>
            </button>
          </div>
        </div>
      </div>

      {/* Firebase Config Quick Editor Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-xs space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Firebase Web App কনফিগারেশন
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModalConfig} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Auth Domain
                </label>
                <input
                  type="text"
                  required
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  placeholder="project-id.firebaseapp.com"
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Project ID
                  </label>
                  <input
                    type="text"
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="project-id"
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    App ID
                  </label>
                  <input
                    type="text"
                    required
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="1:1234:web:abcd"
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="rounded-lg px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 shadow-xs"
                >
                  সংরক্ষণ ও রিলোড
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
