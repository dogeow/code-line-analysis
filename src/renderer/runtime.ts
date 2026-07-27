import { createMockApi } from './runtime/mock-api';
import { createTauriApi, isTauriRuntime } from './runtime/tauri-api';

declare global {
  interface Window {
    __codeLineRuntime?: 'tauri' | 'mock';
  }
}

/**
 * Installs the IPC bridge.
 *
 * Inside the Tauri shell this is the real `invoke`/`listen` bridge. Anywhere
 * else — i.e. `npm run dev:ui` in a plain browser — it is the in-memory mock,
 * so the UI can be developed and reviewed without the desktop shell. The branch
 * is on `isTauriRuntime()` alone and never on a build flag, so the desktop
 * build can never silently fall back to fixtures.
 */
export function ensureRuntimeApi(): void {
  if (isTauriRuntime()) {
    window.api = createTauriApi();
    window.__codeLineRuntime = 'tauri';
    return;
  }

  window.api = createMockApi();
  window.__codeLineRuntime = 'mock';
  console.info(
    '[code-line-analysis] Tauri runtime not detected — using the in-memory mock API. '
    + 'Run `npm run dev` for the desktop shell.',
  );
}
