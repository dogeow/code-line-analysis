// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDelayedFlag } from './_internal/hooks';

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md';
  label?: string;
  className?: string;
}

const SPINNER_SIZE = { xs: 12, sm: 14, md: 16 } as const;

export function Spinner({ size = 'sm', label, className }: SpinnerProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-fg-muted', className)}>
      <Loader2
        aria-hidden
        strokeWidth={1.75}
        size={SPINNER_SIZE[size]}
        className="animate-spin-slow shrink-0"
      />
      {label ? <span className="text-xs">{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}

export interface SkeletonProps {
  variant?: 'text' | 'row' | 'tile';
  count?: number;
  /** Never flash: nothing renders before this many ms have elapsed. */
  delayMs?: number;
  className?: string;
}

const SKELETON_SHAPE = {
  text: 'h-3 w-full',
  row: 'h-row-grid w-full',
  tile: 'h-16 w-full',
} as const;

export function Skeleton({ variant = 'text', count = 1, delayMs = 300, className }: SkeletonProps) {
  const visible = useDelayedFlag(true, delayMs);
  if (!visible) return null;
  return (
    <div aria-hidden className="flex flex-col gap-1.5">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={cn('animate-pulse rounded-sm bg-surface-2', SKELETON_SHAPE[variant], className)}
        />
      ))}
    </div>
  );
}
