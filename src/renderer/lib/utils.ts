// synced from mysql-compare/src/renderer/lib/utils.ts — Doge Desktop Design System
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names so a caller's `className` always wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
