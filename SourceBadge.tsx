import React from 'react';
import { LeadSource } from '../../types/lead';
import { SOURCE_LABELS } from '../../utils/formatters';

interface SourceBadgeProps {
  source: LeadSource;
  sources?: LeadSource[];
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const FacebookIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export const MessengerIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.454 5.518 3.735 7.197V22l3.418-1.877c.905.251 1.86.388 2.847.388 5.523 0 10-4.145 10-9.253C22 6.145 17.523 2 12 2zm1.002 12.441l-2.56-2.73-5 2.73 5.497-5.835 2.623 2.73 4.937-2.73-5.497 5.835z" />
  </svg>
);

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

export const ManualIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const getSourceIcon = (source: LeadSource, className?: string) => {
  switch (source) {
    case 'facebook':
      return <FacebookIcon className={className || 'w-4 h-4'} />;
    case 'messenger':
      return <MessengerIcon className={className || 'w-4 h-4'} />;
    case 'whatsapp':
      return <WhatsAppIcon className={className || 'w-4 h-4'} />;
    case 'manual':
    default:
      return <ManualIcon className={className || 'w-4 h-4'} />;
  }
};

export const getSourceTheme = (source: LeadSource) => {
  switch (source) {
    case 'facebook':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/60',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800/60',
        brandBg: 'bg-[#1877F2]',
        iconColor: 'text-[#1877F2]',
        name: 'Facebook',
      };
    case 'messenger':
      return {
        bg: 'bg-indigo-50 dark:bg-indigo-950/60',
        text: 'text-indigo-700 dark:text-indigo-300',
        border: 'border-indigo-200 dark:border-indigo-800/60',
        brandBg: 'bg-gradient-to-r from-[#0084FF] to-[#A824FF]',
        iconColor: 'text-[#0084FF]',
        name: 'Messenger',
      };
    case 'whatsapp':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800/60',
        brandBg: 'bg-[#25D366]',
        iconColor: 'text-[#25D366]',
        name: 'WhatsApp',
      };
    case 'manual':
    default:
      return {
        bg: 'bg-slate-100 dark:bg-slate-800/80',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-700',
        brandBg: 'bg-slate-600',
        iconColor: 'text-slate-600 dark:text-slate-400',
        name: 'ম্যানুয়াল',
      };
  }
};

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  source,
  sources,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const displaySources = sources && sources.length > 0 ? sources : [source];
  const isMultiSource = displaySources.length > 1;

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  }[size];

  if (isMultiSource) {
    return (
      <div
        className={`inline-flex items-center rounded-lg border border-purple-200/80 bg-purple-50/90 text-purple-800 shadow-xs dark:border-purple-800/50 dark:bg-purple-950/60 dark:text-purple-300 font-medium ${sizeStyles} ${className}`}
        title={`এই লিড একাধিক মাধ্যম থেকে এসেছে: ${displaySources.map((s) => SOURCE_LABELS[s] || s).join(', ')}`}
      >
        <div className="flex -space-x-1 items-center">
          {displaySources.map((s, idx) => {
            const theme = getSourceTheme(s);
            return (
              <span
                key={idx}
                className={`inline-flex items-center justify-center p-0.5 rounded-full ring-1 ring-white dark:ring-slate-900 ${theme.bg} ${theme.iconColor}`}
              >
                {getSourceIcon(s, iconSizes)}
              </span>
            );
          })}
        </div>
        {showLabel && (
          <span className="font-semibold tracking-tight whitespace-nowrap">
            {displaySources.map((s) => SOURCE_LABELS[s] || s).join(' + ')}
          </span>
        )}
      </div>
    );
  }

  const theme = getSourceTheme(source);

  return (
    <span
      className={`inline-flex items-center rounded-lg border shadow-xs font-semibold tracking-tight whitespace-nowrap ${theme.bg} ${theme.text} ${theme.border} ${sizeStyles} ${className}`}
    >
      <span className={theme.iconColor}>{getSourceIcon(source, iconSizes)}</span>
      {showLabel && <span>{SOURCE_LABELS[source] || source}</span>}
    </span>
  );
};
