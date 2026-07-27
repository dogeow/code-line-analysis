import { useEffect, useMemo } from 'react';
import { Globe2, Info, ListTree, Palette } from 'lucide-react';
import {
  Button,
  Dialog,
  Field,
  Kbd,
  RadioGroup,
  Select,
  Switch,
  Tabs,
  ToggleGroup,
  isMac,
  type RuleScope,
  type ToggleOption,
} from '../components/ui';
import { useRuleEditorPanel } from '../components/RuleEditorPanel';
import { useI18n, type Language } from '../i18n';
import { useTheme, type ThemeMode } from '../theme';
import { useActiveFolder, useAppStore, type SettingsTab } from '../store/app-store';
import { useFolderActions } from '../hooks/useFolderActions';

const RULE_SCOPES: RuleScope[] = ['global', 'folder', 'duplicates'];

/**
 * `⌘,` — the Settings modal from `App.tsx:590-686`, now a real `Dialog` with
 * four tabs (blueprint §2.7). The hand-written focus trap at `App.tsx:197-227`
 * was correct and is the behaviour `useFocusTrap` inherited; `Dialog` supplies
 * the trap, the focus restore, `aria-modal` and `aria-labelledby`.
 *
 * Setup lives here, never in the nav (DESIGN-SYSTEM §9 rule 2): the `/folders`
 * route is gone and its rules are the `folder` scope of the one `RuleEditor`,
 * as are the duplicates drawer's.
 */
export default function SettingsDialog() {
  const { language, languageOptions, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const folder = useActiveFolder();
  const actions = useFolderActions();

  const open = useAppStore(state => state.settingsOpen);
  const setOpen = useAppStore(state => state.setSettingsOpen);
  const tab = useAppStore(state => state.settingsTab);
  const setTab = useAppStore(state => state.setSettingsTab);
  const scope = useAppStore(state => state.settingsScope);
  const setScope = useAppStore(state => state.setSettingsScope);
  const autoScanOnOpen = useAppStore(state => state.autoScanOnOpen);
  const setAutoScanOnOpen = useAppStore(state => state.setAutoScanOnOpen);
  const restoreLastFolder = useAppStore(state => state.restoreLastFolder);
  const setRestoreLastFolder = useAppStore(state => state.setRestoreLastFolder);
  const detectDuplicates = useAppStore(state => state.detectDuplicatesOnScan);
  const setDetectDuplicates = useAppStore(state => state.setDetectDuplicatesOnScan);

  const rulesTabActive = open && tab === 'rules';
  const rules = useRuleEditorPanel({ scope, folder, active: rulesTabActive });

  // A scope that needs a folder cannot be the landing scope when there is none.
  useEffect(() => {
    if (rulesTabActive && folder == null && scope !== 'global') setScope('global');
  }, [folder, rulesTabActive, scope, setScope]);

  // `⌘S` submits the rule editor (blueprint §4.2). It is registered only while
  // the rules tab is open, so it never races the editor tab's own `⌘S`.
  const saveRules = rules.save;
  const rulesEditable = rules.editable;
  useEffect(() => {
    if (!rulesTabActive || !rulesEditable) return;
    function onKeyDown(event: KeyboardEvent): void {
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (!mod || event.altKey || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      void saveRules();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rulesEditable, rulesTabActive, saveRules]);

  const tabItems = useMemo(() => [
    { value: 'general', label: t('settings.generalTab'), icon: Globe2 },
    { value: 'rules', label: t('settings.rulesTab'), icon: ListTree },
    { value: 'appearance', label: t('settings.appearanceTab'), icon: Palette },
    { value: 'about', label: t('settings.aboutTab'), icon: Info },
  ], [t]);

  const scopeOptions: ToggleOption<RuleScope>[] = RULE_SCOPES.map(value => ({
    value,
    label: value === 'global'
      ? t('settings.scopeGlobal')
      : value === 'folder'
        ? t('settings.scopeFolder', { name: folder?.name ?? '-' })
        : t('settings.scopeDuplicates'),
    disabled: value !== 'global' && folder == null,
    disabledReason: t('settings.scopeNeedsFolder'),
  }));

  async function saveAndRescan(): Promise<void> {
    // A rule change that is not re-applied is a rule change that did nothing
    // (blueprint §3.5), so this is the primary footer action.
    if (await rules.save()) actions.rescan();
  }

  const footer = tab === 'rules' ? (
    <>
      <Button onClick={() => setOpen(false)}>{t('common.close')}</Button>
      <Button
        loading={rules.saving}
        disabled={!rules.editable}
        onClick={() => void rules.save()}
      >
        {t('settings.save')}
        <Kbd className="ml-0.5">Mod+S</Kbd>
      </Button>
      <Button
        variant="primary"
        loading={rules.saving}
        disabled={!rules.editable || folder == null || !folder.isAvailable}
        onClick={() => void saveAndRescan()}
      >
        {t('settings.saveAndRescan')}
      </Button>
    </>
  ) : (
    <Button onClick={() => setOpen(false)}>{t('common.close')}</Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      size="lg"
      title={t('app.settings')}
      closeLabel={t('common.close')}
      footer={footer}
    >
      <div className="flex flex-col gap-3">
        <Tabs
          aria-label={t('app.settings')}
          value={tab}
          onValueChange={value => setTab(value as SettingsTab)}
          items={tabItems}
        />

        {tab === 'general' ? (
          <>
            <p className="m-0 text-xs text-fg-muted">{t('settings.generalHelp')}</p>
            <Field label={t('app.language')} hint={t('settings.languageHelp')}>
              <Select
                value={language}
                onChange={event => setLanguage(event.target.value as Language)}
                options={languageOptions.map(option => ({ value: option.code, label: option.label }))}
              />
            </Field>
            <Switch
              checked={restoreLastFolder}
              onCheckedChange={setRestoreLastFolder}
              label={t('settings.restoreLastFolder')}
              description={t('settings.restoreLastFolderHelp')}
            />
            <Switch
              checked={autoScanOnOpen}
              onCheckedChange={setAutoScanOnOpen}
              label={t('settings.autoScanOnOpen')}
              description={t('settings.autoScanOnOpenHelp')}
            />
            <Switch
              checked={detectDuplicates}
              onCheckedChange={setDetectDuplicates}
              label={t('settings.detectDuplicates')}
              description={t('settings.detectDuplicatesHelp')}
            />
          </>
        ) : null}

        {tab === 'rules' ? (
          <>
            <Field label={t('settings.scope')}>
              <ToggleGroup
                aria-label={t('settings.scope')}
                value={scope}
                onValueChange={setScope}
                options={scopeOptions}
              />
            </Field>
            {rules.node}
          </>
        ) : null}

        {tab === 'appearance' ? (
          <>
            <p className="m-0 text-xs text-fg-muted">{t('settings.themeHelp')}</p>
            <Field label={t('settings.colorMode')}>
              <RadioGroup
                name="settings-theme"
                variant="segmented"
                aria-label={t('settings.colorMode')}
                value={theme}
                onValueChange={value => setTheme(value as ThemeMode)}
                options={[
                  { value: 'light', label: t('settings.themeLight') },
                  { value: 'dark', label: t('settings.themeDark') },
                ]}
              />
            </Field>
          </>
        ) : null}

        {tab === 'about' ? (
          <>
            <p className="m-0 text-xs text-fg-muted">{t('settings.aboutHelp')}</p>
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-fg-muted">{t('settings.version')}</dt>
              <dd className="m-0 font-mono text-fg">{__APP_VERSION__}</dd>
              <dt className="text-fg-muted">{t('settings.runtime')}</dt>
              {/* Risk 7: the browser mock must always be visible as such. */}
              <dd className="m-0 text-fg">
                {window.api.runtime.mode === 'mock' ? t('settings.runtimeMock') : t('settings.runtimeTauri')}
              </dd>
              {folder ? (
                <>
                  <dt className="text-fg-muted">{t('app.currentFolder')}</dt>
                  <dd className="m-0 min-w-0 truncate font-mono text-fg" title={folder.rootPath}>
                    {folder.rootPath}
                  </dd>
                </>
              ) : null}
            </dl>
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
