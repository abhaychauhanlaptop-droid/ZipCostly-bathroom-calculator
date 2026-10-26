import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const guides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guides' }),
  schema: z.object({
    /** Delete this line once a person has fact-checked the guide; it removes the on-page banner. */
    review_status: z.string().optional(),
    seo_title: z.string().max(70),
    meta_description: z.string().max(160),
    h1: z.string(),
    intro: z.string(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).min(1),
  }),
});

export const collections = { guides };
