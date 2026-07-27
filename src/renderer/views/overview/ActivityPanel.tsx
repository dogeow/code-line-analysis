import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import type { FolderRow, HeatmapBucket } from '../../../shared/api';
import {
  Chart,
  EmptyState,
  Field,
  Panel,
  Select,
  Tabs,
  type ChartTokens,
  type TabItem,
} from '../../components/ui';
import ScanNowButton from '../../components/ScanNowButton';
import { useI18n } from '../../i18n';
import { axisValueLabelOf, firstFormatterParam } from '../../utils/echartsParams';
import { escapeHtml } from '../../utils/escapeHtml';
import { useAppStore, useRevision } from '../../store/app-store';

type Granularity = 'day' | 'month' | 'year';
type RangeState = Record<Granularity, number>;

const GRANULARITIES: Granularity[] = ['day', 'month', 'year'];

/** Unchanged from `HeatmapView.tsx:21-31` — every window option survives. */
const RANGE_OPTIONS: Record<Granularity, number[]> = {
  day: [7, 30, 90, 365],
  month: [6, 12, 24, 36],
  year: [3, 5, 10],
};

const DEFAULT_RANGES: RangeState = {
  day: 30,
  month: 12,
  year: 10,
};

function rangeQueryDays(granularity: Granularity, range: number): number {
  if (granularity === 'day') return range;
  if (granularity === 'month') return Math.ceil(range * 365.25 / 12);
  return range * 366;
}

function cutoffKey(granularity: Granularity, range: number): string {
  const now = new Date();

  if (granularity === 'day') {
    const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    cutoff.setUTCDate(cutoff.getUTCDate() - range + 1);
    return cutoff.toISOString().slice(0, 10);
  }

  if (granularity === 'month') {
    const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - range + 1, 1));
    return cutoff.toISOString().slice(0, 7);
  }

  return String(now.getUTCFullYear() - range + 1);
}

function aggregateBuckets(rawData: HeatmapBucket[], granularity: Granularity, range: number): HeatmapBucket[] {
  const buckets = new Map<string, HeatmapBucket>();
  const cutoff = cutoffKey(granularity, range);

  for (const bucket of rawData) {
    const date = granularity === 'day'
      ? bucket.date
      : granularity === 'month'
        ? bucket.date.slice(0, 7)
        : bucket.date.slice(0, 4);

    if (date < cutoff) continue;

    const current = buckets.get(date);
    if (current) {
      current.files += bucket.files;
      current.lines += bucket.lines;
    } else {
      buckets.set(date, { date, files: bucket.files, lines: bucket.lines });
    }
  }

  return Array.from(buckets.values()).sort((left, right) => left.date.localeCompare(right.date));
}

interface Props {
  folder: FolderRow;
}

/**
 * Was the whole `/heatmap` route. Its three stacked sections become three
 * `Tabs` inside one collapsible `Panel` on Overview (blueprint §2.2); each
 * granularity keeps its own window `Select`, and the panel's open/closed state
 * is persisted per folder.
 */
export default function ActivityPanel({ folder }: Props) {
  const scanRevision = useRevision();
  const { locale, t } = useI18n();
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [ranges, setRanges] = useState<RangeState>(DEFAULT_RANGES);
  const [rawData, setRawData] = useState<HeatmapBucket[]>([]);
  const [loading, setLoading] = useState(false);

  const open = useAppStore(state => state.activityOpenByFolder[folder.id] ?? false);
  const setActivityOpen = useAppStore(state => state.setActivityOpen);

  // One query covers all three granularities, so switching tabs never refetches.
  const queryDays = Math.max(
    ...GRANULARITIES.map(item => rangeQueryDays(item, ranges[item])),
  );

  useEffect(() => {
    if (!open) return undefined;
    let ignore = false;
    setLoading(true);
    void window.api.stats.heatmap(folder.id, queryDays)
      .then(buckets => {
        if (ignore) return;
        setRawData(buckets);
        setLoading(false);
      })
      .catch(() => {
        if (ignore) return;
        setRawData([]);
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [folder.id, open, queryDays, scanRevision]);

  const data = useMemo(
    () => aggregateBuckets(rawData, granularity, ranges[granularity]),
    [granularity, ranges, rawData],
  );

  const buildOption = useCallback((tokens: ChartTokens): EChartsOption => {
    const maxFiles = data.reduce((peak, bucket) => Math.max(peak, bucket.files), 0);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: tokens.tooltipBg,
        borderColor: tokens.tooltipBorder,
        textStyle: { color: tokens.ink },
        formatter: params => {
          const point = firstFormatterParam(params);
          const lines = point && typeof point.data === 'object' && point.data && 'lines' in point.data
            ? Number(point.data.lines)
            : 0;
          return [
            escapeHtml(axisValueLabelOf(point)),
            `${t('heatmap.filesChanged')}: ${Number(point?.value ?? 0).toLocaleString(locale)}`,
            `${t('heatmap.totalLinesSinceDate')}: ${lines.toLocaleString(locale)}`,
          ].join('<br/>');
        },
      },
      // Sequential ramp (DESIGN-SYSTEM §1.6). Hidden: the bar height already
      // carries the magnitude, so colour is reinforcement, never the signal.
      visualMap: {
        show: false,
        type: 'continuous',
        seriesIndex: 0,
        min: 0,
        max: Math.max(maxFiles, 1),
        inRange: { color: tokens.sequential },
      },
      grid: {
        top: 14,
        right: 14,
        bottom: data.length > 10 ? 62 : 38,
        left: 10,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: data.map(bucket => bucket.date),
        axisLine: { lineStyle: { color: tokens.axis } },
        axisTick: { show: false },
        axisLabel: {
          color: tokens.inkMuted,
          interval: data.length > 40 ? Math.ceil(data.length / 12) - 1 : 0,
          rotate: data.length > 10 ? 38 : 0,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: tokens.inkMuted },
        splitLine: { lineStyle: { color: tokens.grid } },
      },
      series: [
        {
          name: t('heatmap.filesChanged'),
          type: 'bar',
          barMaxWidth: 32,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          data: data.map(bucket => ({ value: bucket.files, lines: bucket.lines })),
        },
      ],
    };
  }, [data, locale, t]);

  const tabs = useMemo<TabItem[]>(
    () => GRANULARITIES.map(item => ({ value: item, label: t(`heatmap.${item}`) })),
    [t],
  );

  function rangeLabel(item: Granularity, count: number): string {
    return t(
      item === 'day' ? 'heatmap.days' : item === 'month' ? 'heatmap.months' : 'heatmap.years',
      { count },
    );
  }

  return (
    <Panel
      collapsible
      open={open}
      onOpenChange={next => setActivityOpen(folder.id, next)}
      header={t('heatmap.title')}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs
            aria-label={t('heatmap.granularity')}
            size="sm"
            items={tabs}
            value={granularity}
            onValueChange={value => setGranularity(value as Granularity)}
          />
          <Field
            label={t('heatmap.window')}
            orientation="horizontal"
            className="grid-cols-[auto_1fr] gap-x-2"
          >
            <Select
              size="sm"
              wrapperClassName="w-36"
              value={String(ranges[granularity])}
              onChange={event => {
                const nextRange = Number(event.target.value);
                setRanges(current => ({ ...current, [granularity]: nextRange }));
              }}
              options={RANGE_OPTIONS[granularity].map(option => ({
                value: String(option),
                label: rangeLabel(granularity, option),
              }))}
            />
          </Field>
        </div>

        <p className="m-0 text-xs text-fg-muted">{t('heatmap.subtitle')}</p>

        {!loading && data.length === 0 ? (
          <EmptyState
            size="sm"
            title={t('common.noData')}
            description={t('overview.activityChart')}
            action={<ScanNowButton folderId={folder.id} disabled={!folder.isAvailable} />}
          />
        ) : (
          <Chart
            option={buildOption}
            loading={loading}
            height={300}
            ariaLabel={`${t('heatmap.title')} — ${t('overview.activityChart')}`}
          />
        )}
      </div>
    </Panel>
  );
}
