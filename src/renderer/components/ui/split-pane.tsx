// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export interface SplitPaneProps {
  direction?: 'horizontal' | 'vertical';
  /** Persists the ratio in `localStorage`. */
  storageKey?: string;
  defaultRatio?: number;
  /** px bounds on the first pane. */
  min?: number;
  max?: number;
  collapsible?: 'first' | 'second' | null;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Width of the collapsed pane — an icon rail, not zero. */
  collapsedSize?: number;
  className?: string;
  separatorLabel?: string;
  children: [React.ReactNode, React.ReactNode];
}

const STORAGE_PREFIX = 'ds-split:';

/** Drag AND keyboard resize; zero transition while dragging. */
export function SplitPane({
  direction = 'horizontal',
  storageKey,
  defaultRatio = 0.5,
  min = 160,
  max = 640,
  collapsible = null,
  collapsed = false,
  onCollapsedChange,
  collapsedSize = 44,
  className,
  separatorLabel = 'Resize panes',
  children,
}: SplitPaneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<number | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
      if (stored) setSize(Number(stored) || null);
    } catch {
      // Persistence is best-effort.
    }
  }, [storageKey]);

  const clamp = useCallback((value: number) => Math.min(Math.max(value, min), max), [min, max]);

  const commit = useCallback(
    (value: number) => {
      const next = clamp(value);
      setSize(next);
      if (!storageKey) return;
      try {
        window.localStorage.setItem(STORAGE_PREFIX + storageKey, String(next));
      } catch {
        // Persistence is best-effort.
      }
    },
    [clamp, storageKey],
  );

  useEffect(() => {
    function onMove(event: MouseEvent): void {
      if (!dragging.current || !rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      commit(direction === 'horizontal' ? event.clientX - rect.left : event.clientY - rect.top);
    }
    function onUp(): void {
      dragging.current = false;
      document.body.style.cursor = '';
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [commit, direction]);

  const isCollapsed = collapsible !== null && collapsed;
  const firstSize = isCollapsed && collapsible === 'first' ? collapsedSize : (size ?? null);
  const horizontal = direction === 'horizontal';

  const firstStyle: React.CSSProperties = firstSize
    ? horizontal
      ? { width: firstSize, flex: '0 0 auto' }
      : { height: firstSize, flex: '0 0 auto' }
    : { flex: defaultRatio };

  return (
    <div ref={rootRef} className={cn('flex min-h-0 min-w-0', horizontal ? 'flex-row' : 'flex-col', className)}>
      <div style={firstStyle} className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        {children[0]}
      </div>
      <div
        role="separator"
        aria-orientation={horizontal ? 'vertical' : 'horizontal'}
        aria-label={separatorLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={typeof firstSize === 'number' ? firstSize : undefined}
        tabIndex={0}
        onMouseDown={() => {
          if (isCollapsed) return;
          dragging.current = true;
          document.body.style.cursor = horizontal ? 'col-resize' : 'row-resize';
        }}
        onDoubleClick={() => {
          if (collapsible) onCollapsedChange?.(!collapsed);
          else setSize(null);
        }}
        onKeyDown={event => {
          const step = event.shiftKey ? 32 : 8;
          const base = typeof firstSize === 'number' ? firstSize : min;
          if (event.key === (horizontal ? 'ArrowLeft' : 'ArrowUp')) {
            event.preventDefault();
            commit(base - step);
          } else if (event.key === (horizontal ? 'ArrowRight' : 'ArrowDown')) {
            event.preventDefault();
            commit(base + step);
          } else if (event.key === 'Home') {
            event.preventDefault();
            commit(min);
          } else if (event.key === 'End') {
            event.preventDefault();
            commit(max);
          }
        }}
        className={cn(
          'relative shrink-0 bg-border-strong',
          horizontal ? 'w-px cursor-col-resize' : 'h-px cursor-row-resize',
          'z-[var(--ds-z-resizer)] hover:bg-accent',
          'after:absolute after:content-[""]',
          horizontal ? 'after:-inset-x-1 after:inset-y-0' : 'after:-inset-y-1 after:inset-x-0',
        )}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children[1]}</div>
    </div>
  );
}
