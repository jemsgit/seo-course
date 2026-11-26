import type { APIRoute } from 'astro';
import { courseCatalog } from '../courses/catalog';
import { coursePath, lessonPath, modulePath } from '../courses/registry';

export const GET: APIRoute = async ({ site }) => {
  const paths = ['/'];
  if (site) {
    for (const { course, modules, lessons } of await courseCatalog()) {
      paths.push(coursePath(course.slug));
      for (const module of modules) {
        if (course.modulePages && module.lessons.length) paths.push(modulePath(course.slug, module.slug));
      }
      for (const { data } of lessons) paths.push(lessonPath(course.slug, data.slug));
    }
  } else {
    paths.length = 0;
  }
  return new Response([
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...Array.from(paths, (path) => `  <url><loc>${new URL(path, site)}</loc></url>`),
    '</urlset>',
  ].join('\n'), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
