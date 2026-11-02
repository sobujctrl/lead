import React from 'react';
import { LeadStatus } from '../../types/lead';
import { STATUS_LABELS } from '../../utils/formatters';

interface StatusBadgeProps {
  status: LeadStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dotOnly?: boolean;
}

export const getStatusTheme = (status: LeadStatus) => {
  switch (status) {
    case 'new':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/50',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800/60',
        dot: 'bg-blue-600 dark:bg-blue-400',
        label: STATUS_LABELS.new,
      };
    case 'contacted':
      return {
        bg: 'bg-violet-50 dark:bg-violet-950/50',
        text: 'text-violet-700 dark:text-violet-300',
        border: 'border-violet-200 dark:border-violet-800/60',
        dot: 'bg-violet-600 dark:bg-violet-400',
        label: STATUS_LABELS.contacted,
      };
    case 'followup':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/50',
        text: 'text-amber-800 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800/60',
        dot: 'bg-amber-600 dark:bg-amber-400',
        label: STATUS_LABELS.followup,
      };
    case 'won':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/50',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800/60',
        dot: 'bg-emerald-600 dark:bg-emerald-400',
        label: STATUS_LABELS.won,
      };
    case 'lost':
      return {
        bg: 'bg-slate-100 dark:bg-slate-800/60',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400 dark:bg-slate-500',
        label: STATUS_LABELS.lost,
      };
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
  dotOnly = false,
}) => {
  const theme = getStatusTheme(status);

  if (dotOnly) {
    return (
      <span
        className={`inline-block rounded-full ${theme.dot} ${size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'} ${className}`}
        title={theme.label}
      />
    );
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md font-medium border ${theme.bg} ${theme.text} ${theme.border} ${sizeClasses} ${className} whitespace-nowrap`}
    >
      <span className={`rounded-full shrink-0 ${theme.dot} ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
      <span>{theme.label}</span>
    </span>
  );
};
