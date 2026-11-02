import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, Sparkles, Check, Phone } from 'lucide-react';
import { LeadSource, LeadStatus, Lead } from '../../types/lead';
import { leadService } from '../../services/leadService';
import { normalizeBdPhoneNumber, formatBdPhoneNumber, isValidBdPhoneNumber } from '../../utils/phone';
import { SOURCE_LABELS, PRESET_TAGS, TEAM_MEMBERS } from '../../utils/formatters';
import { FacebookIcon, MessengerIcon, WhatsAppIcon, ManualIcon } from '../common/SourceBadge';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadAdded: (result: { isDuplicate: boolean; notificationMessage: string; lead: Lead }) => void;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  onLeadAdded,
}) => {
  // Always declare all hooks unconditionally at the top
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [messengerId, setMessengerId] = useState('');
  const [profileLink, setProfileLink] = useState('');
  const [pageName, setPageName] = useState('');
  const [pageId, setPageId] = useState('');
  const [source, setSource] = useState<LeadSource>('facebook');
  const [productInterest, setProductInterest] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [tags, setTags] = useState<string[]>([]);
  const [nextFollowUpDate, setNextFollowUpDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignedTo, setAssignedTo] = useState('');
  const [estimatedValue, setEstimatedValue] = useState<number | ''>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<Lead | null>(null);

  // Real-time duplicate check when phone or messengerId changes
  useEffect(() => {
    if (!isOpen) return;
    const existing = leadService.findDuplicateLead({
      phone: phone.trim() || undefined,
      messengerId: messengerId.trim() || undefined,
    });
    setDuplicateWarning(existing || null);
  }, [phone, messengerId, isOpen]);

  // Early return check strictly AFTER all hooks
  if (!isOpen) return null;

  const toggleTag = (t: string) => {
    if (tags.includes(t)) {
      setTags(tags.filter((item) => item !== t));
    } else {
      setTags([...tags, t]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() && !messengerId.trim()) {
      setErrorMsg('অনুগ্রহ করে গ্রাহকের নাম অথবা Messenger ID লিখুন');
      return;
    }

    let finalPhone: string | undefined = undefined;
    if (phone.trim()) {
      const normalizedPhone = normalizeBdPhoneNumber(phone);
      if (!isValidBdPhoneNumber(normalizedPhone)) {
        setErrorMsg('সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678 বা 018...) অথবা খালি রাখুন');
        return;
      }
      finalPhone = phone.trim();
    }

    const result = leadService.addOrMergeLead({
      name: name.trim() || (messengerId ? `Messenger (${messengerId.slice(-4)})` : 'অজ্ঞাত লিড'),
      phone: finalPhone,
      messengerId: messengerId.trim() || undefined,
      profileLink: profileLink.trim() || undefined,
      pageId: pageId.trim() || undefined,
      pageName: pageName.trim() || undefined,
      source,
      productInterest: productInterest || 'সাধারণ অনুসন্ধান',
      message: message || 'নতুন লিড এন্ট্রি',
      status,
      tags,
      nextFollowUpDate: nextFollowUpDate || null,
      assignedTo: assignedTo || null,
      estimatedValue: estimatedValue ? Number(estimatedValue) : 0,
    });

    onLeadAdded(result);
    onClose();
  };


  const sourcesList: { id: LeadSource; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'facebook',
      label: 'Facebook',
      icon: <FacebookIcon className="w-4 h-4 text-[#1877F2]" />,
      color: 'hover:border-blue-400',
    },
    {
      id: 'messenger',
      label: 'Messenger',
      icon: <MessengerIcon className="w-4 h-4 text-[#0084FF]" />,
      color: 'hover:border-indigo-400',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />,
      color: 'hover:border-emerald-400',
    },
    {
      id: 'manual',
      label: 'ম্যানুয়াল এন্ট্রি',
      icon: <ManualIcon className="w-4 h-4 text-slate-500" />,
      color: 'hover:border-slate-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700/80 dark:bg-[#1e293b] max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                নতুন লিড যোগ করুন
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                সরাসরি ইনবক্সে নতুন কাস্টমার এন্ট্রি করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Real-time Duplicate Detection Alert */}
        {duplicateWarning && (
          <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50/80 p-3.5 text-xs text-purple-900 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-200">
            <div className="flex items-center gap-2 font-bold text-purple-800 dark:text-purple-300 mb-1">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span>ডুপ্লিকেট নম্বর শনাক্ত হয়েছে!</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              এই ফোন নম্বরটি ইতিমধ্যে "<strong>{duplicateWarning.name}</strong>" নামে ইনবক্সে আছে (মূল সোর্স:{' '}
              {SOURCE_LABELS[duplicateWarning.source]})। সংরক্ষণ করলে নতুন লিড তৈরি না হয়ে বিদ্যমান লিডের সাথে <strong>স্বয়ংক্রিয়ভাবে মার্জ</strong> হবে।
            </p>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Source Selection Buttons */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
              লিডের সোর্স নির্বাচন করুন <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {sourcesList.map((s) => {
                const isSelected = source === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSource(s.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/90 text-blue-800 shadow-2xs ring-1 ring-blue-600 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-200'
                        : `border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 ${s.color}`
                    }`}
                  >
                    {s.icon}
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                গ্রাহকের নাম <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: তানভীর আহমেদ"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  ফোন নম্বর <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                </label>
                <span className="text-[10px] text-slate-400">খালি রাখা যাবে</span>
              </div>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX বা খালি রাখুন"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Messenger PSID & Profile Link (Optional) */}
          {(source === 'messenger' || source === 'facebook' || messengerId) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl bg-blue-50/50 p-3 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40">
              <div>
                <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-300 mb-1">
                  Messenger ID / PSID (ঐচ্ছিক)
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
                <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-300 mb-1">
                  Facebook প্রোফাইল লিংক (ঐচ্ছিক)
                </label>
                <input
                  type="url"
                  value={profileLink}
                  onChange={(e) => setProfileLink(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full rounded-lg border border-blue-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Facebook Page Information (Optional) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl bg-indigo-50/40 p-3 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40">
            <div>
              <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                ফেসবুক পেজের নাম (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                placeholder="যেমন: ফ্যাশন হাউজ বিডি"
                className="w-full rounded-lg border border-indigo-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                ফেসবুক পেজ ID (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="যেমন: 10293847561029"
                className="w-full rounded-lg border border-indigo-200 bg-white p-2 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>


          {/* Product & Value */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                আগ্রহের প্রোডাক্ট / সার্ভিস
              </label>
              <input
                type="text"
                value={productInterest}
                onChange={(e) => setProductInterest(e.target.value)}
                placeholder="যেমন: স্মার্ট ওয়াচ সিরিজ ৯"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                সম্ভাব্য ডিল মূল্য (টাকা)
              </label>
              <input
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value ? Number(e.target.value) : '')}
                placeholder="যেমন: ১৫০০"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* First Message / Lead Note */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              প্রথম মেসেজ / নোট
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="গ্রাহক মেসেজে কী জানতে চেয়েছেন..."
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
              ট্যাগ
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((t) => {
                const isSelected = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Follow-up date & Assigned */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                পরবর্তী ফলো-আপ তারিখ
              </label>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                টিম মেম্বার অ্যাসাইন করুন
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">অ্যাসাইন করবেন না</option>
                {TEAM_MEMBERS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200/80 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              {duplicateWarning ? 'মার্জ করে সংরক্ষণ করুন' : 'লিড সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
