// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { FieldSize } from './_internal/types';

export interface TabItem {
  value: string;
  label: React.ReactNode;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  items: TabItem[];
  variant?: 'underline' | 'pill';
  size?: FieldSize;
  className?: string;
  /** REQUIRED. */
  'aria-label': string;
}

/** Full `tablist`/`tab` ARIA plus roving tabIndex. */
export function Tabs({
  value,
  onValueChange,
  items,
  variant = 'underline',
  size = 'md',
  className,
  ...rest
}: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const enabled = items.filter(item => !item.disabled);
    if (enabled.length === 0) return;
    const current = enabled.findIndex(item => item.value === value);
    let next = -1;
    if (event.key === 'ArrowRight') next = (current + 1) % enabled.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    if (next < 0) return;
    event.preventDefault();
    onValueChange(enabled[next].value);
    const node = listRef.current?.querySelector<HTMLElement>(`[data-tab-value="${enabled[next].value}"]`);
    node?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn(
        'flex min-w-0 items-center',
        variant === 'underline' ? 'gap-1 border-b border-border' : 'gap-0.5 rounded-lg bg-surface-2 p-0.5',
        className,
      )}
      {...rest}
    >
      {items.map(item => {
        const selected = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            data-tab-value={item.value}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onValueChange(item.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2 font-medium whitespace-nowrap transition-colors duration-[120ms]',
              'disabled:pointer-events-none disabled:opacity-50',
              size === 'sm' ? 'h-control-sm text-xs' : 'h-control-md text-sm',
              variant === 'underline'
                ? cn(
                    '-mb-px border-b-2 border-transparent',
                    selected ? 'border-accent text-fg' : 'text-fg-muted hover:text-fg',
                  )
                : cn('rounded-md', selected ? 'bg-surface text-fg' : 'text-fg-muted hover:bg-hover hover:text-fg'),
            )}
          >
            {Icon ? <Icon aria-hidden strokeWidth={1.75} size={14} /> : null}
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}
