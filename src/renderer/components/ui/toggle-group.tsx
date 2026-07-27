// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ToggleOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: LucideIcon;
  /** Live count, e.g. on a filter chip. */
  count?: number;
  disabled?: boolean;
  disabledReason?: string;
  title?: string;
}

export interface ToggleGroupProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: ToggleOption<T>[];
  variant?: 'segmented' | 'chips';
  size?: 'xs' | 'sm';
  className?: string;
  /** REQUIRED. */
  'aria-label': string;
}

/** Mutually exclusive view modes; filter chips with counts. */
export function ToggleGroup<T extends string>({
  value,
  onValueChange,
  options,
  variant = 'segmented',
  size = 'sm',
  className,
  ...rest
}: ToggleGroupProps<T>) {
  return (
    <div
      role="group"
      className={cn(
        'flex min-w-0 flex-wrap items-center',
        variant === 'segmented' ? 'gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5' : 'gap-1',
        className,
      )}
      {...rest}
    >
      {options.map(option => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={option.disabled}
            title={option.disabled ? option.disabledReason : option.title}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 font-medium whitespace-nowrap transition-colors duration-[120ms]',
              'disabled:pointer-events-none disabled:opacity-50',
              size === 'xs' ? 'h-control-xs px-1.5 text-2xs' : 'h-control-sm px-2 text-xs',
              variant === 'segmented'
                ? cn('rounded-md', selected ? 'bg-surface text-fg' : 'text-fg-muted hover:bg-hover hover:text-fg')
                : cn(
                    'rounded-full border',
                    selected
                      ? 'border-accent/40 bg-accent-quiet text-accent-text'
                      : 'border-border bg-surface text-fg-muted hover:bg-hover hover:text-fg',
                  ),
            )}
          >
            {Icon ? <Icon aria-hidden strokeWidth={1.75} size={12} /> : null}
            {option.label}
            {typeof option.count === 'number' ? (
              <span className="ds-tabular text-2xs opacity-70" aria-live="polite">
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
