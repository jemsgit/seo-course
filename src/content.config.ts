import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const collections = {
  lessons: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/lessons' }),
    schema: z.object({
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      title: z.string().min(1),
      description: z.string().min(1),
      module: z.string(),
      order: z.number().int().positive(),
      draft: z.boolean(),
      checked: z.iso.date(),
    }),
  }),
};
