import type {
  DefaultLabelFormatterCallbackParams,
  TooltipComponentFormatterCallbackParams,
} from 'echarts';

/**
 * Narrows the tooltip formatter params union to a single callback param:
 * axis-trigger tooltips receive an array (one entry per series), item-trigger
 * tooltips receive a single object.
 */
export function firstFormatterParam(
  params: TooltipComponentFormatterCallbackParams,
): DefaultLabelFormatterCallbackParams | undefined {
  return Array.isArray(params) ? params[0] : params;
}

/**
 * Reads the runtime-only `axisValueLabel` field that axis-trigger tooltips
 * attach to each param but the ECharts typings omit.
 */
export function axisValueLabelOf(param: DefaultLabelFormatterCallbackParams | undefined): string {
  if (!param || !('axisValueLabel' in param)) return '';
  return String((param as { axisValueLabel?: unknown }).axisValueLabel ?? '');
}
