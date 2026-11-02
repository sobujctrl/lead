import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveNavTab } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { SummaryCards } from './components/dashboard/SummaryCards';
import { LeadListView } from './components/dashboard/LeadListView';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { ReportsView } from './components/reports/ReportsView';
import { ImportExportView } from './components/integrations/ImportExportView';
import { SettingsView } from './components/settings/SettingsView';
import { LeadDetailDrawer } from './components/detail/LeadDetailDrawer';
import { AddLeadModal } from './components/modals/AddLeadModal';
import { Lead, LeadStatus } from './types/lead';
import { leadService, FirestoreErrorPayload } from './services/leadService';
import { exportLeadsToCSV } from './utils/formatters';
import { authService, AdminUser } from './services/authService';
import { firebaseAuthService, AUTHORIZED_ADMIN_EMAIL } from './services/firebaseAuthService';
import { isEmailAllowed, PRIMARY_ADMIN_EMAIL } from './config/authConfig';
import { isFirebaseConfigured, initializeFirebaseInstances } from './firebase/config';
import { AdminLoginView } from './components/auth/AdminLoginView';
import { CheckCircle2, Sparkles, X, AlertTriangle, Layers } from 'lucide-react';

export default function App() {
  const isFb = isFirebaseConfigured();

  // Authentication states
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    if (isFb) return null; // When Firebase is configured, strictly wait for Firebase Auth
    return authService.getCurrentUser();
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(() => isFb);
  const [authError, setAuthError] = useState<string | null>(null);

  // Firestore real-time error banner
  const [firestoreError, setFirestoreError] = useState<FirestoreErrorPayload | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveNavTab>('inbox');
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (isFb) return []; // Fresh state, never load old localStorage demo leads!
    return leadService.getLeads();
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFollowUpFilterActive, setIsFollowUpFilterActive] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; isDuplicate?: boolean; type?: 'success' | 'error' } | null>(null);

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('unified_lead_dark_mode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('unified_lead_dark_mode', String(isDarkMode));
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error(e);
    }
  }, [isDarkMode]);

  // Firebase Auth listener on startup (Requirement 1 & 2)
  useEffect(() => {
    if (isFb) {
      setIsAuthChecking(true);
      const unsubscribe = firebaseAuthService.subscribeAuthState(async (firebaseUser) => {
        if (firebaseUser) {
          const userEmail = (firebaseUser.email || '').toLowerCase().trim();
          if (isEmailAllowed(userEmail)) {
            const admin: AdminUser = {
              email: firebaseUser.email || userEmail,
              name: firebaseUser.displayName || userEmail.split('@')[0],
              role: userEmail === PRIMARY_ADMIN_EMAIL.toLowerCase() ? 'super_admin' : 'admin',
              lastLogin: new Date().toISOString(),
            };
            setCurrentUser(admin);
            setAuthError(null);
          } else {
            await firebaseAuthService.logout();
            setCurrentUser(null);
            setAuthError('আপনার প্রবেশের অনুমতি নেই, অ্যাডমিনের সাথে যোগাযোগ করুন');
          }
        } else {
          setCurrentUser(null);
        }
        setIsAuthChecking(false);
      });

      return () => unsubscribe();
    } else {
      setIsAuthChecking(false);
    }
  }, [isFb]);

  // Real-time Firestore onSnapshot / leads subscription (Requirement 3 & 4)
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = leadService.subscribeToLeads(
      (updatedLeads) => {
        setLeads(updatedLeads);
        setFirestoreError(null); // Clear error on successful sync
        if (selectedLead) {
          const found = updatedLeads.find((l) => l.id === selectedLead.id);
          setSelectedLead(found || null);
        }
      },
      (errorPayload) => {
        console.error('Firestore Error in App:', errorPayload);
        setFirestoreError(errorPayload);
      }
    );

    return () => unsubscribe();
  }, [currentUser, selectedLead]);

  // Auth state listener event
  useEffect(() => {
    const onAuthChange = () => {
      if (!isFb) {
        setCurrentUser(authService.getCurrentUser());
      }
    };
    window.addEventListener('auth_state_changed', onAuthChange);
    return () => window.removeEventListener('auth_state_changed', onAuthChange);
  }, [isFb]);

  // Summary statistics
  const stats = leadService.getSummaryStats(leads);

  // Direct refresh helper
  const refreshLeads = () => {
    const updated = leadService.getLeads();
    setLeads(updated);
    if (selectedLead) {
      const found = updated.find((l) => l.id === selectedLead.id);
      setSelectedLead(found || null);
    }
  };

  // Toast Notification helper
  const showToast = (text: string, isDuplicate = false, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, isDuplicate, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Actions
  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    leadService.setLeadStatus(leadId, newStatus);
    refreshLeads();
  };

  const handleToggleStar = (leadId: string) => {
    leadService.toggleStar(leadId);
    refreshLeads();
  };

  const handleUpdateLead = (id: string, updates: Partial<Lead>) => {
    leadService.updateLead(id, updates);
    refreshLeads();
    showToast('লিড সফলভাবে আপডেট করা হয়েছে!');
  };

  const handleAddNote = (leadId: string, content: string, author?: string) => {
    leadService.addNote(leadId, content, author);
    refreshLeads();
    showToast('নতুন নোট যোগ করা হয়েছে');
  };

  const handleDeleteLead = async (leadId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await leadService.deleteLead(leadId);
      if (res.success) {
        refreshLeads();
        if (selectedLead?.id === leadId) setSelectedLead(null);
        showToast(res.message, false, 'success');
        return { success: true, message: res.message };
      } else {
        showToast(res.message, false, 'error');
        return { success: false, message: res.message };
      }
    } catch (err: any) {
      const msg = `লিড মুছতে সমস্যা হয়েছে: ${err?.message || err}`;
      showToast(msg, false, 'error');
      return { success: false, message: msg };
    }
  };

  const handleLeadAdded = (result: { isDuplicate: boolean; notificationMessage: string; lead: Lead }) => {
    refreshLeads();
    showToast(result.notificationMessage, result.isDuplicate);
    setSelectedLead(result.lead);
  };

  const handleExport = () => {
    exportLeadsToCSV(leads, `unified-leads-${new Date().toISOString().split('T')[0]}.csv`);
    showToast('সব লিড CSV ফরম্যাটে ডাউনলোড হয়েছে!');
  };

  const handleResetDemo = async () => {
    if (window.confirm('আপনি কি ১৬টি প্রাথমিক ডেমো লিড লোড করতে চান?')) {
      await leadService.loadDemoLeads();
      refreshLeads();
      showToast('ডেমো ডেটাসেট সফলভাবে লোড করা হয়েছে');
    }
  };

  // 1. Loading Splash while checking Firebase Auth state
  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl animate-pulse">
          <Layers className="h-7 w-7" />
        </div>
        <p className="mt-4 text-xs font-bold text-slate-600 dark:text-slate-300">
          Firebase Authentication যাচাই হচ্ছে...
        </p>
      </div>
    );
  }

  // 2. If not authenticated, render Clean Google Login Gate (Requirement 2)
  if (!currentUser) {
    return (
      <AdminLoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setAuthError(null);
        }}
        initialError={authError || undefined}
      />
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0f172a] dark:text-slate-100 font-sans">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={stats}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={async () => {
          await firebaseAuthService.logout();
          setCurrentUser(null);
          setLeads([]);
        }}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Requirement 4: Firestore Error Banner */}
        {firestoreError && (
          <div className="flex items-center justify-between gap-3 bg-rose-600 px-4 py-2.5 text-xs text-white shadow-md animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <strong>Firestore ত্রুটি [{firestoreError.code}]:</strong> {firestoreError.details}
              </span>
            </div>
            <button
              onClick={() => setFirestoreError(null)}
              className="shrink-0 rounded bg-rose-700 hover:bg-rose-800 px-2.5 py-1 text-[11px] font-bold"
            >
              বন্ধ করুন
            </button>
          </div>
        )}

        {/* Top Header */}
        <TopHeader
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onExport={handleExport}
          onResetDemo={handleResetDemo}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* TAB 1: INBOX */}
          {activeTab === 'inbox' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <SummaryCards
                stats={stats}
                selectedSourceFilter={sourceFilter}
                onSelectSource={(src) => setSourceFilter(src)}
                isFollowUpFilterActive={isFollowUpFilterActive}
                onToggleFollowUpFilter={() => setIsFollowUpFilterActive(!isFollowUpFilterActive)}
              />

              {/* Main List and Card Views */}
              <LeadListView
                leads={leads}
                onSelectLead={(lead) => setSelectedLead(lead)}
                onQuickStatusChange={handleStatusChange}
                onToggleStar={handleToggleStar}
                sourceFilter={sourceFilter}
                onSourceFilterChange={setSourceFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onOpenAddModal={() => setIsAddModalOpen(true)}
                isFollowUpFilterActive={isFollowUpFilterActive}
                onToggleFollowUpFilter={() => setIsFollowUpFilterActive(!isFollowUpFilterActive)}
                firestoreError={firestoreError}
                onRetryFirestore={() => {
                  setFirestoreError(null);
                  refreshLeads();
                }}
              />
            </div>
          )}

          {/* TAB 2: PIPELINE (KANBAN) */}
          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    সেলস পাইপলাইন বোর্ড
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    লিড কার্ড ড্র্যাগ করে অথবা তীরের বাটনে ক্লিক করে পরবর্তী ধাপে নিন
                  </p>
                </div>
              </div>

              <KanbanBoard
                leads={leads}
                onSelectLead={(lead) => setSelectedLead(lead)}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}

          {/* TAB 3: REPORTS & ANALYTICS */}
          {activeTab === 'reports' && <ReportsView leads={leads} stats={stats} />}

          {/* TAB 4: IMPORT & INTEGRATIONS */}
          {activeTab === 'integrations' && (
            <ImportExportView
              leads={leads}
              onLeadsUpdated={refreshLeads}
              onShowToast={(msg) => showToast(msg)}
            />
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <SettingsView
              leads={leads}
              onLeadsUpdated={refreshLeads}
              onShowToast={(msg) => showToast(msg)}
            />
          )}
        </main>
      </div>

      {/* Slide-in Lead Details Panel */}
      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        onUpdateLead={handleUpdateLead}
        onAddNote={handleAddNote}
        onDeleteLead={handleDeleteLead}
      />

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onLeadAdded={handleLeadAdded}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border p-4 shadow-xl max-w-md animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            toastMessage.type === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200'
              : 'border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              toastMessage.type === 'error'
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-400'
                : toastMessage.isDuplicate
                ? 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertTriangle className="h-4 w-4" />
            ) : toastMessage.isDuplicate ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 text-xs font-medium leading-snug">
            {toastMessage.text}
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
