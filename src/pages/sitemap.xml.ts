import type { APIRoute } from 'astro';
import { calculatorPath, liveSlugs } from '../lib/data';
import { site } from '../config/site';

export const staticPages = ['/', '/about/', '/methodology/', '/privacy/', '/terms/', '/contact/'];

export const GET: APIRoute = () => {
  const paths = [...staticPages, ...liveSlugs().map(calculatorPath)];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, site.url).href}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
