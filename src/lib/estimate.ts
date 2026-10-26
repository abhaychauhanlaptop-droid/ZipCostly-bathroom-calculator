import {
  CATEGORY_LABELS,
  LEVELS,
  QUALITIES,
  type Amount,
  type Category,
  type Estimate,
  type EstimateInput,
  type LineItem,
  type ProjectBundle,
  type Range,
  type Level,
  type Wage,
  type WageSet,
  type When,
} from './types';

export class EstimateError extends Error {}

const WAGE_KEY: Record<string, keyof Wage> = {
  hourly_p25: 'p25',
  hourly_median: 'median',
  hourly_p75: 'p75',
};

const amount = (a: Amount, size: number) => (a.base ?? 0) + (a.per_size ?? 0) * size;

const applies = (when: When | undefined, options: Record<string, string>) =>
  !when || Object.entries(when).every(([k, v]) => options[k] === v);

const zeroRange = (): Range => ({ low: 0, typical: 0, high: 0 });

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

const fmtQty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));

/** Returns a user-facing error message, or null when the size is usable. */
export function validateSize(bundle: ProjectBundle, size: unknown): string | null {
  const { min, max, unit } = bundle.recipe.size;
  if (typeof size !== 'number' || !Number.isFinite(size)) return `Enter a size in ${unit}.`;
  if (size <= 0) return `Size must be greater than 0 ${unit}.`;
  if (size < min) return `Enter at least ${min} ${unit}.`;
  if (size > max) return `For projects over ${max} ${unit}, get a custom quote.`;
  return null;
}

/** Fills in defaults and rejects option values the recipe doesn't know. */
export function resolveOptions(bundle: ProjectBundle, given: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const opt of bundle.recipe.options) {
    const v = given[opt.id] ?? opt.default;
    if (!opt.choices.some((c) => c.value === v)) throw new EstimateError(`Unknown choice "${v}" for ${opt.label}.`);
    out[opt.id] = v;
  }
  return out;
}

/**
 * The one calculator engine. Every project is a recipe; this turns a recipe, local wages
 * and the user's inputs into an itemised low / typical / high estimate.
 */
export function estimate(bundle: ProjectBundle, wages: WageSet, input: EstimateInput): Estimate {
  const { recipe, prices, assumptions } = bundle;
  const sizeError = validateSize(bundle, input.size);
  if (sizeError) throw new EstimateError(sizeError);
  if (!QUALITIES.includes(input.quality)) throw new EstimateError(`Unknown quality "${String(input.quality)}".`);
  const options = resolveOptions(bundle, input.options);
  const { size, quality } = input;

  const lines: LineItem[] = [];
  const byLevel = (fn: (level: Level) => number): Range =>
    Object.fromEntries(LEVELS.map((l) => [l, fn(l)])) as Range;

  for (const m of recipe.materials) {
    if (!applies(m.when, options)) continue;
    const price = prices[m.item];
    if (!price) throw new EstimateError(`No price for material "${m.item}".`);
    const qty = amount(m.qty, size);
    if (qty <= 0) continue;
    const unitPrice = price.price[quality];
    lines.push({
      id: m.item,
      label: price.label,
      category: 'materials',
      detail: price.unit === 'each' ? `${fmtQty(qty)} × $${unitPrice}` : `${fmtQty(qty)} ${price.unit} × $${unitPrice}`,
      cost: byLevel((l) => qty * unitPrice * assumptions.range[l].materials_factor),
    });
  }

  const qualityFactor = recipe.quality_labor_factor[quality];
  for (const job of recipe.labor) {
    if (!applies(job.when, options)) continue;
    const wage = wages[job.trade];
    if (!wage) throw new EstimateError(`No wage data for trade "${job.trade}".`);
    const hours = amount(job.hours, size) * qualityFactor;
    if (hours <= 0) continue;
    lines.push({
      id: job.id,
      label: job.label,
      category: 'labor',
      detail: `${fmtQty(hours)} hrs`,
      cost: byLevel((l) => hours * wage[WAGE_KEY[assumptions.range[l].wage]] * assumptions.contractor_markup),
    });
  }

  const subtotal = byLevel((l) => lines.reduce((s, line) => s + line.cost[l], 0));
  for (const fee of recipe.fees) {
    if (!applies(fee.when, options)) continue;
    const flat = (fee.fixed ?? 0) + (fee.per_size ?? 0) * size;
    lines.push({
      id: fee.id,
      label: fee.label,
      category: 'permits',
      detail: fee.pct_of_subtotal ? `$${flat} + ${fee.pct_of_subtotal * 100}% of job` : '',
      cost: byLevel((l) => flat + (fee.pct_of_subtotal ?? 0) * subtotal[l]),
    });
  }

  // Line items to the nearest $10, totals to the configured step.
  for (const line of lines) for (const l of LEVELS) line.cost[l] = roundTo(line.cost[l], 10);

  const byCategory = Object.fromEntries(
    (Object.keys(CATEGORY_LABELS) as Category[]).map((c) => [c, zeroRange()]),
  ) as Record<Category, Range>;
  for (const line of lines) for (const l of LEVELS) byCategory[line.category][l] += line.cost[l];

  const total = byLevel((l) => roundTo(lines.reduce((s, line) => s + line.cost[l], 0), assumptions.round_to));
  return { total, byCategory, lines };
}

/** Share of the typical total, 0–1. */
export const shareOf = (part: number, est: Estimate) => (est.total.typical > 0 ? part / est.total.typical : 0);
