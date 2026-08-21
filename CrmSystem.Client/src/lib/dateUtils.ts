// ==============================================================================
// CRM DATE UTILITIES FOR OPPORTUNITIES & EXPECTED CLOSE DATES (dateUtils.ts)
// ==============================================================================
// Implements standard CRM behaviors for Expected Close Date calculations:
// 1. Overdue detection for open deals past their target date
// 2. Urgent / Closing Soon detection for deals due within 3 days
// 3. Quick shortcut date generators (+2 Weeks, +30 Days, End of Month, Next Quarter)
// ==============================================================================

export interface CloseDateStatus {
  status: 'none' | 'overdue' | 'today' | 'soon' | 'future' | 'closed';
  label: string;
  badge?: string;
  color: string;
  bg?: string;
  diffDays?: number;
}

/**
 * Calculates standard CRM status for an opportunity's expected close date.
 */
export function getExpectedCloseDateStatus(
  dateStr?: string | null,
  isWon?: boolean,
  isLost?: boolean
): CloseDateStatus {
  if (!dateStr) {
    return {
      status: 'none',
      label: 'No target date set',
      color: 'var(--text-muted, #64748b)'
    };
  }

  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) {
    return {
      status: 'none',
      label: '—',
      color: 'var(--text-muted, #64748b)'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(targetDate);
  checkDate.setHours(0, 0, 0, 0);

  const diffMs = checkDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const formattedDate = targetDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const shortDate = targetDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

  // Closed deals (Won / Lost)
  if (isWon || isLost) {
    return {
      status: 'closed',
      label: isWon ? `Won on ${formattedDate}` : `Lost on ${formattedDate}`,
      badge: isWon ? `✓ Won ${shortDate}` : `✗ Lost ${shortDate}`,
      color: isWon ? '#10b981' : '#94a3b8',
      bg: isWon ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
      diffDays
    };
  }

  // Open deals: Overdue (Past date)
  if (diffDays < 0) {
    const daysPast = Math.abs(diffDays);
    return {
      status: 'overdue',
      label: `Overdue by ${daysPast}d (${formattedDate})`,
      badge: `⚠️ Overdue (${daysPast}d)`,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      diffDays
    };
  }

  // Open deals: Due Today
  if (diffDays === 0) {
    return {
      status: 'today',
      label: `Target closing date is Today (${formattedDate})`,
      badge: `🔥 Due Today`,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.18)',
      diffDays
    };
  }

  // Open deals: Closing Soon (1 to 3 days)
  if (diffDays <= 3) {
    return {
      status: 'soon',
      label: `Closing in ${diffDays} day${diffDays > 1 ? 's' : ''} (${formattedDate})`,
      badge: `⏳ In ${diffDays}d`,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.14)',
      diffDays
    };
  }

  // Open deals: Normal Future date (On track)
  return {
    status: 'future',
    label: formattedDate,
    badge: shortDate,
    color: 'var(--text-secondary, #94a3b8)',
    bg: 'rgba(255, 255, 255, 0.05)',
    diffDays
  };
}

/**
 * Returns formatted ISO date string (YYYY-MM-DD) for common standard CRM presets
 */
export function getStandardCloseDatePresets() {
  const today = new Date();

  // 1. +14 Days (2 Weeks)
  const plus2Weeks = new Date(today);
  plus2Weeks.setDate(plus2Weeks.getDate() + 14);

  // 2. +30 Days (1 Month)
  const plus30Days = new Date(today);
  plus30Days.setDate(plus30Days.getDate() + 30);

  // 3. End of Current Month
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // 4. End of Next Month
  const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

  // 5. End of Current Quarter
  const currentQuarter = Math.floor(today.getMonth() / 3);
  const endOfQuarter = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);

  const format = (d: Date) => d.toISOString().split('T')[0];

  return [
    { label: '+2 Weeks', value: format(plus2Weeks) },
    { label: '+30 Days (Standard)', value: format(plus30Days) },
    { label: 'End of Month', value: format(endOfMonth) },
    { label: 'End of Quarter', value: format(endOfQuarter) }
  ];
}
