import { getCollection, type CollectionEntry } from 'astro:content';
import { courses } from './registry';

export type LessonEntry = CollectionEntry<'lessons'>;

export async function courseCatalog() {
  const entries = await getCollection('lessons');
  const byCourse = new Map(courses.map((course) => [course.slug, {
    lessons: [] as LessonEntry[],
    slugs: new Set<string>(),
    positions: new Set<string>(),
  }]));

  for (const lesson of entries) {
    const [courseSlug] = lesson.id.split('/');
    const course = courses.find(({ slug }) => slug === courseSlug);
    const bucket = byCourse.get(courseSlug);
    const { data } = lesson;
    if (!course || !bucket) throw new Error(`Unknown course for lesson ${lesson.id}`);
    if (!course.modules.some(({ slug }) => slug === data.module)) {
      throw new Error(`Unknown module ${data.module} for lesson ${lesson.id}`);
    }

    const position = `${data.module}/${data.order}`;
    if (bucket.slugs.has(data.slug) || bucket.positions.has(position)) {
      throw new Error(`Duplicate lesson slug or position: ${lesson.id} (${position})`);
    }
    bucket.slugs.add(data.slug);
    bucket.positions.add(position);
    if (!data.draft) bucket.lessons.push(lesson);
  }

  return courses.map((course) => {
    const published = byCourse.get(course.slug)!.lessons;
    const modules = course.modules.map((module) => ({
      ...module,
      lessons: published.filter(({ data }) => data.module === module.slug)
        .sort((a, b) => a.data.order - b.data.order),
    }));
    return { course, modules, lessons: modules.flatMap((module) => module.lessons) };
  });
}

export type CourseEntry = Awaited<ReturnType<typeof courseCatalog>>[number];
