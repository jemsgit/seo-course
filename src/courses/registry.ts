export interface CourseModule {
  slug: string;
  title: string;
  programTitle?: string;
  assignment?: string;
}

interface CourseDefinition {
  slug: string;
  name: string;
  title: string;
  description: string;
  summary: string;
  presentation?: 'seo' | 'redux';
  modulePages?: boolean;
  modules: readonly CourseModule[];
}

export const courses: readonly CourseDefinition[] = [
  {
    slug: 'seo',
    name: 'SEO Практика',
    title: 'SEO для веб-разработчиков',
    description: 'Практический курс по SEO для Google и Яндекса. От обхода и индексирования до продвижения и анализа трафика.',
    summary: 'Как Google и Яндекс находят страницы и показывают их в выдаче. Уроки, упражнения и итоговый чеклист.',
    presentation: 'seo',
    modulePages: true,
    modules: [
      {
        slug: 'search-basics',
        title: 'Как сайт попадает в поиск',
        assignment: 'Выберите страницу своего сайта. Найдите ссылку, по которой робот может на неё попасть, проверьте HTTP-ответ и узнайте статус URL в обеих панелях.',
      },
      { slug: 'content', title: 'Запросы, контент и продвижение' },
      { slug: 'technical', title: 'Техническое SEO' },
      { slug: 'measurement', title: 'Измерение результатов и сложные задачи' },
      { slug: 'geo', title: 'Бонусный модуль: GEO и поиск с ИИ' },
    ],
  },
  {
    slug: 'redux',
    name: 'Redux по шагам',
    title: 'Интерактивный учебник Redux Toolkit и RTK Query',
    description: '27 уроков Redux Toolkit и RTK Query на русском: объяснения, живые примеры, задания и работа с кэшем. Статический учебник по официальной документации.',
    summary: 'Redux Toolkit и RTK Query на русском. Интерактивные примеры, задания и работа с кэшем.',
    presentation: 'redux',
    modules: [
      { slug: 'toolkit', title: 'Redux Toolkit', programTitle: 'Думать состоянием' },
      { slug: 'rtk-query', title: 'RTK Query', programTitle: 'Освоить серверные данные' },
      { slug: 'practice', title: 'Практика', programTitle: 'Собрать всё вместе' },
      { slug: 'advanced', title: 'Продвинутый RTK Query', programTitle: 'Управлять поведением точнее' },
      { slug: 'best-practices', title: 'Практические правила', programTitle: 'Проверять свои решения' },
    ],
  },
];

export type Course = (typeof courses)[number];

export const coursePath = (course: string) => `/${course}/`;
export const lessonPath = (course: string, slug: string) => `${coursePath(course)}lessons/${slug}/`;
export const modulePath = (course: string, slug: string) => `${coursePath(course)}modules/${slug}/`;
