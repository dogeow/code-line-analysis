// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { cloneElement, isValidElement, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { useControllable, useDismiss, useFloating, usePortal } from './_internal/hooks';
import type { Align, Side } from './_internal/types';

export interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
  side?: Side;
  align?: Align;
  offset?: number;
  /** Pointer-anchored surfaces (ContextMenu) pass a viewport point. */
  anchorPoint?: { x: number; y: number } | null;
  matchTriggerWidth?: boolean;
  /** A Popover inside a Dialog passes the dialog element (DESIGN-SYSTEM §4). */
  container?: HTMLElement | null;
  className?: string;
  role?: string;
  'aria-label'?: string;
  children: React.ReactNode;
}

export function Popover({
  open: openProp,
  onOpenChange,
  trigger,
  side = 'bottom',
  align = 'start',
  offset = 4,
  anchorPoint = null,
  matchTriggerWidth,
  container,
  className,
  role,
  children,
  ...rest
}: PopoverProps) {
  const [open, setOpen] = useControllable(openProp, false, onOpenChange);
  const anchorRef = useRef<HTMLElement | null>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const target = usePortal(container);

  const style = useFloating(anchorRef, floatingRef, {
    side,
    align,
    offset,
    anchorPoint,
    matchTriggerWidth,
    open,
  });

  useDismiss(floatingRef, {
    active: open,
    onDismiss: () => setOpen(false),
  });

  const triggerNode =
    trigger && isValidElement(trigger)
      ? cloneElement(trigger as React.ReactElement<Record<string, unknown>>, {
          ref: (node: HTMLElement | null) => {
            anchorRef.current = node;
          },
          'aria-expanded': open,
          'aria-haspopup': 'dialog',
          onClick: (event: React.MouseEvent) => {
            (trigger.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(event);
            setOpen(!open);
          },
        })
      : null;

  return (
    <>
      {triggerNode}
      {open && target
        ? createPortal(
            <div
              ref={floatingRef}
              role={role}
              style={style ?? { position: 'fixed', top: -9999, left: -9999 }}
              className={cn(
                'z-[var(--ds-z-popover)] overflow-auto rounded-lg border border-border-strong',
                'bg-raised text-sm text-fg shadow-raised',
                className,
              )}
              {...rest}
            >
              {children}
            </div>,
            target,
          )
        : null}
    </>
  );
}
