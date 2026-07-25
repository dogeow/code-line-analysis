import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Copy, FileCode2, Files, ListTree, SlidersHorizontal } from 'lucide-react';
import type { FolderRow, DuplicateCluster, FolderRules } from '../../shared/api';
import { useI18n } from '../i18n';

interface Props {
  folder: FolderRow | null;
  scanRevision: number;
}

const DUPLICATE_MIN_LINES_MIN = 3;
const DUPLICATE_MIN_LINES_MAX = 200;

function getDuplicateRuleErrorMessage(error: unknown, fallback: string, unavailable: string): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/No handler registered|setDuplicateRules is not a function|getDuplicateRules is not a function/i.test(message)) {
    return unavailable;
  }
  return fallback;
}

function normalizeRules(value: FolderRules | null | undefined): FolderRules {
  return {
    whitelist: Array.isArray(value?.whitelist) ? value.whitelist : [],
    blacklist: Array.isArray(value?.blacklist) ? value.blacklist : [],
  };
}

export default function DuplicatesView({ folder, scanRevision }: Props) {
  const [clusters, setClusters] = useState<DuplicateCluster[]>([]);
  const [duplicateMinLines, setDuplicateMinLines] = useState(8);
  const [duplicateMinLinesDraft, setDuplicateMinLinesDraft] = useState(8);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [duplicateRules, setDuplicateRules] = useState<FolderRules>({ whitelist: [], blacklist: [] });
  const [duplicateWhiteText, setDuplicateWhiteText] = useState('');
  const [duplicateBlackText, setDuplicateBlackText] = useState('');
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rulesMessage, setRulesMessage] = useState('');
  const [rulesError, setRulesError] = useState('');
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const scrollStorageKey = folder ? `duplicates-scroll:${folder.id}` : '';
  const duplicateRuleApisAvailable = typeof window.api.folders.getDuplicateRules === 'function'
    && typeof window.api.folders.setDuplicateRules === 'function';

  async function loadClusters(folderId: number): Promise<void> {
    const nextClusters = await window.api.stats.duplicates(folderId);
    setClusters(nextClusters);
  }

  useEffect(() => {
    if (!folder) return;
    void loadClusters(folder.id);
  }, [folder?.id, scanRevision]);

  useEffect(() => {
    if (!folder) return;
    void window.api.folders.getDuplicateMinLines(folder.id).then(count => {
      setDuplicateMinLines(count);
      setDuplicateMinLinesDraft(Math.max(DUPLICATE_MIN_LINES_MIN, count));
    }).catch(() => undefined);
  }, [folder?.id]);

  useEffect(() => {
    if (!folder) {
      setRulesOpen(false);
      setDuplicateRules({ whitelist: [], blacklist: [] });
      setDuplicateWhiteText('');
      setDuplicateBlackText('');
      setRulesMessage('');
      setRulesError('');
      return;
    }

    if (!duplicateRuleApisAvailable) {
      setRulesError(t('duplicates.rulesUnavailable'));
      return;
    }

    void window.api.folders.getDuplicateRules(folder.id).then(rules => {
      const nextRules = normalizeRules(rules);
      setDuplicateRules(nextRules);
      setDuplicateWhiteText(nextRules.whitelist.join('\n'));
      setDuplicateBlackText(nextRules.blacklist.join('\n'));
      setRulesMessage('');
      setRulesError('');
    }).catch(error => {
      setRulesError(getDuplicateRuleErrorMessage(error, t('duplicates.rulesFailed'), t('duplicates.rulesUnavailable')));
    });
  }, [duplicateRuleApisAvailable, folder?.id, t]);

  async function applyDuplicateMinLines(nextValue: number): Promise<void> {
    if (!folder) return;
    if (!Number.isInteger(nextValue) || nextValue < DUPLICATE_MIN_LINES_MIN || nextValue === duplicateMinLines) return;
    await window.api.folders.setDuplicateMinLines(folder.id, nextValue);
    setDuplicateMinLines(nextValue);
    setDuplicateMinLinesDraft(nextValue);
    await loadClusters(folder.id);
  }

  useEffect(() => {
    if (!folder || duplicateMinLinesDraft === duplicateMinLines) return;
    const timer = window.setTimeout(() => {
      void applyDuplicateMinLines(duplicateMinLinesDraft);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [duplicateMinLines, duplicateMinLinesDraft, folder]);

  async function saveDuplicateRules(): Promise<void> {
    if (!folder) return;
    if (!duplicateRuleApisAvailable) {
      setRulesError(t('duplicates.rulesUnavailable'));
      return;
    }

    const nextRules: FolderRules = {
      whitelist: duplicateWhiteText.split('\n').map(pattern => pattern.trim()).filter(Boolean),
      blacklist: duplicateBlackText.split('\n').map(pattern => pattern.trim()).filter(Boolean),
    };

    setRulesSaving(true);
    setRulesMessage('');
    setRulesError('');

    try {
      const response = await window.api.folders.setDuplicateRules(folder.id, nextRules);
      const persistedRules = Array.isArray(response?.whitelist) && Array.isArray(response?.blacklist)
        ? normalizeRules(response)
        : normalizeRules(await window.api.folders.getDuplicateRules(folder.id).catch(() => nextRules));
      setDuplicateRules(persistedRules);
      setDuplicateWhiteText(persistedRules.whitelist.join('\n'));
      setDuplicateBlackText(persistedRules.blacklist.join('\n'));
      await loadClusters(folder.id);
      setRulesMessage(t('duplicates.rulesApplied'));
    } catch (error) {
      setRulesError(getDuplicateRuleErrorMessage(error, t('duplicates.rulesFailed'), t('duplicates.rulesUnavailable')));
    } finally {
      setRulesSaving(false);
    }
  }

  function getScrollContainer() {
    return document.querySelector<HTMLElement>('.content');
  }

  function saveScrollPosition() {
    if (!scrollStorageKey) return;
    try {
      window.sessionStorage.setItem(scrollStorageKey, String(getScrollContainer()?.scrollTop ?? 0));
    } catch {
      // Ignore storage failures; navigation should still work normally.
    }
  }

  useLayoutEffect(() => {
    if (!scrollStorageKey) return;

    let savedPosition = 0;
    try {
      savedPosition = Number(window.sessionStorage.getItem(scrollStorageKey) ?? 0);
    } catch {
      savedPosition = 0;
    }

    if (savedPosition <= 0) return;

    const frameId = window.requestAnimationFrame(() => {
      getScrollContainer()?.scrollTo({ top: savedPosition });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [clusters.length, scrollStorageKey]);

  useEffect(() => {
    if (!scrollStorageKey) return;

    const container = getScrollContainer();
    if (!container) return;

    container.addEventListener('scroll', saveScrollPosition, { passive: true });
    return () => container.removeEventListener('scroll', saveScrollPosition);
  }, [scrollStorageKey]);

  if (!folder) return <div className="empty">{t('common.selectFolder')}</div>;

  const duplicateMinLinesMax = Math.max(DUPLICATE_MIN_LINES_MAX, duplicateMinLines, duplicateMinLinesDraft);
  const occurrenceCount = clusters.reduce((sum, cluster) => sum + cluster.occurrences.length, 0);
  const affectedFileCount = new Set(
    clusters.flatMap(cluster => cluster.occurrences.map(occurrence => occurrence.relPath)),
  ).size;
  const repeatedLineCount = clusters.reduce(
    (sum, cluster) => sum + (cluster.lines * cluster.occurrences.length),
    0,
  );

  return (
    <div className="duplicates-page">
      <section className="duplicates-control-panel">
        <div className="duplicates-control-row">
          <button type="button" className="duplicates-rules-trigger" onClick={() => setRulesOpen(true)}>
            <SlidersHorizontal aria-hidden="true" />
            <span>{t('duplicates.rules')}</span>
            <span className="duplicates-rule-counts">
              {duplicateRules.whitelist.length.toLocaleString(locale)} / {duplicateRules.blacklist.length.toLocaleString(locale)}
            </span>
          </button>
          <label className="duplicates-threshold-control">
            <span className="duplicates-control-label">{t('duplicates.minLines')}</span>
            <input
              type="range"
              min={DUPLICATE_MIN_LINES_MIN}
              max={duplicateMinLinesMax}
              step={1}
              value={duplicateMinLinesDraft}
              onChange={event => setDuplicateMinLinesDraft(Number(event.target.value))}
              className="duplicates-range-input"
              aria-label={t('duplicates.minLines')}
            />
            <output className="duplicates-range-value">
              {duplicateMinLinesDraft.toLocaleString(locale)}
              <span>{t('common.lines')}</span>
            </output>
          </label>
        </div>
      </section>

      <div className="cards duplicates-summary-cards">
        <div className="card metric-card">
          <ListTree aria-hidden="true" />
          <div>
            <div className="label">{t('duplicates.groups')}</div>
            <div className="value">{clusters.length.toLocaleString(locale)}</div>
          </div>
        </div>
        <div className="card metric-card">
          <Copy aria-hidden="true" />
          <div>
            <div className="label">{t('duplicates.fragments')}</div>
            <div className="value">{occurrenceCount.toLocaleString(locale)}</div>
          </div>
        </div>
        <div className="card metric-card">
          <Files aria-hidden="true" />
          <div>
            <div className="label">{t('duplicates.affectedFiles')}</div>
            <div className="value">{affectedFileCount.toLocaleString(locale)}</div>
          </div>
        </div>
        <div className="card metric-card">
          <FileCode2 aria-hidden="true" />
          <div>
            <div className="label">{t('duplicates.repeatedLines')}</div>
            <div className="value">{repeatedLineCount.toLocaleString(locale)}</div>
          </div>
        </div>
      </div>

      {!rulesOpen && (rulesMessage || rulesError) ? (
        <div className={rulesError ? 'settings-field-note error' : 'settings-field-note'}>
          {rulesError || rulesMessage}
        </div>
      ) : null}
      {rulesOpen ? (
        <div className="side-drawer-backdrop" onClick={() => setRulesOpen(false)}>
          <aside className="side-drawer" role="dialog" aria-modal="true" aria-label={t('duplicates.rules')} onClick={event => event.stopPropagation()}>
            <div className="side-drawer-header">
              <strong>{t('duplicates.rules')}</strong>
              <button type="button" onClick={() => setRulesOpen(false)}>{t('common.close')}</button>
            </div>
            <p className="settings-copy">{t('duplicates.rulesHelp')}</p>
            <div className="rules-grid" style={{ marginTop: 12 }}>
              <div>
                <h2>{t('folderManager.whitelist')}</h2>
                <textarea
                  value={duplicateWhiteText}
                  onChange={event => {
                    setDuplicateWhiteText(event.target.value);
                    setRulesMessage('');
                    setRulesError('');
                  }}
                  rows={10}
                  className="rules-textarea"
                  placeholder={'src/**\nlib/**'}
                />
              </div>
              <div>
                <h2>{t('folderManager.blacklist')}</h2>
                <textarea
                  value={duplicateBlackText}
                  onChange={event => {
                    setDuplicateBlackText(event.target.value);
                    setRulesMessage('');
                    setRulesError('');
                  }}
                  rows={10}
                  className="rules-textarea"
                  placeholder={'vendor\n**/__generated__/**'}
                />
              </div>
            </div>
            <div className="settings-actions" style={{ marginTop: 12 }}>
              <button type="button" className="primary" onClick={() => void saveDuplicateRules()} disabled={rulesSaving}>
                {rulesSaving ? t('folderManager.saving') : t('duplicates.saveRules')}
              </button>
            </div>
            {(rulesMessage || rulesError) && (
              <div className={rulesError ? 'settings-field-note error' : 'settings-field-note'}>
                {rulesError || rulesMessage}
              </div>
            )}
          </aside>
        </div>
      ) : null}
      {clusters.length === 0 && <div className="empty">{t('duplicates.empty')}</div>}
      <div className="duplicates-list">
        {clusters.map((cluster, clusterIndex) => (
          <section key={cluster.hash} className="duplicate-cluster-card">
            <div className="duplicate-cluster-header">
              <div className="duplicate-cluster-title">
                <span className="duplicate-cluster-icon"><Copy aria-hidden="true" /></span>
                <div>
                  <strong>{t('duplicates.groupLabel', { index: (clusterIndex + 1).toLocaleString(locale) })}</strong>
                  <span className="duplicate-cluster-hash" title={cluster.hash}>
                    {t('duplicates.hash')}: {cluster.hash.slice(0, 12)}
                  </span>
                </div>
              </div>
              <div className="duplicate-cluster-badges">
                <span>{cluster.occurrences.length.toLocaleString(locale)} {t('duplicates.occurrences')}</span>
                <span>{cluster.lines.toLocaleString(locale)} {t('common.lines')}</span>
              </div>
            </div>
            <div className="duplicate-occurrence-list">
              {cluster.occurrences.map((occurrence, occurrenceIndex) => (
                <button
                  key={`${occurrence.relPath}:${occurrence.startLine}:${occurrenceIndex}`}
                  type="button"
                  className="duplicate-occurrence-row"
                  onClick={() => {
                    saveScrollPosition();
                    navigate(`/editor/${encodeURIComponent(occurrence.relPath)}?line=${occurrence.startLine}&endLine=${occurrence.endLine}&highlight=duplicate`);
                  }}
                >
                  <FileCode2 aria-hidden="true" />
                  <span className="duplicate-occurrence-path mono">{occurrence.relPath}</span>
                  <span className="duplicate-occurrence-lines">
                    {t('duplicates.lineRange', { start: occurrence.startLine, end: occurrence.endLine })}
                  </span>
                  <ChevronRight aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
