// ==============================================================================
// CRM DATE UTILITIES FOR OPPORTUNITIES, INVOICES & CONTRACTS (dateUtils.ts)
// ==============================================================================

/**
 * Returns a local date string (YYYY-MM-DD) avoiding UTC midnight timezone shifts.
 */
export function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Robust date formatter for display (e.g. "Aug 25, 2026") that avoids UTC day-shifting.
 */
export function formatDisplayDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    if (typeof dateInput === 'string') {
      const datePart = dateInput.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const d = new Date(year, month, day);
          return d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      }
    }
    const d = new Date(dateInput);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
  } catch {
    return '—';
  }
}

/**
 * Checks if an invoice is overdue (past end-of-day on the due date).
 */
export function isInvoiceOverdue(dueDateStr?: string | null, status?: string): boolean {
  const normStatus = (status || '').toLowerCase();
  if (normStatus === 'paid' || normStatus === 'cancelled' || normStatus === 'refunded' || normStatus === 'pendingverification') {
    return false;
  }
  if (!dueDateStr) return false;

  const dateOnly = typeof dueDateStr === 'string' ? dueDateStr.split('T')[0] : '';
  const parts = dateOnly.split('-');
  let dueEndOfDay: number;
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    dueEndOfDay = new Date(y, m, d, 23, 59, 59, 999).getTime();
  } else {
    const dueDateObj = new Date(dueDateStr);
    dueEndOfDay = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate(), 23, 59, 59, 999).getTime();
  }

  return Date.now() > dueEndOfDay;
}

/**
 * Returns how many full days an invoice or item is past its due date.
 */
export function getDaysOverdue(dueDateStr?: string | null): number {
  if (!dueDateStr) return 0;
  const dateOnly = typeof dueDateStr === 'string' ? dueDateStr.split('T')[0] : '';
  const parts = dateOnly.split('-');
  let dueEndOfDay: number;
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    dueEndOfDay = new Date(y, m, d, 23, 59, 59, 999).getTime();
  } else {
    const dueDateObj = new Date(dueDateStr);
    dueEndOfDay = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate(), 23, 59, 59, 999).getTime();
  }
  const diff = Date.now() - dueEndOfDay;
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

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

  const dateOnly = dateStr.split('T')[0];
  const parts = dateOnly.split('-');
  let targetDate: Date;
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    targetDate = new Date(y, m, d);
  } else {
    targetDate = new Date(dateStr);
  }

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
 * Returns formatted local date strings (YYYY-MM-DD) for common standard CRM presets
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

  return [
    { label: '+2 Weeks', value: getLocalDateString(plus2Weeks) },
    { label: '+30 Days (Standard)', value: getLocalDateString(plus30Days) },
    { label: 'End of Month', value: getLocalDateString(endOfMonth) },
    { label: 'End of Quarter', value: getLocalDateString(endOfQuarter) }
  ];
}
