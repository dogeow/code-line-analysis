import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, description, eyebrow, meta, actions }: PageHeaderProps) {
  if (!meta && !actions) return null;

  return (
    <header
      className="page-header page-header-compact"
      aria-label={[eyebrow, title, description].filter(Boolean).join(' · ')}
    >
      {actions && <div className="page-actions">{actions}</div>}
      {meta && <div className="page-meta">{meta}</div>}
    </header>
  );
}
