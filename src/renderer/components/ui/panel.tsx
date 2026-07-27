// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useControllable } from './_internal/hooks';
import type { Tone } from './_internal/types';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'bordered' | 'inset';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  /** `true` -> `p-3`. */
  padded?: boolean;
  /** `danger` is the Danger Zone treatment. */
  tone?: 'default' | 'danger';
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Controlled disclosure — pair with `onOpenChange` to persist the state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PANEL_VARIANT = {
  flat: 'bg-surface',
  bordered: 'border border-border bg-surface',
  inset: 'border border-border bg-inset',
} as const;

/** Level-1 surface. Border-first: never a shadow (DESIGN-SYSTEM §4). */
export function Panel({
  variant = 'bordered',
  header,
  footer,
  padded = true,
  tone = 'default',
  collapsible,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  children,
  ...rest
}: PanelProps) {
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
  const body = collapsible ? open : true;
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-lg',
        PANEL_VARIANT[variant],
        tone === 'danger' && 'border-danger/40 bg-danger-quiet',
        className,
      )}
      {...rest}
    >
      {header ? (
        collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex h-control-lg items-center gap-1.5 border-b border-border px-3 text-left text-sm font-medium text-fg"
          >
            <Chevron aria-hidden strokeWidth={1.75} size={14} className="text-fg-muted" />
            <span className="min-w-0 flex-1">{header}</span>
          </button>
        ) : (
          <div className="flex min-h-control-lg items-center gap-1.5 border-b border-border px-3 text-sm font-medium text-fg">
            {header}
          </div>
        )
      ) : null}
      {body ? <div className={cn('min-w-0 flex-1', padded && 'p-3')}>{children}</div> : null}
      {footer && body ? <div className="border-t border-border px-3 py-2">{footer}</div> : null}
    </div>
  );
}

export interface StatTileProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  delta?: { value: React.ReactNode; direction: 'up' | 'down' | 'flat'; tone?: Tone };
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

const DELTA_TONE: Record<Tone, string> = {
  neutral: 'text-fg-muted',
  accent: 'text-accent-text',
  success: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-danger-text',
  running: 'text-running-text',
  idle: 'text-fg-muted',
};

const DELTA_GLYPH = { up: '▲', down: '▼', flat: '–' } as const;

export function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  delta,
  size = 'sm',
  onClick,
  className,
}: StatTileProps) {
  const content = (
    <>
      <div className="flex items-center gap-1.5 text-xs text-fg-muted">
        {Icon ? <Icon aria-hidden strokeWidth={1.75} size={14} className="shrink-0" /> : null}
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <div
        className={cn(
          'ds-tabular font-medium text-fg',
          size === 'md' ? 'text-2xl' : 'text-xl',
        )}
      >
        {value}
      </div>
      {delta ? (
        <div className={cn('flex items-center gap-1 text-xs', DELTA_TONE[delta.tone ?? 'neutral'])}>
          <span aria-hidden>{DELTA_GLYPH[delta.direction]}</span>
          {delta.value}
        </div>
      ) : null}
      {hint ? <div className="truncate text-xs text-fg-subtle">{hint}</div> : null}
    </>
  );

  const shell = cn(
    'flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface p-3 text-left',
    onClick && 'transition-colors duration-[120ms] hover:bg-hover',
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shell}>
        {content}
      </button>
    );
  }
  return <div className={shell}>{content}</div>;
}
