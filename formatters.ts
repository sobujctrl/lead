import { Lead, LeadSource, LeadStatus } from '../types/lead';
import { formatBdPhoneNumber } from './phone';

export const SOURCE_LABELS: Record<LeadSource, string> = {
  facebook: 'Facebook',
  messenger: 'Messenger',
  whatsapp: 'WhatsApp',
  manual: 'ম্যানুয়াল এন্ট্রি',
};

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'নতুন',
  contacted: 'যোগাযোগ করা হয়েছে',
  followup: 'ফলো-আপ',
  won: 'কাস্টমার হয়েছে',
  lost: 'হারানো',
};

export const PRESET_TAGS = [
  'গরম লিড 🔥',
  'দাম জানতে চেয়েছে',
  'কল ব্যাক প্রয়োজন',
  'VIP ক্লায়েন্ট',
  'অফার চায়',
  'পাইকারি ক্রেতা',
  'তাড়াতাড়ি ডেলিভারি',
  'সন্দেহপ্রবণ',
  'রিপিট কাস্টমার',
];

export const TEAM_MEMBERS = [
  'রাকিব হাসান',
  'সুমাইয়া আক্তার',
  'মেহরাব হোসেন',
  'তানজিম আহমেদ',
  'ফারজানা সুলতানা',
];

/**
 * Converts English numbers to Bengali numerals
 */
export function toBengaliNumerals(num: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (w) => bengaliDigits[+w]);
}

/**
 * Format relative time or clean date in Bengali
 */
export function formatBanglaDateTime(isoDateString?: string | null): string {
  if (!isoDateString) return 'নির্ধারিত নয়';
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return isoDateString;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'এইমাত্র';
    if (diffMins < 60) return `${toBengaliNumerals(diffMins)} মিনিট আগে`;
    if (diffHours < 24 && now.getDate() === date.getDate()) {
      return `আজ ${date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays === 1) {
      return `গতকাল ${date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return date.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDateString;
  }
}

/**
 * Format strictly relative time in Bengali (e.g. '৩ মিনিট আগে', '১ ঘণ্টা আগে', 'এইমাত্র')
 */
export function formatBanglaRelativeTime(isoDateString?: string | null): string {
  if (!isoDateString) return '';
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return isoDateString;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'এইমাত্র';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'এইমাত্র';
    if (diffMins < 60) return `${toBengaliNumerals(diffMins)} মিনিট আগে`;
    if (diffHours < 24) return `${toBengaliNumerals(diffHours)} ঘণ্টা আগে`;
    if (diffDays === 1) return 'গতকাল';
    if (diffDays < 30) return `${toBengaliNumerals(diffDays)} দিন আগে`;

    return date.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDateString;
  }
}

/**
 * Formats a date only (e.g. for follow-up date)
 */
export function formatBanglaDateOnly(dateString?: string | null): string {
  if (!dateString) return 'তারিখ সেট নেই';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'আজকে';
    if (diffDays === 1) return 'আগামীকাল';
    if (diffDays === -1) return 'গতকাল (ওভারডিউ)';
    if (diffDays < -1) return `${toBengaliNumerals(Math.abs(diffDays))} দিন ওভারডিউ`;

    return date.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format currency in Bangladeshi Taka
 */
export function formatTaka(amount?: number): string {
  if (amount === undefined || amount === null) return '৳ ০';
  return `৳ ${toBengaliNumerals(amount.toLocaleString('en-IN'))}`;
}

/**
 * Exports leads to CSV format with UTF-8 BOM so Excel displays Bengali cleanly
 */
export function exportLeadsToCSV(leads: Lead[], filename = 'leads-export.csv'): void {
  const headers = [
    'নাম',
    'ফোন নম্বর',
    'মূল সোর্স',
    'সব সোর্স (মার্জড)',
    'ফেসবুক পেজ',
    'পেজ ID',
    'প্রোডাক্ট/সার্ভিস',
    'স্ট্যাটাস',
    'ট্যাগসমূহ',
    'প্রথম মেসেজ',
    'অ্যাসাইন করা',
    'তৈরির সময়',
    'পরবর্তী ফলো-আপ',
    'আনুমানিক মূল্য (টাকা)',
  ];

  const escapeCSV = (field: string | number | undefined | null): string => {
    if (field === null || field === undefined) return '""';
    const stringVal = String(field);
    return `"${stringVal.replace(/"/g, '""')}"`;
  };

  const rows = leads.map((lead) => [
    escapeCSV(lead.name),
    escapeCSV(formatBdPhoneNumber(lead.phone)),
    escapeCSV(SOURCE_LABELS[lead.source] || lead.source),
    escapeCSV(lead.sources.map((s) => SOURCE_LABELS[s] || s).join(', ')),
    escapeCSV(lead.pageName || ''),
    escapeCSV(lead.pageId || ''),
    escapeCSV(lead.productInterest),
    escapeCSV(STATUS_LABELS[lead.status] || lead.status),
    escapeCSV(lead.tags.join(', ')),
    escapeCSV(lead.message),
    escapeCSV(lead.assignedTo || 'অ্যাসাইন করা নেই'),
    escapeCSV(formatBanglaDateTime(lead.createdAt)),
    escapeCSV(lead.nextFollowUpDate ? formatBanglaDateOnly(lead.nextFollowUpDate) : 'নেই'),
    escapeCSV(lead.estimatedValue || 0),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  // Add UTF-8 BOM (\uFEFF) for Excel Bengali character rendering
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
