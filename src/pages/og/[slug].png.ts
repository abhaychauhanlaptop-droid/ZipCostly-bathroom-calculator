// Open Graph images (1200×630), generated at build time with satori + resvg.
import type { APIRoute, GetStaticPaths } from 'astro';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { calculators } from '../../lib/data';
import { site } from '../../config/site';

const require = createRequire(import.meta.url);
const font = (w: number) => readFileSync(require.resolve(`@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-${w}-normal.woff`));
const icon = readFileSync(new URL('../../../public/icon.svg', import.meta.url));

export const getStaticPaths: GetStaticPaths = () => [
  { params: { slug: 'default' }, props: { title: site.tagline, sub: 'Free home project cost calculators' } },
  ...calculators
    .filter((c) => c.live)
    .map((c) => ({ params: { slug: c.slug }, props: { title: `${c.name} Cost Calculator`, sub: 'Instant price range for your ZIP code' } })),
];

const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}) => ({
  type,
  props: { style, children, ...extra },
});

export const GET: APIRoute = async ({ props }) => {
  const { title, sub } = props as { title: string; sub: string };
  const tree = h('div', { width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#F6F4EF', fontFamily: 'Jakarta' }, [
    h('div', { display: 'flex', alignItems: 'center', gap: 20 }, [
      h('img', { width: 84, height: 84 }, undefined, { src: `data:image/svg+xml;base64,${icon.toString('base64')}`, width: 84, height: 84 }),
      h('div', { display: 'flex', fontSize: 52, fontWeight: 800 }, [h('span', { color: '#0E6E6E' }, 'zip'), h('span', { color: '#15201F' }, 'costly')]),
    ]),
    h('div', { display: 'flex', flexDirection: 'column' }, [
      h('div', { fontSize: 76, fontWeight: 800, color: '#15201F', lineHeight: 1.05, letterSpacing: -2 }, title),
      h('div', { marginTop: 24, fontSize: 36, fontWeight: 500, color: '#4A5654' }, sub),
    ]),
    h('div', { display: 'flex', height: 14, width: 220, background: '#F28C28', borderRadius: 7 }),
  ]);
  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Jakarta', data: font(800), weight: 800, style: 'normal' },
      { name: 'Jakarta', data: font(500), weight: 500, style: 'normal' },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
