// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
import { cn } from '../../lib/utils';
import { isMac } from './_internal/hooks';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

const TOKENS: Record<string, string> = {
  Mod: isMac ? '⌘' : 'Ctrl',
  Meta: isMac ? '⌘' : 'Win',
  Cmd: '⌘',
  Alt: isMac ? '⌥' : 'Alt',
  Shift: '⇧',
  Ctrl: isMac ? '⌃' : 'Ctrl',
  Enter: '↵',
  Escape: 'Esc',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

/** Renders `Mod+K` as `⌘K` on macOS and `Ctrl+K` elsewhere. */
export function formatChord(chord: string): string {
  return chord
    .split('+')
    .map(part => TOKENS[part] ?? part)
    .join(isMac ? '' : '+');
}

export function Kbd({ children, className, ...rest }: KbdProps) {
  const text = typeof children === 'string' ? formatChord(children) : children;
  return (
    <kbd
      className={cn(
        'inline-flex h-4 min-w-4 items-center justify-center rounded-xs border border-border',
        'bg-surface-2 px-1 font-mono text-2xs text-fg-muted',
        className,
      )}
      {...rest}
    >
      {text}
    </kbd>
  );
}
