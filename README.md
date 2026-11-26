# Курсы для веб-разработчиков

Общая статическая сборка Astro для двух курсов.

- `/` — каталог курсов.
- `/seo/` — SEO Практика. Уроки лежат в `src/content/courses/seo/lessons/`. Программа и правила подготовки материалов находятся в [плане курса](COURSE_PLAN.md).
- `/redux/` — Redux по шагам. MDX-уроки лежат в `src/content/courses/redux/lessons/`, а React-примеры — в `src/courses/redux/components/`.

## Запуск

Нужен Node.js 22.23.4 или новее.

```sh
npm ci
npm run dev
```

Чтобы проверить готовую сборку локально:

```sh
npm run build
npm run check
npm run verify:redux
npm test
npm run preview
```

## Публикация

Подставьте общий HTTPS-домен:

```sh
SITE_URL=https://courses.example.com npm run build
SITE_URL=https://courses.example.com npm run check
SITE_URL=https://courses.example.com npm run verify:redux
```

Выложите содержимое `dist/` на статический хостинг. Настройте раздачу `index.html` из каталогов и страницу `404.html` с HTTP-статусом 404. Оба курса используют один корневой `robots.txt` и один `sitemap.xml`. Канонические адреса и карта берут домен из `SITE_URL`. Сборки без этого параметра получают `noindex` и пустой sitemap.

Если курсы уже были опубликованы, настройте на прежних хостах постоянные редиректы со старых URL на соответствующие уроки нового сайта. Например, прежний адрес SEO `/lessons/how-search-works/` ведёт на `/seo/lessons/how-search-works/`. Для Redux используйте префикс `/redux/` и тот же slug урока. Правила зависят от прежних доменов и хостинга.

## Уроки SEO

Файлы уроков лежат в `src/content/courses/seo/lessons/`. Схема проверяет метаданные при сборке. Для нового урока выберите постоянный `slug` и свободную позицию внутри модуля. Поставьте `draft: true`, пока урок в работе. Перед публикацией проверьте источники и пройдите редактуру с навыком `humanizer:humanizer`.

## Добавление курса

1. Добавьте курс и его модули в `src/courses/registry.ts`.
2. Поместите Markdown или MDX в `src/content/courses/<курс>/lessons/`. У каждого урока задайте `slug`, `title`, `description`, `module`, `order` и `draft`. Поле `checked` хранит дату проверки источников. Порядок задаётся внутри модуля, а порядок модулей — в реестре.
3. Соберите сайт и запустите проверку. Каталог, программа, адреса уроков и sitemap собираются из реестра и опубликованных уроков. Для страниц модулей включите `modulePages`.
