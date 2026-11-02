import React from 'react';
import { Users, Calendar, PhoneCall, TrendingUp, MessageSquare } from 'lucide-react';
import { SummaryStats } from '../../services/leadService';
import { toBengaliNumerals, formatTaka } from '../../utils/formatters';
import { FacebookIcon, MessengerIcon, WhatsAppIcon } from '../common/SourceBadge';

interface SummaryCardsProps {
  stats: SummaryStats;
  selectedSourceFilter: string;
  onSelectSource: (source: string) => void;
  isFollowUpFilterActive: boolean;
  onToggleFollowUpFilter: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  stats,
  selectedSourceFilter,
  onSelectSource,
  isFollowUpFilterActive,
  onToggleFollowUpFilter,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {/* 1. Total Leads */}
      <div
        onClick={() => onSelectSource('all')}
        className={`group cursor-pointer rounded-xl border p-3.5 transition-all hover:shadow-sm ${
          selectedSourceFilter === 'all' && !isFollowUpFilterActive
            ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500 dark:border-blue-400 dark:bg-blue-950/30'
            : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-700/80 dark:bg-[#1e293b] dark:hover:border-slate-600'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span className="text-xs font-semibold">মোট লিড</span>
          <div className="rounded-lg bg-slate-100 p-1.5 dark:bg-slate-800">
            <Users className="h-4 w-4 text-slate-700 dark:text-slate-300" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
            {toBengaliNumerals(stats.totalLeads)}
          </span>
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {formatTaka(stats.totalEstimatedPipelineValue)}
          </span>
        </div>
      </div>

      {/* 2. Today's New Leads */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-700/80 dark:bg-[#1e293b]">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span className="text-xs font-semibold">আজকের নতুন</span>
          <div className="rounded-lg bg-blue-100/70 p-1.5 dark:bg-blue-950">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-blue-600 tabular-nums dark:text-blue-400">
            {toBengaliNumerals(stats.todayNewLeads)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">আজ প্রাপ্ত</span>
        </div>
      </div>

      {/* 3. Facebook Leads */}
      <div
        onClick={() => onSelectSource('facebook')}
        className={`group cursor-pointer rounded-xl border p-3.5 transition-all hover:shadow-sm ${
          selectedSourceFilter === 'facebook'
            ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 dark:border-blue-400 dark:bg-blue-950/40'
            : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-700/80 dark:bg-[#1e293b] dark:hover:border-slate-600'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Facebook</span>
          <div className="rounded-lg bg-blue-50 p-1.5 dark:bg-blue-950">
            <FacebookIcon className="h-4 w-4 text-[#1877F2]" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-[#1877F2] tabular-nums">
            {toBengaliNumerals(stats.facebookCount)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {stats.totalLeads > 0
              ? `${toBengaliNumerals(Math.round((stats.facebookCount / stats.totalLeads) * 100))}%`
              : '০%'}
          </span>
        </div>
      </div>

      {/* 4. Messenger Leads */}
      <div
        onClick={() => onSelectSource('messenger')}
        className={`group cursor-pointer rounded-xl border p-3.5 transition-all hover:shadow-sm ${
          selectedSourceFilter === 'messenger'
            ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500 dark:border-indigo-400 dark:bg-indigo-950/40'
            : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-700/80 dark:bg-[#1e293b] dark:hover:border-slate-600'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Messenger</span>
          <div className="rounded-lg bg-indigo-50 p-1.5 dark:bg-indigo-950">
            <MessengerIcon className="h-4 w-4 text-[#0084FF]" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-indigo-600 tabular-nums dark:text-indigo-400">
            {toBengaliNumerals(stats.messengerCount)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {stats.totalLeads > 0
              ? `${toBengaliNumerals(Math.round((stats.messengerCount / stats.totalLeads) * 100))}%`
              : '০%'}
          </span>
        </div>
      </div>

      {/* 5. WhatsApp Leads */}
      <div
        onClick={() => onSelectSource('whatsapp')}
        className={`group cursor-pointer rounded-xl border p-3.5 transition-all hover:shadow-sm ${
          selectedSourceFilter === 'whatsapp'
            ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 dark:border-emerald-400 dark:bg-emerald-950/40'
            : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-700/80 dark:bg-[#1e293b] dark:hover:border-slate-600'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">WhatsApp</span>
          <div className="rounded-lg bg-emerald-50 p-1.5 dark:bg-emerald-950">
            <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400">
            {toBengaliNumerals(stats.whatsappCount)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {stats.totalLeads > 0
              ? `${toBengaliNumerals(Math.round((stats.whatsappCount / stats.totalLeads) * 100))}%`
              : '০%'}
          </span>
        </div>
      </div>

      {/* 6. Today's Follow-up */}
      <div
        onClick={onToggleFollowUpFilter}
        className={`group cursor-pointer rounded-xl border p-3.5 transition-all hover:shadow-sm ${
          isFollowUpFilterActive
            ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500 dark:border-amber-400 dark:bg-amber-950/40'
            : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-700/80 dark:bg-[#1e293b] dark:hover:border-slate-600'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">আজকের ফলো-আপ</span>
          <div className="rounded-lg bg-amber-100/70 p-1.5 dark:bg-amber-950">
            <PhoneCall className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-amber-600 tabular-nums dark:text-amber-400">
            {toBengaliNumerals(stats.todayFollowUpCount)}
          </span>
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
            {isFollowUpFilterActive ? 'ফিল্টার চালু' : 'পেন্ডিং'}
          </span>
        </div>
      </div>

      {/* 7. Unread Messages */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-700/80 dark:bg-[#1e293b]">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span className="text-xs font-semibold">অপঠিত মেসেজ</span>
          <div className="rounded-lg bg-rose-100/70 p-1.5 dark:bg-rose-950">
            <MessageSquare className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-rose-600 tabular-nums dark:text-rose-400">
            {toBengaliNumerals(stats.unreadCount || 0)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">নতুন বার্তা</span>
        </div>
      </div>
    </div>
  );
};
