import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Editor, { OnMount } from '@monaco-editor/react';
import { FileCode2, RefreshCw, X } from 'lucide-react';
import type { editor } from 'monaco-editor';
import type { FolderRow, FileMeta, GitFileInfo, TagRow } from '../../shared/api';
import {
  Badge,
  Button,
  EmptyState,
  Kbd,
  Skeleton,
  Switch,
  Toolbar,
  isMac,
  toast,
  type MenuItem,
} from '../components/ui';
import NoFolderState from '../components/NoFolderState';
import { commandsFromMenu, useRegisterCommands } from '../hooks/useCommands';
import { tagTone } from '../lib/tag-tone';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { useAppStore, useRevision } from '../store/app-store';
import { EDITOR_PREFIX, tabId, useTabsStore } from '../store/tabs-store';

interface Props {
  folder: FolderRow | null;
}

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  json: 'json', py: 'python', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin',
  cpp: 'cpp', cc: 'cpp', c: 'c', h: 'cpp', hpp: 'cpp', cs: 'csharp',
  rb: 'ruby', php: 'php', swift: 'swift', sh: 'shell', bash: 'shell',
  yml: 'yaml', yaml: 'yaml', toml: 'ini', ini: 'ini', sql: 'sql',
  html: 'html', htm: 'html', xml: 'xml', css: 'css', scss: 'scss', less: 'less',
  md: 'markdown', vue: 'html', svelte: 'html', dart: 'dart', lua: 'lua',
};

function langOf(relPath: string): string {
  const dot = relPath.lastIndexOf('.');
  if (dot < 0) return 'plaintext';
  return EXT_TO_LANG[relPath.slice(dot + 1).toLowerCase()] || 'plaintext';
}

/**
 * The editor is a **document tab** now (blueprint §1.2, §2.5), not the terminal
 * route of eight views with no nav entry. What that buys, concretely:
 *
 * - the `sourceNav` router-state hack and the `← Back` button are gone — `⌘W`
 *   closes, `⌘1…9` / `⌥←→` switch, and the view tab keeps its scroll position;
 * - the unsaved buffer lives in `tabs-store`, so switching tabs no longer
 *   throws the edit away and the dirty dot means something;
 * - closing a dirty tab routes through the shell's `ConfirmDialog`.
 *
 * Monaco's theming (`vs` / `vs-dark`), the highlight decorations and the
 * `?line` / `?endLine` / `?highlight` deep-link params are untouched.
 */
export default function EditorTab({ folder }: Props) {
  const scanRevision = useRevision();
  const { relPath = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const { theme } = useTheme();
  const decodedPath = relPath;
  const targetLine = Number(searchParams.get('line')) || 0;
  const targetEndLine = Number(searchParams.get('endLine')) || 0;
  const highlightKind = searchParams.get('highlight');
  const currentFileKey = folder && decodedPath ? tabId(folder.id, decodedPath) : '';

  const setDraft = useTabsStore(state => state.setDraft);
  const requestClose = useTabsStore(state => state.requestClose);

  const [content, setContent] = useState<string>('');
  const [original, setOriginal] = useState<string>('');
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [git, setGit] = useState<GitFileInfo | null>(null);
  const [fileTags, setFileTags] = useState<TagRow[]>([]);
  const [readOnly, setReadOnly] = useState(true);
  const [savingCountsByFile, setSavingCountsByFile] = useState<Record<string, number>>({});
  const [editorReady, setEditorReady] = useState(false);
  const [cursor, setCursor] = useState<{ line: number; column: number }>({ line: 1, column: 1 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [loadedPath, setLoadedPath] = useState('');
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const cursorSubscriptionRef = useRef<{ dispose: () => void } | null>(null);
  const activeFileKeyRef = useRef(currentFileKey);
  const lastFileKeyRef = useRef(currentFileKey);
  const fileVersionRef = useRef(0);
  activeFileKeyRef.current = currentFileKey;
  if (lastFileKeyRef.current !== currentFileKey) {
    lastFileKeyRef.current = currentFileKey;
    fileVersionRef.current += 1;
  }

  function isCurrentFileRequest(requestKey: string, requestVersion: number) {
    return activeFileKeyRef.current === requestKey && fileVersionRef.current === requestVersion;
  }

  function revealTargetLine(lineNumber: number, endLine?: number) {
    const mountedEditor = editorRef.current;
    if (!mountedEditor || lineNumber <= 0) return;
    const model = mountedEditor.getModel();
    if (!model) return;
    const safeLineNumber = Math.min(Math.max(lineNumber, 1), model.getLineCount() || 1);
    const safeEndLine = Math.min(Math.max(endLine ?? lineNumber, safeLineNumber), model.getLineCount() || 1);
    if (safeEndLine > safeLineNumber) {
      mountedEditor.revealLinesInCenter(safeLineNumber, safeEndLine);
      mountedEditor.setSelection({ startLineNumber: safeLineNumber, startColumn: 1, endLineNumber: safeEndLine, endColumn: model.getLineMaxColumn(safeEndLine) });
    } else {
      mountedEditor.revealLineInCenter(safeLineNumber);
      mountedEditor.setPosition({ lineNumber: safeLineNumber, column: 1 });
    }
    mountedEditor.focus();
  }

  function clearHighlights() {
    const mountedEditor = editorRef.current;
    if (!mountedEditor || decorationIdsRef.current.length === 0) return;
    decorationIdsRef.current = mountedEditor.deltaDecorations(decorationIdsRef.current, []);
  }

  function applyHighlights(startLine: number, endLine: number, kind: string | null) {
    const mountedEditor = editorRef.current;
    const monacoInstance = monacoRef.current;
    const model = mountedEditor?.getModel();
    if (!mountedEditor || !monacoInstance || !model || startLine <= 0) {
      clearHighlights();
      return;
    }

    const safeStart = Math.min(Math.max(startLine, 1), model.getLineCount() || 1);
    const safeEnd = Math.min(Math.max(endLine || startLine, safeStart), model.getLineCount() || 1);
    const tone = kind === 'duplicate' ? 'duplicate' : kind === 'function' ? 'function' : 'default';

    decorationIdsRef.current = mountedEditor.deltaDecorations(decorationIdsRef.current, [
      {
        range: new monacoInstance.Range(safeStart, 1, safeEnd, model.getLineMaxColumn(safeEnd)),
        options: {
          isWholeLine: true,
          className: `editor-highlight-range ${tone}`,
          linesDecorationsClassName: `editor-highlight-gutter ${tone}`,
        },
      },
      {
        range: new monacoInstance.Range(safeStart, 1, safeStart, model.getLineMaxColumn(safeStart)),
        options: {
          isWholeLine: true,
          className: `editor-highlight-anchor ${tone}`,
        },
      },
    ]);
  }

  function jumpToLine(lineNumber: number) {
    if (!decodedPath) return;
    // `replace` so the marker chips do not stack up in the history; the shell
    // mirrors the new `?line=` back onto the tab.
    navigate(`${EDITOR_PREFIX}${encodeURIComponent(decodedPath)}?line=${lineNumber}`, { replace: true });
    revealTargetLine(lineNumber);
  }

  /* ------------------------------------------------------------------ data */

  useEffect(() => {
    if (!folder || !decodedPath) return;
    const requestKey = currentFileKey;
    const requestVersion = fileVersionRef.current;
    setLoadError(null);
    setMeta(null);
    setGit(null);
    setFileTags([]);
    setLoadedPath('');
    setContent('');
    setOriginal('');
    window.api.file.read(folder.id, decodedPath).then(({ content, meta }) => {
      if (!isCurrentFileRequest(requestKey, requestVersion)) return;
      // A tab remembers what you typed into it — restore the buffer before the
      // disk contents so re-selecting the tab is lossless.
      const draft = useTabsStore.getState().fileTabsByFolder[folder.id]
        ?.find(tab => tab.id === requestKey)?.draft;
      setContent(draft ?? content);
      setOriginal(content);
      setMeta(meta);
      setLoadedPath(decodedPath);
    }).catch(e => {
      if (!isCurrentFileRequest(requestKey, requestVersion)) return;
      setLoadError(String(e));
    });
    window.api.git.fileInfo(folder.id, decodedPath).then((nextGit) => {
      if (!isCurrentFileRequest(requestKey, requestVersion)) return;
      setGit(nextGit);
    }).catch(() => {
      if (!isCurrentFileRequest(requestKey, requestVersion)) return;
      setGit(null);
    });
    window.api.stats.fileTags(folder.id, decodedPath).then((nextTags) => {
      if (!isCurrentFileRequest(requestKey, requestVersion)) return;
      setFileTags(nextTags);
    }).catch(() => {
      if (!isCurrentFileRequest(requestKey, requestVersion)) return;
      setFileTags([]);
    });
  }, [currentFileKey, decodedPath, folder?.id, reloadToken]);

  useEffect(() => {
    if (!folder || !decodedPath || scanRevision === 0) return;
    const requestKey = currentFileKey;
    const requestVersion = fileVersionRef.current;
    window.api.stats.fileTags(folder.id, decodedPath).then((nextTags) => {
      if (!isCurrentFileRequest(requestKey, requestVersion)) return;
      setFileTags(nextTags);
    }).catch(() => {
      if (!isCurrentFileRequest(requestKey, requestVersion)) return;
      setFileTags([]);
    });
  }, [currentFileKey, decodedPath, folder?.id, scanRevision]);

  const loaded = Boolean(loadedPath) && loadedPath === decodedPath;
  const dirty = loaded && content !== original;

  // The dirty dot on the tab, and the buffer that survives a tab switch. Gated
  // on `loaded` so the reset at the top of the load effect cannot wipe the
  // draft the load effect is about to read.
  useEffect(() => {
    if (!loaded || !currentFileKey) return;
    setDraft(currentFileKey, dirty ? content : null);
  }, [content, currentFileKey, dirty, loaded, setDraft]);

  useEffect(() => {
    if (!editorReady || !loaded) return;
    if (targetLine <= 0) {
      clearHighlights();
      return;
    }
    applyHighlights(targetLine, targetEndLine, highlightKind);
    revealTargetLine(targetLine, targetEndLine);
  }, [editorReady, highlightKind, loaded, targetEndLine, targetLine]);

  useEffect(() => clearHighlights, []);
  useEffect(() => () => cursorSubscriptionRef.current?.dispose(), []);

  const onMount: OnMount = (mountedEditor, monacoInstance) => {
    editorRef.current = mountedEditor;
    monacoRef.current = monacoInstance;
    cursorSubscriptionRef.current?.dispose();
    cursorSubscriptionRef.current = mountedEditor.onDidChangeCursorPosition(event => {
      setCursor({ line: event.position.lineNumber, column: event.position.column });
    });
    setEditorReady(true);
  };

  function beforeMount(monacoInstance: typeof import('monaco-editor')) {
    monacoInstance.editor.setTheme(theme === 'light' ? 'vs' : 'vs-dark');
  }

  const saving = (savingCountsByFile[currentFileKey] ?? 0) > 0;

  const save = useCallback(async () => {
    if (!folder) return;
    const requestKey = currentFileKey;
    const requestVersion = fileVersionRef.current;
    setSavingCountsByFile(current => ({
      ...current,
      [requestKey]: (current[requestKey] ?? 0) + 1,
    }));
    try {
      const newMeta = await window.api.file.write(folder.id, decodedPath, content);
      if (!isCurrentFileRequest(requestKey, requestVersion)) return;
      const nextTags = await window.api.stats.fileTags(folder.id, decodedPath);
      if (!isCurrentFileRequest(requestKey, requestVersion)) return;
      setMeta(newMeta);
      setOriginal(content);
      setFileTags(nextTags);
    } catch (e) {
      // A failed *save* is an app-level error, not a region-level one
      // (DESIGN-SYSTEM §7.5): the buffer is still on screen and still yours, so
      // it must not be replaced by an EmptyState.
      toast.show({ tone: 'danger', title: t('editor.saveFailed'), details: String(e) });
    } finally {
      setSavingCountsByFile(current => {
        const nextCount = (current[requestKey] ?? 0) - 1;
        if (nextCount > 0) {
          return { ...current, [requestKey]: nextCount };
        }
        const { [requestKey]: _removed, ...rest } = current;
        return rest;
      });
    }
  }, [content, currentFileKey, decodedPath, folder, t]);

  // `⌘S` — the app had no global shortcuts at all (DESIGN-SYSTEM §8.1). While
  // read-only it is not a dead key: it says how to make it work.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (!mod || event.altKey || event.key.toLowerCase() !== 's') return;
      // Always swallowed, so `dev:ui` never opens the browser's Save dialog.
      event.preventDefault();
      // Settings' rule editor owns `⌘S` while it is open (blueprint §4.2), and
      // the two must not both fire.
      if (useAppStore.getState().settingsOpen) return;
      if (readOnly) {
        toast.show({
          // A stable id, so holding ⌘S down does not stack a pile of toasts.
          id: 'editor-read-only',
          tone: 'neutral',
          title: t('editor.readOnlyHint'),
          action: { label: t('editor.enableEditMode'), onClick: () => setReadOnly(false) },
        });
        return;
      }
      if (!dirty || saving) return;
      void save();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dirty, readOnly, save, saving, t]);

  const groupedFileTags = useMemo(
    () => Array.from(fileTags.reduce<Map<TagRow['kind'], TagRow[]>>((groups, tag) => {
      const currentGroup = groups.get(tag.kind) ?? [];
      currentGroup.push(tag);
      groups.set(tag.kind, currentGroup);
      return groups;
    }, new Map())),
    [fileTags],
  );

  const overflow: MenuItem[] = useMemo(() => [
    {
      id: 'reload',
      label: t('editor.reload'),
      icon: RefreshCw,
      onSelect: () => {
        // Reloading discards the buffer, so drop the draft first — the load
        // effect reads it back through `getState()`.
        if (currentFileKey) setDraft(currentFileKey, null);
        setReloadToken(current => current + 1);
      },
    },
    {
      id: 'copy-path',
      label: t('tree.menu.copyRelativePath'),
      onSelect: () => void navigator.clipboard?.writeText(decodedPath).catch(() => undefined),
    },
    { kind: 'separator', id: 'sep' },
    {
      id: 'close',
      label: t('tabs.close'),
      icon: X,
      shortcut: 'Mod+W',
      onSelect: () => {
        if (currentFileKey) requestClose([currentFileKey]);
      },
    },
  ], [currentFileKey, decodedPath, requestClose, setDraft, t]);

  // The editor's verbs, by name, while this tab is the mounted view: the two
  // primary controls plus everything in its `⋯` (DESIGN-SYSTEM §9 rule 1).
  useRegisterCommands('editor-tab', () => [
    {
      id: 'editor-tab:save',
      group: 'action' as const,
      title: t('editor.save'),
      hint: decodedPath,
      shortcut: 'Mod+S',
      disabled: readOnly || !dirty || saving,
      disabledReason: readOnly ? t('editor.readOnlyHint') : undefined,
      perform: () => void save(),
    },
    {
      id: 'editor-tab:edit-mode',
      group: 'action' as const,
      title: readOnly ? t('editor.enableEditMode') : t('editor.editMode'),
      hint: decodedPath,
      perform: () => setReadOnly(current => !current),
    },
    ...commandsFromMenu('editor-tab', overflow, { hint: decodedPath }),
  ]);

  if (!folder) return <NoFolderState />;

  const metaLine = meta
    ? `${meta.lang} · ${meta.total.toLocaleString(locale)} ${t('common.lines')} · ${(meta.size / 1024).toFixed(1)} KB · ${t('editor.mtime')} ${new Date(meta.mtime).toLocaleString(locale)}`
    : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Toolbar
        sticky={false}
        className="rounded-lg border border-border"
        icon={FileCode2}
        title={<span className="font-mono">{decodedPath}</span>}
        subtitle={metaLine}
        overflowLabel={t('common.more')}
        overflow={overflow}
        actions={(
          <>
            <Switch
              size="sm"
              checked={!readOnly}
              onCheckedChange={next => setReadOnly(!next)}
              label={t('editor.editMode')}
            />
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              disabled={readOnly || !dirty || saving}
              onClick={() => void save()}
            >
              {saving ? t('editor.saving') : t('editor.save')}
              <Kbd className="ml-0.5">Mod+S</Kbd>
            </Button>
          </>
        )}
        filters={groupedFileTags.length > 0 ? (
          <>
            <span className="text-xs text-fg-muted">{t('tags.title')}</span>
            {groupedFileTags.map(([currentKind, hits]) => (
              <div key={currentKind} className="flex flex-wrap items-center gap-1">
                <Badge tone={tagTone(currentKind)}>{currentKind} {hits.length}</Badge>
                {hits.map((hit, index) => (
                  <Button
                    key={`${currentKind}-${hit.lineNo}-${index}`}
                    size="xs"
                    variant="ghost"
                    title={t('tags.jumpToLine', { line: hit.lineNo.toLocaleString(locale) })}
                    onClick={() => jumpToLine(hit.lineNo)}
                  >
                    {hit.lineNo.toLocaleString(locale)}
                  </Button>
                ))}
              </div>
            ))}
          </>
        ) : undefined}
      />

      {loadError ? (
        <EmptyState
          variant="error"
          title={t('common.loadFailed')}
          error={loadError}
          detailsLabel={t('common.more')}
          action={(
            <Button variant="primary" onClick={() => setReloadToken(current => current + 1)}>
              {t('common.retry')}
            </Button>
          )}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
          {/* Monaco stays mounted across tab switches — only `path` changes, so
              it keeps a model (and its undo stack) per file. The skeleton
              covers it while the next file is being read. */}
          <div className="relative min-h-0 flex-1" aria-busy={!loaded || undefined}>
            <Editor
              height="100%"
              theme={theme === 'light' ? 'vs' : 'vs-dark'}
              path={decodedPath}
              language={langOf(decodedPath)}
              loading={t('editor.loadingAssets')}
              value={content}
              onChange={v => setContent(v ?? '')}
              beforeMount={beforeMount}
              onMount={onMount}
              options={{
                readOnly,
                glyphMargin: true,
                minimap: { enabled: true },
                fontSize: 13,
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
            {!loaded ? (
              <div className="absolute inset-0 bg-surface p-3">
                <Skeleton variant="row" count={20} />
              </div>
            ) : null}
          </div>
          {/* The git line lives in the footer now so it can never push Monaco
              down (blueprint §2.5). */}
          <footer className="flex h-statusbar shrink-0 items-center gap-3 border-t border-border bg-surface px-2 text-2xs text-fg-muted">
            <span className="min-w-0 flex-1 truncate">
              {git ? (
                <>
                  {t('editor.git')} {git.lastSha?.slice(0, 7) || '—'} {t('editor.gitBy')} {git.lastAuthor || '—'} {t('editor.gitOn')} {git.lastDate ? new Date(git.lastDate).toLocaleDateString(locale) : '—'}
                  {git.topAuthors.length > 0
                    ? ` · ${t('editor.gitTop')}: ${git.topAuthors.map(a => `${a.author} (${a.lines.toLocaleString(locale)})`).join(', ')}`
                    : null}
                </>
              ) : null}
            </span>
            <span className="shrink-0 font-mono">
              {t('editor.cursor', {
                line: cursor.line.toLocaleString(locale),
                column: cursor.column.toLocaleString(locale),
              })}
            </span>
          </footer>
        </div>
      )}
    </div>
  );
}
