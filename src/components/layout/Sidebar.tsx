import React from 'react';
import {
  Inbox,
  Kanban,
  BarChart3,
  Webhook,
  Settings,
  PlusCircle,
  Moon,
  Sun,
  Layers,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { SummaryStats } from '../../services/leadService';
import { toBengaliNumerals } from '../../utils/formatters';
import { AdminUser } from '../../services/authService';
import { PRIMARY_ADMIN_EMAIL } from '../../config/authConfig';

export type ActiveNavTab = 'inbox' | 'pipeline' | 'reports' | 'integrations' | 'settings';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onTabChange: (tab: ActiveNavTab) => void;
  stats: SummaryStats;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAddModal: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  currentUser?: AdminUser | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  stats,
  isDarkMode,
  onToggleDarkMode,
  onOpenAddModal,
  isMobileOpen,
  onCloseMobile,
  currentUser,
  onLogout,
}) => {
  const navItems = [
    {
      id: 'inbox' as ActiveNavTab,
      label: 'ইনবক্স',
      sublabel: 'সব সোর্সের লিড তালিকা',
      icon: Inbox,
      badge: stats.todayNewLeads > 0 ? `${toBengaliNumerals(stats.todayNewLeads)} নতুন` : undefined,
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      id: 'pipeline' as ActiveNavTab,
      label: 'পাইপলাইন',
      sublabel: 'কানবান সেলস বোর্ড',
      icon: Kanban,
      badge: stats.totalLeads > 0 ? toBengaliNumerals(stats.totalLeads) : undefined,
      badgeColor: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      id: 'reports' as ActiveNavTab,
      label: 'রিপোর্ট ও অ্যানালিটিক্স',
      sublabel: 'গ্রাফ ও কনভার্সন চার্ট',
      icon: BarChart3,
    },
    {
      id: 'integrations' as ActiveNavTab,
      label: 'ইমপোর্ট ও ইন্টিগ্রেশন',
      sublabel: 'CSV ও Webhook ইনটেক',
      icon: Webhook,
    },
    {
      id: 'settings' as ActiveNavTab,
      label: 'সেটিংস',
      sublabel: 'টিম ও ডেটা ব্যাকআপ',
      icon: Settings,
    },
  ];

  const handleNavClick = (tab: ActiveNavTab) => {
    onTabChange(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/80 bg-white shadow-sm transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-[#1e293b] lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 px-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-slate-900 dark:text-white">
                লিড ইনবক্স
              </span>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Unified Lead CRM
              </span>
            </div>
          </div>
        </div>

        {/* Quick Add CTA */}
        <div className="p-4">
          <button
            onClick={onOpenAddModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-blue-500/40"
          >
            <PlusCircle className="h-4 w-4" />
            <span>নতুন লিড যোগ করুন</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50/90 text-blue-700 shadow-xs dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200'
                    }`}
                  />
                  <div className="truncate">
                    <span className="block truncate font-semibold leading-tight">{item.label}</span>
                    <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {item.sublabel}
                    </span>
                  </div>
                </div>
                {item.badge && (
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live Channel Status Widget in Sidebar */}
        <div className="mx-3 mb-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              সোর্স সারসংক্ষেপ
            </span>
            <span className="text-[11px] font-normal text-slate-500">মোট {toBengaliNumerals(stats.totalLeads)}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
            <div className="rounded-lg bg-blue-50/80 p-1.5 dark:bg-blue-950/50">
              <span className="block text-[10px] font-medium text-blue-600 dark:text-blue-400">Facebook</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {toBengaliNumerals(stats.facebookCount)}
              </span>
            </div>
            <div className="rounded-lg bg-indigo-50/80 p-1.5 dark:bg-indigo-950/50">
              <span className="block text-[10px] font-medium text-indigo-600 dark:text-indigo-400">Messenger</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {toBengaliNumerals(stats.messengerCount)}
              </span>
            </div>
            <div className="rounded-lg bg-emerald-50/80 p-1.5 dark:bg-emerald-950/50">
              <span className="block text-[10px] font-medium text-emerald-600 dark:text-emerald-400">WhatsApp</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {toBengaliNumerals(stats.whatsappCount)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer info & Dark Mode */}
        <div className="border-t border-slate-200/80 p-3 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-xs">
                {currentUser?.name ? currentUser.name.charAt(0) : 'অ'}
              </div>
              <div className="text-xs truncate">
                <span className="block font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {currentUser?.name || 'অ্যাডমিন'}
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  {currentUser?.email || PRIMARY_ADMIN_EMAIL}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onToggleDarkMode}
                className="flex items-center justify-center rounded-lg p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200 dark:text-amber-400 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700/80 dark:hover:text-amber-300 transition-colors shadow-2xs"
                title={isDarkMode ? 'লাইট মোড অন করুন' : 'ডার্ক মোড অন করুন'}
                aria-label={isDarkMode ? 'লাইট মোড অন করুন' : 'ডার্ক মোড অন করুন'}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors"
                  title="লগআউট করুন"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
