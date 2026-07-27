import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardCopy,
  EllipsisVertical,
  ExternalLink,
  FolderOpen,
  GitBranch,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { FolderRow } from '../../shared/api';
import {
  Badge,
  Button,
  DataTable,
  DropdownMenu,
  EmptyState,
  IconButton,
  SplitButton,
  StatusDot,
  Toolbar,
  toast,
  type Column,
  type MenuItem,
  type SortState,
} from '../components/ui';
import { commitAgeTone, daysSinceCommit } from '../lib/commit-age';
import { commandsFromMenu, useRegisterCommands } from '../hooks/useCommands';
import { useI18n } from '../i18n';
import { useAppStore } from '../store/app-store';
import { useFolderActions } from '../hooks/useFolderActions';

function formatRemoteLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname.replace(/\.git$/i, '')}`;
  } catch {
    return url.replace(/\.git$/i, '');
  }
}

/** Primary = Add folder…, menu = the bulk Git import (`WorkspaceView.tsx:45-61`). */
function AddFolderActions({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { t } = useI18n();
  const actions = useFolderActions();

  return (
    <SplitButton
      size={size}
      icon={Plus}
      menuLabel={t('workspace.addFolderOptions')}
      onClick={() => void actions.addFolder()}
      items={[
        {
          id: 'add-git-repositories',
          label: t('workspace.addGitRepositories'),
          icon: GitBranch,
          onSelect: () => void actions.addGitRepositories(),
        },
      ]}
    >
      {t('app.addFolder')}
    </SplitButton>
  );
}

/**
 * Folder management (blueprint §2.6). The card grid became a `DataTable`: this
 * is a list of six-to-thirty repositories with five uniform attributes, which
 * is a table.
 *
 * It is no longer the unavoidable launch screen — it is reached from the
 * titlebar folder menu's "Manage folders…", from the nav, and automatically
 * when the app has no folders at all, which is what makes its `first-run`
 * `EmptyState` the genuine cold-start screen (blueprint §1.2 / §3.1).
 */
export default function WorkspaceView() {
  const { locale, t } = useI18n();
  const folders = useAppStore(state => state.folders);
  const activeFolderId = useAppStore(state => state.activeFolderId);
  const repoInfoByFolder = useAppStore(state => state.repoInfoByFolder);
  const loadRepoInfo = useAppStore(state => state.loadRepoInfo);
  const actions = useFolderActions();

  const [sort, setSort] = useState<SortState | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void loadRepoInfo();
  }, [folders, loadRepoInfo]);

  /* ---------------------------------------------------------------- format */

  const formatCommitDate = useCallback((value: number | null | undefined): string => {
    if (!value) return t('workspace.noCommits');
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(value);
  }, [locale, t]);

  const formatDaysAgo = useCallback((days: number | null): string | null => {
    if (days === null) return null;
    if (days === 0) return t('workspace.daysAgo_one', { count: 0 });
    return t('workspace.daysAgo', { count: days });
  }, [t]);

  /* ------------------------------------------------------------------ sort */

  const sortedFolders = useMemo(() => {
    if (!sort) return folders;
    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...folders].sort((a, b) => {
      if (sort.columnId === 'name') return direction * a.name.localeCompare(b.name, locale);
      if (sort.columnId === 'path') return direction * a.rootPath.localeCompare(b.rootPath, locale);
      const da = repoInfoByFolder[a.id]?.lastCommitDate ?? null;
      const db = repoInfoByFolder[b.id]?.lastCommitDate ?? null;
      // A repository with no commits sorts last in both directions.
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return direction * (da - db);
    });
  }, [folders, locale, repoInfoByFolder, sort]);

  const commitSort = sort?.columnId === 'commit' ? sort.direction : null;

  /* --------------------------------------------------------------- actions */

  const refreshGitInfo = useCallback(() => {
    void loadRepoInfo({ force: true }).then(() => {
      toast.show({ tone: 'success', title: t('workspace.gitInfoRefreshed') });
    });
  }, [loadRepoInfo, t]);

  const copyPath = useCallback((folder: FolderRow) => {
    // `navigator.clipboard` is absent in an insecure context, so the failure
    // path has to survive it being undefined, not only rejecting.
    const clipboard = navigator.clipboard as Clipboard | undefined;
    if (!clipboard) {
      toast.show({ tone: 'danger', title: t('workspace.pathCopyFailed') });
      return;
    }
    void clipboard.writeText(folder.rootPath)
      .then(() => toast.show({ tone: 'success', title: t('workspace.pathCopied') }))
      .catch(() => toast.show({ tone: 'danger', title: t('workspace.pathCopyFailed') }));
  }, [t]);

  const folderMenuItems = useCallback((folder: FolderRow): MenuItem[] => {
    const remote = repoInfoByFolder[folder.id]?.remoteOriginWebUrl ?? null;
    return [
      {
        id: 'open',
        label: t('workspace.openFolder'),
        icon: FolderOpen,
        onSelect: () => actions.openFolder(folder.id),
      },
      {
        // Available on every row now, not only on a missing one — one place for
        // an action that used to have three (blueprint §3.7).
        id: 'relocate',
        label: t('workspace.relocate'),
        icon: MapPin,
        onSelect: () => void actions.relocateFolder(folder),
      },
      {
        id: 'open-remote',
        label: t('workspace.openRemote'),
        icon: ExternalLink,
        disabled: remote == null,
        onSelect: () => {
          if (remote) void window.api.system.openExternal(remote);
        },
      },
      {
        id: 'copy-path',
        label: t('tree.menu.copyAbsolutePath'),
        icon: ClipboardCopy,
        onSelect: () => copyPath(folder),
      },
      { kind: 'separator', id: 'sep' },
      {
        // Routes through the shell's ConfirmDialog — this is what killed
        // `confirm()` at `App.tsx:321`.
        id: 'remove',
        label: t('folderManager.remove'),
        icon: Trash2,
        danger: true,
        onSelect: () => actions.requestRemoveFolder(folder),
      },
    ];
  }, [actions, copyPath, repoInfoByFolder, t]);

  const overflow: MenuItem[] = useMemo(() => [
    { kind: 'label', id: 'sort-label', label: t('workspace.sortByCommitTitle') },
    {
      kind: 'checkbox',
      id: 'sort-newest',
      label: t('workspace.sortNewestFirst'),
      checked: commitSort === 'desc',
      onSelect: () => setSort({ columnId: 'commit', direction: 'desc' }),
    },
    {
      kind: 'checkbox',
      id: 'sort-oldest',
      label: t('workspace.sortOldestFirst'),
      checked: commitSort === 'asc',
      onSelect: () => setSort({ columnId: 'commit', direction: 'asc' }),
    },
    {
      kind: 'checkbox',
      id: 'sort-off',
      label: t('workspace.sortOff'),
      checked: sort === null,
      onSelect: () => setSort(null),
    },
    { kind: 'separator', id: 'sep' },
    {
      id: 'refresh-git',
      label: t('workspace.refreshGitInfo'),
      icon: RefreshCw,
      disabled: folders.length === 0,
      onSelect: refreshGitInfo,
    },
  ], [commitSort, folders.length, refreshGitInfo, sort, t]);

  /**
   * Right-clicking a row opens the same native menu the Explorer uses, scoped
   * to the folder root — that is the only API this app has for "Open path" and
   * "Reveal in Finder" (`system.showTreeNodeContextMenu`, a Rust-built menu),
   * and launching it from inside a DOM `DropdownMenu` item would stack two menu
   * systems on one gesture. Delegated from the container because `DataTable`
   * owns its `<tr>`s.
   */
  function onContextMenu(event: React.MouseEvent<HTMLDivElement>): void {
    const target = event.target instanceof Element ? event.target.closest('tbody tr') : null;
    if (!target) return;
    const nodes = Array.from(tableRef.current?.querySelectorAll('tbody tr') ?? []);
    const folder = sortedFolders[nodes.indexOf(target)];
    if (!folder) return;

    event.preventDefault();
    void window.api.system.showTreeNodeContextMenu({
      folderId: folder.id,
      relPath: '',
      displayName: folder.name,
      x: event.clientX,
      y: event.clientY,
      labels: {
        copyName: t('tree.menu.copyName'),
        copyRelativePath: t('tree.menu.copyRelativePath'),
        copyAbsolutePath: t('tree.menu.copyAbsolutePath'),
        openPath: t('tree.menu.openPath'),
        revealInFinder: t('tree.menu.revealInFinder'),
      },
    });
  }

  /* --------------------------------------------------------------- columns */

  // Sort by last commit / Refresh git info by name, while this view is up.
  useRegisterCommands('workspace-view', () => commandsFromMenu('workspace-view', overflow, {
    prefix: t('workspace.title'),
  }));

  const columns: Column<FolderRow>[] = useMemo(() => [
    {
      id: 'status',
      header: <span className="sr-only">{t('workspace.statusColumn')}</span>,
      width: 30,
      truncate: false,
      cell: folder => (
        <StatusDot
          status={folder.isAvailable ? 'success' : 'danger'}
          label={<span className="sr-only">{folder.isAvailable ? t('app.foldersAvailable') : t('workspace.missingShort')}</span>}
        />
      ),
    },
    {
      id: 'name',
      header: t('workspace.nameColumn'),
      sortable: true,
      cell: folder => (
        <span className="flex min-w-0 items-center gap-1.5" title={folder.name}>
          <span className="truncate font-medium text-fg">{folder.name}</span>
          {folder.id === activeFolderId ? (
            <Badge size="xs" tone="accent">{t('common.active')}</Badge>
          ) : null}
        </span>
      ),
    },
    {
      id: 'path',
      header: t('common.path'),
      sortable: true,
      mono: true,
      cell: folder => (
        <span className="flex min-w-0 items-center gap-1.5" title={folder.rootPath}>
          <span className="truncate">{folder.rootPath}</span>
          {folder.isAvailable ? null : (
            <Badge size="xs" tone="danger">{t('workspace.missingShort')}</Badge>
          )}
        </span>
      ),
    },
    {
      id: 'remote',
      header: t('workspace.remoteColumn'),
      cell: folder => {
        const remote = repoInfoByFolder[folder.id]?.remoteOriginWebUrl ?? null;
        if (!remote) {
          return <span className="text-fg-subtle">{t('workspace.noRemoteOrigin')}</span>;
        }
        return (
          <span
            className="flex min-w-0"
            onClick={event => event.stopPropagation()}
            onKeyDown={event => event.stopPropagation()}
          >
            <Button
              variant="link"
              size="xs"
              icon={ExternalLink}
              title={remote}
              onClick={() => void window.api.system.openExternal(remote)}
            >
              <span className="truncate">{formatRemoteLabel(remote)}</span>
            </Button>
          </span>
        );
      },
    },
    {
      id: 'commit',
      header: t('workspace.lastCommit'),
      sortable: true,
      truncate: false,
      width: 190,
      cell: folder => {
        const info = repoInfoByFolder[folder.id];
        const days = daysSinceCommit(info?.lastCommitDate);
        const label = formatDaysAgo(days);
        return (
          <span className="flex items-center gap-1.5" title={formatCommitDate(info?.lastCommitDate)}>
            {label ? (
              <Badge size="xs" dot tone={commitAgeTone(days)}>{label}</Badge>
            ) : (
              <span className="text-fg-subtle">{t('workspace.noCommits')}</span>
            )}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: <span className="sr-only">{t('workspace.moreActions')}</span>,
      width: 40,
      align: 'right',
      truncate: false,
      cell: folder => (
        <span
          className="inline-flex"
          onClick={event => event.stopPropagation()}
          onKeyDown={event => event.stopPropagation()}
        >
          <DropdownMenu
            align="end"
            items={folderMenuItems(folder)}
            trigger={(
              <IconButton
                icon={EllipsisVertical}
                size="xs"
                variant="ghost"
                label={t('workspace.moreActions')}
              />
            )}
          />
        </span>
      ),
    },
  ], [activeFolderId, folderMenuItems, formatCommitDate, formatDaysAgo, repoInfoByFolder, t]);

  /* ---------------------------------------------------------------- render */

  return (
    <div className="grid gap-3">
      <Toolbar
        sticky={false}
        className="rounded-lg border border-border"
        title={t('workspace.title')}
        subtitle={t('workspace.folderCount', { count: folders.length.toLocaleString(locale) })}
        overflowLabel={t('common.more')}
        overflow={overflow}
        actions={<AddFolderActions size="sm" />}
      />

      {folders.length === 0 ? (
        <EmptyState
          variant="first-run"
          title={t('workspace.emptyTitle')}
          description={t('workspace.addFirst')}
          action={<AddFolderActions />}
          shortcut="Mod+K"
        />
      ) : (
        <div ref={tableRef} onContextMenu={onContextMenu}>
          <DataTable
            aria-label={t('workspace.title')}
            columns={columns}
            rows={sortedFolders}
            rowKey={folder => String(folder.id)}
            variant="report"
            sort={sort}
            onSortChange={setSort}
            selection={{
              mode: 'single',
              selected: activeFolderId == null ? new Set() : new Set([String(activeFolderId)]),
              // Selection here *is* the active folder; activating a row is the
              // only thing that changes it, so there is nothing to write back.
              onChange: () => undefined,
            }}
            // Activating a missing folder still opens it: its cached scan data
            // stays browsable and the shell shows the Relocate banner
            // (blueprint §3.7).
            onRowActivate={folder => actions.openFolder(folder.id)}
          />
        </div>
      )}
    </div>
  );
}
