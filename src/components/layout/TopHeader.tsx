import React from 'react';
import { Menu, Plus, Search, RotateCcw, Download, Moon, Sun } from 'lucide-react';
import { ActiveNavTab } from './Sidebar';

interface TopHeaderProps {
  activeTab: ActiveNavTab;
  onOpenMobileMenu: () => void;
  onOpenAddModal: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onExport: () => void;
  onResetDemo: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const TAB_TITLES: Record<ActiveNavTab, { title: string; subtitle: string }> = {
  inbox: {
    title: 'ইউনিফাইড লিড ইনবক্স',
    subtitle: 'Facebook, Messenger ও WhatsApp-এর সব লিড এক জায়গায়',
  },
  pipeline: {
    title: 'সেলস পাইপলাইন কানবান',
    subtitle: 'লিডের বর্তমান অবস্থা ও ফলো-আপ স্ট্যাটাস ট্র্যাক করুন',
  },
  reports: {
    title: 'রিপোর্ট ও অ্যানালিটিক্স',
    subtitle: 'সোর্স বিতরণ, দৈনিক লিড গ্রোথ ও কনভার্সন রেট',
  },
  integrations: {
    title: 'ইমপোর্ট ও অটোমেশন ইন্টিগ্রেশন',
    subtitle: 'CSV থেকে লিড ইমপোর্ট ও n8n/Zapier/Make Webhook কানেকশন',
  },
  settings: {
    title: 'সেটিংস ও ডেটা ব্যবস্থাপনা',
    subtitle: 'টিম মেম্বার, ট্যাগ ও ডেটা ব্যাকআপ কনফিগারেশন',
  },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  onOpenAddModal,
  searchQuery,
  onSearchChange,
  onExport,
  onResetDemo,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const currentTab = TAB_TITLES[activeTab];

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-[#1e293b]/95 sm:px-6">
      {/* Left: Mobile hamburger & Titles */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          title="মেনু খুলুন"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
            {currentTab.title}
          </h1>
          <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
            {currentTab.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Search and Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {activeTab === 'inbox' && (
          <div className="relative hidden w-48 md:block lg:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="নাম বা ফোন দিয়ে খুঁজুন..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-100 dark:focus:border-blue-400"
            />
          </div>
        )}

        {/* Export CSV button */}
        <button
          onClick={onExport}
          className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60 sm:inline-flex"
          title="CSV এক্সপোর্ট"
        >
          <Download className="h-3.5 w-3.5 text-slate-500" />
          <span>এক্সপোর্ট</span>
        </button>

        {/* Reset Demo leads button */}
        <button
          onClick={onResetDemo}
          className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60 lg:inline-flex"
          title="ডেমো ডেটা রিসেট"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
          <span>রিসেট</span>
        </button>

        {/* Dark/Light mode toggle in Top Header */}
        {onToggleDarkMode && (
          <button
            onClick={onToggleDarkMode}
            className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-400 dark:hover:bg-slate-700/60 shadow-2xs transition"
            title={isDarkMode ? 'লাইট মোড অন করুন' : 'ডার্ক মোড অন করুন'}
            aria-label={isDarkMode ? 'লাইট মোড অন করুন' : 'ডার্ক মোড অন করুন'}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}

        {/* Primary CTA button */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">নতুন লিড</span>
          <span className="sm:hidden">লিড</span>
        </button>
      </div>
    </header>
  );
};
