import type { StatusTone } from '../components/ui';

/**
 * The 7 / 30-day commit-age thresholds the workspace cards used
 * (`WorkspaceView.tsx:116-121`), extracted so the Workspace table and the
 * titlebar folder `Combobox` grade a repository identically.
 *
 * The tone is never the only signal: every call site pairs it with a
 * `StatusDot` and the "n days ago" label (DESIGN-SYSTEM §0 rule 2).
 */
export function daysSinceCommit(value: number | null | undefined): number | null {
  if (!value) return null;
  return Math.floor((Date.now() - value) / 86_400_000);
}

export function commitAgeTone(days: number | null): StatusTone {
  if (days === null) return 'idle';
  if (days <= 7) return 'success';
  if (days <= 30) return 'warning';
  return 'danger';
}
