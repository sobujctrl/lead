import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Calendar,
  Tag,
  User,
  Clock,
  Trash2,
  Save,
  CheckCircle,
  AlertTriangle,
  Send,
  Plus,
  DollarSign,
  Share2,
  ExternalLink,
  Flag,
} from 'lucide-react';

import { Lead, LeadStatus, LeadSource } from '../../types/lead';
import { SourceBadge, WhatsAppIcon, FacebookIcon, MessengerIcon } from '../common/SourceBadge';
import { StatusBadge } from '../common/StatusBadge';
import { ChannelBadge, resolveMessageChannel } from '../common/ChannelBadge';
import { PageBadge } from '../common/PageBadge';
import {
  formatBanglaDateTime,
  formatBanglaRelativeTime,
  formatBanglaDateOnly,
  formatTaka,
  toBengaliNumerals,
  STATUS_LABELS,
  SOURCE_LABELS,
  PRESET_TAGS,
  TEAM_MEMBERS,
} from '../../utils/formatters';
import { formatBdPhoneNumber, normalizeBdPhoneNumber, getWhatsAppLink, getPhoneCallLink, isValidBdPhoneNumber } from '../../utils/phone';

interface ParsedMessageActivity {
  id: string;
  channel: 'comment' | 'messenger' | 'whatsapp';
  text: string;
  timestamp: string;
  postLink?: string;
}

function extractMessageActivities(lead: Lead): ParsedMessageActivity[] {
  if (!lead.activities || !Array.isArray(lead.activities)) return [];

  const results: ParsedMessageActivity[] = [];

  for (const act of lead.activities) {
    const desc = (act.description || '').trim();
    let channel: 'comment' | 'messenger' | 'whatsapp' | null = null;
    let cleanText = '';

    if (desc.startsWith('Facebook কমেন্ট:')) {
      channel = 'comment';
      cleanText = desc.replace(/^Facebook\s*কমেন্ট:\s*/i, '').trim();
    } else if (desc.startsWith('Messenger-এ নতুন মেসেজ:')) {
      channel = 'messenger';
      cleanText = desc.replace(/^Messenger-এ\s*নতুন\s*মেসেজ:\s*/i, '').trim();
    } else if (desc.startsWith('WhatsApp-এ নতুন মেসেজ:')) {
      channel = 'whatsapp';
      cleanText = desc.replace(/^WhatsApp-এ\s*নতুন\s*মেসেজ:\s*/i, '').trim();
    } else if (
      act.channel === 'comment' ||
      (act.type as string) === 'comment' ||
      desc.toLowerCase().startsWith('কমেন্ট:')
    ) {
      channel = 'comment';
      cleanText = desc.replace(/^(Facebook\s*কমেন্ট:|কমেন্ট:)\s*/i, '').trim();
    } else if (
      act.channel === 'messenger' ||
      (act.type as string) === 'messenger' ||
      desc.toLowerCase().startsWith('মেসেঞ্জার:')
    ) {
      channel = 'messenger';
      cleanText = desc.replace(/^(Messenger-এ\s*নতুন\s*মেসেজ:|মেসেঞ্জার:\s*)/i, '').trim();
    } else if (
      act.channel === 'whatsapp' ||
      (act.type as string) === 'whatsapp' ||
      desc.toLowerCase().startsWith('হোয়াটসঅ্যাপ:')
    ) {
      channel = 'whatsapp';
      cleanText = desc.replace(/^(WhatsApp-এ\s*নতুন\s*মেসেজ:|হোয়াটসঅ্যাপ:\s*)/i, '').trim();
    }

    if (channel) {
      if (act.details && act.details.trim()) {
        cleanText = act.details.trim();
      }

      cleanText = cleanText
        .replace(/^Facebook\s*কমেন্ট:\s*/i, '')
        .replace(/^Messenger-এ\s*নতুন\s*মেসেজ:\s*/i, '')
        .replace(/^WhatsApp-এ\s*নতুন\s*মেসেজ:\s*/i, '')
        .replace(/^কমেন্ট:\s*/i, '')
        .replace(/^মেসেঞ্জার:\s*/i, '')
        .replace(/^হোয়াটসঅ্যাপ:\s*/i, '')
        .replace(/^["'“”‘’]|["'“”‘’]$/g, '')
        .trim();

      const postLink = channel === 'comment' ? (act.postLink || lead.lastPostLink) : undefined;

      results.push({
        id: act.id || `${channel}-${act.timestamp}-${Math.random()}`,
        channel,
        text: cleanText || desc,
        timestamp: act.timestamp,
        postLink,
      });
    }
  }

  // Sort from newest to oldest
  return results.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime() || 0;
    const timeB = new Date(b.timestamp).getTime() || 0;
    return timeB - timeA;
  });
}

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateLead: (id: string, updates: Partial<Lead>) => void;
  onAddNote: (leadId: string, noteContent: string, author?: string) => void;
  onDeleteLead: (leadId: string) => Promise<{ success: boolean; message: string }> | void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  isOpen,
  onClose,
  onUpdateLead,
  onAddNote,
  onDeleteLead,
}) => {
  // Form State - Always declare hooks unconditionally before any early returns
  const [name, setName] = useState(lead?.name || '');
  const [phone, setPhone] = useState(lead?.phone || '');
  const [messengerId, setMessengerId] = useState(lead?.messengerId || '');
  const [profileLink, setProfileLink] = useState(lead?.profileLink || '');
  const [productInterest, setProductInterest] = useState(lead?.productInterest || '');
  const [status, setStatus] = useState<LeadStatus>(lead?.status || 'new');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(() => {
    const raw = lead?.followUpDate || lead?.nextFollowUpDate || '';
    return raw ? raw.substring(0, 10) : '';
  });
  const [assignedTo, setAssignedTo] = useState(lead?.assignedTo || '');
  const [estimatedValue, setEstimatedValue] = useState<number | ''>(() => {
    return lead?.estimatedValue && lead.estimatedValue > 0 ? lead.estimatedValue : '';
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(lead?.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [newNote, setNewNote] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('অ্যাডমিন');
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'timeline'>('info');
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [customWhatsAppGreeting, setCustomWhatsAppGreeting] = useState('');

  // Delete Confirmation Modal States
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sync state if lead changes
  useEffect(() => {
    if (lead) {
      setName(lead.name);
      setPhone(lead.phone || '');
      setMessengerId(lead.messengerId || '');
      setProfileLink(lead.profileLink || '');
      setProductInterest(lead.productInterest);
      setStatus(lead.status);
      const rawDate = lead.followUpDate || lead.nextFollowUpDate || '';
      setNextFollowUpDate(rawDate ? rawDate.substring(0, 10) : '');
      setAssignedTo(lead.assignedTo || '');
      setEstimatedValue(lead.estimatedValue && lead.estimatedValue > 0 ? lead.estimatedValue : '');
      setSelectedTags(lead.tags || []);

      // If unread, mark lastSeenAt as now
      const isUnread = lead.lastMessageAt && (!lead.lastSeenAt || new Date(lead.lastMessageAt).getTime() > new Date(lead.lastSeenAt).getTime());
      if (isUnread) {
        onUpdateLead(lead.id, { lastSeenAt: new Date().toISOString() });
      }
    }
  }, [lead?.id]);

  // Early return check strictly AFTER all hooks
  if (!isOpen || !lead) return null;

  // Handle Save
  const handleSave = () => {
    const cleanPhone = phone.trim() ? normalizeBdPhoneNumber(phone) || phone.trim() : undefined;
    const dateToSave = nextFollowUpDate ? nextFollowUpDate.substring(0, 10) : null;
    onUpdateLead(lead.id, {
      name,
      phone: cleanPhone,
      originalPhone: phone.trim() || undefined,
      messengerId: messengerId.trim() || undefined,
      profileLink: profileLink.trim() || undefined,
      productInterest,
      status,
      followUpDate: dateToSave,
      nextFollowUpDate: dateToSave,
      assignedTo: assignedTo || null,
      estimatedValue: estimatedValue === '' ? 0 : Number(estimatedValue),
      tags: selectedTags,
    });
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };


  // Handle Add Note
  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(lead.id, newNote.trim(), noteAuthor);
    setNewNote('');
  };

  // Toggle Tags
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddNewCustomTag = () => {
    if (newTagInput.trim() && !selectedTags.includes(newTagInput.trim())) {
      setSelectedTags([...selectedTags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  // Handle Confirm Delete from Firestore
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await onDeleteLead(lead.id);
      setIsDeleting(false);

      if (res && res.success === false) {
        setDeleteError(res.message);
      } else {
        setIsDeleteConfirmOpen(false);
        onClose();
      }
    } catch (err: any) {
      setIsDeleting(false);
      setDeleteError(err?.message || 'Firestore থেকে লিড মুছতে ব্যর্থ হয়েছে।');
    }
  };

  const isMultiSource = lead.sources && lead.sources.length > 1;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-xl bg-white shadow-2xl transition-all dark:bg-[#1e293b] flex flex-col border-l border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-3.5 sm:px-6 py-2.5 sm:py-3.5 bg-white dark:bg-[#1e293b] shrink-0">
            {/* Left Title and Source Badges */}
            <div className="flex flex-col gap-1 min-w-0 pr-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                লিড বিবরণ
              </span>
              <div className="flex flex-wrap items-center gap-1">
                <SourceBadge source={lead.source} sources={lead.sources} size="sm" />
                {(lead.pageName || lead.pageId) && (
                  <PageBadge pageName={lead.pageName} pageId={lead.pageId} size="sm" />
                )}
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
              {/* Always-visible Delete Button in Header */}
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setIsDeleteConfirmOpen(true);
                }}
                title="লিড মুছে ফেলুন"
                aria-label="লিড মুছে ফেলুন"
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 hover:border-rose-300 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950 transition whitespace-nowrap shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden min-[520px]:inline whitespace-nowrap">মুছে ফেলুন</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                title={isSavedRecently ? 'সংরক্ষিত!' : 'সংরক্ষণ করুন'}
                aria-label="সংরক্ষণ করুন"
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-2 sm:px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition whitespace-nowrap shrink-0"
              >
                <Save className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden min-[520px]:inline whitespace-nowrap">{isSavedRecently ? 'সংরক্ষিত!' : 'সংরক্ষণ করুন'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="বন্ধ করুন"
                title="বন্ধ করুন"
                className="rounded-lg p-1.5 sm:p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 shrink-0"
              >
                <X className="h-5 w-5 shrink-0" />
              </button>
            </div>
          </div>

          {/* Duplicate Multi-source banner */}
          {isMultiSource && (
            <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 px-3.5 sm:px-6 py-2 border-b border-purple-200/50 dark:border-purple-800/40">
              <div className="flex items-start sm:items-center gap-2 text-[11px] sm:text-xs font-semibold text-purple-900 dark:text-purple-300 leading-snug">
                <Share2 className="h-3.5 w-3.5 text-purple-600 shrink-0 mt-0.5 sm:mt-0" />
                <span className="line-clamp-2">
                  ডুপ্লিকেট মার্জ: গ্রাহক একাধিক চ্যানেল থেকে যোগাযোগ করেছেন (
                  {lead.sources.map((s) => SOURCE_LABELS[s] || s).join(', ')}
                  )
                </span>
              </div>
            </div>
          )}

          {/* Customer Quick Banner & Direct Action Buttons */}
          <div className="border-b border-slate-200/80 bg-slate-50/70 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {lead.name}
                </h2>
                {lead.phone && lead.phone.trim() ? (
                  <p className="font-mono text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                    {formatBdPhoneNumber(lead.phone)}
                  </p>
                ) : (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                      ফোন নেই
                    </span>
                    <span className="text-[11px] text-slate-500">নিচে নম্বর যোগ করতে পারবেন</span>
                  </div>
                )}
                {lead.messengerId && (
                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-1">
                    Messenger PSID: {lead.messengerId}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>তৈরি: {formatBanglaDateTime(lead.createdAt)}</span>
                </div>
              </div>

              {/* Instant Messenger, WhatsApp & Phone Call Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Messenger direct reply button */}
                {lead.messengerId && (
                  <a
                    href="https://business.facebook.com/latest/inbox/all"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-[#0084FF] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0073e6] transition whitespace-nowrap"
                    title="Meta Business Suite Inbox-এ মেসেজের উত্তর দিন"
                  >
                    <MessengerIcon className="h-4 w-4 shrink-0" />
                    <span>Messenger-এ উত্তর দিন</span>
                  </a>
                )}

                {/* WhatsApp & Call buttons ONLY if phone exists */}
                {lead.phone && lead.phone.trim() ? (
                  <>
                    <a
                      href={getWhatsAppLink(lead.phone, lead.name, customWhatsAppGreeting)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#20ba59] transition whitespace-nowrap"
                    >
                      <WhatsAppIcon className="h-4 w-4 shrink-0" />
                      <span>WhatsApp চ্যাট</span>
                    </a>

                    <a
                      href={getPhoneCallLink(lead.phone)}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition whitespace-nowrap"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>কল করুন</span>
                    </a>
                  </>
                ) : null}
              </div>
            </div>


            {/* Quick Status Pill Selector */}
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500">বর্তমান স্ট্যাটাস:</span>
              {(['new', 'contacted', 'followup', 'won', 'lost'] as LeadStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatus(st)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    status === st
                      ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900'
                      : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {STATUS_LABELS[st]}
                </button>
              ))}
            </div>
          </div>

          {/* Drawer Navigation Tabs */}
          <div className="flex border-b border-slate-200/80 px-3.5 sm:px-6 overflow-x-auto no-scrollbar dark:border-slate-800">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-3 text-xs font-bold border-b-2 transition-colors mr-4 sm:mr-6 whitespace-nowrap shrink-0 ${
                activeTab === 'info'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              সাধারণ তথ্য
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-3 text-xs font-bold border-b-2 transition-colors mr-4 sm:mr-6 whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'notes'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span>নোটসমূহ</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] tabular-nums dark:bg-slate-800">
                {toBengaliNumerals(lead.notes.length)}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span>অ্যাক্টিভিটি হিস্ট্রি</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] tabular-nums dark:bg-slate-800">
                {toBengaliNumerals(lead.activities.length)}
              </span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
            {activeTab === 'info' && (
              <div className="space-y-4 text-xs">
                {/* Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      গ্রাহকের নাম
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        ফোন নম্বর <span className="font-normal text-slate-400">(ঐচ্ছিক)</span>
                      </label>
                      {!phone && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          ফোন নেই (পরে যুক্ত করুন)
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX বা খালি রাখুন"
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Messenger PSID & Profile Link (Editable & Copyable) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-blue-50/50 p-3 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40">
                  <div>
                    <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-300 mb-1">
                      Messenger PSID (Facebook ID)
                    </label>
                    <input
                      type="text"
                      value={messengerId}
                      onChange={(e) => setMessengerId(e.target.value)}
                      placeholder="যেমন: 489218491029482"
                      className="w-full rounded-lg border border-blue-200 bg-white p-2 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-300">
                        ফেসবুক প্রোফাইল লিংক
                      </label>
                      {profileLink && (
                        <a
                          href={profileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                          ভিজিট <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    <input
                      type="url"
                      value={profileLink}
                      onChange={(e) => setProfileLink(e.target.value)}
                      placeholder="https://facebook.com/..."
                      className="w-full rounded-lg border border-blue-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Facebook Page Section */}
                {(lead.pageName || lead.pageId) && (
                  <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/60 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/40">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-indigo-300 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>ফেসবুক পেজ:</span>
                      </span>
                      <PageBadge pageName={lead.pageName} pageId={lead.pageId} size="sm" />
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between mt-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{lead.pageName || 'পেজের নাম নেই'}</span>
                      {lead.pageId && (
                        <span className="font-mono text-[10px] text-slate-500 shrink-0 ml-2">Page ID: {lead.pageId}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* From Which Post Section */}
                {lead.lastPostLink && (
                  <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-3.5 dark:border-blue-900/60 dark:bg-blue-950/40">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-300 mb-1">
                      <span>কোন পোস্ট থেকে:</span>
                      <a
                        href={lead.lastPostLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700 transition"
                      >
                        <span>পোস্ট দেখুন</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate">
                      {lead.lastPostId ? `Post ID: ${lead.lastPostId}` : lead.lastPostLink}
                    </p>
                  </div>
                )}

                {/* Latest Incoming Message with ChannelBadge */}
                {(() => {
                  const leadChannel = resolveMessageChannel(lead.lastChannel);
                  const isComment = leadChannel === 'comment';
                  const msgToShow = lead.lastMessage || lead.message;
                  if (!msgToShow) return null;

                  return (
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5 dark:border-slate-700/80 dark:bg-slate-800/60">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex-wrap gap-1">
                        <div className="flex items-center gap-1.5">
                          <span>সর্বশেষ মেসেজ</span>
                          {leadChannel && <ChannelBadge channel={leadChannel} size="xs" />}
                        </div>
                        {lead.lastMessageAt && (
                          <span className="font-normal text-slate-500 dark:text-slate-400 text-[10px]">
                            {formatBanglaDateTime(lead.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        "{msgToShow}"
                      </p>
                      {/* Requirement 3: কমেন্টের মেসেজের নিচে "পোস্ট দেখুন" লিংক রাখো, আর Messenger মেসেজে ওই লিংক দেখিও না */}
                      {isComment && lead.lastPostLink && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          <a
                            href={lead.lastPostLink}
                            target="_blank"
                            rel="noopener noreferrer"
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

                {/* All Messages (Where they came from) Section */}
                {(() => {
                  const messageActivities = extractMessageActivities(lead);

                  return (
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3.5 dark:border-slate-700/80 dark:bg-slate-800/40 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            সব মেসেজ (কোথা থেকে এসেছে)
                          </span>
                        </div>
                        {messageActivities.length > 0 && (
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600/60 px-2 py-0.5 rounded-full">
                            {toBengaliNumerals(messageActivities.length)}টি মেসেজ
                          </span>
                        )}
                      </div>

                      {messageActivities.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700/80 p-3.5 text-center">
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            এখনও কোনো মেসেজ রেকর্ড নেই
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                          {messageActivities.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs shadow-2xs transition dark:border-slate-700/70 dark:bg-slate-800/70"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                                <ChannelBadge channel={item.channel} size="xs" />
                                {item.timestamp && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                    {formatBanglaRelativeTime(item.timestamp)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                {item.text}
                              </p>
                              {item.channel === 'comment' && item.postLink && (
                                <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                                  <a
                                    href={item.postLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                                  >
                                    <span>পোস্ট দেখুন</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Product Interest & Estimated Value */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      আগ্রহের প্রোডাক্ট / সার্ভিস
                    </label>
                    <input
                      type="text"
                      value={productInterest}
                      onChange={(e) => setProductInterest(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      সম্ভাব্য মূল্য (টাকা)
                    </label>
                    <input
                      type="number"
                      value={estimatedValue === 0 ? '' : estimatedValue}
                      onChange={(e) => setEstimatedValue(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>


                {/* Follow-up Date & Assigned Member */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      পরবর্তী ফলো-আপের তারিখ
                    </label>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      অ্যাসাইন করা মেম্বার
                    </label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">অ্যাসাইন করা নেই</option>
                      {TEAM_MEMBERS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Customer's Initial Message / Query (shown if different from latest message) */}
                {lead.lastMessage && lead.lastMessage !== lead.message && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      প্রথম মেসেজ / আদি বার্তা
                    </label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                      {lead.message}
                    </div>
                  </div>
                )}

                {/* Tags Management */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    ট্যাগসমূহ নির্বাচন করুন
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {PRESET_TAGS.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="কাস্টম ট্যাগ লিখুন..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewCustomTag())}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewCustomTag}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    >
                      যুক্ত করুন
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: NOTES */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                {/* Note creation form */}
                <form onSubmit={handleAddNoteSubmit} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      নতুন নোট বা ফলো-আপ আপডেট
                    </label>
                    <select
                      value={noteAuthor}
                      onChange={(e) => setNoteAuthor(e.target.value)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <option value="অ্যাডমিন">লেখক: অ্যাডমিন</option>
                      {TEAM_MEMBERS.map((m) => (
                        <option key={m} value={m}>
                          লেখক: {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="গ্রাহকের সাথে কী কথা হলো, বিশেষ কোনো শর্ত থাকলে এখানে লিখে রাখুন..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newNote.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>নোট যুক্ত করুন</span>
                    </button>
                  </div>
                </form>

                {/* Notes List */}
                <div className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                  {lead.notes.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      এখনো কোনো নোট যোগ করা হয়নি
                    </div>
                  ) : (
                    lead.notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/40"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {note.author}
                          </span>
                          <span>{formatBanglaDateTime(note.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {lead.activities.map((act) => {
                  const actChannel = resolveMessageChannel(act.channel, {
                    ...act,
                    lastChannel: lead.lastChannel,
                    lastPostLink: lead.lastPostLink,
                  });
                  const isComment = actChannel === 'comment' || act.type === 'comment' || Boolean(act.postLink);
                  const isMessenger = actChannel === 'messenger' || act.channel === 'messenger' || act.type === 'contacted' && act.description.includes('Messenger');
                  const resolvedChannel = isComment ? 'comment' : isMessenger ? 'messenger' : actChannel;

                  return (
                    <div key={act.id} className="relative">
                      {/* Marker / Comment or Messenger Icon */}
                      {isComment ? (
                        <div className="absolute -left-[23px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-amber-500 text-white shadow-2xs dark:border-slate-900" title="Facebook কমেন্ট">
                          <MessageSquare className="h-2.5 w-2.5" />
                        </div>
                      ) : isMessenger ? (
                        <div className="absolute -left-[23px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-2xs dark:border-slate-900" title="Messenger বার্তা">
                          <MessageSquare className="h-2.5 w-2.5" />
                        </div>
                      ) : (
                        <div className="absolute -left-[19px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600 dark:border-slate-900" />
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {act.description}
                        </span>
                        {/* Requirement 2: প্রতিটা মেসেজের পাশেও একই ব্যাজ দেখাও */}
                        {resolvedChannel && <ChannelBadge channel={resolvedChannel} size="xs" />}
                      </div>

                      {act.details && (
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          {act.details}
                        </p>
                      )}

                      {/* Requirement 3: কমেন্টের মেসেজের নিচে "পোস্ট দেখুন" লিংক রাখো, আর Messenger মেসেজে ওই লিংক দেখিও না */}
                      {isComment && act.postLink && (
                        <div className="mt-1">
                          <a
                            href={act.postLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                          >
                            <span>পোস্ট দেখুন</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                        {formatBanglaDateTime(act.timestamp)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drawer Footer: Always Visible Actions */}
          <div className="border-t border-slate-200/80 p-3 sm:p-4 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60 flex flex-col min-[520px]:flex-row items-stretch min-[520px]:items-center justify-between gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setIsDeleteConfirmOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:border-rose-300 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950 transition whitespace-nowrap shrink-0 order-2 min-[520px]:order-1"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">লিড মুছে ফেলুন</span>
            </button>

            <div className="flex items-center justify-end gap-2 order-1 min-[520px]:order-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-[520px]:flex-none text-center rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                বন্ধ করুন
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 min-[520px]:flex-none flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 sm:px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition whitespace-nowrap shrink-0"
              >
                <Save className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">{isSavedRecently ? 'সংরক্ষিত!' : 'পরিবর্তন সংরক্ষণ করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* In-App Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl dark:border-rose-900 dark:bg-slate-900 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/80">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  লিডটি স্থায়ীভাবে মুছে ফেলতে চান?
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">এই পরিবর্তনটি পূর্বাবস্থায় ফেরানো যাবে না</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 mb-3 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{lead.name}</p>
              <p className="font-mono text-slate-600 dark:text-slate-300 text-[11px]">{lead.phone}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                সোর্স: {lead.sources.map((s) => SOURCE_LABELS[s] || s).join(', ')}
              </p>
            </div>

            {deleteError && (
              <div className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/70 dark:text-rose-200 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div className="space-y-0.5">
                  <span className="font-bold block">মুছতে ব্যর্থ হয়েছে:</span>
                  <p className="leading-relaxed text-[11px]">{deleteError}</p>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Firestore ক্লাউড ডাটাবেজ থেকে এই লিডের সমস্ত তথ্য, নোট ও হিস্ট্রি স্থায়ীভাবে মুছে যাবে।
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeleteError(null);
                }}
                className="rounded-lg px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-xs disabled:opacity-50 transition"
              >
                {isDeleting ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>মুছে ফেলা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>হ্যাঁ, মুছে ফেলুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
