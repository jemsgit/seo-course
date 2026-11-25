import { getCollection } from 'astro:content';

export const modules = [
  { slug: 'search-basics', title: 'Как сайт попадает в поиск' },
  { slug: 'content', title: 'Запросы, контент и продвижение' },
  { slug: 'technical', title: 'Техническое SEO' },
  { slug: 'measurement', title: 'Измерение результатов и сложные задачи' },
];

export const lessonPath = (slug: string) => `/lessons/${slug}/`;
export const modulePath = (slug: string) => `/modules/${slug}/`;

export async function publishedLessons() {
  const lessons = await getCollection('lessons', ({ data }) => !data.draft);
  const slugs = new Set<string>();
  const positions = new Set<string>();
  for (const { data } of lessons) {
    const position = `${data.module}/${data.order}`;
    if (!modules.some(({ slug }) => slug === data.module) || slugs.has(data.slug) || positions.has(position)) {
      throw new Error(`Unknown module or duplicate lesson: ${data.slug} (${position})`);
    }
    slugs.add(data.slug);
    positions.add(position);
  }
  return modules.flatMap(({ slug }) =>
    lessons.filter(({ data }) => data.module === slug).sort((a, b) => a.data.order - b.data.order),
  );
}
