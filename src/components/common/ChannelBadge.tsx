import React from 'react';

export type MessageChannelType = 'comment' | 'messenger' | 'whatsapp' | string;

interface ChannelBadgeProps {
  channel?: MessageChannelType | null;
  size?: 'xs' | 'sm';
  className?: string;
}

/**
 * Resolves lead's message channel strictly from the lastChannel field.
 * Does NOT guess from sources, lastPostLink, messengerId, or other fields.
 */
export const resolveMessageChannel = (
  channel?: string | null,
  fallback?: {
    lastChannel?: string;
    [key: string]: any;
  }
): 'comment' | 'messenger' | 'whatsapp' | null => {
  const raw = (channel || fallback?.lastChannel || '').toString().trim().toLowerCase();
  if (!raw) return null;

  if (raw === 'comment' || raw === 'facebook_comment' || raw.includes('comment') || raw.includes('কমেন্ট')) {
    return 'comment';
  }
  if (raw === 'messenger' || raw === 'facebook_messenger' || raw.includes('messenger') || raw.includes('মেসেঞ্জার')) {
    return 'messenger';
  }
  if (raw === 'whatsapp' || raw.includes('whatsapp') || raw.includes('হোয়াটসঅ্যাপ')) {
    return 'whatsapp';
  }

  return null;
};

export const ChannelBadge: React.FC<ChannelBadgeProps> = ({
  channel,
  size = 'xs',
  className = '',
}) => {
  if (!channel) return null;

  const isComment = channel === 'comment' || channel.includes('comment') || channel.includes('কমেন্ট');
  const isMessenger = channel === 'messenger' || channel.includes('messenger') || channel.includes('মেসেঞ্জার');
  const isWhatsApp = channel === 'whatsapp' || channel.includes('whatsapp') || channel.includes('হোয়াটসঅ্যাপ');

  if (!isComment && !isMessenger && !isWhatsApp) return null;

  const sizeClasses = size === 'xs' 
    ? 'text-[10px] px-1.5 py-0.5 gap-1' 
    : 'text-[11px] px-2 py-0.5 gap-1.5';

  if (isComment) {
    return (
      <span
        className={`inline-flex items-center font-bold rounded-md border border-amber-300/80 bg-amber-100 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/60 dark:text-amber-300 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
        title="Facebook কমেন্ট থেকে প্রাপ্ত বার্তা"
      >
        <span>💬 কমেন্ট</span>
      </span>
    );
  }

  if (isMessenger) {
    return (
      <span
        className={`inline-flex items-center font-bold rounded-md border border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
        title="Messenger ইনবক্স থেকে প্রাপ্ত বার্তা"
      >
        <span>✉️ মেসেঞ্জার</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-bold rounded-md border border-emerald-300/80 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
      title="WhatsApp থেকে প্রাপ্ত বার্তা"
    >
      <span>WhatsApp</span>
    </span>
  );
};
