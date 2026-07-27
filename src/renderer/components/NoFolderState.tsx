import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from './ui';
import { useI18n } from '../i18n';

/**
 * The single "no folder is active" dead-end. It replaces the eleven bare
 * `<div className="empty">{t('common.selectFolder')}</div>` blocks, and — per
 * DESIGN-SYSTEM §7.6 — always carries an action instead of leaving the user
 * stranded.
 */
export default function NoFolderState() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <EmptyState
      variant="no-selection"
      title={t('app.noFolderSelected')}
      description={t('common.selectFolder')}
      action={(
        <Button variant="primary" onClick={() => navigate('/')}>
          {t('nav.workspace')}
        </Button>
      )}
    />
  );
}
