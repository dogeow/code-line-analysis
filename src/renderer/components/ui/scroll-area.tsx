// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'both';
  /** Persists `scrollTop` in `sessionStorage` under this key. */
  restoreKey?: string;
  onReachEnd?: () => void;
  viewportRef?: React.Ref<HTMLDivElement>;
  /** Hairline shadow under a sticky header once scrolled. */
  stickyShadow?: boolean;
}

const STORAGE_PREFIX = 'ds-scroll:';

/**
 * Owns exactly one scroll region and exposes its viewport ref. This is the fix
 * for pages reaching out with `closest('.content')` / `querySelector('.content')`.
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { orientation = 'vertical', restoreKey, onReachEnd, viewportRef, stickyShadow, className, children, ...rest },
  ref,
) {
  const inner = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const assign = useCallback(
    (node: HTMLDivElement | null) => {
      inner.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (typeof viewportRef === 'function') viewportRef(node);
      else if (viewportRef) (viewportRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref, viewportRef],
  );

  useEffect(() => {
    if (!restoreKey) return;
    let target = 0;
    try {
      target = Number(window.sessionStorage.getItem(STORAGE_PREFIX + restoreKey)) || 0;
    } catch {
      // Session storage is optional; scroll position simply resets.
      return;
    }
    if (target <= 0) return;

    // The content a key belongs to usually arrives a frame or more later (async
    // data), so wait until the viewport can actually hold the offset instead of
    // writing a value the browser clamps to 0.
    let attempts = 0;
    let frame = 0;
    const apply = (): void => {
      const node = inner.current;
      if (!node) return;
      // The user scrolled first — leave them where they are.
      if (node.scrollTop > 0) return;
      if (node.scrollHeight - node.clientHeight >= target) {
        node.scrollTop = target;
        return;
      }
      attempts += 1;
      if (attempts > 60) return;
      frame = window.requestAnimationFrame(apply);
    };

    frame = window.requestAnimationFrame(apply);
    return () => window.cancelAnimationFrame(frame);
  }, [restoreKey]);

  function onScroll(event: React.UIEvent<HTMLDivElement>): void {
    const node = event.currentTarget;
    if (stickyShadow) setScrolled(node.scrollTop > 0);
    if (restoreKey) {
      try {
        window.sessionStorage.setItem(STORAGE_PREFIX + restoreKey, String(node.scrollTop));
      } catch {
        // Ignored — position persistence is best-effort.
      }
    }
    if (onReachEnd && node.scrollHeight - node.scrollTop - node.clientHeight < 24) onReachEnd();
    rest.onScroll?.(event);
  }

  return (
    <div
      ref={assign}
      data-scrolled={scrolled || undefined}
      className={cn(
        'min-h-0 min-w-0 flex-1',
        orientation === 'both' ? 'overflow-auto' : 'overflow-x-hidden overflow-y-auto',
        className,
      )}
      {...rest}
      onScroll={onScroll}
    >
      {children}
    </div>
  );
});
