// A driver's money for the day. Only cash (not UPI) goes into the office handover, and the
// driver's spending comes out of that cash.
export interface CashLine {
  amount: number;
}

export function summarizeCash(
  expenses: CashLine[],
  collections: (CashLine & { method: 'cash' | 'upi' })[],
) {
  const round = (n: number) => Math.round(n * 100) / 100;
  const totalExpenses = round(expenses.reduce((s, e) => s + e.amount, 0));
  const totalCollected = round(collections.reduce((s, c) => s + c.amount, 0));
  const totalCashCollected = round(collections.filter(c => c.method === 'cash').reduce((s, c) => s + c.amount, 0));
  return {
    totalExpenses,
    totalCollected,
    totalCashCollected,
    cashToHandOver: round(totalCashCollected - totalExpenses),
    netEarnings: round(totalCollected - totalExpenses),
  };
}

// "-₹1" for a loss, "₹1" otherwise.
export const formatSignedRupees = (n: number) => `${n < 0 ? '-' : ''}₹${Math.abs(n).toLocaleString('en-IN')}`;

// Entries made after the driver's last handover. A driver can hand over several times a day,
// and cash left over from an earlier day still counts until it is handed over.
// With no handover yet, everything counts.
export function entriesSince<T extends { timestamp: string }>(entries: T[], lastHandoverAt: string | null): T[] {
  if (!lastHandoverAt) return entries;
  const cutoff = new Date(lastHandoverAt).getTime();
  return entries.filter(e => new Date(e.timestamp).getTime() > cutoff);
}

// What the driver should hand over now: cash collected minus spending since the last handover.
export function cashDueSince(
  expenses: (CashLine & { timestamp: string })[],
  collections: (CashLine & { method: 'cash' | 'upi'; timestamp: string })[],
  lastHandoverAt: string | null,
) {
  return summarizeCash(entriesSince(expenses, lastHandoverAt), entriesSince(collections, lastHandoverAt));
}
