// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, type ButtonProps } from './button';
import { DropdownMenu } from './menu';
import type { MenuItem } from './_internal/types';

export interface SplitButtonProps extends Omit<ButtonProps, 'trailingIcon' | 'size'> {
  size?: 'sm' | 'md';
  /** The menu of variants behind the caret ("Add Folder ▾"). */
  items: MenuItem[];
  menuLabel: string;
}

export function SplitButton({
  items,
  menuLabel,
  size = 'md',
  variant = 'primary',
  className,
  children,
  ...rest
}: SplitButtonProps) {
  return (
    <div className={cn('inline-flex items-stretch', className)}>
      <Button variant={variant} size={size} className="rounded-r-none" {...rest}>
        {children}
      </Button>
      <DropdownMenu
        items={items}
        align="end"
        trigger={
          <Button
            variant={variant}
            size={size}
            aria-label={menuLabel}
            className="rounded-l-none border-l border-l-black/15 px-1"
          >
            <ChevronDown aria-hidden strokeWidth={1.75} />
          </Button>
        }
      />
    </div>
  );
}
