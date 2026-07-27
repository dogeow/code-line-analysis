import { create } from 'zustand';
import type { ScanOptions, ScanProgress } from '../../shared/api';
import type { JobStatus } from '../components/ui';
import { useAppStore } from './app-store';
import { readPersisted, writePersisted } from './persist';

/**
 * One `ScanJob` with the DESIGN-SYSTEM §7 vocabulary
 * (`idle → queued → running → done | error | cancelled`).
 *
 * Replaces the implicit-only trigger at `App.tsx:165-175`, the layout-shifting
 * `scan-panel`, and the `progress.phase === 'done'` → `setScanRevision` effect.
 */
export interface ScanState {
  status: JobStatus;
  folderId: number | null;
  progress: ScanProgress | null;
  error: string | null;
  /** Incremented on every terminal transition so the shell can toast once. */
  outcomeToken: number;
  /** Epoch ms of the last successful scan, per folder — drives "scanned 2m ago". */
  lastScanAt: Record<number, number>;
  durationMs: number | null;
  filesScanned: number | null;

  listen: () => () => void;
  run: (folderId: number, opts?: ScanOptions) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

const LAST_SCAN_KEY = 'last-scan-at';

let cancelRequested = false;
let startedAt = 0;
let doneTimer: number | null = null;

function clearDoneTimer(): void {
  if (doneTimer !== null) {
    window.clearTimeout(doneTimer);
    doneTimer = null;
  }
}

export const useScanStore = create<ScanState>((set, get) => ({
  status: 'idle',
  folderId: null,
  progress: null,
  error: null,
  outcomeToken: 0,
  lastScanAt: readPersisted<Record<number, number>>(LAST_SCAN_KEY, {}),
  durationMs: null,
  filesScanned: null,

  listen() {
    return window.api.scan.onProgress(progress => {
      // Partial results stream: keep the last payload so the toolbar line and
      // the status bar can render `n/m` plus the current file.
      set(state => ({
        progress,
        folderId: progress.folderId,
        status: progress.phase === 'done' ? state.status : 'running',
      }));
    });
  },

  async run(folderId, opts) {
    if (get().status === 'running' || get().status === 'queued') return;
    clearDoneTimer();
    cancelRequested = false;
    startedAt = Date.now();
    set({ status: 'queued', folderId, progress: null, error: null, durationMs: null, filesScanned: null });

    try {
      const stats = await window.api.scan.run(folderId, opts);
      if (cancelRequested) {
        set(state => ({
          status: 'cancelled',
          progress: null,
          outcomeToken: state.outcomeToken + 1,
        }));
        return;
      }

      const lastScanAt = { ...get().lastScanAt, [folderId]: Date.now() };
      writePersisted(LAST_SCAN_KEY, lastScanAt);
      set(state => ({
        status: 'done',
        lastScanAt,
        durationMs: Date.now() - startedAt,
        filesScanned: stats.totalFiles,
        outcomeToken: state.outcomeToken + 1,
      }));
      useAppStore.getState().bumpRevision();

      // `done` holds the bar for a beat, then the chrome goes quiet again.
      doneTimer = window.setTimeout(() => {
        doneTimer = null;
        if (get().status !== 'done') return;
        set({ status: 'idle', progress: null });
      }, 1200);
    } catch (error) {
      if (cancelRequested) {
        set(state => ({ status: 'cancelled', progress: null, outcomeToken: state.outcomeToken + 1 }));
        return;
      }
      set(state => ({
        status: 'error',
        progress: null,
        error: error instanceof Error ? error.message : String(error ?? ''),
        outcomeToken: state.outcomeToken + 1,
      }));
    }
  },

  cancel() {
    const { status } = get();
    if (status !== 'running' && status !== 'queued') return;
    cancelRequested = true;
    void window.api.scan.cancel().catch(() => undefined);
  },

  reset() {
    clearDoneTimer();
    set({ status: 'idle', progress: null, error: null });
  },
}));

export function useIsScanning(): boolean {
  return useScanStore(state => state.status === 'running' || state.status === 'queued');
}
