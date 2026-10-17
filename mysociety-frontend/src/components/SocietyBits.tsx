import { Avatar, Chip } from '@mui/material';
import type { SocietyProfile, SocietyStatus } from '@/types';

export const SOCIETY_STATUSES: SocietyStatus[] = ['ACTIVE', 'TRIAL', 'SUSPENDED', 'INACTIVE'];

const STATUS_COLOR: Record<SocietyStatus, 'success' | 'info' | 'warning' | 'default'> = {
  ACTIVE: 'success',
  TRIAL: 'info',
  SUSPENDED: 'warning',
  INACTIVE: 'default',
};

const AVATAR_COLORS = ['#1565c0', '#2e7d32', '#6a1b9a', '#ef6c00', '#00838f', '#ad1457'];

export function SocietyStatusChip({ status, size = 'small' }: { status: SocietyStatus; size?: 'small' | 'medium' }) {
  return <Chip size={size} color={STATUS_COLOR[status] ?? 'default'} label={status.charAt(0) + status.slice(1).toLowerCase()} />;
}

export function SocietyAvatar({ society, size = 52 }: { society: Pick<SocietyProfile, 'name' | 'code' | 'logoUrl'>; size?: number }) {
  const initials = society.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const color = AVATAR_COLORS[[...society.code].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <Avatar
      src={society.logoUrl ?? undefined}
      variant="rounded"
      sx={{ width: size, height: size, bgcolor: color, fontWeight: 700, fontSize: size / 2.6, borderRadius: 2 }}
    >
      {initials || 'S'}
    </Avatar>
  );
}

export const formatLocation = (s: Pick<SocietyProfile, 'city' | 'stateName'>): string =>
  [s.city, s.stateName].filter(Boolean).join(', ');
