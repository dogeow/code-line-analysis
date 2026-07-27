// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { StatusTone, Tone } from './_internal/types';

const TONE: Record<Tone, { quiet: string; solid: string; outline: string }> = {
  neutral: {
    quiet: 'bg-surface-2 text-fg-muted border-border',
    solid: 'bg-fg-muted text-surface border-transparent',
    outline: 'border-border text-fg-muted',
  },
  accent: {
    quiet: 'bg-accent-quiet text-accent-text border-accent/30',
    solid: 'bg-accent text-accent-fg border-transparent',
    outline: 'border-accent/50 text-accent-text',
  },
  success: {
    quiet: 'bg-success-quiet text-success-text border-success/30',
    solid: 'bg-success text-surface border-transparent',
    outline: 'border-success/50 text-success-text',
  },
  warning: {
    quiet: 'bg-warning-quiet text-warning-text border-warning/30',
    solid: 'bg-warning text-surface border-transparent',
    outline: 'border-warning/50 text-warning-text',
  },
  danger: {
    quiet: 'bg-danger-quiet text-danger-text border-danger/30',
    solid: 'bg-danger text-danger-fg border-transparent',
    outline: 'border-danger/50 text-danger-text',
  },
  running: {
    quiet: 'bg-running-quiet text-running-text border-running/30',
    solid: 'bg-running text-accent-fg border-transparent',
    outline: 'border-running/50 text-running-text',
  },
  idle: {
    quiet: 'bg-idle-quiet text-fg-muted border-border',
    solid: 'bg-idle text-surface border-transparent',
    outline: 'border-border text-fg-muted',
  },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: 'xs' | 'sm';
  icon?: LucideIcon;
  /** Leading StatusDot instead of an icon. */
  dot?: boolean;
  variant?: 'quiet' | 'solid' | 'outline';
}

export function Badge({
  tone = 'neutral',
  size = 'sm',
  icon: Icon,
  dot,
  variant = 'quiet',
  className,
  children,
  ...rest
}: BadgeProps) {
  const status: StatusTone =
    tone === 'success' || tone === 'warning' || tone === 'danger' || tone === 'running' ? tone : 'idle';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-sm border font-medium whitespace-nowrap',
        size === 'xs' ? 'h-4 px-1 text-2xs' : 'h-5 px-1.5 text-xs',
        TONE[tone][variant],
        className,
      )}
      {...rest}
    >
      {dot ? <StatusDot status={status} /> : null}
      {Icon ? <Icon aria-hidden strokeWidth={1.75} size={size === 'xs' ? 10 : 12} /> : null}
      {children}
    </span>
  );
}

export interface StatusDotProps {
  status: StatusTone;
  size?: 'sm' | 'md';
  /** When present, renders dot + text and drops `aria-hidden`. */
  label?: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

const DOT: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  running: 'bg-running',
  idle: 'bg-idle',
};

export function StatusDot({
  status,
  size = 'sm',
  label,
  pulse = status === 'running',
  className,
}: StatusDotProps) {
  const dot = (
    <span
      data-status={status}
      aria-hidden
      className={cn(
        'inline-block shrink-0 rounded-full',
        size === 'sm' ? 'size-1.5' : 'size-2',
        DOT[status],
        pulse && 'animate-pulse-dot',
        !label && className,
      )}
    />
  );
  if (!label) return dot;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-fg-muted', className)}>
      {dot}
      {label}
    </span>
  );
}
