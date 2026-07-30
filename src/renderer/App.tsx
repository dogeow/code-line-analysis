import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Skeleton } from './components/ui/spinner';
import AppShell from './shell/AppShell';
import { useActiveFolder } from './store/app-store';
import { useI18n } from './i18n';
import { checkForUpdate } from './lib/updater';

const WorkspaceView = lazy(() => import('./views/WorkspaceView'));
const OverviewView = lazy(() => import('./views/OverviewView'));
const CodeView = lazy(() => import('./views/CodeView'));
const ArchitectureView = lazy(() => import('./views/ArchitectureView'));
const EditorTab = lazy(() => import('./views/EditorTab'));

function RouteFallback() {
  return (
    <div className="grid gap-3" aria-busy="true">
      <Skeleton variant="row" count={2} />
      <Skeleton variant="tile" className="h-64" />
    </div>
  );
}

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
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    </AppShell>
  );
}
