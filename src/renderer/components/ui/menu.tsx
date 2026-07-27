// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Kbd } from './kbd';
import { Popover, type PopoverProps } from './popover';
import { isActionableMenuItem, type MenuItem } from './_internal/types';

/** Insert a separator before the first `danger` item when the author omitted one. */
function withDangerSeparator(items: MenuItem[]): MenuItem[] {
  const index = items.findIndex(item => (item.kind ?? 'item') === 'item' && 'danger' in item && item.danger);
  if (index <= 0) return items;
  if (items[index - 1].kind === 'separator') return items;
  return [...items.slice(0, index), { kind: 'separator', id: `sep-danger-${index}` }, ...items.slice(index)];
}

interface MenuListProps {
  items: MenuItem[];
  onClose: () => void;
  container?: HTMLElement | null;
}

function MenuList({ items, onClose, container }: MenuListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const resolved = useMemo(() => withDangerSeparator(items), [items]);
  const actionable = resolved.filter(isActionableMenuItem);
  const [activeId, setActiveId] = useState<string | null>(actionable[0]?.id ?? null);

  useEffect(() => {
    listRef.current?.focus();
  }, []);

  function moveActive(delta: number): void {
    if (actionable.length === 0) return;
    const current = actionable.findIndex(item => item.id === activeId);
    const next = (current + delta + actionable.length) % actionable.length;
    setActiveId(actionable[next].id);
  }

  function select(item: MenuItem): void {
    if (item.kind === 'separator' || item.kind === 'label' || item.kind === 'submenu') return;
    if (item.disabled) return;
    item.onSelect();
    onClose();
  }

  return (
    <div
      ref={listRef}
      role="menu"
      tabIndex={-1}
      className="min-w-44 p-1 outline-none"
      onKeyDown={event => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          moveActive(1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          moveActive(-1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          setActiveId(actionable[0]?.id ?? null);
        } else if (event.key === 'End') {
          event.preventDefault();
          setActiveId(actionable[actionable.length - 1]?.id ?? null);
        } else if (event.key === 'Enter' || event.key === ' ') {
          const item = resolved.find(entry => isActionableMenuItem(entry) && entry.id === activeId);
          if (item) {
            event.preventDefault();
            select(item);
          }
        }
      }}
    >
      {resolved.map(item => {
        if (item.kind === 'separator') {
          return <div key={item.id} role="separator" className="my-1 h-px bg-border" />;
        }
        if (item.kind === 'label') {
          return (
            <div key={item.id} className="px-2 py-1 text-2xs font-medium tracking-wide text-fg-subtle uppercase">
              {item.label}
            </div>
          );
        }
        if (item.kind === 'submenu') {
          return (
            <DropdownMenu
              key={item.id}
              items={item.items}
              side="right"
              align="start"
              container={container}
              trigger={
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  className="flex h-control-sm w-full items-center gap-2 rounded-md px-2 text-sm text-fg hover:bg-hover"
                >
                  {item.icon ? <item.icon aria-hidden strokeWidth={1.75} size={14} /> : null}
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  <ChevronRight aria-hidden strokeWidth={1.75} size={14} className="text-fg-subtle" />
                </button>
              }
            />
          );
        }

        const checkbox = item.kind === 'checkbox';
        const danger = item.kind !== 'checkbox' && item.danger;
        return (
          <button
            key={item.id}
            type="button"
            role={checkbox ? 'menuitemcheckbox' : 'menuitem'}
            aria-checked={checkbox ? item.checked : undefined}
            disabled={item.disabled}
            data-active={activeId === item.id || undefined}
            onMouseEnter={() => setActiveId(item.id)}
            onClick={() => select(item)}
            className={cn(
              'flex h-control-sm w-full items-center gap-2 rounded-md px-2 text-left text-sm',
              'disabled:pointer-events-none disabled:opacity-50',
              danger ? 'text-danger-text hover:bg-danger-quiet' : 'text-fg hover:bg-hover',
              'data-[active]:bg-hover',
            )}
          >
            {checkbox ? (
              <Check
                aria-hidden
                strokeWidth={1.75}
                size={14}
                className={cn('shrink-0', item.checked ? 'text-accent-text' : 'opacity-0')}
              />
            ) : item.icon ? (
              <item.icon aria-hidden strokeWidth={1.75} size={14} className="shrink-0" />
            ) : null}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {!checkbox && item.hint ? <span className="text-xs text-fg-subtle">{item.hint}</span> : null}
            {!checkbox && item.shortcut ? <Kbd>{item.shortcut}</Kbd> : null}
          </button>
        );
      })}
    </div>
  );
}

export interface DropdownMenuProps extends Omit<PopoverProps, 'children'> {
  items: MenuItem[];
}

export function DropdownMenu({ items, open: openProp, onOpenChange, ...rest }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const current = isControlled ? openProp : open;

  function change(next: boolean): void {
    if (!isControlled) setOpen(next);
    onOpenChange?.(next);
  }

  return (
    <Popover open={current} onOpenChange={change} className="py-0" {...rest}>
      <MenuList items={items} onClose={() => change(false)} container={rest.container} />
    </Popover>
  );
}

export interface ContextMenuProps {
  items: MenuItem[];
  children: React.ReactElement;
  disabled?: boolean;
  container?: HTMLElement | null;
}

/** `DropdownMenu` opened at the pointer. */
export function ContextMenu({ items, children, disabled, container }: ContextMenuProps) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  const child = isValidElement(children)
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        onContextMenu: (event: React.MouseEvent) => {
          if (disabled) return;
          event.preventDefault();
          setPoint({ x: event.clientX, y: event.clientY });
        },
      })
    : children;

  return (
    <>
      {child}
      {point ? (
        <DropdownMenu
          items={items}
          open
          onOpenChange={next => {
            if (!next) setPoint(null);
          }}
          anchorPoint={point}
          container={container}
        />
      ) : null}
    </>
  );
}
