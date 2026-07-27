import type { ApiRouteEntry, ApiRouteOverview } from '../../../shared/api';
import type { TranslationKey } from '../../i18n';

/**
 * The pure route model behind the Routes lens. Extracted verbatim from the
 * 1375-line `pages/ApiRoutesView.tsx` so the list renderer
 * (`ApiRoutesList.tsx`) and the eight chart variants (`ApiRoutesGraph.tsx`) can
 * be split apart without either of them owning the other's data shaping
 * (blueprint §6 chunk 8 / ADOPTION §1.4).
 *
 * Nothing here knows about colour any more: the old `FRAMEWORK_COLORS` /
 * `METHOD_COLORS` / `CHART_*` hex blocks baked `itemStyle` into every node.
 * Colour is now assigned at option-build time from `ChartTokens`, which is what
 * makes the charts theme-aware (DESIGN-SYSTEM §1.6).
 */
export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

export type DisplayMode = 'list' | 'graph';

export type RouteChartVariant =
  | 'force'
  | 'circular'
  | 'sankey'
  | 'tree'
  | 'sunburst'
  | 'treemap'
  | 'heatmap'
  | 'stackedBar';

export const ROUTE_CHART_VARIANTS: RouteChartVariant[] = [
  'force', 'circular', 'sankey', 'tree', 'sunburst', 'treemap', 'heatmap', 'stackedBar',
];

/**
 * Variants whose marks are placed by a layout pass, so "Re-layout graph" has
 * something to do. Heatmap and stacked bar are axis-bound.
 */
export const RELAYOUTABLE_VARIANTS: RouteChartVariant[] = ['force', 'circular', 'sankey', 'tree'];

export type RouteNodeKind = 'root' | 'framework' | 'group' | 'method';

export interface RouteFlowNode {
  name: string;
  displayName: string;
  kind: RouteNodeKind;
  framework?: ApiRouteEntry['framework'];
  method?: string;
  routeCount: number;
  methods?: string[];
  sourceCount?: number;
  symbolSize?: number;
  category?: number;
}

export interface RouteHierarchyNode extends RouteFlowNode {
  value: number;
  children?: RouteHierarchyNode[];
}

export interface RouteHierarchyChart {
  groupDepth: number;
  groupCount: number;
  root: RouteHierarchyNode;
  chartHeight: number;
}

export interface RouteFlowLink {
  source: string;
  target: string;
  value: number;
}

export interface RouteFlowGraph {
  groupDepth: number;
  groupCount: number;
  nodes: RouteFlowNode[];
  links: RouteFlowLink[];
  chartHeight: number;
}

export interface RouteAnalysisGroup {
  key: string;
  framework: ApiRouteEntry['framework'];
  label: string;
  displayName: string;
  routeCount: number;
  methodCounts: Record<string, number>;
}

export interface RouteAnalysisChart {
  groupDepth: number;
  groupCount: number;
  groups: RouteAnalysisGroup[];
  methods: string[];
  maxValue: number;
  chartHeight: number;
}

export interface RouteGroup {
  key: string;
  label: string;
  routes: ApiRouteEntry[];
}

export interface FrameworkRouteSection {
  framework: ApiRouteEntry['framework'];
  routes: ApiRouteEntry[];
  groups: RouteGroup[];
}

export const LARAVEL_GROUP_BEST_EFFORT_WARNING =
  'Laravel route groups are expanded best-effort; dynamic group attributes or runtime-defined routes can still be incomplete.';

export function emptyOverview(): ApiRouteOverview {
  return { frameworks: [], routes: [], laravelRouteFiles: 0, nextRouteFiles: 0, warnings: [] };
}

export function frameworkLabel(framework: ApiRouteEntry['framework'], t: Translate): string {
  if (framework === 'laravel') return t('apiRoutes.frameworkLaravel');
  if (framework === 'next-app') return t('apiRoutes.frameworkNextApp');
  return t('apiRoutes.frameworkNextPages');
}

export function methodLabel(method: string, t: Translate): string {
  if (method === 'PAGE') return t('apiRoutes.pageType');
  return method;
}

export function displayModeLabel(mode: DisplayMode, t: Translate): string {
  return mode === 'graph' ? t('apiRoutes.viewGraph') : t('apiRoutes.viewList');
}

export function depthButtonLabel(level: number, t: Translate): string {
  return t('apiRoutes.depthLevel', { count: level });
}

export function routeChartVariantLabel(variant: RouteChartVariant, t: Translate): string {
  if (variant === 'circular') return t('apiRoutes.chartCircular');
  if (variant === 'heatmap') return t('apiRoutes.chartHeatmap');
  if (variant === 'sankey') return t('apiRoutes.chartSankey');
  if (variant === 'stackedBar') return t('apiRoutes.chartStackedBar');
  if (variant === 'tree') return t('apiRoutes.chartTree');
  if (variant === 'sunburst') return t('apiRoutes.chartSunburst');
  if (variant === 'treemap') return t('apiRoutes.chartTreemap');
  return t('apiRoutes.chartForce');
}

export function splitRouteSegments(routePath: string): string[] {
  return routePath.split('/').filter(Boolean);
}

export function maxRoutePathDepth(routes: ApiRouteEntry[]): number {
  return routes.reduce((maxDepth, route) => Math.max(maxDepth, splitRouteSegments(route.path).length), 0);
}

export function prefixPath(routePath: string, depth: number): string {
  const segments = splitRouteSegments(routePath).slice(0, depth);
  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}

export function tailPath(routePath: string, depth: number | null): string {
  if (depth == null) return routePath;

  const segments = splitRouteSegments(routePath);
  if (segments.length <= depth) return '/';
  return `/${segments.slice(depth).join('/')}`;
}

export function routeKey(route: ApiRouteEntry): string {
  return [route.framework, route.path, route.handler, route.sourceFile, route.routeName ?? '', route.methods.join(',')].join('|');
}

export function translateApiRouteWarning(warning: string, t: Translate): string {
  const missingIncludedFilesMatch = warning.match(/^Laravel included route files were referenced but not found in the scan:\s*(.+)$/);
  if (missingIncludedFilesMatch?.[1]) {
    return t('apiRoutes.warningMissingIncludedFiles', { value: missingIncludedFilesMatch[1] });
  }

  return warning;
}

export function frameworkNodeId(framework: ApiRouteEntry['framework']): string {
  return `framework:${framework}`;
}

export function groupNodeId(framework: ApiRouteEntry['framework'], groupLabel: string): string {
  return `group:${framework}:${groupLabel}`;
}

export function methodNodeId(method: string): string {
  return `method:${method.toUpperCase()}`;
}

export function buildRouteSections(routes: ApiRouteEntry[], groupDepth: number | null): FrameworkRouteSection[] {
  const frameworkMap = new Map<ApiRouteEntry['framework'], ApiRouteEntry[]>();

  for (const route of routes) {
    const frameworkRoutes = frameworkMap.get(route.framework) ?? [];
    frameworkRoutes.push(route);
    frameworkMap.set(route.framework, frameworkRoutes);
  }

  return Array.from(frameworkMap.entries()).map(([framework, frameworkRoutes]) => {
    if (groupDepth == null) {
      return {
        framework,
        routes: frameworkRoutes,
        groups: [],
      };
    }

    const groups = new Map<string, ApiRouteEntry[]>();

    for (const route of frameworkRoutes) {
      const groupLabel = prefixPath(route.path, groupDepth);
      const groupRoutes = groups.get(groupLabel) ?? [];
      groupRoutes.push(route);
      groups.set(groupLabel, groupRoutes);
    }

    return {
      framework,
      routes: frameworkRoutes,
      groups: Array.from(groups.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([label, groupRoutes]) => ({
          key: `${framework}|${label}`,
          label,
          routes: groupRoutes,
        })),
    };
  });
}

export function buildRouteFlowGraph(routes: ApiRouteEntry[], groupDepth: number, t: Translate): RouteFlowGraph {
  const frameworkCounts = new Map<ApiRouteEntry['framework'], number>();
  const groups = new Map<string, { framework: ApiRouteEntry['framework']; label: string; routeCount: number; methods: Set<string>; sourceFiles: Set<string> }>();
  const methodCounts = new Map<string, number>();
  const groupMethodCounts = new Map<string, { framework: ApiRouteEntry['framework']; label: string; method: string; count: number }>();

  for (const route of routes) {
    frameworkCounts.set(route.framework, (frameworkCounts.get(route.framework) ?? 0) + 1);

    const label = prefixPath(route.path, groupDepth);
    const key = `${route.framework}|${label}`;
    const existing = groups.get(key) ?? {
      framework: route.framework,
      label,
      routeCount: 0,
      methods: new Set<string>(),
      sourceFiles: new Set<string>(),
    };

    existing.routeCount += 1;
    route.methods.forEach(method => {
      const normalizedMethod = method.toUpperCase();
      const groupMethodKey = `${key}|${normalizedMethod}`;
      const currentGroupMethod = groupMethodCounts.get(groupMethodKey) ?? {
        framework: route.framework,
        label,
        method: normalizedMethod,
        count: 0,
      };

      existing.methods.add(normalizedMethod);
      methodCounts.set(normalizedMethod, (methodCounts.get(normalizedMethod) ?? 0) + 1);
      currentGroupMethod.count += 1;
      groupMethodCounts.set(groupMethodKey, currentGroupMethod);
    });
    existing.sourceFiles.add(route.sourceFile);
    groups.set(key, existing);
  }

  const nodes: RouteFlowNode[] = Array.from(frameworkCounts.entries())
    .sort(([left], [right]) => frameworkLabel(left, t).localeCompare(frameworkLabel(right, t)))
    .map(([framework, routeCount]) => ({
      name: frameworkNodeId(framework),
      displayName: frameworkLabel(framework, t),
      kind: 'framework' as const,
      framework,
      routeCount,
      category: 0,
      symbolSize: 42 + Math.min(26, Math.sqrt(routeCount) * 4),
    }));

  const links: RouteFlowLink[] = [];
  const groupEntries = Array.from(groups.values()).sort((left, right) => left.framework.localeCompare(right.framework) || left.label.localeCompare(right.label));

  for (const entry of groupEntries) {
    const nodeId = groupNodeId(entry.framework, entry.label);
    nodes.push({
      name: nodeId,
      displayName: entry.label,
      kind: 'group',
      framework: entry.framework,
      routeCount: entry.routeCount,
      methods: Array.from(entry.methods).sort(),
      sourceCount: entry.sourceFiles.size,
      category: 1,
      symbolSize: 22 + Math.min(32, Math.sqrt(entry.routeCount) * 5),
    });
    links.push({
      source: frameworkNodeId(entry.framework),
      target: nodeId,
      value: entry.routeCount,
    });
  }

  for (const [method, routeCount] of Array.from(methodCounts.entries()).sort(([left], [right]) => left.localeCompare(right))) {
    nodes.push({
      name: methodNodeId(method),
      displayName: methodLabel(method, t),
      kind: 'method',
      method,
      routeCount,
      category: 2,
      symbolSize: 24 + Math.min(28, Math.sqrt(routeCount) * 4),
    });
  }

  for (const entry of groupMethodCounts.values()) {
    links.push({
      source: groupNodeId(entry.framework, entry.label),
      target: methodNodeId(entry.method),
      value: entry.count,
    });
  }

  return {
    groupDepth,
    groupCount: groupEntries.length,
    nodes,
    links,
    chartHeight: Math.max(620, Math.min(980, 460 + (groupEntries.length * 8))),
  };
}

export function buildRouteHierarchy(routes: ApiRouteEntry[], groupDepth: number, t: Translate): RouteHierarchyChart {
  const frameworkNodes = new Map<ApiRouteEntry['framework'], RouteHierarchyNode>();
  const groupNodes = new Map<string, RouteHierarchyNode>();
  const groupMethods = new Map<string, Set<string>>();

  const root: RouteHierarchyNode = {
    name: 'root',
    displayName: t('apiRoutes.treeRoot'),
    kind: 'root',
    routeCount: routes.length,
    value: routes.length,
    children: [],
  };

  for (const route of routes) {
    const frameworkNode = frameworkNodes.get(route.framework) ?? {
      name: frameworkNodeId(route.framework),
      displayName: frameworkLabel(route.framework, t),
      kind: 'framework' as const,
      framework: route.framework,
      routeCount: 0,
      value: 0,
      children: [],
    };

    if (!frameworkNodes.has(route.framework)) {
      frameworkNodes.set(route.framework, frameworkNode);
      root.children?.push(frameworkNode);
    }

    frameworkNode.routeCount += 1;
    frameworkNode.value = frameworkNode.routeCount;

    const groupLabel = prefixPath(route.path, groupDepth);
    const groupKey = `${route.framework}|${groupLabel}`;
    const groupNode = groupNodes.get(groupKey) ?? {
      name: groupNodeId(route.framework, groupLabel),
      displayName: groupLabel,
      kind: 'group' as const,
      framework: route.framework,
      routeCount: 0,
      value: 0,
      methods: [],
      children: [],
    };

    if (!groupNodes.has(groupKey)) {
      groupNodes.set(groupKey, groupNode);
      groupMethods.set(groupKey, new Set<string>());
      frameworkNode.children?.push(groupNode);
    }

    groupNode.routeCount += 1;
    groupNode.value = groupNode.routeCount;

    const methods = groupMethods.get(groupKey)!;
    route.methods.forEach(method => {
      const normalizedMethod = method.toUpperCase();
      methods.add(normalizedMethod);

      const existingMethodNode = groupNode.children?.find(child => child.kind === 'method' && child.method === normalizedMethod);
      if (existingMethodNode) {
        existingMethodNode.routeCount += 1;
        existingMethodNode.value = existingMethodNode.routeCount;
        return;
      }

      groupNode.children?.push({
        name: `${groupNodeId(route.framework, groupLabel)}:${normalizedMethod}`,
        displayName: methodLabel(normalizedMethod, t),
        kind: 'method',
        method: normalizedMethod,
        routeCount: 1,
        value: 1,
      });
    });

    groupNode.methods = Array.from(methods).sort();
  }

  root.children = (root.children ?? [])
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
    .map(frameworkNode => ({
      ...frameworkNode,
      children: (frameworkNode.children ?? [])
        .sort((left, right) => left.displayName.localeCompare(right.displayName))
        .map(groupNode => ({
          ...groupNode,
          children: (groupNode.children ?? []).sort((left, right) => left.displayName.localeCompare(right.displayName)),
        })),
    }));

  return {
    groupDepth,
    groupCount: groupNodes.size,
    root,
    chartHeight: Math.max(640, Math.min(1040, 480 + (groupNodes.size * 10))),
  };
}

export function buildRouteAnalysisChart(routes: ApiRouteEntry[], groupDepth: number, t: Translate): RouteAnalysisChart {
  const groupMap = new Map<string, {
    framework: ApiRouteEntry['framework'];
    label: string;
    routeCount: number;
    methodCounts: Map<string, number>;
  }>();
  const methods = new Set<string>();

  for (const route of routes) {
    const label = prefixPath(route.path, groupDepth);
    const key = `${route.framework}|${label}`;
    const entry = groupMap.get(key) ?? {
      framework: route.framework,
      label,
      routeCount: 0,
      methodCounts: new Map<string, number>(),
    };

    entry.routeCount += 1;
    route.methods.forEach(method => {
      const normalizedMethod = method.toUpperCase();
      methods.add(normalizedMethod);
      entry.methodCounts.set(normalizedMethod, (entry.methodCounts.get(normalizedMethod) ?? 0) + 1);
    });

    groupMap.set(key, entry);
  }

  const methodList = Array.from(methods).sort((left, right) => left.localeCompare(right));
  const groups = Array.from(groupMap.entries())
    .sort((left, right) => right[1].routeCount - left[1].routeCount || left[1].framework.localeCompare(right[1].framework) || left[1].label.localeCompare(right[1].label))
    .map(([key, entry]) => ({
      key,
      framework: entry.framework,
      label: entry.label,
      displayName: `${frameworkLabel(entry.framework, t)} · ${entry.label}`,
      routeCount: entry.routeCount,
      methodCounts: methodList.reduce<Record<string, number>>((acc, method) => {
        acc[method] = entry.methodCounts.get(method) ?? 0;
        return acc;
      }, {}),
    }));

  const maxValue = groups.reduce((maxCount, group) => {
    const groupMax = methodList.reduce((methodMax, method) => Math.max(methodMax, group.methodCounts[method] ?? 0), 0);
    return Math.max(maxCount, groupMax);
  }, 0);

  return {
    groupDepth,
    groupCount: groups.length,
    groups,
    methods: methodList,
    maxValue,
    chartHeight: Math.max(620, Math.min(1180, 280 + (groups.length * 30))),
  };
}
