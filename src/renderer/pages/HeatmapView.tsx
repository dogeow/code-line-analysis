import React, { useEffect, useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import type { FolderRow, HeatmapBucket } from '../../shared/api';
import EChartsPanel from '../components/EChartsPanel';
import { useI18n } from '../i18n';
import { escapeHtml } from '../utils/escapeHtml';

interface Props {
  folder: FolderRow | null;
  scanRevision: number;
}

type Granularity = 'day' | 'month' | 'year';
type RangeState = Record<Granularity, number>;

const GRANULARITIES: Granularity[] = ['day', 'month', 'year'];

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

const CHART_TEXT = '#e6edf3';
const CHART_MUTED = '#8b949e';
const CHART_BORDER = '#2a313c';
const CHART_TOOLTIP_BACKGROUND = '#161b22';

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

export default function HeatmapView({ folder, scanRevision }: Props) {
  const [ranges, setRanges] = useState<RangeState>(DEFAULT_RANGES);
  const [rawData, setRawData] = useState<HeatmapBucket[]>([]);
  const { locale, t } = useI18n();

  const queryDays = Math.max(
    ...GRANULARITIES.map(granularity => rangeQueryDays(granularity, ranges[granularity])),
  );

  useEffect(() => {
    if (!folder) return;
    window.api.stats.heatmap(folder.id, queryDays).then(setRawData);
  }, [folder?.id, queryDays, scanRevision]);

  const chartData = useMemo(
    () => Object.fromEntries(
      GRANULARITIES.map(granularity => [
        granularity,
        aggregateBuckets(rawData, granularity, ranges[granularity]),
      ]),
    ) as Record<Granularity, HeatmapBucket[]>,
    [ranges, rawData],
  );

  function chartOption(granularity: Granularity): EChartsOption {
    const data = chartData[granularity];

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: CHART_TOOLTIP_BACKGROUND,
        borderColor: CHART_BORDER,
        textStyle: { color: CHART_TEXT },
        formatter: params => {
          const point = Array.isArray(params) ? params[0] : params;
          const lines = point && typeof point.data === 'object' && point.data && 'lines' in point.data
            ? Number(point.data.lines)
            : 0;
          return [
            escapeHtml(String(point?.axisValueLabel ?? '')),
            `${t('heatmap.filesChanged')}: ${Number(point?.value ?? 0).toLocaleString(locale)}`,
            `${t('heatmap.totalLinesSinceDate')}: ${lines.toLocaleString(locale)}`,
          ].join('<br/>');
        },
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
        axisLine: { lineStyle: { color: CHART_BORDER } },
        axisTick: { show: false },
        axisLabel: {
          color: CHART_MUTED,
          interval: data.length > 40 ? Math.ceil(data.length / 12) - 1 : 0,
          rotate: data.length > 10 ? 38 : 0,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: CHART_MUTED },
        splitLine: { lineStyle: { color: 'rgba(139, 148, 158, 0.18)' } },
      },
      series: [
        {
          name: t('heatmap.filesChanged'),
          type: 'bar',
          barMaxWidth: 32,
          itemStyle: { color: '#58a6ff', borderRadius: [4, 4, 0, 0] },
          data: data.map(bucket => ({ value: bucket.files, lines: bucket.lines })),
        },
      ],
    };
  }

  function rangeLabel(granularity: Granularity, count: number): string {
    return t(
      granularity === 'day'
        ? 'heatmap.days'
        : granularity === 'month'
          ? 'heatmap.months'
          : 'heatmap.years',
      { count },
    );
  }

  if (!folder) return <div className="empty">{t('common.selectFolder')}</div>;

  return (
    <div className="heatmap-page">
      <div className="heatmap-expanded-grid">
        {GRANULARITIES.map(granularity => (
          <section
            key={granularity}
            className={granularity === 'day' ? 'chart-box heatmap-section heatmap-section-wide' : 'chart-box heatmap-section'}
          >
            <div className="heatmap-section-header">
              <strong>{t(`heatmap.${granularity}`)}</strong>
              <label className="page-select-field">
                <span>{t('heatmap.window')}</span>
                <select
                  value={ranges[granularity]}
                  onChange={event => {
                    const nextRange = Number(event.target.value);
                    setRanges(current => ({ ...current, [granularity]: nextRange }));
                  }}
                >
                  {RANGE_OPTIONS[granularity].map(option => (
                    <option key={option} value={option}>{rangeLabel(granularity, option)}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="heatmap-chart-box">
              <EChartsPanel option={chartOption(granularity)} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
