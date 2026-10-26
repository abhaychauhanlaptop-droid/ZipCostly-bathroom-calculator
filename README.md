# ZipCostly

Free home-project cost calculators for US homeowners: **"What will it cost in your ZIP code?"**
Static site (Astro + TypeScript + Tailwind), no backend, deployed to Cloudflare Pages.

See [docs/architecture.md](docs/architecture.md) for the folder structure and data schema,
and [docs/accuracy-checklist.md](docs/accuracy-checklist.md) for what still needs checking.

## Run locally

Requires Node.js 22 (see `.nvmrc`).

```sh
npm install
npm run dev        # http://localhost:4321 (dashed "Ad" boxes show where ads will go)
npm test           # unit tests (Vitest)
npm run build      # type-check + build the static site into dist/
npm run preview    # serve dist/ locally
```

## How to update a price

All numbers live in `/data`. You never need to touch code to change a price.

| To change | Edit |
|---|---|
| A material price | `data/materials.json` → `projects.<slug>.<item>.price` (`budget` / `mid` / `premium`, per unit) |
| Labor hours or quantities | `data/projects/<slug>.json` (`hours` / `qty` = `base` + `per_size` × size) |
| Wages | `data/labor_rates.csv` (or re-import from BLS, below) |
| Contractor markup, low/high spread, rounding | `data/assumptions.json` |
| Which ZIPs map to which metro | `data/zip_to_metro.csv` |

Then bump the file's `last_updated` (in CSVs it's a column on each row you changed), update
`source` if it changed, run `npm test`, and deploy. The "Prices updated" date on each page is
the newest `last_updated` among the files that calculator uses.

### Load real BLS wage data

1. Download the OEWS "All data" file for the latest year from https://www.bls.gov/oes/tables.htm.
2. Open the `.xlsx` and save it as CSV.
3. `npm run import:bls -- path/to/all_data_M_2024.csv "BLS OEWS May 2024"`
4. `npm test && npm run build`

Missing or suppressed cells fall back to the state rate, then the national rate.

### Load the full ZIP list

Replace `data/zip_to_metro.csv` with the HUD USPS ZIP–CBSA crosswalk
(https://www.huduser.gov/portal/datasets/usps_crosswalk.html), keeping the columns
`zip,metro_code,state,last_updated,source`. Where a ZIP spans several metros, keep the one with
the largest residential ratio. ZIPs must stay 5-character text (`02108`, not `2108`).

## How to add a new calculator

1. **Recipe:** copy `data/projects/bathroom-remodel.json` to `data/projects/<slug>.json` and
   edit the size input, options, materials (with quantities), labor tasks (trade + hours) and fees.
   Use `when` to include a line only for certain option values.
2. **Prices:** add `projects.<slug>` to `data/materials.json` with every item the recipe uses.
3. **Guide:** add `src/content/guides/<slug>.md` (copy the bathroom one for the frontmatter:
   SEO title, meta description, H1, intro, FAQ). Put `<!-- ad -->` where the mid-guide ad goes.
4. **Switch it on:** set `"live": true` for it in `data/calculators.json`.
5. **Test:** add a `describe` block to `tests/estimate.test.ts` checking the typical output
   against published guides, then `npm test && npm run build`.

The page appears at `/<slug>-cost/` with the shared calculator, OG image, sitemap entry and
related links. No new components needed.

## Ads

Everything is in `src/config/site.ts` → `ads`:

1. Get approved for AdSense, then set `adsenseClient` (`ca-pub-…`) and each slot's `adsenseSlot` ID.
2. Set `enabled: true`.
3. Add `public/ads.txt` with the line AdSense gives you.

Each calculator page has three slots: after the result, mid-guide and end of page. They keep a
fixed minimum height so ads don't shift the layout, and are never above or over the result.

## Deploy (Cloudflare Pages, free tier)

1. Push this repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick the repo.
3. Build settings: framework preset **Astro**, build command `npm run build`, output directory `dist`.
   Add environment variable `NODE_VERSION` = `22`.
4. Deploy, then add the custom domain `zipcostly.com` under the project's Custom domains tab.

`public/_headers` sets long-lived caching for hashed assets. Every push to the main branch
redeploys; pull requests get preview URLs.

## Project layout

```
data/          cost data (CSV/JSON), the only place numbers live
docs/          architecture and accuracy checklist
public/        logo, icons, robots.txt, Cloudflare _headers
scripts/       BLS import, brand asset generator (npm run brand)
src/lib/       calculator engine, ZIP lookup, data loading (pure TS, unit-tested)
src/components Calculator.astro (the shared template), AdSlot, header/footer…
src/content/   cost guides in Markdown
src/pages/     routes; [slug]-cost.astro renders every calculator
tests/         Vitest
```
