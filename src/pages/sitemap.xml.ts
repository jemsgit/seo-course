import type { APIRoute } from 'astro';
import { lessonPath, modulePath, publishedLessons } from '../course';

export const GET: APIRoute = async ({ site }) => {
  const paths = new Set<string>();
  if (site) {
    paths.add('/');
    for (const { data } of await publishedLessons()) {
      paths.add(modulePath(data.module));
      paths.add(lessonPath(data.slug));
    }
  }
  return new Response([
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...Array.from(paths, (path) => `  <url><loc>${new URL(path, site)}</loc></url>`),
    '</urlset>',
  ].join('\n'), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
