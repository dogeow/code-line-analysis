// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { Square } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from './icon-button';
import type { JobStatus, ProgressState } from './_internal/types';

export interface ProgressBarProps extends ProgressState {
  /** `bar` = 6px with labels; `line` = the 2px variant pinned under a Toolbar. */
  variant?: 'bar' | 'line';
  className?: string;
  cancelLabel?: string;
}

const FILL: Record<JobStatus, string> = {
  idle: 'bg-idle',
  queued: 'bg-idle',
  running: 'bg-running',
  done: 'bg-success',
  error: 'bg-danger',
  cancelled: 'bg-idle',
};

/** DESIGN-SYSTEM §7 — cancel always lives with the progress. */
export function ProgressBar({
  status,
  value,
  label,
  detail,
  count,
  onCancel,
  variant = 'bar',
  className,
  cancelLabel = 'Cancel',
}: ProgressBarProps) {
  const indeterminate = status === 'running' && typeof value !== 'number';
  const percent = typeof value === 'number' ? Math.min(100, Math.max(0, value * 100)) : 0;

  const track = (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(percent)}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-busy={status === 'running' || undefined}
      className={cn(
        'relative w-full overflow-hidden rounded-full bg-surface-2',
        variant === 'line' ? 'h-0.5 rounded-none' : 'h-1.5',
      )}
    >
      <div
        data-indeterminate={indeterminate || undefined}
        className={cn(
          'h-full rounded-full',
          FILL[status],
          indeterminate ? 'w-full animate-indeterminate' : 'transition-[width] duration-[180ms]',
        )}
        style={indeterminate ? undefined : { width: `${percent}%` }}
      />
    </div>
  );

  if (variant === 'line') return <div className={className}>{track}</div>;

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label || count || onCancel ? (
        <div className="flex min-w-0 items-center gap-2" aria-live="polite">
          {label ? <span className="truncate text-xs text-fg">{label}</span> : null}
          {count ? (
            <span className="ds-tabular text-xs text-fg-muted">
              {count.done}
              {typeof count.total === 'number' ? ` / ${count.total}` : ''}
            </span>
          ) : null}
          {onCancel ? (
            <IconButton
              icon={Square}
              label={cancelLabel}
              size="xs"
              variant="danger-ghost"
              className="ml-auto"
              onClick={onCancel}
            />
          ) : null}
        </div>
      ) : null}
      {track}
      {detail ? <span className="truncate font-mono text-2xs text-fg-subtle">{detail}</span> : null}
    </div>
  );
}
