// HTML for the parts of the calculator that change with the inputs. Used both at build time
// (so the page ships with a real estimate) and in the browser (to re-render), so the two never drift.
import { estimate, shareOf } from './estimate';
import { formatPct, formatRange, formatUSD } from './format';
import { CATEGORY_LABELS, QUALITIES, QUALITY_LABELS, type AreaRates, type Category, type Estimate, type EstimateInput, type ProjectBundle } from './types';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function breakdownHtml(est: Estimate): string {
  const groups = (Object.keys(CATEGORY_LABELS) as Category[])
    .map((cat) => {
      const lines = est.lines.filter((l) => l.category === cat);
      if (!lines.length) return '';
      const sub = est.byCategory[cat];
      const head = `<tr class="bg-teal-50"><th scope="rowgroup" class="px-3 py-2 text-left font-bold">${CATEGORY_LABELS[cat]}</th><td class="px-3 py-2 text-right font-bold tabular-nums">${formatUSD(sub.typical)}</td><td class="px-3 py-2 text-right font-bold tabular-nums">${formatPct(shareOf(sub.typical, est))}</td></tr>`;
      const rows = lines
        .map(
          (l) =>
            `<tr class="border-t border-line"><th scope="row" class="px-3 py-2 text-left font-normal">${esc(l.label)}${l.detail ? `<span class="block text-xs text-ink-soft">${esc(l.detail)}</span>` : ''}</th><td class="px-3 py-2 text-right tabular-nums">${formatUSD(l.cost.typical)}</td><td class="px-3 py-2 text-right text-ink-soft tabular-nums">${formatPct(shareOf(l.cost.typical, est))}</td></tr>`,
        )
        .join('');
      return `<tbody>${head}${rows}</tbody>`;
    })
    .join('');
  return `<table class="w-full text-sm"><caption class="sr-only">Cost breakdown, typical estimate</caption><thead><tr class="text-xs tracking-wide text-ink-soft uppercase"><th scope="col" class="px-3 py-2 text-left">Item</th><th scope="col" class="px-3 py-2 text-right">Typical</th><th scope="col" class="px-3 py-2 text-right">Share</th></tr></thead>${groups}<tfoot><tr class="border-t-2 border-ink"><th scope="row" class="px-3 py-2 text-left font-bold">Total (typical)</th><td class="px-3 py-2 text-right font-bold tabular-nums">${formatUSD(est.total.typical)}</td><td class="px-3 py-2 text-right font-bold">100%</td></tr></tfoot></table>`;
}

export interface CompareContext {
  local: AreaRates;
  localLabel: string;
  stateArea: AreaRates | null;
  stateName: string | null;
  national: AreaRates;
}

export function compareHtml(bundle: ProjectBundle, input: EstimateInput, ctx: CompareContext): string {
  const row = (label: string, value: string, current = false) =>
    `<tr class="border-t border-line${current ? ' bg-orange-50 font-bold' : ''}"><th scope="row" class="px-3 py-2.5 text-left font-[inherit]">${label}</th><td class="px-3 py-2.5 text-right tabular-nums">${value}</td></tr>`;
  const at = (area: AreaRates, quality = input.quality) => estimate(bundle, area.wages, { ...input, quality }).total;

  const quality = QUALITIES.map((q) =>
    row(`${QUALITY_LABELS[q]}${q === input.quality ? ' <span class="text-xs font-semibold text-ink-soft">(your pick)</span>' : ''}`, formatRange(at(ctx.local, q)), q === input.quality),
  ).join('');
  const qLabel = QUALITY_LABELS[input.quality].toLowerCase();
  const stateRow = ctx.stateArea
    ? row(`${esc(ctx.stateArea.name)} average`, formatRange(at(ctx.stateArea)))
    : row(`${ctx.stateName ? esc(ctx.stateName) + ' average' : 'State average'}`, '<span class="text-ink-soft">Enter a ZIP with state data</span>');
  const natRow = row('National average', formatRange(at(ctx.national)));

  const cap = (text: string, first: boolean) =>
    `<caption class="px-3 ${first ? 'pt-3' : 'pt-5'} pb-2 text-left text-xs font-bold tracking-wide text-ink-soft uppercase">${text}</caption>`;
  return `<table class="w-full text-sm">${cap(`In ${esc(ctx.localLabel)}`, true)}<tbody>${quality}</tbody></table><table class="w-full text-sm">${cap(`Same project, ${qLabel}, elsewhere`, false)}<tbody>${stateRow}${natRow}</tbody></table>`;
}

/** "Seattle-Tacoma-Bellevue, WA" → "the Seattle-Tacoma-Bellevue, WA area". */
export function placeLabel(area: AreaRates): string {
  if (area.type === 'metro') return `the ${area.name.replace(/-[A-Z]{2}(-[A-Z]{2})*$/, '')} area`;
  if (area.type === 'state') return area.name;
  return 'the U.S. (national average)';
}
