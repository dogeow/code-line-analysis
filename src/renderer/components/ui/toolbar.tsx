// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { EllipsisVertical, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from './icon-button';
import { DropdownMenu } from './menu';
import { ProgressBar } from './progress';
import type { MenuItem, ProgressState } from './_internal/types';

export interface ToolbarProps {
  title?: React.ReactNode;
  /** Path, row count, connection — mono where it is a literal. */
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  /** High-frequency only; cap at ~4 controls. */
  actions?: React.ReactNode;
  /** Everything else -> a single trailing ⋯. */
  overflow?: MenuItem[];
  /** Second row; wraps as a ToggleGroup chips row. */
  filters?: React.ReactNode;
  /** Renders a 2px ProgressBar on the bottom edge — zero layout cost. */
  progress?: ProgressState | null;
  sticky?: boolean;
  className?: string;
  overflowLabel?: string;
}

/**
 * The anchor of the whole IA: `title` ALWAYS renders (the old `PageHeader`
 * returned `null` unless `meta`/`actions` was passed, so no screen had a title).
 */
export function Toolbar({
  title,
  subtitle,
  icon: Icon,
  actions,
  overflow,
  filters,
  progress,
  sticky = true,
  className,
  overflowLabel = 'More actions',
}: ToolbarProps) {
  return (
    <div
      className={cn(
        'relative shrink-0 border-b border-border bg-surface',
        sticky && 'sticky top-0 z-[var(--ds-z-chrome)]',
        className,
      )}
    >
      <div className="flex h-toolbar items-center gap-1.5 px-2">
        {Icon ? <Icon size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-fg-muted" /> : null}
        <div className="flex min-w-0 items-baseline gap-2">
          {title ? <h1 className="truncate text-sm font-semibold text-fg">{title}</h1> : null}
          {subtitle ? <span className="truncate text-xs text-fg-muted">{subtitle}</span> : null}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {actions}
          {overflow && overflow.length > 0 ? (
            <DropdownMenu
              items={overflow}
              align="end"
              trigger={
                <IconButton icon={EllipsisVertical} label={overflowLabel} size="sm" variant="ghost" />
              }
            />
          ) : null}
        </div>
      </div>
      {filters ? (
        <div className="flex flex-wrap items-center gap-1 border-t border-border px-2 py-1">{filters}</div>
      ) : null}
      {progress ? (
        <ProgressBar {...progress} variant="line" className="absolute inset-x-0 bottom-0" />
      ) : null}
    </div>
  );
}
