# ZipCostly: folder structure and data schema (proposal)

Status: built. This is the structure the code follows.

## Folder structure

```
zipcostly/
├── data/                         ← all cost data lives here (edit these, not code)
│   ├── labor_rates.csv           metro/state/national → hourly wage by trade (BLS OEWS shape)
│   ├── zip_to_metro.csv          ZIP → metro (CBSA) + state (small sample for now)
│   ├── zip3_to_state.csv         ZIP prefix → state (fallback when a ZIP isn't in zip_to_metro)
│   ├── materials.json            per project, per item: budget / mid / premium unit prices
│   ├── assumptions.json          contractor markup, range spread, other global knobs
│   ├── calculators.json          list of all calculators (name, blurb, live or coming soon)
│   └── projects/
│       └── bathroom-remodel.json "recipe": inputs, options, quantities, labor hours, fees
├── docs/
│   ├── architecture.md           this file
│   └── accuracy-checklist.md     TODO list: check each calculator against published guides
├── public/                       logo.svg, icon.svg, favicon.*, robots.txt
├── scripts/
│   ├── import-bls-oews.mjs       turns a BLS OEWS CSV export into data/labor_rates.csv
│   └── build-brand.mjs           regenerates logo/icon/favicon PNGs from the SVG source
├── src/
│   ├── config/site.ts            site name, URL, ads on/off flag, AdSense IDs
│   ├── lib/                      pure TypeScript, no DOM (all unit-tested)
│   │   ├── types.ts              data types
│   │   ├── data.ts               loads + validates /data at build time
│   │   ├── zip.ts                ZIP validation and ZIP → metro/state/national lookup
│   │   ├── estimate.ts           the calculator engine (one engine for every project)
│   │   └── format.ts             currency/range formatting
│   ├── components/
│   │   ├── Calculator.astro      THE shared calculator template (inputs, result, breakdown,
│   │   │                         compare, resale, feedback). Client script = calculator only.
│   │   ├── AdSlot.astro          empty ad placeholder with fixed min-height, one config flag
│   │   ├── Logo.astro, Header.astro, Footer.astro, RelatedCalculators.astro, ...
│   ├── content/guides/
│   │   └── bathroom-remodel.md   cost guide + FAQ (frontmatter), marked NEEDS HUMAN REVIEW
│   ├── layouts/Base.astro        <head>, SEO, canonical, OG, JSON-LD
│   └── pages/
│       ├── index.astro, about, methodology, privacy, terms, contact
│       ├── [slug]-cost.astro     one route renders every live calculator with Calculator.astro
│       ├── zip/[prefix].json.ts  static per-ZIP-prefix data shards (see "How data reaches the browser")
│       └── og/[slug].png.ts      Open Graph images generated at build time
└── tests/                        Vitest: engine, ZIP lookup, data integrity
```

Adding a calculator = one recipe JSON in `data/projects/`, its prices in `materials.json`,
one guide `.md`, `"live": true` in data/calculators.json. No new components.

## Data schema

Every data file carries `last_updated` and `source`. In CSVs these are columns on every
row (so a partial refresh can mix sources honestly); in JSON they are top-level fields.

### data/labor_rates.csv (long format, mirrors BLS OEWS)

| column | example | notes |
|---|---|---|
| area_code | `35620` / `NY` / `US` | CBSA code for metros, USPS code for states, `US` for national |
| area_type | `metro` / `state` / `national` | |
| area_name | `New York-Newark-Jersey City, NY-NJ-PA` | |
| state | `NY` | primary state (blank for national) |
| trade | `plumber` | carpenter, plumber, electrician, painter, roofer, general_labor, tile_setter |
| soc_code | `47-2152` | BLS occupation code, used by the import script |
| hourly_p25 | `24.10` | OEWS H_PCT25 → feeds the LOW end |
| hourly_median | `29.59` | OEWS H_MEDIAN → feeds TYPICAL |
| hourly_p75 | `37.80` | OEWS H_PCT75 → feeds the HIGH end |
| last_updated | `2026-10-26` | |
| source | `BLS OEWS May 2024` | |

BLS wages are what workers earn, not what contractors charge. `assumptions.json` holds a
`contractor_markup` (payroll tax, insurance, overhead, profit) applied to wages.

### data/zip_to_metro.csv

`zip,metro_code,state,last_updated,source` (ZIPs stored as text so `02108` keeps its zero).
Later this comes from the HUD USPS ZIP–CBSA crosswalk (free).

### data/zip3_to_state.csv

`zip3_start,zip3_end,state,last_updated,source`. Lookup order for any ZIP:
metro rates → state rates → national rates. The page says which level it used.

### data/materials.json

```json
{
  "last_updated": "2026-10-26",
  "source": "…",
  "projects": {
    "bathroom-remodel": {
      "floor_tile": { "label": "Floor tile", "unit": "sq ft",
                      "price": { "budget": 2.5, "mid": 6, "premium": 15 },
                      "source": "optional per-item override" }
    }
  }
}
```

### data/projects/<slug>.json (the recipe)

```json
{
  "slug": "bathroom-remodel",
  "size": { "label": "Bathroom size", "unit": "sq ft", "default": 50, "min": 15, "max": 400 },
  "options": [ { "id": "shower_type", "type": "select", "default": "tub_shower", "choices": [...] } ],
  "materials": [ { "item": "floor_tile", "qty": { "base": 0, "per_size": 1.1 },
                   "when": { "shower_type": "walk_in" } } ],
  "labor": [ { "id": "tile", "label": "Tile installation", "trade": "tile_setter",
               "hours": { "base": 4, "per_size": 0.3 } } ],
  "fees": [ { "id": "permit", "category": "permits", "fixed": 250, "pct_of_subtotal": 0.01 } ],
  "quality_labor_factor": { "budget": 0.9, "mid": 1.0, "premium": 1.25 },
  "resale": { "recoup_pct": null, "source": null },
  "related": ["kitchen-remodel", "flooring-installation", "interior-painting"]
}
```

## How an estimate is calculated

For the chosen quality level:

- materials = Σ qty × unit price (national prices for now)
- labor = Σ hours × quality factor × local hourly wage × contractor markup
- permits & fees = fixed + % of subtotal
- LOW uses wage p25 and materials × 0.85; TYPICAL uses median; HIGH uses p75 and materials × 1.2
  (spreads live in `assumptions.json`). Rounded to the nearest $100, always shown as a range.

## How data reaches the browser

No backend. At build time Astro writes small static JSON files, one per ZIP prefix
(`/zip/100.json`), holding just the ZIPs and wage rates for that prefix. Entering a ZIP fetches
one ~2 KB file. The page itself ships with a pre-rendered national estimate, so the result is
visible instantly and works without JavaScript. This scales to all ~41,000 ZIPs without
making pages heavier.
