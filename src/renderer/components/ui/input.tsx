// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { forwardRef, isValidElement, useEffect, useRef, useState } from 'react';
import { Search, X, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from './icon-button';
import type { FieldSize } from './_internal/types';

const inputBase =
  'w-full rounded-md border bg-inset text-fg placeholder:text-fg-subtle ' +
  'transition-[border-color,box-shadow] duration-[120ms] ' +
  'border-border hover:border-border-strong ' +
  'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'aria-invalid:border-danger aria-invalid:outline-danger';

/** Distinguishes a renderable component type from an already-built node. */
function isIconComponent(value: InputProps['leading']): value is LucideIcon {
  if (typeof value === 'function') return true;
  return typeof value === 'object' && value !== null && !isValidElement(value);
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: FieldSize;
  invalid?: boolean;
  /** Paths, globs, SQL. */
  mono?: boolean;
  leading?: LucideIcon | React.ReactNode;
  trailing?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, wrapperClassName, size = 'md', invalid, mono, leading, trailing, ...rest },
  ref,
) {
  // A `lucide-react` icon is a `forwardRef` exotic *object*, not a function, so
  // a `typeof === 'function'` test silently drops it into the children position
  // and React throws "Objects are not valid as a React child".
  const Lead = isIconComponent(leading) ? leading : null;
  const pad = size === 'sm' ? 'h-control-sm text-xs' : 'h-control-md text-sm';
  return (
    <div className={cn('relative flex items-center', wrapperClassName)}>
      {leading ? (
        <span className="pointer-events-none absolute left-2 flex text-fg-subtle">
          {Lead ? <Lead size={14} strokeWidth={1.75} aria-hidden /> : (leading as React.ReactNode)}
        </span>
      ) : null}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          inputBase,
          pad,
          mono && 'font-mono',
          leading ? 'pl-7' : 'pl-2',
          trailing ? 'pr-7' : 'pr-2',
          className,
        )}
        {...rest}
      />
      {trailing ? <span className="absolute right-1 flex items-center">{trailing}</span> : null}
    </div>
  );
});

export interface SearchInputProps
  extends Omit<InputProps, 'leading' | 'trailing' | 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  debounceMs?: number;
  /** Esc clears on the first press and blurs on the second. */
  clearable?: boolean;
  /** "n results" chip in the trailing slot. */
  count?: number;
  clearLabel?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onValueChange, debounceMs = 0, clearable = true, count, clearLabel = 'Clear', size = 'md', ...rest },
  ref,
) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<number | null>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function push(next: string): void {
    setDraft(next);
    if (debounceMs <= 0) {
      onValueChange(next);
      return;
    }
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onValueChange(next), debounceMs);
  }

  return (
    <Input
      ref={ref}
      size={size}
      type="search"
      value={draft}
      leading={Search}
      onChange={event => push(event.target.value)}
      onKeyDown={event => {
        if (event.key !== 'Escape') return;
        if (draft.length > 0) {
          event.stopPropagation();
          push('');
        } else {
          event.currentTarget.blur();
        }
      }}
      trailing={
        <span className="flex items-center gap-1">
          {typeof count === 'number' ? (
            <span className="ds-tabular text-2xs text-fg-subtle">{count}</span>
          ) : null}
          {clearable && draft.length > 0 ? (
            <IconButton
              icon={X}
              label={clearLabel}
              size="xs"
              variant="ghost"
              tooltip={false}
              onClick={() => push('')}
            />
          ) : null}
        </span>
      }
      {...rest}
    />
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  mono?: boolean;
  resize?: 'none' | 'vertical';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, mono, rows = 8, resize = 'vertical', ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        inputBase,
        'px-2 py-1.5 text-sm leading-relaxed',
        mono && 'font-mono',
        resize === 'none' ? 'resize-none' : 'resize-y',
        className,
      )}
      {...rest}
    />
  );
});
