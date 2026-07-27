// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { IconButton } from './icon-button';
import { Popover } from './popover';
import { Spinner } from './spinner';
import type { FieldSize } from './_internal/types';

export interface ComboboxProps<T> {
  items: T[];
  value: T | null;
  onValueChange: (value: T | null) => void;
  itemKey: (item: T) => string;
  renderItem: (item: T, state: { active: boolean; selected: boolean }) => React.ReactNode;
  /** Defaults to a case-insensitive match against `renderTrigger`'s text. */
  filter?: (item: T, query: string) => boolean;
  groupBy?: (item: T) => string;
  /** Text shown on the trigger when nothing is selected. */
  placeholder?: string;
  /** Text shown on the trigger for the current value. */
  renderValue?: (item: T) => React.ReactNode;
  emptyMessage?: React.ReactNode;
  size?: FieldSize;
  clearable?: boolean;
  loading?: boolean;
  searchPlaceholder?: string;
  clearLabel?: string;
  className?: string;
  'aria-label'?: string;
}

/** Anything searchable or grouped, or more than ~12 options. */
export function Combobox<T>({
  items,
  value,
  onValueChange,
  itemKey,
  renderItem,
  filter,
  groupBy,
  placeholder = 'Select…',
  renderValue,
  emptyMessage = 'No matches',
  size = 'md',
  clearable,
  loading,
  searchPlaceholder = 'Search…',
  clearLabel = 'Clear',
  className,
  ...rest
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    if (!query.trim()) return items;
    const needle = query.trim().toLowerCase();
    return items.filter(item =>
      filter ? filter(item, query) : itemKey(item).toLowerCase().includes(needle),
    );
  }, [items, query, filter, itemKey]);

  const groups = useMemo(() => {
    if (!groupBy) return [['', matches] as const];
    const map = new Map<string, T[]>();
    for (const item of matches) {
      const key = groupBy(item);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries());
  }, [matches, groupBy]);

  function commit(item: T): void {
    onValueChange(item);
    setOpen(false);
    setQuery('');
  }

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (!next) setQuery('');
      }}
      matchTriggerWidth
      className="max-h-72 w-64"
      trigger={
        <Button
          size={size}
          trailingIcon={ChevronDown}
          className={cn('justify-between', className)}
          aria-haspopup="listbox"
          {...rest}
        >
          <span className="min-w-0 truncate">
            {value ? (renderValue ? renderValue(value) : itemKey(value)) : placeholder}
          </span>
        </Button>
      }
    >
      <div className="flex flex-col">
        <div className="relative flex items-center border-b border-border">
          <Search aria-hidden size={14} strokeWidth={1.75} className="absolute left-2 text-fg-subtle" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            placeholder={searchPlaceholder}
            onChange={event => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={event => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex(index => Math.min(index + 1, matches.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex(index => Math.max(index - 1, 0));
              } else if (event.key === 'Enter' && matches[activeIndex]) {
                event.preventDefault();
                commit(matches[activeIndex]);
              }
            }}
            // The ring is never optional (DESIGN-SYSTEM §5); the offset is
            // inset because this input is flush with the popover's edge.
            className="h-control-md w-full bg-transparent pr-7 pl-7 text-sm text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          />
          {clearable && value ? (
            <IconButton
              icon={X}
              label={clearLabel}
              size="xs"
              variant="ghost"
              className="absolute right-1"
              onClick={() => {
                onValueChange(null);
                setOpen(false);
              }}
            />
          ) : null}
        </div>
        <div role="listbox" className="max-h-56 overflow-y-auto p-1">
          {loading ? (
            <div className="flex justify-center p-3">
              <Spinner />
            </div>
          ) : matches.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-fg-muted">{emptyMessage}</div>
          ) : (
            groups.map(([group, list]) => (
              <div key={group || '_'}>
                {group ? (
                  <div className="px-2 py-1 text-2xs font-medium tracking-wide text-fg-subtle uppercase">
                    {group}
                  </div>
                ) : null}
                {list.map(item => {
                  const index = matches.indexOf(item);
                  const selected = value !== null && itemKey(item) === itemKey(value);
                  const active = index === activeIndex;
                  return (
                    <button
                      key={itemKey(item)}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commit(item)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-fg',
                        active && 'bg-hover',
                        selected && 'bg-selected',
                      )}
                    >
                      {renderItem(item, { active, selected })}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </Popover>
  );
}
