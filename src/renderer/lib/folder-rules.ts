import type { FolderRules } from '../../shared/api';
import { normalizeRules } from '../components/ui';

/**
 * Guard an IPC response (or a cached value) into a well-formed `FolderRules`.
 * Replaces the three copy-pasted `normalizeRules(value)` helpers that used to
 * live in `App.tsx`, `FolderManager.tsx` and `DuplicatesView.tsx`.
 */
export function readFolderRules(value: FolderRules | null | undefined): FolderRules {
  return {
    whitelist: Array.isArray(value?.whitelist) ? value.whitelist : [],
    blacklist: Array.isArray(value?.blacklist) ? value.blacklist : [],
  };
}

/** `RuleEditor` textareas -> the IPC payload. Trims, drops blanks, de-duplicates. */
export function rulesFromText(allow: string, block: string): FolderRules {
  return { whitelist: normalizeRules(allow), blacklist: normalizeRules(block) };
}

/** The IPC payload -> the two `RuleEditor` textareas. */
export function rulesToText(rules: FolderRules): { allow: string; block: string } {
  return { allow: rules.whitelist.join('\n'), block: rules.blacklist.join('\n') };
}

/** True when the response really carried both arrays back. */
export function isFolderRulesResponse(value: FolderRules | null | undefined): boolean {
  return Array.isArray(value?.whitelist) && Array.isArray(value?.blacklist);
}
