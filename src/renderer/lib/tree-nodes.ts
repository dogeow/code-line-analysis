import type { DirNode } from '../../shared/api';

/**
 * Pure directory-tree helpers, moved verbatim out of the deleted
 * `pages/TreeView.tsx` (`:112-154`) when the tree became permanent sidebar
 * chrome. They are shared by `shell/Explorer.tsx` and — once the palette lands
 * — by the "Expand all" / "Level 1·2·3" commands.
 */

export function collectDirectoryPaths(node: DirNode): { allPaths: string[]; maxDepth: number } {
  const allPaths: string[] = [];
  let maxDepth = 0;

  function visit(current: DirNode, depth: number): void {
    if (!current.isDir) return;
    if (current.path !== '') {
      allPaths.push(current.path);
      maxDepth = Math.max(maxDepth, depth);
    }
    current.children?.forEach(child => {
      if (child.isDir) visit(child, depth + 1);
    });
  }

  visit(node, 0);
  return { allPaths, maxDepth };
}

export function pathsForLevel(node: DirNode, targetDepth: number): string[] {
  const paths: string[] = [];

  function visit(current: DirNode, depth: number): void {
    if (!current.isDir) return;
    if (current.path !== '' && depth <= targetDepth) paths.push(current.path);
    if (depth >= targetDepth) return;
    current.children?.forEach(child => {
      if (child.isDir) visit(child, depth + 1);
    });
  }

  visit(node, 0);
  return paths;
}

export function parentDirectoryPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 1) return '';
  return segments.slice(0, -1).join('/');
}

/** One visible tree row — the flattened shape `role="tree"` needs. */
export interface FlatTreeRow {
  node: DirNode;
  depth: number;
  /** Index of the parent row in the same flat list, or -1 for the root. */
  parentIndex: number;
}

/**
 * Depth-first flatten of the expanded subtree. A flat list is what lets the
 * container own `role="tree"` with `role="treeitem"` children (nested wrapper
 * `<div>`s would break that relationship) and what makes ↑/↓/Home/End and
 * type-ahead a single index walk.
 */
export function flattenTree(root: DirNode, expanded: Set<string>): FlatTreeRow[] {
  const rows: FlatTreeRow[] = [];

  function visit(node: DirNode, depth: number, parentIndex: number): void {
    const index = rows.length;
    rows.push({ node, depth, parentIndex });
    if (!node.isDir || !expanded.has(node.path)) return;
    node.children?.forEach(child => visit(child, depth + 1, index));
  }

  visit(root, 0, -1);
  return rows;
}
