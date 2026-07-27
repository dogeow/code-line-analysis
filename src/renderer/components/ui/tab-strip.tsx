// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { useRef, useState } from 'react';
import { X, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { StatusDot } from './badge';
import { DropdownMenu } from './menu';
import type { MenuItem } from './_internal/types';

export interface DocumentTab {
  id: string;
  title: string;
  icon?: LucideIcon;
  dirty?: boolean;
  /** A StatusDot replaces the icon while set. */
  status?: 'running' | 'error' | null;
  closable?: boolean;
}

export interface TabStripProps {
  tabs: DocumentTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  onReorder?: (from: number, to: number) => void;
  onContextMenu?: (id: string) => MenuItem[];
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  closeLabel?: string;
  'aria-label': string;
}

/**
 * Closable, reorderable document tabs. Always exposes the same affordances no
 * matter who mounts it.
 */
export function TabStrip({
  tabs,
  activeId,
  onSelect,
  onClose,
  onReorder,
  onContextMenu,
  leading,
  trailing,
  className,
  closeLabel = 'Close tab',
  ...rest
}: TabStripProps) {
  const dragIndex = useRef<number | null>(null);
  const [menu, setMenu] = useState<{ id: string; point: { x: number; y: number } } | null>(null);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (tabs.length === 0) return;
    const current = tabs.findIndex(tab => tab.id === activeId);
    let next = -1;
    if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    onSelect(tabs[next].id);
  }

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn('flex h-tabstrip shrink-0 items-stretch gap-0.5 border-b border-border bg-surface px-1', className)}
      {...rest}
    >
      {leading}
      <div className="flex min-w-0 flex-1 items-stretch gap-0.5 overflow-x-auto">
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          const Icon = tab.icon;
          const closable = tab.closable !== false && Boolean(onClose);
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              draggable={Boolean(onReorder)}
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDragOver={event => {
                if (onReorder) event.preventDefault();
              }}
              onDrop={() => {
                if (onReorder && dragIndex.current !== null && dragIndex.current !== index) {
                  onReorder(dragIndex.current, index);
                }
                dragIndex.current = null;
              }}
              onClick={() => onSelect(tab.id)}
              onContextMenu={event => {
                if (!onContextMenu) return;
                event.preventDefault();
                setMenu({ id: tab.id, point: { x: event.clientX, y: event.clientY } });
              }}
              className={cn(
                'group flex min-w-0 cursor-default items-center gap-1.5 rounded-t-md px-2 text-sm',
                'transition-colors duration-[120ms]',
                selected
                  ? 'border-b-2 border-accent bg-surface-2 text-fg'
                  : 'border-b-2 border-transparent text-fg-muted hover:bg-hover hover:text-fg',
              )}
            >
              {tab.status ? (
                <StatusDot status={tab.status === 'error' ? 'danger' : 'running'} />
              ) : Icon ? (
                <Icon aria-hidden strokeWidth={1.75} size={14} className="shrink-0" />
              ) : null}
              <span className="min-w-0 truncate">{tab.title}</span>
              {tab.dirty ? <span aria-label="Unsaved" className="size-1.5 shrink-0 rounded-full bg-accent" /> : null}
              {closable ? (
                <button
                  type="button"
                  aria-label={`${closeLabel}: ${tab.title}`}
                  onClick={event => {
                    event.stopPropagation();
                    onClose?.(tab.id);
                  }}
                  className="flex size-4 shrink-0 items-center justify-center rounded-xs text-fg-subtle hover:bg-hover hover:text-fg"
                >
                  <X aria-hidden strokeWidth={1.75} size={12} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {trailing}
      {menu && onContextMenu ? (
        <DropdownMenu
          items={onContextMenu(menu.id)}
          open
          onOpenChange={next => {
            if (!next) setMenu(null);
          }}
          anchorPoint={menu.point}
        />
      ) : null}
    </div>
  );
}
