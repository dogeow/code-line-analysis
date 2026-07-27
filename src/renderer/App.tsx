import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import OverviewView from './views/OverviewView';
import CodeView from './views/CodeView';
import ArchitectureView from './views/ArchitectureView';
import EditorTab from './views/EditorTab';
import WorkspaceView from './views/WorkspaceView';
import AppShell from './shell/AppShell';
import { useActiveFolder } from './store/app-store';
import { useI18n } from './i18n';
import { checkForUpdate } from './lib/updater';

/**
 * Routing only. Every piece of state this file used to own — folders, the
 * active folder, the scan progress, the expanded tree paths, the settings modal
 * and the `scanRevision` cache-buster — now lives in `store/` and is read by
 * the shell and the pages directly.
 */
export default function App() {
  const folder = useActiveFolder();
  const { t } = useI18n();

  useEffect(() => {
    void checkForUpdate(t);
  }, [t]);

  return (
    <AppShell>
      <Routes>
        {/* Folder management reads the store directly now, so this route takes
            no props (blueprint §2.6). */}
        <Route path="/" element={<WorkspaceView />} />
        {/* `/dashboard` + `/heatmap` merged into one view (blueprint §2.2). */}
        <Route path="/overview" element={<OverviewView folder={folder} />} />
        {/* `/files` + `/top` + `/tags` + `/duplicates` are one view with four
            lenses now; the lens rides in `?lens=` (blueprint §2.3). */}
        <Route path="/code" element={<CodeView folder={folder} />} />
        {/* `/api-routes` + `/relations` + `/laravel-schema` are one view with
            three lenses now; the lens rides in `?lens=` (blueprint §2.4). */}
        <Route path="/architecture" element={<ArchitectureView folder={folder} />} />
        {/* The editor is a document tab now, not a nav-less terminal route
            (blueprint §1.2 / §2.5). The route shape is unchanged so every
            existing deep link (`?line`, `?endLine`, `?highlight`) still works. */}
        <Route path="/editor/:relPath" element={<EditorTab folder={folder} />} />
      </Routes>
    </AppShell>
  );
}
