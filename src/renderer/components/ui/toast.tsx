// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, CircleX, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { IconButton } from './icon-button';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  id?: string;
  tone?: ToastTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Collapsed `<details>` — stack traces, SQL errors. */
  details?: string;
  action?: { label: string; onClick: () => void };
  /** 4000ms; `null` = sticky. `danger` defaults to sticky. */
  durationMs?: number | null;
}

interface ToastRecord extends ToastOptions {
  id: string;
  createdAt: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let records: ToastRecord[] = [];
let counter = 0;

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): ToastRecord[] {
  return records;
}

/**
 * `toast.update` is what lets one background job own one toast for its whole
 * lifecycle instead of firing three (PRIMITIVES §16).
 */
export const toast = {
  show(options: ToastOptions): string {
    const id = options.id ?? `toast-${++counter}`;
    records = [...records.filter(record => record.id !== id), { ...options, id, createdAt: Date.now() }];
    emit();
    return id;
  },
  update(id: string, patch: Partial<ToastOptions>): void {
    records = records.map(record => (record.id === id ? { ...record, ...patch } : record));
    emit();
  },
  dismiss(id: string): void {
    records = records.filter(record => record.id !== id);
    emit();
  },
  clear(): void {
    records = [];
    emit();
  },
};

const TONE_ICON: Record<ToastTone, LucideIcon> = {
  neutral: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
};

const TONE_CLASS: Record<ToastTone, string> = {
  neutral: 'text-fg-muted',
  success: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-danger-text',
};

const MAX_VISIBLE = 3;

function ToastCard({ record, paused }: { record: ToastRecord; paused: boolean }) {
  const tone = record.tone ?? 'neutral';
  const Icon = TONE_ICON[tone];
  const timer = useRef<number | null>(null);

  const duration =
    record.durationMs === undefined ? (tone === 'danger' ? null : 4000) : record.durationMs;

  useEffect(() => {
    if (paused || duration === null) return;
    timer.current = window.setTimeout(() => toast.dismiss(record.id), duration);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [paused, duration, record.id, record.title, record.description]);

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-80 max-w-full gap-2 rounded-lg border border-border-strong',
        'bg-raised p-3 shadow-overlay',
      )}
    >
      <Icon aria-hidden strokeWidth={1.75} size={14} className={cn('mt-0.5 shrink-0', TONE_CLASS[tone])} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-fg">{record.title}</div>
        {record.description ? (
          <div className="mt-0.5 text-xs text-fg-muted">{record.description}</div>
        ) : null}
        {record.details ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-xs text-fg-muted">Details</summary>
            <pre className="mt-1 max-h-32 overflow-auto rounded-md border border-border bg-inset p-2 font-mono text-2xs text-fg-muted">
              {record.details}
            </pre>
          </details>
        ) : null}
        {record.action ? (
          <Button size="xs" variant="link" className="mt-1" onClick={record.action.onClick}>
            {record.action.label}
          </Button>
        ) : null}
      </div>
      <IconButton
        icon={X}
        label="Dismiss"
        size="xs"
        variant="ghost"
        tooltip={false}
        onClick={() => toast.dismiss(record.id)}
      />
    </div>
  );
}

export function Toaster() {
  const items = useSyncExternalStore(subscribe, snapshot, snapshot);
  const [paused, setPaused] = useState(false);
  const visible = items.slice(-MAX_VISIBLE);
  const hidden = items.length - visible.length;

  if (items.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-[var(--ds-z-toast)] flex flex-col items-end gap-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {hidden > 0 ? (
        <div className="pointer-events-auto rounded-full border border-border bg-raised px-2 py-0.5 text-2xs text-fg-muted">
          {hidden} more
        </div>
      ) : null}
      {visible.map(record => (
        <ToastCard key={record.id} record={record} paused={paused} />
      ))}
    </div>,
    document.body,
  );
}
