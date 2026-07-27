// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { cloneElement, isValidElement, useId } from 'react';
import { cn } from '../../lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ className, required, children, ...rest }: LabelProps) {
  return (
    <label className={cn('text-xs font-medium text-fg-muted', className)} {...rest}>
      {children}
      {required ? <span className="ml-0.5 text-danger-text">*</span> : null}
    </label>
  );
}

export interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  /** When set, the control gets `aria-invalid` and `aria-describedby`. */
  error?: React.ReactNode;
  required?: boolean;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  orientation = 'vertical',
  className,
  children,
}: FieldProps) {
  const auto = useId();
  const id = htmlFor ?? auto;
  const msgId = `${id}-msg`;

  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id,
        'aria-describedby': hint || error ? msgId : undefined,
        'aria-invalid': error ? true : undefined,
      })
    : children;

  return (
    <div
      className={cn(
        'gap-1',
        orientation === 'vertical'
          ? 'flex flex-col'
          : 'grid grid-cols-[140px_1fr] items-center gap-x-3',
        className,
      )}
    >
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {control}
      {hint || error ? (
        <p id={msgId} className={cn('text-xs', error ? 'text-danger-text' : 'text-fg-subtle')}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
