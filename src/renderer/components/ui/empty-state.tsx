// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { CircleX, FolderOpen, MousePointerClick, SearchX, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Kbd } from './kbd';

export type EmptyStateVariant = 'first-run' | 'no-selection' | 'no-results' | 'error';

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** REQUIRED — every empty state carries an action (DESIGN-SYSTEM §7.6). */
  action: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** e.g. `Mod+K`, rendered as a Kbd hint. */
  shortcut?: string;
  error?: unknown;
  size?: 'sm' | 'md';
  className?: string;
  detailsLabel?: string;
}

const DEFAULT_ICON: Record<EmptyStateVariant, LucideIcon> = {
  'first-run': FolderOpen,
  'no-selection': MousePointerClick,
  'no-results': SearchX,
  error: CircleX,
};

function describeError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

export function EmptyState({
  variant = 'first-run',
  icon,
  title,
  description,
  action,
  secondaryAction,
  shortcut,
  error,
  size = 'md',
  className,
  detailsLabel = 'Details',
}: EmptyStateProps) {
  const Icon = icon ?? DEFAULT_ICON[variant];
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col items-center justify-center gap-2 text-center',
        size === 'md' ? 'flex-1 px-6 py-10' : 'px-4 py-6',
        className,
      )}
    >
      <Icon
        aria-hidden
        strokeWidth={1.75}
        size={20}
        className={cn('shrink-0', variant === 'error' ? 'text-danger' : 'text-fg-subtle')}
      />
      <div className="text-sm font-medium text-fg">{title}</div>
      {description ? <p className="m-0 max-w-md text-xs text-fg-muted">{description}</p> : null}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        {action}
        {secondaryAction}
      </div>
      {shortcut ? (
        <div className="mt-1 flex items-center gap-1 text-2xs text-fg-subtle">
          <Kbd>{shortcut}</Kbd>
        </div>
      ) : null}
      {variant === 'error' && error !== undefined ? (
        <details className="mt-2 max-w-full text-left">
          <summary className="cursor-pointer text-xs text-fg-muted">{detailsLabel}</summary>
          <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-border bg-inset p-2 font-mono text-2xs text-fg-muted">
            {describeError(error)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
