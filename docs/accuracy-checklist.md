# Accuracy checklist

Every calculator's **typical** output must be checked against published cost guides before
launch and after every price update. Record what you compared, the date, and the result.

How to check: run the calculator with the national average (no ZIP), mid-range quality and
the default size, then compare against at least three published guides. Our typical value
should sit inside their typical range. If it doesn't, adjust `data/materials.json` or the
recipe hours in `data/projects/<slug>.json`, and update the test in `tests/estimate.test.ts`.

Current calculator output (national sample rates, 2026-10-26):

| Calculator | Inputs | Low – High | Typical |
|---|---|---|---|
| Bathroom remodel | 50 sq ft, budget | $6,100 – $8,900 | $7,300 |
| Bathroom remodel | 50 sq ft, mid-range | $9,400 – $13,600 | $11,200 |
| Bathroom remodel | 50 sq ft, premium | $17,300 – $25,000 | $20,600 |

## Data (applies to every calculator)

- [ ] Replace sample `data/labor_rates.csv` with the real BLS OEWS export (`npm run import:bls`).
- [ ] Replace sample `data/zip_to_metro.csv` with the HUD USPS ZIP–CBSA crosswalk.
- [ ] Review `contractor_markup` (2.0×) in `data/assumptions.json` against published contractor overhead and profit benchmarks.
- [ ] Review the low/high spreads (materials −15% / +20%, wages p25 / p75).
- [ ] Spot-check 3 metros (one high-cost, one average, one low-cost) against local cost guides.

## Bathroom remodel

- [ ] Compare typical mid-range against Angi / HomeAdvisor bathroom remodel cost guide.
- [ ] Compare against Remodeling magazine Cost vs. Value report (midrange bathroom remodel, national); note its scope is larger than our default.
- [ ] Compare against one more guide (e.g. Fixr, Forbes Home, NerdWallet, This Old House).
- [ ] Check budget and premium typical values against the same guides' low and high ends.
- [ ] Check material unit prices in `materials.json` against current Home Depot / Lowe's listings.
- [ ] Check labor hours in `data/projects/bathroom-remodel.json` with a working contractor if possible.
- [ ] Check permit fee assumption ($200 + 1%) against 2–3 city fee schedules.
- [ ] Fact-check the cost guide and FAQ (`src/content/guides/bathroom-remodel.md`), then delete its `review_status` line.
- [ ] Add resale data (`resale.recoup_pct` and `resale.source`), e.g. from Cost vs. Value.

## Not yet built

- [ ] Kitchen remodel
- [ ] Roof replacement
- [ ] Flooring installation
- [ ] Interior painting
- [ ] Exterior painting
- [ ] Fence installation
- [ ] Deck
- [ ] Driveway
- [ ] Siding

## Site pages needing review

- [ ] /about/, /methodology/ (draft copy)
- [ ] /privacy/, /terms/ (have a lawyer review before launch)
- [ ] Set up the contact mailbox in `src/config/site.ts`
