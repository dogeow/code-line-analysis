/**
 * Tiny localStorage helpers shared by the stores.
 *
 * The app already persists three things by hand (`code-line-analysis-theme`,
 * `code-line-analysis-language`, and the design-system `ds-split:` /
 * `ds-scroll:` prefixes). These keep the same `code-line-analysis-*` shape so
 * everything the app owns is greppable with one prefix.
 */
const PREFIX = 'code-line-analysis-';

export function readPersisted<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writePersisted(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Persistence is best-effort; the in-memory value still applies.
  }
}
