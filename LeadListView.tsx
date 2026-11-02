import React, { useState } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  Phone,
  MessageSquare,
  Clock,
  Tag,
  Star,
  ChevronRight,
  UserCheck,
  Calendar,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { Lead, LeadSource, LeadStatus } from '../../types/lead';
import { FirestoreErrorPayload } from '../../services/leadService';
import { SourceBadge, FacebookIcon, MessengerIcon, WhatsAppIcon, ManualIcon } from '../common/SourceBadge';
import { StatusBadge } from '../common/StatusBadge';
import { ChannelBadge, resolveMessageChannel } from '../common/ChannelBadge';
import { PageBadge } from '../common/PageBadge';
import {
  formatBanglaDateTime,
  formatBanglaDateOnly,
  formatTaka,
  toBengaliNumerals,
  STATUS_LABELS,
  PRESET_TAGS,
  TEAM_MEMBERS,
} from '../../utils/formatters';
import { formatBdPhoneNumber, getWhatsAppLink, getPhoneCallLink } from '../../utils/phone';

interface LeadListViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onQuickStatusChange: (leadId: string, status: LeadStatus) => void;
  onToggleStar: (leadId: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (source: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAddModal: () => void;
  isFollowUpFilterActive: boolean;
  onToggleFollowUpFilter: () => void;
  firestoreError?: FirestoreErrorPayload | null;
  onRetryFirestore?: () => void;
}

export const LeadListView: React.FC<LeadListViewProps> = ({
  leads,
  onSelectLead,
  onQuickStatusChange,
  onToggleStar,
  sourceFilter,
  onSourceFilterChange,
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  isFollowUpFilterActive,
  onToggleFollowUpFilter,
  firestoreError,
  onRetryFirestore,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [postFilter, setPostFilter] = useState<string>('all');
  const [pageFilter, setPageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'value'>('newest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Compute unique posts for filter dropdown and lead counts
  const postMap: Record<string, { count: number; link?: string }> = {};
  leads.forEach((l) => {
    if (l.lastPostId) {
      if (!postMap[l.lastPostId]) {
        postMap[l.lastPostId] = { count: 0, link: l.lastPostLink };
      }
      postMap[l.lastPostId].count++;
    }
  });
  const uniquePosts = Object.entries(postMap).map(([postId, data]) => ({
    postId,
    count: data.count,
    link: data.link,
  }));

  // Compute unique pages for filter dropdown and lead counts
  const pageMap: Record<string, { count: number; name: string }> = {};
  leads.forEach((l) => {
    if (l.pageName || l.pageId) {
      const key = l.pageId || l.pageName || 'unknown';
      const displayName = l.pageName || `Page (${l.pageId})`;
      if (!pageMap[key]) {
        pageMap[key] = { count: 0, name: displayName };
      }
      pageMap[key].count++;
    }
  });
  const uniquePages = Object.entries(pageMap).map(([pageKey, data]) => ({
    pageKey,
    name: data.name,
    count: data.count,
  }));

  // Tab configuration
  const sourceTabs: { id: string; label: string; icon: React.ReactNode; count: number }[] = [
    {
      id: 'all',
      label: 'সব লিড',
      icon: null,
      count: leads.length,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: <FacebookIcon className="w-3.5 h-3.5 text-[#1877F2]" />,
      count: leads.filter((l) => l.sources.includes('facebook') || l.source === 'facebook').length,
    },
    {
      id: 'messenger',
      label: 'Messenger',
      icon: <MessengerIcon className="w-3.5 h-3.5 text-[#0084FF]" />,
      count: leads.filter((l) => l.sources.includes('messenger') || l.source === 'messenger').length,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />,
      count: leads.filter((l) => l.sources.includes('whatsapp') || l.source === 'whatsapp').length,
    },
    {
      id: 'manual',
      label: 'ম্যানুয়াল',
      icon: <ManualIcon className="w-3.5 h-3.5 text-slate-500" />,
      count: leads.filter((l) => l.sources.includes('manual') || l.source === 'manual').length,
    },
  ];

  // Filtering Logic
  const today = new Date().toISOString().split('T')[0];

  const filteredLeads = leads
    .filter((lead) => {
      // 1. Source Tab
      if (sourceFilter !== 'all') {
        const matchesSource = lead.sources.includes(sourceFilter as LeadSource) || lead.source === sourceFilter;
        if (!matchesSource) return false;
      }

      // 2. Search Query (name or phone or messengerId or product)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = lead.name.toLowerCase().includes(q);
        const phoneMatch = Boolean(
          (lead.phone && lead.phone.includes(q)) ||
          (lead.originalPhone && lead.originalPhone.includes(q))
        );
        const messengerMatch = Boolean(lead.messengerId && lead.messengerId.toLowerCase().includes(q));
        const productMatch = lead.productInterest.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !messengerMatch && !productMatch) return false;
      }


      // 3. Status Filter
      if (statusFilter !== 'all' && lead.status !== statusFilter) {
        return false;
      }

      // 4. Tag Filter
      if (tagFilter !== 'all' && !lead.tags.includes(tagFilter)) {
        return false;
      }

      // 5. Assigned Filter
      if (assignedFilter !== 'all') {
        if (assignedFilter === 'unassigned') {
          if (lead.assignedTo) return false;
        } else if (lead.assignedTo !== assignedFilter) {
          return false;
        }
      }

      // 6. Follow-up Filter
      if (isFollowUpFilterActive) {
        const followUpVal = lead.followUpDate || lead.nextFollowUpDate;
        if (!followUpVal || !followUpVal.startsWith(today)) {
          return false;
        }
      }

      // 7. Post Filter
      if (postFilter !== 'all' && lead.lastPostId !== postFilter) {
        return false;
      }

      // 8. Page Filter
      if (pageFilter !== 'all') {
        const matchesPage = lead.pageId === pageFilter || lead.pageName === pageFilter;
        if (!matchesPage) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = new Date(a.lastMessageAt || a.createdAt).getTime();
        const timeB = new Date(b.lastMessageAt || b.createdAt).getTime();
        return timeB - timeA;
      }
      if (sortBy === 'oldest') {
        const timeA = new Date(a.lastMessageAt || a.createdAt).getTime();
        const timeB = new Date(b.lastMessageAt || b.createdAt).getTime();
        return timeA - timeB;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'bn');
      }
      if (sortBy === 'value') {
        return (b.estimatedValue || 0) - (a.estimatedValue || 0);
      }
      return 0;
    });

  const clearAllFilters = () => {
    onSourceFilterChange('all');
    onSearchChange('');
    setStatusFilter('all');
    setTagFilter('all');
    setAssignedFilter('all');
    setPostFilter('all');
    setPageFilter('all');
    if (isFollowUpFilterActive) {
      onToggleFollowUpFilter();
    }
  };

  const hasActiveFilters =
    sourceFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    tagFilter !== 'all' ||
    assignedFilter !== 'all' ||
    postFilter !== 'all' ||
    pageFilter !== 'all' ||
    isFollowUpFilterActive;

  return (
    <div className="space-y-4">
      {/* Top Filter Bar: Tabs & View Switches */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        {/* Source Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {sourceTabs.map((tab) => {
            const isActive = sourceFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSourceFilterChange(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  className={`ml-1 rounded-md px-1.5 py-0.2 text-[10px] tabular-nums font-bold ${
                    isActive
                      ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {toBengaliNumerals(tab.count)}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Switcher & Filter Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
          {/* Quick Page Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline whitespace-nowrap">
              পেজ:
            </span>
            <select
              value={pageFilter}
              onChange={(e) => setPageFilter(e.target.value)}
              aria-label="ফেসবুক পেজ ফিল্টার"
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all focus:outline-hidden ${
                pageFilter !== 'all'
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <option value="all">সব পেজ ({toBengaliNumerals(leads.length)})</option>
              {uniquePages.map((p) => (
                <option key={p.pageKey} value={p.pageKey}>
                  {p.name} ({toBengaliNumerals(p.count)})
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Filter Button */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
              showAdvancedFilters || hasActiveFilters
                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>ফিল্টার</span>
            {hasActiveFilters && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </button>

          {/* Table / Card View Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-md p-1.5 transition ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="টেবিল ভিউ"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`rounded-md p-1.5 transition ${
                viewMode === 'card'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="কার্ড ভিউ"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filter Collapsible Bar */}
      {showAdvancedFilters && (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              বিস্তারিত ফিল্টার ও সাজানো
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs text-rose-600 hover:underline dark:text-rose-400"
              >
                <X className="h-3 w-3" />
                <span>সব ফিল্টার মুছুন</span>
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {/* Status Filter */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                স্ট্যাটাস
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">সব স্ট্যাটাস</option>
                <option value="new">নতুন</option>
                <option value="contacted">যোগাযোগ করা হয়েছে</option>
                <option value="followup">ফলো-আপ</option>
                <option value="won">কাস্টমার হয়েছে</option>
                <option value="lost">হারানো</option>
              </select>
            </div>

            {/* Tag Filter */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                ট্যাগ
              </label>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">সব ট্যাগ</option>
                {PRESET_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned To */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                অ্যাসাইন করা সদস্য
              </label>
              <select
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">সব সদস্য</option>
                <option value="unassigned">অ্যাসাইন করা হয়নি</option>
                {TEAM_MEMBERS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Post Filter */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                ফেসবুক পোস্ট
              </label>
              <select
                value={postFilter}
                onChange={(e) => setPostFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">সব পোস্ট</option>
                {uniquePosts.map((p) => (
                  <option key={p.postId} value={p.postId}>
                    {p.postId} ({toBengaliNumerals(p.count)} টি লিড)
                  </option>
                ))}
              </select>
            </div>

            {/* Page Filter in Advanced Grid */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                ফেসবুক পেজ
              </label>
              <select
                value={pageFilter}
                onChange={(e) => setPageFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">সব পেজ ({toBengaliNumerals(leads.length)})</option>
                {uniquePages.map((p) => (
                  <option key={p.pageKey} value={p.pageKey}>
                    {p.name} ({toBengaliNumerals(p.count)} টি লিড)
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                সাজানোর ক্রম
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="newest">নতুন আগে</option>
                <option value="oldest">পুরনো আগে</option>
                <option value="name">নাম অনুসারে (ক-হ)</option>
                <option value="value">মূল্য (সর্বোচ্চ আগে)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter summary pill line */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div>
            মোট প্রদর্শিত লিড:{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {toBengaliNumerals(filteredLeads.length)}
            </span>{' '}
            টি
          </div>
          {pageFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              পেজ: {pageMap[pageFilter]?.name || pageFilter}
              <button
                onClick={() => setPageFilter('all')}
                className="hover:text-indigo-900 dark:hover:text-white"
                title="পেজ ফিল্টার বাতিল করুন"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
        {searchQuery && (
          <div className="text-xs">
            "<span>{searchQuery}</span>" খোঁজার ফলাফল
          </div>
        )}
      </div>

      {/* Requirement 4: Firestore Error Alert Banner in Inbox */}
      {firestoreError && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold">Firestore থেকে ডেটা লোড করতে সমস্যা হয়েছে [{firestoreError.code}]</h4>
              <p className="text-xs mt-0.5 text-rose-700 dark:text-rose-300 leading-relaxed">{firestoreError.details}</p>
            </div>
          </div>
          {onRetryFirestore && (
            <button
              onClick={onRetryFirestore}
              className="shrink-0 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition"
            >
              পুনরায় চেষ্টা করুন
            </button>
          )}
        </div>
      )}

      {/* Main Content: Table or Card View */}
      {filteredLeads.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            কোনো লিড পাওয়া যায়নি
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {hasActiveFilters
              ? 'আপনার নির্বাচিত ফিল্টার বা সার্চ কোয়েরির সাথে কোনো লিড মিলছে না। ফিল্টার পরিবর্তন করে দেখুন।'
              : 'বর্তমানে ইনবক্সে কোনো লিড নেই। নতুন লিড যোগ করতে বা ইমপোর্ট করতে নিচের বাটনে চাপ দিন।'}
          </p>
          <div className="mt-5 flex gap-2">
            {hasActiveFilters ? (
              <button
                onClick={clearAllFilters}
                className="rounded-lg bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                ফিল্টার রিসেট করুন
              </button>
            ) : (
              <button
                onClick={onOpenAddModal}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                নতুন লিড যোগ করুন
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-[#1e293b] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold text-slate-500 dark:border-slate-700/80 dark:bg-[#0f172a]/70 dark:text-slate-300">
                  <th className="py-3 pl-4 pr-1 w-8 shrink-0">★</th>
                  <th className="py-3 px-3 min-w-[190px] whitespace-nowrap">নাম ও ফোন নম্বর</th>
                  <th className="py-3 px-3 min-w-[140px] whitespace-nowrap">সোর্স ও পেজ</th>
                  <th className="py-3 px-3 min-w-[130px] max-w-[160px]">প্রোডাক্ট / সার্ভিস</th>
                  <th className="py-3 px-3 min-w-[130px] whitespace-nowrap">স্ট্যাটাস</th>
                  <th className="py-3 px-3 min-w-[100px] whitespace-nowrap">ফলো-আপ</th>
                  <th className="py-3 px-3 max-w-[130px]">সর্বশেষ মেসেজ</th>
                  <th className="py-3 px-3 min-w-[90px] whitespace-nowrap">অ্যাসাইন</th>
                  <th className="py-3 pr-4 pl-2 text-right min-w-[110px] whitespace-nowrap">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLeads.map((lead) => {
                  const isMerged = lead.sources && lead.sources.length > 1;
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="group cursor-pointer transition-colors hover:bg-blue-50/40 dark:hover:bg-slate-800/50"
                    >
                      {/* Star */}
                      <td
                        className="py-3 pl-4 pr-1 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(lead.id);
                        }}
                      >
                        <button
                          className={`p-1 rounded-sm ${
                            lead.isStarred
                              ? 'text-amber-500 hover:text-amber-600'
                              : 'text-slate-300 hover:text-slate-500 dark:text-slate-600'
                          }`}
                        >
                          <Star className={`h-3.5 w-3.5 ${lead.isStarred ? 'fill-current' : ''}`} />
                        </button>
                      </td>

                      {/* Name & Phone */}
                      <td className="py-3 px-3 min-w-[190px]">
                        {(() => {
                          const isUnread = lead.lastMessageAt && (!lead.lastSeenAt || new Date(lead.lastMessageAt).getTime() > new Date(lead.lastSeenAt).getTime());
                          return (
                            <div className="font-bold text-slate-900 dark:text-white whitespace-nowrap flex items-center gap-1.5">
                              <span>{lead.name}</span>
                              {isUnread && (
                                <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.2 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
                                  নতুন মেসেজ
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        {lead.phone && lead.phone.trim() ? (
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                            {formatBdPhoneNumber(lead.phone)}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 mt-0.5 rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            ফোন নেই
                          </span>
                        )}
                        {lead.messengerId && (
                          <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400 mt-0.5 truncate max-w-[170px]" title={`Messenger PSID: ${lead.messengerId}`}>
                            ID: {lead.messengerId}
                          </div>
                        )}
                      </td>

                      {/* Source & Page Badges */}
                      <td className="py-3 px-3 min-w-[140px] whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <SourceBadge source={lead.source} sources={lead.sources} size="sm" />
                          {(lead.pageName || lead.pageId) && (
                            <PageBadge pageName={lead.pageName} pageId={lead.pageId} size="sm" />
                          )}
                          {isMerged && (
                            <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                              মার্জড লিড
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Product Interest */}
                      <td className="py-3 px-3 min-w-[130px] max-w-[160px]">
                        <div className="truncate font-medium text-slate-800 dark:text-slate-200" title={lead.productInterest}>
                          {lead.productInterest}
                        </div>
                        {lead.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lead.tags.slice(0, 1).map((t) => (
                              <span
                                key={t}
                                className="inline-block rounded-xs bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {t}
                              </span>
                            ))}
                            {lead.tags.length > 1 && (
                              <span className="text-[10px] text-slate-400">
                                +{toBengaliNumerals(lead.tags.length - 1)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td
                        className="py-3 px-3 min-w-[130px] whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={lead.status}
                          onChange={(e) => onQuickStatusChange(lead.id, e.target.value as LeadStatus)}
                          className="rounded-md border border-transparent bg-slate-100 py-1 pl-2 pr-6 text-[11px] font-medium text-slate-800 transition hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:bg-slate-800 dark:text-slate-200"
                        >
                          <option value="new">নতুন</option>
                          <option value="contacted">যোগাযোগ করা হয়েছে</option>
                          <option value="followup">ফলো-আপ</option>
                          <option value="won">কাস্টমার হয়েছে</option>
                          <option value="lost">হারানো</option>
                        </select>
                      </td>

                      {/* Next Follow Up */}
                      <td className="py-3 px-3 min-w-[100px] whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{formatBanglaDateOnly(lead.followUpDate || lead.nextFollowUpDate)}</span>
                        </div>
                      </td>

                      {/* Message excerpt */}
                      <td className="py-3 px-3 min-w-[140px] max-w-[200px]">
                        {(() => {
                          const channel = resolveMessageChannel(lead.lastChannel, lead);
                          const isComment = channel === 'comment';
                          return (
                            <div>
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                {channel && <ChannelBadge channel={channel} size="xs" />}
                              </div>
                              <div className="truncate text-slate-700 dark:text-slate-300 text-[11px]" title={lead.lastMessage || lead.message}>
                                {lead.lastMessage || lead.message}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 whitespace-nowrap">
                                {formatBanglaDateTime(lead.lastMessageAt || lead.createdAt)}
                              </div>
                              {/* Requirement 3: কমেন্টের মেসেজের নিচে "পোস্ট দেখুন" লিংক রাখো, আর Messenger মেসেজে ওই লিংক দেখিও না */}
                              {isComment && lead.lastPostLink && (
                                <a
                                  href={lead.lastPostLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline dark:text-blue-400 mt-1"
                                >
                                  <span>পোস্ট দেখুন</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Assigned member */}
                      <td className="py-3 px-3 min-w-[90px] whitespace-nowrap">
                        <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                          {lead.assignedTo || '—'}
                        </span>
                      </td>

                      {/* Action buttons (Messenger, WhatsApp, Call) */}
                      <td
                        className="py-3 pr-4 pl-2 text-right min-w-[120px] whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          {/* Messenger Reply button if messengerId is present */}
                          {lead.messengerId && (
                            <a
                              href="https://business.facebook.com/latest/inbox/all"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-blue-50 text-[#0084FF] hover:bg-blue-100 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800 text-[11px] font-bold transition shrink-0"
                              title="Meta Business Suite Inbox-এ মেসেজের উত্তর দিন"
                            >
                              <MessengerIcon className="h-3.5 w-3.5 text-[#0084FF]" />
                              <span className="hidden xl:inline">Messenger-এ উত্তর দিন</span>
                            </a>
                          )}

                          {/* WhatsApp & Call buttons ONLY if phone exists */}
                          {lead.phone && lead.phone.trim() ? (
                            <>
                              <a
                                href={getWhatsAppLink(lead.phone, lead.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 transition shrink-0"
                                title="WhatsApp-এ মেসেজ পাঠান"
                              >
                                <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" />
                              </a>

                              <a
                                href={getPhoneCallLink(lead.phone)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/80 dark:text-blue-300 transition shrink-0"
                                title="কল করুন"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            </>
                          ) : null}

                          {/* Details Drawer trigger */}
                          <button
                            onClick={() => onSelectLead(lead)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition shrink-0"
                            title="বিস্তারিত দেখুন"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD VIEW */
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.map((lead) => {
            const isMerged = lead.sources && lead.sources.length > 1;
            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-blue-400 hover:shadow-sm dark:border-slate-700/80 dark:bg-[#1e293b] dark:hover:border-blue-500 cursor-pointer"
              >
                {/* Card Top: Source Badge & Status */}
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <SourceBadge source={lead.source} sources={lead.sources} size="sm" />
                      {(lead.pageName || lead.pageId) && (
                        <PageBadge pageName={lead.pageName} pageId={lead.pageId} size="sm" />
                      )}
                    </div>
                    <StatusBadge status={lead.status} size="sm" />
                  </div>

                  {/* Name & Phone */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      {(() => {
                        const isUnread = lead.lastMessageAt && (!lead.lastSeenAt || new Date(lead.lastMessageAt).getTime() > new Date(lead.lastSeenAt).getTime());
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 transition-colors">
                              {lead.name}
                            </h4>
                            {isUnread && (
                              <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.2 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
                                নতুন মেসেজ
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(lead.id);
                        }}
                        className={`p-1 rounded-sm ${
                          lead.isStarred
                            ? 'text-amber-500'
                            : 'text-slate-300 hover:text-slate-500 dark:text-slate-600'
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${lead.isStarred ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {lead.phone && lead.phone.trim() ? (
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatBdPhoneNumber(lead.phone)}
                      </p>
                    ) : (
                      <span className="inline-flex items-center mt-1 rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        ফোন নেই
                      </span>
                    )}

                    {lead.messengerId && (
                      <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                        PSID: {lead.messengerId}
                      </p>
                    )}
                  </div>

                  {/* Product & Note */}
                  {(() => {
                    const channel = resolveMessageChannel(lead.lastChannel);
                    const isComment = channel === 'comment';
                    return (
                      <div className="mt-2.5 rounded-lg bg-slate-50 p-2.5 dark:bg-[#0f172a]/70">
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {lead.productInterest}
                          </span>
                          {channel && <ChannelBadge channel={channel} size="xs" />}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                          "{lead.lastMessage || lead.message}"
                        </p>
                        <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          {formatBanglaDateTime(lead.lastMessageAt || lead.createdAt)}
                        </div>
                        {/* Requirement 3: কমেন্টের মেসেজের নিচে "পোস্ট দেখুন" লিংক রাখো, আর Messenger মেসেজে ওই লিংক দেখিও না */}
                        {isComment && lead.lastPostLink && (
                          <div className="mt-1.5">
                            <a
                              href={lead.lastPostLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                            >
                              <span>পোস্ট দেখুন</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Tags */}
                  {lead.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {lead.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Bottom: Metadata & Actions */}
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatBanglaDateTime(lead.createdAt)}
                    </span>
                    {lead.assignedTo && (
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {lead.assignedTo}
                      </span>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="mt-3 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Messenger reply button if messengerId exists */}
                    {lead.messengerId && (
                      <a
                        href="https://business.facebook.com/latest/inbox/all"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 py-1.5 px-2.5 text-xs font-bold text-[#0084FF] hover:bg-blue-100 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900 transition"
                        title="Meta Business Suite Inbox-এ মেসেজের উত্তর দিন"
                      >
                        <MessengerIcon className="h-3.5 w-3.5 text-[#0084FF]" />
                        <span>Messenger-এ উত্তর দিন</span>
                      </a>
                    )}

                    {/* WhatsApp & Call ONLY if phone exists */}
                    {lead.phone && lead.phone.trim() ? (
                      <>
                        <a
                          href={getWhatsAppLink(lead.phone, lead.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-50 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 transition"
                        >
                          <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href={getPhoneCallLink(lead.phone)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-50 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/80 dark:text-blue-300 transition"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>কল করুন</span>
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
