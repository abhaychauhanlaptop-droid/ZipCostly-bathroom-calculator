export const site = {
  name: 'ZipCostly',
  url: 'https://zipcostly.com',
  tagline: 'What will it cost in your ZIP code?',
  description:
    'Free cost calculators for home projects. Get an instant, itemized low-to-high price range for your ZIP code. No signup, no phone number.',
  // TODO: set up this mailbox (Cloudflare Email Routing is free) before launch.
  contactEmail: 'hello@zipcostly.com',
};

/**
 * Ads. Everything ad-related is controlled here.
 * - enabled: false → no ad code and no empty boxes are rendered.
 * - enabled: true  → each <AdSlot> renders a fixed-height box; with an AdSense client ID
 *   and slot IDs filled in, it loads the AdSense unit inside that box.
 * - showPlaceholders: draws dashed "Ad" boxes in dev so you can see where ads will go.
 */
export const ads = {
  enabled: false,
  showPlaceholders: import.meta.env.DEV,
  adsenseClient: '', // e.g. 'ca-pub-1234567890123456'
  slots: {
    afterResult: { adsenseSlot: '', minHeight: 280 },
    midGuide: { adsenseSlot: '', minHeight: 280 },
    end: { adsenseSlot: '', minHeight: 280 },
  },
} as const;

export type AdSlotName = keyof typeof ads.slots;
