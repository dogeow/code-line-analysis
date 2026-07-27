import { useCallback } from 'react';
import type { EChartsOption } from 'echarts';
import { Chart, Panel, type ChartTokens } from '../../components/ui';
import { escapeHtml } from '../../utils/escapeHtml';
import type { ChartEvents } from './lens';
import {
  methodLabel,
  type RouteAnalysisChart,
  type RouteChartVariant,
  type RouteFlowGraph,
  type RouteFlowNode,
  type RouteHierarchyChart,
  type RouteHierarchyNode,
  type RouteNodeKind,
  type Translate,
} from './routes-model';

/**
 * Graph mode of the Routes lens — the eight variants that used to occupy a
 * visible strip of eight buttons and are now the toolbar's "View as ▾" menu.
 *
 * Every colour comes from `ChartTokens`; the file's old `FRAMEWORK_COLORS` /
 * `METHOD_COLORS` / `CHART_TEXT` / `CHART_MUTED` / `CHART_BORDER` /
 * `CHART_TOOLTIP_BACKGROUND` literals are gone, which is what lets the charts
 * follow the theme instead of being re-skinned by a string-substitution pass.
 *
 * Encoding (DESIGN-SYSTEM §1.6):
 * - force / circular / sankey are all-pairs forms, so they are capped at
 *   categorical slots 1–3 — one per node kind (framework · path prefix ·
 *   method), which is exactly the graph's own category model.
 * - tree / sunburst / treemap encode *depth*, an ordered variable, so they use
 *   the ordinal ramp.
 * - heatmap is a continuous magnitude: the sequential ramp via `visualMap`.
 * - stacked bar is the one categorical-by-series form; its methods take the
 *   eight slots in sorted order and anything past slot 8 falls back to the
 *   muted ink so nothing is ever cycled.
 */

const KIND_SLOT: Record<RouteNodeKind, number> = { root: 0, framework: 0, group: 1, method: 2 };
const KIND_DEPTH: Record<RouteNodeKind, number> = { root: 0, framework: 1, group: 2, method: 3 };

export interface RouteChartContext {
  variant: RouteChartVariant;
  flow: RouteFlowGraph;
  hierarchy: RouteHierarchyChart;
  analysis: RouteAnalysisChart;
  locale: string;
  t: Translate;
  /** Changes on "Re-layout graph" so the series is rebuilt from scratch. */
  seed: number;
}

function tooltipChrome(tokens: ChartTokens) {
  return {
    backgroundColor: tokens.tooltipBg,
    borderColor: tokens.tooltipBorder,
    textStyle: { color: tokens.ink },
  };
}

function methodSlot(index: number, tokens: ChartTokens): string {
  return tokens.categorical[index] ?? tokens.inkMuted;
}

function nodeTooltip(data: RouteFlowNode, ctx: RouteChartContext): string {
  const { locale, t } = ctx;
  const lines = [
    escapeHtml(data.displayName),
    `${t('apiRoutes.routes')}: ${data.routeCount.toLocaleString(locale)}`,
  ];

  if (data.kind === 'group') {
    lines.push(`${t('apiRoutes.depth')}: ${ctx.flow.groupDepth.toLocaleString(locale)}`);
    lines.push(`${t('common.files')}: ${Number(data.sourceCount ?? 0).toLocaleString(locale)}`);
    if (data.methods && data.methods.length > 0) {
      lines.push(`${t('apiRoutes.methods')}: ${data.methods.map(method => methodLabel(method, t)).join(' / ')}`);
    }
  }

  if (data.kind === 'method' && data.method) lines.push(`${t('apiRoutes.methods')}: ${methodLabel(data.method, t)}`);

  return lines.join('<br/>');
}

/** Shared formatter for every node/edge form (graph, sankey, tree, sunburst, treemap). */
function structureFormatter(ctx: RouteChartContext) {
  return (params: unknown): string => {
    if (typeof params !== 'object' || !params) return '';
    const payload = params as { dataType?: string; value?: number; data?: RouteFlowNode };
    if (payload.dataType === 'edge') {
      return `${ctx.t('apiRoutes.routes')}: ${Number(payload.value ?? 0).toLocaleString(ctx.locale)}`;
    }
    const data = payload.data;
    if (!data || typeof data.displayName !== 'string') return '';
    return nodeTooltip(data, ctx);
  };
}

function decorateFlowNode(node: RouteFlowNode, tokens: ChartTokens) {
  return {
    ...node,
    itemStyle: {
      color: tokens.categorical[KIND_SLOT[node.kind]],
      borderColor: tokens.markRing,
      borderWidth: node.kind === 'framework' ? 2 : 1.5,
    },
    label: {
      show: node.kind !== 'group' || node.routeCount >= 2,
      color: tokens.ink,
      fontSize: node.kind === 'framework' ? 13 : 11,
      fontWeight: node.kind === 'framework' ? 600 : 400,
      formatter: node.displayName,
    },
    emphasis: {
      scale: true,
      itemStyle: { borderColor: tokens.markRing, borderWidth: 2.5 },
      label: { show: true },
    },
  };
}

type DecoratedHierarchyNode = Omit<RouteHierarchyNode, 'children'> & {
  itemStyle: { color: string; borderColor: string; borderWidth: number };
  label: { color: string; fontSize: number; fontWeight: number; formatter: string };
  children?: DecoratedHierarchyNode[];
};

function decorateHierarchyNode(node: RouteHierarchyNode, tokens: ChartTokens): DecoratedHierarchyNode {
  const depth = KIND_DEPTH[node.kind];
  return {
    ...node,
    itemStyle: {
      color: tokens.ordinal[Math.min(depth, tokens.ordinal.length - 1)],
      borderColor: tokens.surface,
      borderWidth: 2,
    },
    label: {
      color: tokens.ink,
      fontSize: node.kind === 'framework' ? 13 : 11,
      fontWeight: node.kind === 'framework' ? 600 : 400,
      formatter: node.displayName,
    },
    children: node.children?.map(child => decorateHierarchyNode(child, tokens)),
  };
}

export function routeChartOption(tokens: ChartTokens, ctx: RouteChartContext): EChartsOption {
  const { analysis, flow, hierarchy, locale, seed, t, variant } = ctx;
  const base = {
    animation: true,
    animationDuration: 450,
    animationDurationUpdate: 320,
    textStyle: { color: tokens.inkMuted },
  } as const;

  if (variant === 'heatmap') {
    return {
      ...base,
      tooltip: {
        trigger: 'item',
        ...tooltipChrome(tokens),
        formatter: params => {
          const data = typeof params === 'object' && params && 'data' in params ? params.data as {
            value: [number, number, number];
            displayName: string;
            routeCount: number;
            method: string;
          } : null;
          if (!data) return '';
          return [
            escapeHtml(data.displayName),
            `${t('apiRoutes.methods')}: ${methodLabel(data.method, t)}`,
            `${t('apiRoutes.routes')}: ${Number(data.value?.[2] ?? 0).toLocaleString(locale)}`,
            `${t('common.files')}: ${data.routeCount.toLocaleString(locale)}`,
          ].join('<br/>');
        },
      },
      visualMap: {
        min: 0,
        max: Math.max(1, analysis.maxValue),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        textStyle: { color: tokens.inkMuted },
        inRange: { color: tokens.sequential },
      },
      grid: { top: 18, left: 24, right: 18, bottom: 84, containLabel: true },
      xAxis: {
        type: 'category',
        data: analysis.methods.map(method => methodLabel(method, t)),
        splitArea: { show: true },
        axisLabel: { color: tokens.inkMuted },
        axisLine: { lineStyle: { color: tokens.axis } },
      },
      yAxis: {
        type: 'category',
        data: analysis.groups.map(group => group.displayName),
        splitArea: { show: true },
        axisLabel: { color: tokens.inkMuted, width: 220, overflow: 'truncate' },
        axisLine: { lineStyle: { color: tokens.axis } },
        inverse: true,
      },
      series: [
        {
          id: `routes-heatmap-${seed}`,
          type: 'heatmap',
          data: analysis.groups.flatMap((group, groupIndex) => analysis.methods.map((method, methodIndex) => ({
            value: [methodIndex, groupIndex, group.methodCounts[method] ?? 0] as [number, number, number],
            displayName: group.label,
            routeCount: group.routeCount,
            method,
          }))),
          label: {
            show: analysis.groups.length <= 14,
            color: tokens.ink,
            formatter: params => {
              const value = typeof params === 'object' && params && 'data' in params
                ? (params.data as { value: [number, number, number] }).value?.[2]
                : null;
              return Number(value ?? 0) > 0 ? String(value) : '';
            },
          },
          itemStyle: { borderColor: tokens.surface, borderWidth: 2 },
        },
      ],
    };
  }

  if (variant === 'stackedBar') {
    return {
      ...base,
      tooltip: {
        trigger: 'item',
        ...tooltipChrome(tokens),
        formatter: params => {
          const data = typeof params === 'object' && params && 'data' in params ? params.data as {
            value: number;
            displayName: string;
            routeCount: number;
            method: string;
          } : null;
          if (!data) return '';
          return [
            escapeHtml(data.displayName),
            `${t('apiRoutes.methods')}: ${methodLabel(data.method, t)}`,
            `${t('apiRoutes.routes')}: ${Number(data.value ?? 0).toLocaleString(locale)}`,
            `${t('common.files')}: ${data.routeCount.toLocaleString(locale)}`,
          ].join('<br/>');
        },
      },
      legend: { top: 0, textStyle: { color: tokens.inkMuted } },
      grid: { top: 56, left: 24, right: 18, bottom: 20, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: tokens.inkMuted },
        splitLine: { lineStyle: { color: tokens.grid } },
      },
      yAxis: {
        type: 'category',
        data: analysis.groups.map(group => group.displayName),
        axisLabel: { color: tokens.inkMuted, width: 220, overflow: 'truncate' },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: tokens.axis } },
        inverse: true,
      },
      series: analysis.methods.map((method, index) => ({
        id: `routes-bar-${method}-${seed}`,
        type: 'bar' as const,
        name: methodLabel(method, t),
        stack: 'routes',
        // 2px surface gap between stacked segments (DESIGN-SYSTEM §1.6).
        itemStyle: { color: methodSlot(index, tokens), borderColor: tokens.surface, borderWidth: 1 },
        emphasis: { focus: 'series' as const },
        data: analysis.groups.map(group => ({
          value: group.methodCounts[method] ?? 0,
          displayName: group.label,
          routeCount: group.routeCount,
          method,
        })),
      })),
    };
  }

  if (variant === 'sankey') {
    return {
      ...base,
      tooltip: { trigger: 'item', ...tooltipChrome(tokens), formatter: structureFormatter(ctx) },
      series: [
        {
          id: `routes-sankey-${seed}`,
          type: 'sankey',
          data: flow.nodes.map(node => ({
            ...decorateFlowNode(node, tokens),
            value: node.routeCount,
            depth: KIND_DEPTH[node.kind] - 1,
          })),
          links: flow.links,
          nodeWidth: 16,
          nodeGap: 16,
          draggable: false,
          emphasis: { focus: 'adjacency' },
          levels: [0, 1, 2].map(depth => ({
            depth,
            itemStyle: { borderWidth: depth === 0 ? 2 : 1.5 },
            lineStyle: { color: 'source', opacity: 0.26 },
          })),
          lineStyle: { color: 'source', opacity: 0.26, curveness: 0.5 },
          label: {
            color: tokens.ink,
            fontSize: 12,
            formatter: params => {
              const data = typeof params === 'object' && params && 'data' in params ? params.data as RouteFlowNode : null;
              return data?.displayName ?? '';
            },
          },
        },
      ],
    };
  }

  if (variant === 'tree') {
    return {
      ...base,
      tooltip: { trigger: 'item', ...tooltipChrome(tokens), formatter: structureFormatter(ctx) },
      series: [
        {
          id: `routes-tree-${seed}`,
          type: 'tree',
          data: [decorateHierarchyNode(hierarchy.root, tokens)],
          layout: 'radial',
          top: '8%',
          left: '8%',
          bottom: '8%',
          right: '8%',
          symbol: 'circle',
          symbolSize: 10,
          roam: true,
          expandAndCollapse: true,
          initialTreeDepth: 2,
          animationDurationUpdate: 550,
          lineStyle: { color: tokens.grid, width: 1.2, curveness: 0.28 },
          itemStyle: { borderWidth: 1.5 },
          label: {
            color: tokens.ink,
            fontSize: 12,
            formatter: params => {
              const data = typeof params === 'object' && params && 'data' in params ? params.data as RouteHierarchyNode : null;
              return data?.displayName ?? '';
            },
          },
          leaves: { label: { color: tokens.ink, fontSize: 11 } },
          emphasis: { focus: 'descendant' },
        },
      ],
    };
  }

  if (variant === 'sunburst') {
    return {
      ...base,
      tooltip: { trigger: 'item', ...tooltipChrome(tokens), formatter: structureFormatter(ctx) },
      series: [
        {
          id: `routes-sunburst-${seed}`,
          type: 'sunburst',
          data: (hierarchy.root.children ?? []).map(child => decorateHierarchyNode(child, tokens)),
          radius: ['12%', '92%'],
          sort: undefined,
          nodeClick: false,
          emphasis: { focus: 'ancestor' },
          itemStyle: { borderColor: tokens.surface, borderWidth: 2 },
          label: { color: tokens.ink },
          levels: [
            {},
            { r0: '12%', r: '32%', label: { rotate: 'tangential' } },
            { r0: '34%', r: '62%', label: { rotate: 'tangential' } },
            { r0: '64%', r: '92%', label: { rotate: 'radial' } },
          ],
        },
      ],
    };
  }

  if (variant === 'treemap') {
    return {
      ...base,
      tooltip: { trigger: 'item', ...tooltipChrome(tokens), formatter: structureFormatter(ctx) },
      series: [
        {
          id: `routes-treemap-${seed}`,
          type: 'treemap',
          data: (hierarchy.root.children ?? []).map(child => decorateHierarchyNode(child, tokens)),
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            color: tokens.ink,
            formatter: params => {
              const data = typeof params === 'object' && params && 'data' in params ? params.data as RouteHierarchyNode : null;
              return data?.displayName ?? '';
            },
          },
          upperLabel: { show: true, color: tokens.ink, height: 24 },
          itemStyle: { borderColor: tokens.surface, borderWidth: 2, gapWidth: 2 },
        },
      ],
    };
  }

  // force + circular — the all-pairs form, capped at categorical slots 1–3.
  return {
    ...base,
    tooltip: { trigger: 'item', ...tooltipChrome(tokens), formatter: structureFormatter(ctx) },
    color: tokens.categorical.slice(0, 3),
    legend: {
      bottom: 0,
      left: 0,
      textStyle: { color: tokens.ink },
      data: [t('apiRoutes.framework'), t('apiRoutes.pathPrefix'), t('apiRoutes.methods')],
    },
    series: [
      {
        id: `routes-graph-${seed}`,
        type: 'graph',
        layout: variant === 'circular' ? 'circular' : 'force',
        circular: variant === 'circular' ? { rotateLabel: false } : undefined,
        data: flow.nodes.map(node => decorateFlowNode(node, tokens)),
        links: flow.links,
        categories: [
          { name: t('apiRoutes.framework') },
          { name: t('apiRoutes.pathPrefix') },
          { name: t('apiRoutes.methods') },
        ],
        roam: true,
        draggable: variant !== 'circular',
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [0, 8],
        force: variant === 'force' ? {
          repulsion: 260,
          gravity: 0.08,
          edgeLength: [80, 180],
          friction: 0.55,
        } : undefined,
        emphasis: {
          itemStyle: { borderColor: tokens.markRing, borderWidth: 2 },
          lineStyle: { width: 1.2, opacity: 0.32 },
        },
        lineStyle: {
          color: 'source',
          opacity: 0.32,
          width: 1.2,
          curveness: variant === 'circular' ? 0.18 : 0.08,
        },
        labelLayout: { hideOverlap: true },
      },
    ],
  };
}

export default function ApiRoutesGraph({
  ctx,
  height,
  onEvents,
}: {
  ctx: RouteChartContext;
  height: number;
  onEvents: ChartEvents;
}) {
  const option = useCallback((tokens: ChartTokens) => routeChartOption(tokens, ctx), [ctx]);

  return (
    <Panel className="overflow-hidden">
      <Chart
        option={option}
        ariaLabel={ctx.t('apiRoutes.title')}
        height={height}
        onEvents={onEvents}
      />
    </Panel>
  );
}
