import { useMemo } from 'react';
import { CommandPalette, Dialog, Kbd } from '../components/ui';
import { useCommands } from '../hooks/useCommands';
import { SHORTCUT_GROUPS } from '../hooks/useShortcuts';
import { useI18n } from '../i18n';
import { useAppStore } from '../store/app-store';

/** `⌘P` narrows the same palette to the file rows (blueprint §4.2). */
const FILE_COMMAND_PREFIXES = ['open:file:', 'open:recent:', 'open:tab:'];

/**
 * The two global overlays that make the IA curation safe: `⌘K`, where every
 * demoted feature stays one keystroke away (DESIGN-SYSTEM §9 rule 1), and `?`,
 * the shortcut help generated from the same table `useShortcuts` binds.
 */
export default function CommandPaletteHost() {
  const { t } = useI18n();
  const open = useAppStore(state => state.paletteOpen);
  const mode = useAppStore(state => state.paletteMode);
  const setPaletteOpen = useAppStore(state => state.setPaletteOpen);
  const helpOpen = useAppStore(state => state.shortcutHelpOpen);
  const setShortcutHelpOpen = useAppStore(state => state.setShortcutHelpOpen);

  const all = useCommands(open);
  const commands = useMemo(
    () => (mode === 'files'
      ? all.filter(command => FILE_COMMAND_PREFIXES.some(prefix => command.id.startsWith(prefix)))
      : all),
    [all, mode],
  );

  return (
    <>
      <CommandPalette
        open={open}
        onOpenChange={next => setPaletteOpen(next)}
        commands={commands}
        placeholder={mode === 'files' ? t('palette.filesPlaceholder') : t('palette.placeholder')}
        emptyMessage={t('palette.empty')}
        groupLabels={{
          navigate: t('palette.navigateGroup'),
          action: t('palette.actionsGroup'),
          open: t('palette.openGroup'),
          settings: t('palette.settingsGroup'),
        }}
      />

      <Dialog
        open={helpOpen}
        onOpenChange={setShortcutHelpOpen}
        size="lg"
        title={t('shortcuts.title')}
        description={t('shortcuts.description')}
        closeLabel={t('common.close')}
      >
        <div className="flex flex-col gap-4">
          {SHORTCUT_GROUPS.map(group => (
            <section key={group.id} className="flex flex-col gap-1">
              <h3 className="m-0 text-2xs font-medium tracking-wide text-fg-subtle uppercase">
                {t(group.labelKey)}
              </h3>
              <dl className="m-0 grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-sm">
                {group.rows.map(row => (
                  <div key={row.chord} className="contents">
                    <dt className="flex flex-wrap items-center gap-1">
                      {row.chord.split(' ').map(chord => (
                        <Kbd key={chord}>{chord}</Kbd>
                      ))}
                    </dt>
                    <dd className="m-0 min-w-0 text-fg">{t(row.labelKey)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </Dialog>
    </>
  );
}
