import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { useI18n } from '../i18n';
import { useAppStore } from '../store/app-store';
import { useScanStore } from '../store/scan-store';

interface Props {
  folderId: number;
  disabled?: boolean;
}

/**
 * The required action on every "scanned nothing yet" `EmptyState`
 * (DESIGN-SYSTEM §7.6). It runs through the shared scan store, so the progress
 * line, the status bar and Cancel all light up from here too — `scan.run` now
 * has exactly one entry point.
 */
export default function ScanNowButton({ folderId, disabled }: Props) {
  const { t } = useI18n();
  const status = useScanStore(state => state.status);
  const run = useScanStore(state => state.run);
  const detectDuplicates = useAppStore(state => state.detectDuplicatesOnScan);
  const busy = status === 'running' || status === 'queued';

  return (
    <Button
      variant="primary"
      icon={RefreshCw}
      loading={busy}
      disabled={disabled || busy}
      onClick={() => void run(folderId, { detectDuplicates })}
    >
      {t('common.scanNow')}
    </Button>
  );
}
