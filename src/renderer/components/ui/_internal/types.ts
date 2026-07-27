// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import type { LucideIcon } from 'lucide-react';
import type React from 'react';

export type ControlSize = 'xs' | 'sm' | 'md' | 'lg';
export type FieldSize = 'sm' | 'md';
export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Align = 'start' | 'center' | 'end';

/** The seven semantic tones. DESIGN-SYSTEM §1.4 — status colour is reserved. */
export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'running' | 'idle';

/** DESIGN-SYSTEM §7 — one state machine for every long job. */
export type JobStatus = 'idle' | 'queued' | 'running' | 'done' | 'error' | 'cancelled';

export type StatusTone = 'success' | 'warning' | 'danger' | 'running' | 'idle';

export interface ProgressState {
  status: JobStatus;
  /** 0..1; absent while running means indeterminate. */
  value?: number;
  label?: React.ReactNode;
  /** Current file / table / step — mono, truncated. */
  detail?: React.ReactNode;
  count?: { done: number; total?: number };
  onCancel?: () => void;
}

export type MenuItem =
  | {
      kind?: 'item';
      id: string;
      label: React.ReactNode;
      icon?: LucideIcon;
      shortcut?: string;
      onSelect: () => void;
      disabled?: boolean;
      danger?: boolean;
      hint?: React.ReactNode;
    }
  | {
      kind: 'checkbox';
      id: string;
      label: React.ReactNode;
      checked: boolean;
      onSelect: () => void;
      disabled?: boolean;
    }
  | { kind: 'separator'; id: string }
  | { kind: 'label'; id: string; label: React.ReactNode }
  | { kind: 'submenu'; id: string; label: React.ReactNode; icon?: LucideIcon; items: MenuItem[] };

export function isActionableMenuItem(
  item: MenuItem,
): item is Extract<MenuItem, { kind?: 'item' } | { kind: 'checkbox' } | { kind: 'submenu' }> {
  return item.kind !== 'separator' && item.kind !== 'label';
}
