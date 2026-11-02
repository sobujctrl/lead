import React, { useState, useEffect } from 'react';
import {
  Users,
  Tag,
  Database,
  RotateCcw,
  Download,
  Upload,
  CheckCircle,
  ShieldCheck,
  Plus,
  Trash2,
  HardDrive,
  KeyRound,
  Flame,
  Check,
  HelpCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Mail,
  UserCheck,
} from 'lucide-react';
import { Lead } from '../../types/lead';
import { leadService } from '../../services/leadService';
import { authService } from '../../services/authService';
import {
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  isFirebaseConfigured,
  FirebaseClientConfig,
} from '../../firebase/config';
import { ALLOWED_EMAILS, PRIMARY_ADMIN_EMAIL } from '../../config/authConfig';
import { TEAM_MEMBERS, PRESET_TAGS, toBengaliNumerals } from '../../utils/formatters';

interface SettingsViewProps {
  leads: Lead[];
  onLeadsUpdated: () => void;
  onShowToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  leads,
  onLeadsUpdated,
  onShowToast,
}) => {
  const [teamMembers, setTeamMembers] = useState<string[]>(TEAM_MEMBERS);
  const [newMember, setNewMember] = useState('');
  const [tags, setTags] = useState<string[]>(PRESET_TAGS);
  const [newTag, setNewTag] = useState('');

  // Firebase Config State
  const savedConfig = getSavedFirebaseConfig();
  const [apiKey, setApiKey] = useState(savedConfig?.apiKey || '');
  const [authDomain, setAuthDomain] = useState(savedConfig?.authDomain || 'post-510005.firebaseapp.com');
  const [projectId, setProjectId] = useState(savedConfig?.projectId || 'post-510005');
  const [storageBucket, setStorageBucket] = useState(savedConfig?.storageBucket || 'post-510005.appspot.com');
  const [messagingSenderId, setMessagingSenderId] = useState(savedConfig?.messagingSenderId || '');
  const [appId, setAppId] = useState(savedConfig?.appId || '');
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false);
  const [isFirebaseSaving, setIsFirebaseSaving] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  // Admin Credentials State
  const initialCreds = authService.getCredentials();
  const [adminEmail, setAdminEmail] = useState(initialCreds.email);
  const [adminPassword, setAdminPassword] = useState(initialCreds.password);
  const [adminName, setAdminName] = useState(initialCreds.name);
  const [isCredsSaved, setIsCredsSaved] = useState(false);

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFirebaseSaving(true);

    const config: FirebaseClientConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    saveFirebaseConfig(config);

    // CRITICAL: Clear legacy localStorage mock leads & session
    localStorage.removeItem('unified_lead_inbox_leads_v1');
    localStorage.removeItem('unified_lead_inbox_firestore_v2');
    localStorage.removeItem('unified_lead_admin_auth_v1');

    setIsFirebaseConnected(true);
    setIsFirebaseSaving(false);
    onShowToast('Firebase কনফিগারেশন সংরক্ষিত! এখন Google দিয়ে লগইন করুন।');

    // Notify auth change
    window.dispatchEvent(new CustomEvent('auth_state_changed'));
  };

  const handleUpdateCreds = (e: React.FormEvent) => {
    e.preventDefault();
    authService.updateCredentials(adminEmail, adminPassword, adminName);
    setIsCredsSaved(true);
    setTimeout(() => setIsCredsSaved(false), 2500);
    onShowToast('অ্যাডমিন তথ্য সফলভাবে আপডেট করা হয়েছে!');
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMember.trim() && !teamMembers.includes(newMember.trim())) {
      setTeamMembers([...teamMembers, newMember.trim()]);
      setNewMember('');
      onShowToast(`টিম মেম্বার "${newMember.trim()}" যোগ করা হয়েছে`);
    }
  };

  const handleRemoveMember = (name: string) => {
    setTeamMembers(teamMembers.filter((m) => m !== name));
    onShowToast(`টিম মেম্বার "${name}" মুছে ফেলা হয়েছে`);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      onShowToast(`ট্যাগ "${newTag.trim()}" তৈরি হয়েছে`);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    onShowToast(`ট্যাগ "${tag}" মুছে ফেলা হয়েছে`);
  };

  // Requirement 5: Load demo leads on explicit button click
  const handleLoadDemoLeads = async () => {
    if (window.confirm('আপনি কি ১৬টি ডেমো লিড লোড করতে চান?')) {
      const count = await leadService.loadDemoLeads();
      onLeadsUpdated();
      onShowToast(`সফলভাবে ${toBengaliNumerals(count)} টি ডেমো লিড লোড করা হয়েছে!`);
    }
  };

  // Requirement 5: Delete only demo leads, preserving real user-added leads
  const handleDeleteDemoLeads = async () => {
    if (
      window.confirm(
        'আপনি কি নিশ্চিত যে ডেমো লিডগুলো মুছে ফেলতে চান? আপনার তৈরি করা বা ইমপোর্ট করা আসল লিডগুলো অক্ষত থাকবে।'
      )
    ) {
      const res = await leadService.deleteDemoLeads();
      onLeadsUpdated();
      onShowToast(
        `সফলভাবে ${toBengaliNumerals(res.deletedCount)} টি ডেমো লিড মুছে ফেলা হয়েছে! বর্তমান আসল লিড: ${toBengaliNumerals(
          res.remainingCount
        )} টি।`
      );
    }
  };

  // Clear all leads completely
  const handleClearAllLeads = async () => {
    if (window.confirm('সতর্কতা: আপনি কি ইনবক্সের সমস্ত লিড স্থায়ীভাবে মুছে ফেলতে চান?')) {
      await leadService.clearAllLeads();
      onLeadsUpdated();
      onShowToast('সমস্ত লিড মুছে ফেলা হয়েছে!');
    }
  };

  // Export full JSON database backup
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(leads, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `leads-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast('সম্পূর্ণ ডাটাবেজ ব্যাকআপ ডাউনলোড সম্পন্ন!');
  };

  // Restore JSON database backup
  const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          leadService.saveLeads(parsed);
          onLeadsUpdated();
          onShowToast(`ব্যাকআপ থেকে ${parsed.length} টি লিড সফলভাবে রিস্টোর করা হয়েছে!`);
        } else {
          alert('ভুল ফরম্যাট: ব্যাকআপ ফাইলটি লিডের অ্যারে হতে হবে।');
        }
      } catch (err) {
        alert('JSON ফাইলটি পড়তে সমস্যা হয়েছে। সঠিক ফাইল নির্বাচন করুন।');
      }
    };
    reader.readAsText(file);
  };

  const allowedRulesEmails = ALLOWED_EMAILS.map((e) => `'${e.toLowerCase()}'`).join(',\n               ');
  const firestoreRulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAllowed() {
      return request.auth != null && 
             request.auth.token.email.lower() in [
               ${allowedRulesEmails}
             ];
    }
    match /leads/{leadId} {
      allow read, write: if isAllowed();
    }
    match /settings/{settingId} {
      allow read, write: if isAllowed();
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Firebase Integration & Setup Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Firebase Firestore ও Auth ইন্টিগ্রেশন
                </h3>
                {isFirebaseConnected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <Check className="h-3 w-3" />
                    সংযুক্ত
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                    কনফিগারেশন বাকি
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Google Authentication ও ক্লাউড ফায়ারস্টোর রিয়েল-টাইম ডেটাবেজ
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowFirebaseGuide(!showFirebaseGuide)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <HelpCircle className="h-4 w-4" />
            <span>কীভাবে সেটআপ করবেন?</span>
            {showFirebaseGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Step-by-Step Setup Guide Accordion */}
        {showFirebaseGuide && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs dark:border-blue-900 dark:bg-blue-950/40 text-slate-800 dark:text-slate-200 space-y-3">
            <h4 className="font-bold text-blue-900 dark:text-blue-200">
              Firebase সেটআপ করার সহজ ৪টি ধাপ:
            </h4>
            <ol className="list-decimal pl-5 space-y-2 text-[12px] leading-relaxed">
              <li>
                <strong>প্রজেক্ট তৈরি:</strong>{' '}
                <a
                  href="https://console.firebase.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline font-semibold"
                >
                  console.firebase.google.com
                </a>
                -এ গিয়ে "Add project"-এ ক্লিক করে একটি প্রজেক্ট তৈরি করুন।
              </li>
              <li>
                <strong>Authentication চালু:</strong> বাম পাশের মেনু থেকে <strong>Build &gt; Authentication</strong>-এ যান। <strong>Sign-in method</strong> ট্যাবে গিয়ে <strong>Google</strong> সিলেক্ট করে Enable করুন এবং আপনার সাপোর্ট ইমেইল ({PRIMARY_ADMIN_EMAIL}) দিন।
              </li>
              <li>
                <strong>Authorized Domains যোগ:</strong> Authentication-এর <strong>Settings &gt; Authorized domains</strong> ট্যাবে গিয়ে <strong>Add domain</strong>-এ ক্লিক করে আপনার বর্তমান অ্যাপ ডোমেনটি (<code className="font-mono bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded text-[11px]">{typeof window !== 'undefined' ? window.location.hostname : ''}</code>) যোগ করুন। এটি না করলে <code>auth/unauthorized-domain</code> এরর আসবে।
              </li>
              <li>
                <strong>Firestore Database তৈরি:</strong> <strong>Build &gt; Firestore Database</strong>-এ ক্লিক করে "Create database" করুন।
              </li>
              <li>
                <strong>Security Rules পেস্ট:</strong> Firestore-এর <strong>Rules</strong> ট্যাবে গিয়ে নিচের কোডটি পেস্ট করে "Publish" করুন:
              </li>
            </ol>

            {/* Copyable Rules Snippet */}
            <div className="relative rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(firestoreRulesText);
                  setCopiedRules(true);
                  setTimeout(() => setCopiedRules(false), 2000);
                }}
                className="absolute right-2 top-2 rounded-md bg-white/10 px-2 py-1 text-[10px] text-white hover:bg-white/20 transition flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                <span>{copiedRules ? 'কপি হয়েছে!' : 'রুলস কপি করুন'}</span>
              </button>
              <pre>{firestoreRulesText}</pre>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              ৫. সবশেষে <strong>Project Settings (গিয়ার আইকন) &gt; General &gt; Your apps</strong> থেকে ওয়েব অ্যাপ (<code>&lt;/&gt;</code>) রেজিস্টার করে নিচের ইনপুটগুলোতে তথ্যগুলো পেস্ট করুন:
            </p>
          </div>
        )}

        {/* Firebase Config Form */}
        <form onSubmit={handleSaveFirebaseConfig} className="mt-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                API Key <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Auth Domain <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                placeholder="your-app.firebaseapp.com"
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Project ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="your-project-id"
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Storage Bucket
              </label>
              <input
                type="text"
                value={storageBucket}
                onChange={(e) => setStorageBucket(e.target.value)}
                placeholder="your-app.appspot.com"
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Messaging Sender ID
              </label>
              <input
                type="text"
                value={messagingSenderId}
                onChange={(e) => setMessagingSenderId(e.target.value)}
                placeholder="1029384756..."
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                App ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1:102938:web:abcdef"
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isFirebaseSaving}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <span>{isFirebaseSaving ? 'কানেক্ট হচ্ছে...' : 'Firebase কনফিগারেশন সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Authorized Accounts (অনুমোদিত অ্যাকাউন্ট) */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  অনুমোদিত অ্যাকাউন্ট
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                  {toBengaliNumerals(ALLOWED_EMAILS.length)}টি অনুমোদিত
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                শুধুমাত্র এই ইমেইলগুলো Google অ্যাকাউন্ট দিয়ে সিস্টেমে প্রবেশাধিকার পাবে
              </p>
            </div>
          </div>
        </div>

        {/* List of Allowed Emails */}
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-slate-50/50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-800/30">
          {ALLOWED_EMAILS.map((email, idx) => {
            const isPrimary = idx === 0;
            return (
              <div
                key={email}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white font-bold text-slate-600 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-[11px]">
                    {toBengaliNumerals(idx + 1)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      isPrimary
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    <UserCheck className="h-3 w-3" />
                    <span>{isPrimary ? 'প্রধান অ্যাডমিন' : 'অনুমোদিত মেম্বার'}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(email);
                      onShowToast(`ইমেইল (${email}) কপি হয়েছে!`);
                    }}
                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    title="ইমেইল কপি করুন"
                  >
                    <Copy className="h-3 w-3" />
                    <span>কপি</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Centralized config guide banner */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs dark:border-indigo-950 dark:bg-indigo-950/30 text-slate-700 dark:text-slate-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300 text-[11px]">
            <KeyRound className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>কীভাবে নতুন ইমেইল যোগ বা বাদ দেবেন?</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            তালিকাটি কোডের <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-indigo-700 border border-indigo-200 dark:bg-slate-900 dark:border-indigo-900 dark:text-indigo-300">src/config/authConfig.ts</code> ফাইলে <code className="font-mono font-bold">ALLOWED_EMAILS</code> অ্যারে হিসেবে সংরক্ষিত আছে। সেখানে যেকোনো ইমেইল যুক্ত করলে বা বাদ দিলে তা সরাসরি কার্যকর হবে।
          </p>
        </div>

        {/* Local Admin Profile Details */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2">
            অ্যাডমিন প্রোফাইল ও অফলাইন ব্যাকআপ পাসওয়ার্ড
          </div>
          <form onSubmit={handleUpdateCreds} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                অ্যাডমিনের নাম
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                প্রধান অ্যাডমিন ইমেইল
              </label>
              <input
                type="email"
                disabled
                value={PRIMARY_ADMIN_EMAIL}
                className="w-full rounded-lg border border-slate-200 bg-slate-100 p-2 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-not-allowed"
                title="src/config/authConfig.ts থেকে পরিচালিত"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                ব্যাকআপ পাসওয়ার্ড
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition shrink-0"
                >
                  {isCredsSaved ? 'সংরক্ষিত!' : 'আপডেট'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* 3. Demo Leads & Database Controls (Requirement 5) */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800">
          <Database className="h-4 w-4 text-emerald-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              ডেমো লিড ও ডেটাবেজ ব্যবস্থাপনা
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              ডেমো ডেটা লোড করুন অথবা এক ক্লিকে সম্পূর্ণ খালি করুন
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Requirement 5: Load Demo Leads on user demand */}
          <button
            onClick={handleLoadDemoLeads}
            className="flex flex-col items-center justify-center rounded-xl border border-blue-200 bg-blue-50/40 p-4 text-center hover:border-blue-500 hover:bg-blue-50 transition dark:border-blue-900/60 dark:bg-blue-950/20"
          >
            <RotateCcw className="h-5 w-5 text-blue-600 mb-1.5" />
            <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
              ডেমো ডেটা লোড করুন
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">১৬টি টেস্ট লিড যুক্ত করুন</span>
          </button>

          {/* Requirement 5: Delete only Demo Leads */}
          <button
            onClick={handleDeleteDemoLeads}
            className="flex flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-center hover:border-amber-500 hover:bg-amber-50 transition dark:border-amber-900/60 dark:bg-amber-950/20"
          >
            <Trash2 className="h-5 w-5 text-amber-600 mb-1.5" />
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
              সব ডেমো লিড মুছুন
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">শুধুমাত্র আসল লিডগুলো থাকবে</span>
          </button>

          {/* Clear All Leads */}
          <button
            onClick={handleClearAllLeads}
            className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/40 p-4 text-center hover:border-rose-500 hover:bg-rose-50 transition dark:border-rose-900/60 dark:bg-rose-950/20"
          >
            <Trash2 className="h-5 w-5 text-rose-600 mb-1.5" />
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
              সব লিড মুছে ফেলুন
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">ইনবক্স সম্পূর্ণ খালি করুন</span>
          </button>

          {/* Export JSON Backup */}
          <button
            onClick={handleExportJSON}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 p-4 text-center hover:border-slate-400 hover:bg-slate-50 transition dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Download className="h-5 w-5 text-slate-600 mb-1.5 dark:text-slate-300" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              JSON ব্যাকআপ ডাউনলোড
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">ফাইল হিসেবে ব্যাকআপ নিন</span>
          </button>
        </div>
      </div>

      {/* 4. Team Members */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800">
          <Users className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            সেলস ও সাপোর্ট টিম মেম্বার
          </h3>
        </div>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          লিড বণ্টন ও অ্যাসাইন করার জন্য টিম সদস্যদের নাম:
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {teamMembers.map((member) => (
            <div
              key={member}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span>{member}</span>
              <button
                onClick={() => handleRemoveMember(member)}
                className="text-slate-400 hover:text-rose-600"
                title="মুছে ফেলুন"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddMember} className="mt-4 flex max-w-sm gap-2">
          <input
            type="text"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            placeholder="নতুন মেম্বারের নাম..."
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>যোগ করুন</span>
          </button>
        </form>
      </div>

      {/* 5. Lead Tags */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800">
          <Tag className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            কাস্টম লিড ট্যাগসমূহ
          </h3>
        </div>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          লিড ফিল্টার ও ক্যাটাগরাইজ করতে নিচের ট্যাগগুলো ব্যবহার করা হয়:
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag}
              className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <span>{tag}</span>
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-amber-500 hover:text-rose-600"
                title="মুছে ফেলুন"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddTag} className="mt-4 flex max-w-sm gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="নতুন ট্যাগ লিখুন..."
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>ট্যাগ তৈরি করুন</span>
          </button>
        </form>
      </div>
    </div>
  );
};
