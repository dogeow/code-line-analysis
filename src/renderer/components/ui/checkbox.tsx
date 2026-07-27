// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { forwardRef, useEffect, useId, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { FieldSize } from './_internal/types';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: FieldSize;
  /** Grid select-all needs this; the old primitive could not express it. */
  indeterminate?: boolean;
  label?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, size = 'md', indeterminate, label, id, ...rest },
  ref,
) {
  const inner = useRef<HTMLInputElement | null>(null);
  const autoId = useId();
  const inputId = id ?? autoId;

  useEffect(() => {
    if (inner.current) inner.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  const input = (
    <input
      ref={node => {
        inner.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }}
      id={inputId}
      type="checkbox"
      className={cn(
        'shrink-0 cursor-pointer appearance-none rounded-sm border border-border-strong bg-inset',
        'transition-colors duration-[120ms]',
        'checked:border-accent checked:bg-accent indeterminate:border-accent indeterminate:bg-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'size-3' : 'size-3.5',
        className,
      )}
      {...rest}
    />
  );

  if (!label) return input;
  return (
    <label htmlFor={inputId} className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-fg">
      {input}
      {label}
    </label>
  );
});

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  size?: FieldSize;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Switch = immediate effect (wrap lines, dark mode, hide dotfiles).
 * Checkbox = part of a form or a selection. Never a Switch in a Save-button form.
 */
export function Switch({
  checked,
  onCheckedChange,
  size = 'md',
  label,
  description,
  disabled,
  className,
}: SwitchProps) {
  const track = size === 'sm' ? 'h-3.5 w-6' : 'h-4 w-7';
  const knob = size === 'sm' ? 'size-2.5' : 'size-3';
  const shift = size === 'sm' ? 'translate-x-2.5' : 'translate-x-3';
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={typeof label === 'string' ? label : undefined}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border border-transparent p-0.5',
        'transition-colors duration-[120ms] disabled:pointer-events-none disabled:opacity-50',
        checked ? 'bg-accent' : 'bg-idle-quiet border-border',
        track,
        className,
      )}
    >
      <span
        className={cn(
          'rounded-full bg-surface transition-transform duration-[120ms]',
          knob,
          checked && shift,
        )}
      />
    </button>
  );

  if (!label && !description) return control;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {label ? <div className="text-sm text-fg">{label}</div> : null}
        {description ? <div className="text-xs text-fg-muted">{description}</div> : null}
      </div>
      {control}
    </div>
  );
}

export interface RadioGroupProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; description?: React.ReactNode; icon?: LucideIcon }[];
  variant?: 'list' | 'segmented';
  name: string;
  size?: FieldSize;
  className?: string;
  'aria-label'?: string;
}

export function RadioGroup<T extends string>({
  value,
  onValueChange,
  options,
  variant = 'list',
  name,
  size = 'md',
  className,
  ...rest
}: RadioGroupProps<T>) {
  if (variant === 'segmented') {
    return (
      <div
        role="radiogroup"
        className={cn('inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5', className)}
        {...rest}
      >
        {options.map(option => {
          const Icon = option.icon;
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onValueChange(option.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 font-medium transition-colors duration-[120ms]',
                size === 'sm' ? 'h-control-xs text-2xs' : 'h-control-sm text-xs',
                selected ? 'bg-surface text-fg shadow-raised' : 'text-fg-muted hover:bg-hover hover:text-fg',
              )}
            >
              {Icon ? <Icon aria-hidden strokeWidth={1.75} size={12} /> : null}
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div role="radiogroup" className={cn('flex flex-col gap-1', className)} {...rest}>
      {options.map(option => (
        <label
          key={option.value}
          className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm text-fg hover:bg-hover"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onValueChange(option.value)}
            className="mt-0.5 size-3.5 accent-[var(--ds-accent)]"
          />
          <span className="min-w-0">
            <span className="block">{option.label}</span>
            {option.description ? (
              <span className="block text-xs text-fg-muted">{option.description}</span>
            ) : null}
          </span>
        </label>
      ))}
    </div>
  );
}
