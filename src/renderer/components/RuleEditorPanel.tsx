import { useCallback, useEffect, useRef, useState } from 'react';
import type { FolderRow, FolderRules } from '../../shared/api';
import { DEFAULT_BLACKLIST } from '../../shared/api';
import { Field } from './ui/field';
import { Input } from './ui/input';
import { Panel } from './ui/panel';
import { RuleEditor, type RuleScope } from './ui/rule-editor';
import { isFolderRulesResponse, readFolderRules, rulesFromText, rulesToText } from '../lib/folder-rules';
import { useI18n } from '../i18n';

const DUPLICATE_MIN_LINES_FLOOR = 3;

export interface RuleEditorPanelArgs {
  scope: RuleScope;
  folder: FolderRow | null;
  /** Only the mounted-and-visible panel loads. */
  active: boolean;
}

export interface RuleEditorPanelState {
  /** The rendered scope body — textareas, notes and the save state line. */
  node: React.ReactNode;
  /** Persists this scope. Resolves `false` when nothing was written. */
  save: () => Promise<boolean>;
  saving: boolean;
  /** `false` when the scope cannot be edited at all (no folder / old backend). */
  editable: boolean;
}

function isDuplicateApiMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /No handler registered|setDuplicateRules is not a function|getDuplicateRules is not a function/i.test(message);
}

/**
 * **One** rule editor, three scopes (DESIGN-SYSTEM §9 rule 3).
 *
 * This replaces three near-identical whitelist/blacklist textarea pairs, each
 * with its own load/save/error triple: the global pair in the old Settings
 * modal, the per-folder page at `/folders` (`pages/FolderManager.tsx`, now
 * deleted) and the duplicates drawer inside the Duplicates lens. The three
 * `normalizeRules` helpers had already collapsed into `lib/folder-rules.ts`;
 * this collapses what was left.
 *
 * It is a hook rather than a component so the Settings dialog's footer can own
 * `Save` / `Save & Rescan` — one primary button per view, and `⌘S` has exactly
 * one thing to submit.
 */
export function useRuleEditorPanel({ scope, folder, active }: RuleEditorPanelArgs): RuleEditorPanelState {
  const { t } = useI18n();

  const [allow, setAllow] = useState('');
  const [block, setBlock] = useState('');
  const [minLines, setMinLines] = useState('8');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');
  const [duplicateApiMissing, setDuplicateApiMissing] = useState(false);

  const folderId = folder?.id ?? null;
  const needsFolder = scope !== 'global' && folderId == null;
  // Feature detection against an older backend, kept from the duplicates
  // drawer (`DuplicatesView.tsx:44-45`) — but scoped to this panel instead of
  // rendering as a permanent page-level error (blueprint §3.6).
  const duplicateApisPresent = typeof window.api.folders.getDuplicateRules === 'function'
    && typeof window.api.folders.setDuplicateRules === 'function';
  const editable = !needsFolder && (scope !== 'duplicates' || (duplicateApisPresent && !duplicateApiMissing));

  // Latest values for the save callback, so it does not change identity on
  // every keystroke (the dialog footer holds on to it).
  const latest = useRef({ allow, block, minLines, scope, folderId });
  latest.current = { allow, block, minLines, scope, folderId };

  useEffect(() => {
    if (!active || needsFolder) return;

    let ignore = false;
    setSavedAt(undefined);
    setError('');
    setDuplicateApiMissing(false);

    async function load(): Promise<FolderRules | undefined> {
      if (scope === 'global') return readFolderRules(await window.api.settings.getGlobalRules());
      if (folderId == null) return undefined;
      if (scope === 'folder') return readFolderRules(await window.api.folders.getRules(folderId));
      if (!duplicateApisPresent) {
        setDuplicateApiMissing(true);
        return undefined;
      }
      const [rules, count] = await Promise.all([
        window.api.folders.getDuplicateRules(folderId),
        window.api.folders.getDuplicateMinLines(folderId).catch(() => 8),
      ]);
      if (!ignore) setMinLines(String(count));
      return readFolderRules(rules);
    }

    void load()
      .then(rules => {
        if (ignore || !rules) return;
        const text = rulesToText(rules);
        setAllow(text.allow);
        setBlock(text.block);
      })
      .catch(loadError => {
        if (ignore) return;
        if (scope === 'duplicates' && isDuplicateApiMissing(loadError)) setDuplicateApiMissing(true);
        else setError(t('common.loadFailed'));
      });

    return () => {
      ignore = true;
    };
  }, [active, duplicateApisPresent, folderId, needsFolder, scope, t]);

  const save = useCallback(async (): Promise<boolean> => {
    const current = latest.current;
    if (current.scope !== 'global' && current.folderId == null) return false;

    const payload = rulesFromText(current.allow, current.block);
    const parsedMinLines = Number(current.minLines);
    if (
      current.scope === 'duplicates'
      && (!Number.isInteger(parsedMinLines) || parsedMinLines < DUPLICATE_MIN_LINES_FLOOR)
    ) {
      setError(t('settings.duplicateMinLinesError'));
      return false;
    }

    setSaving(true);
    setSavedAt(undefined);
    setError('');

    try {
      let response: typeof payload;
      if (current.scope === 'global') {
        response = await window.api.settings.setGlobalRules(payload);
      } else if (current.scope === 'folder') {
        response = await window.api.folders.setRules(current.folderId as number, payload);
      } else {
        await window.api.folders.setDuplicateMinLines(current.folderId as number, parsedMinLines);
        response = await window.api.folders.setDuplicateRules(current.folderId as number, payload);
      }

      // Some backends answer with an empty ack; re-read rather than trust it.
      const persisted = isFolderRulesResponse(response) ? readFolderRules(response) : payload;
      const text = rulesToText(persisted);
      setAllow(text.allow);
      setBlock(text.block);
      setSavedAt(Date.now());
      return true;
    } catch (saveError) {
      if (current.scope === 'duplicates' && isDuplicateApiMissing(saveError)) {
        setDuplicateApiMissing(true);
        setError(t('duplicates.rulesUnavailable'));
      } else {
        setError(current.scope === 'global' ? t('settings.saveFailed') : t('folderManager.saveFailed'));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [t]);

  const help = scope === 'global'
    ? t('settings.globalRulesHelp')
    : scope === 'folder'
      ? t('folderManager.rulesHelp')
      : t('duplicates.rulesHelp');

  const node = (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-xs text-fg-muted">{help}</p>

      {needsFolder ? (
        <Panel tone="danger">
          <p className="m-0 text-xs text-danger-text">{t('settings.scopeNeedsFolder')}</p>
        </Panel>
      ) : null}

      {scope === 'duplicates' && !needsFolder && !editable ? (
        <Panel tone="danger">
          <p className="m-0 text-xs text-danger-text">{t('duplicates.rulesUnavailable')}</p>
        </Panel>
      ) : null}

      <RuleEditor
        scope={scope}
        allow={allow}
        block={block}
        blockPlaceholder={scope === 'global' ? DEFAULT_BLACKLIST.join('\n') : undefined}
        showSave={false}
        onChange={next => {
          setAllow(next.allow);
          setBlock(next.block);
          setSavedAt(undefined);
          setError('');
        }}
        onSave={async () => {
          await save();
        }}
        state={{ saving, error: error || undefined, savedAt }}
        labels={{
          allow: scope === 'global' ? t('settings.globalWhitelist') : t('folderManager.whitelist'),
          block: scope === 'global' ? t('settings.globalBlacklist') : t('folderManager.blacklist'),
          allowHint: t('folderManager.whitelistHelp'),
          blockHint: t('folderManager.blacklistHelp'),
          save: t('settings.save'),
          savedAt: () => t('settings.savedApplies'),
        }}
      />

      {scope === 'duplicates' && editable ? (
        <Field label={t('settings.duplicateMinLines')} hint={t('settings.duplicateMinLinesHelp')}>
          <Input
            type="number"
            inputMode="numeric"
            min={DUPLICATE_MIN_LINES_FLOOR}
            className="w-28"
            value={minLines}
            onChange={event => {
              setMinLines(event.target.value);
              setSavedAt(undefined);
              setError('');
            }}
          />
        </Field>
      ) : null}

      <p className="m-0 text-xs text-fg-subtle">{t('settings.rulesPrecedence')}</p>
    </div>
  );

  return { node, save, saving, editable };
}
