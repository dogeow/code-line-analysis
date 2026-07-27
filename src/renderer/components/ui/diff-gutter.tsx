// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { cn } from '../../lib/utils';

export type DiffKind = 'add' | 'del' | 'mod' | 'moved' | 'same';

export interface DiffGutterProps {
  kind: DiffKind;
  leftNumber?: number;
  rightNumber?: number;
  className?: string;
}

const SIGN: Record<DiffKind, string> = {
  add: '+',
  del: '−',
  mod: '~',
  moved: '⇄',
  same: ' ',
};

const COLOR: Record<DiffKind, string> = {
  add: 'text-diff-add',
  del: 'text-diff-del',
  mod: 'text-diff-mod',
  moved: 'text-diff-moved',
  same: 'text-diff-same',
};

/**
 * MANDATORY on every diff surface: green/red measures ΔE 5.6 under deuteranopia
 * in dark, below the ΔE 6 floor, so colour alone is never sufficient.
 */
export function DiffGutter({ kind, leftNumber, rightNumber, className }: DiffGutterProps) {
  return (
    <span
      data-diff={kind}
      className={cn('inline-flex shrink-0 items-center gap-2 font-mono text-2xs', COLOR[kind], className)}
    >
      {typeof leftNumber === 'number' ? (
        <span className="w-10 text-right text-fg-subtle">{leftNumber}</span>
      ) : null}
      {typeof rightNumber === 'number' ? (
        <span className="w-10 text-right text-fg-subtle">{rightNumber}</span>
      ) : null}
      <span aria-hidden className="w-[1ch] text-center">
        {SIGN[kind]}
      </span>
      <span className="sr-only">{kind}</span>
    </span>
  );
}
