import { titleCase } from '@/utils/format';

const TONE: Record<string, string> = {
  PAID: 'ok',
  RESOLVED: 'ok',
  CLOSED: 'ok',
  CONFIRMED: 'ok',
  CHECKED_IN: 'ok',
  DUE: 'warn',
  REQUESTED: 'warn',
  EXPECTED: 'warn',
  IN_PROGRESS: 'warn',
  OVERDUE: 'bad',
  OPEN: 'bad',
  DENIED: 'bad',
  CANCELLED: 'muted',
  CHECKED_OUT: 'muted',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge--${TONE[status] ?? 'muted'}`}>{titleCase(status)}</span>;
}
