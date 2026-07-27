// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, type ButtonProps } from './button';
import { Kbd } from './kbd';
import { Tooltip } from './tooltip';
import type { Side } from './_internal/types';

export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'children' | 'fullWidth'> {
  icon: LucideIcon;
  /** REQUIRED — becomes both `aria-label` and the Tooltip content. */
  label: string;
  tooltip?: boolean;
  tooltipSide?: Side;
  /** Rendered as a `Kbd` inside the tooltip. */
  shortcut?: string;
  /** Toggle-button pressed state. */
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, tooltip = true, tooltipSide = 'bottom', shortcut, active, size = 'md', className, ...rest },
  ref,
) {
  const button = (
    <Button
      ref={ref}
      size={size}
      aria-label={label}
      aria-pressed={active}
      className={cn('aspect-square px-0', active && 'bg-selected text-fg', className)}
      {...rest}
    >
      <Icon aria-hidden strokeWidth={1.75} />
    </Button>
  );
  if (!tooltip) return button;
  return (
    <Tooltip
      side={tooltipSide}
      content={
        <>
          {label}
          {shortcut ? <Kbd>{shortcut}</Kbd> : null}
        </>
      }
    >
      {button}
    </Tooltip>
  );
});
