import React from 'react';
import { Flag } from 'lucide-react';

interface PageBadgeProps {
  pageName?: string | null;
  pageId?: string | null;
  size?: 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
}

export const PageBadge: React.FC<PageBadgeProps> = ({
  pageName,
  pageId,
  size = 'sm',
  className = '',
  showIcon = true,
}) => {
  const displayName = pageName?.trim() || (pageId ? `Page (${pageId})` : '');

  if (!displayName) {
    return null;
  }

  const sizeClasses =
    size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1'
      : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border border-indigo-200/80 bg-indigo-50/90 text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
      title={pageId ? `পেজের নাম: ${displayName} (ID: ${pageId})` : `পেজের নাম: ${displayName}`}
    >
      {showIcon && <Flag className={size === 'sm' ? 'w-2.5 h-2.5 shrink-0 text-indigo-500 dark:text-indigo-400' : 'w-3 h-3 shrink-0 text-indigo-500 dark:text-indigo-400'} />}
      <span className="truncate max-w-[140px] sm:max-w-[200px]" title={displayName}>
        {displayName}
      </span>
    </span>
  );
};
