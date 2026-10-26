export const QUALITIES = ['budget', 'mid', 'premium'] as const;
export type Quality = (typeof QUALITIES)[number];
export const QUALITY_LABELS: Record<Quality, string> = {
  budget: 'Budget',
  mid: 'Mid-range',
  premium: 'Premium',
};

export const TRADES = [
  'carpenter',
  'plumber',
  'electrician',
  'painter',
  'roofer',
  'general_labor',
  'tile_setter',
] as const;
export type Trade = (typeof TRADES)[number];

export const LEVELS = ['low', 'typical', 'high'] as const;
export type Level = (typeof LEVELS)[number];

export type Category = 'materials' | 'labor' | 'permits';
export const CATEGORY_LABELS: Record<Category, string> = {
  materials: 'Materials',
  labor: 'Labor',
  permits: 'Permits & fees',
};

export interface Wage {
  p25: number;
  median: number;
  p75: number;
}
export type WageSet = Record<Trade, Wage>;

export type AreaType = 'national' | 'state' | 'metro';
export interface AreaRates {
  code: string;
  type: AreaType;
  name: string;
  state: string;
  wages: WageSet;
}

/** A quantity or hours rule: base + per_size × size. */
export interface Amount {
  base?: number;
  per_size?: number;
}

/** Line applies only when every listed option has the given value. */
export type When = Record<string, string>;

export interface OptionChoice {
  value: string;
  label: string;
}
export interface ProjectOption {
  id: string;
  label: string;
  default: string;
  choices: OptionChoice[];
}

export interface MaterialPrice {
  label: string;
  unit: string;
  price: Record<Quality, number>;
  source?: string;
}

export interface ProjectRecipe {
  last_updated: string;
  source: string;
  slug: string;
  name: string;
  noun: string;
  description: string;
  size: { label: string; unit: string; default: number; min: number; max: number; step: number; hint?: string };
  options: ProjectOption[];
  materials: { item: string; qty: Amount; when?: When }[];
  labor: { id: string; label: string; trade: Trade; hours: Amount; when?: When }[];
  fees: { id: string; label: string; fixed?: number; per_size?: number; pct_of_subtotal?: number; when?: When }[];
  quality_labor_factor: Record<Quality, number>;
  resale: { recoup_pct: number | null; source: string | null };
  related: string[];
}

export interface Assumptions {
  last_updated: string;
  source: string;
  contractor_markup: number;
  range: Record<Level, { materials_factor: number; wage: 'hourly_p25' | 'hourly_median' | 'hourly_p75' }>;
  round_to: number;
}

/** Everything the engine needs for one project, small enough to inline in the page. */
export interface ProjectBundle {
  recipe: ProjectRecipe;
  prices: Record<string, MaterialPrice>;
  assumptions: Assumptions;
}

export interface EstimateInput {
  size: number;
  quality: Quality;
  options?: Record<string, string>;
}

export type Range = Record<Level, number>;

export interface LineItem {
  id: string;
  label: string;
  category: Category;
  detail: string;
  cost: Range;
}

export interface Estimate {
  total: Range;
  byCategory: Record<Category, Range>;
  lines: LineItem[];
}

/** The per-ZIP-prefix file the browser fetches: /zip/<prefix>.json */
export interface ZipShard {
  prefix: string;
  state: string | null;
  zips: Record<string, string>;
  areas: Record<string, AreaRates>;
}
