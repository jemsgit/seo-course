---
slug: internal-links
title: "Как связать статьи в курс с помощью внутренних ссылок"
description: "Проверьте путь от главной до урока и добавьте ссылки, которые помогают читателю продолжить работу."
module: content
order: 4
draft: false
checked: "2026-11-24"
---

Читатель может открыть урок о поисковых запросах прямо из выдачи. Если на странице есть ссылка на модуль, он увидит, что уже пропустил и что может прочитать дальше. Ссылка внутри урока решает более узкую задачу. Например, при сомнении, объединять ли два запроса, можно сразу перейти к [сравнению выдачи](/seo/lessons/search-intent/).

## Проверьте путь от главной

На нашем сайте [главная](/seo/#program) ведёт к [странице модуля](/seo/modules/content/), где собраны опубликованные уроки по порядку. Урок ссылается обратно на модуль через хлебные крошки. Внизу есть переходы к соседним урокам. Через эту навигацию до статьи легко добраться, даже если читатель забыл её название.

Проверьте новые URL после сборки. Если до статьи можно добраться только по прямому адресу, добавьте её в нужный раздел или свяжите с материалом, который уже есть на сайте. Сборка курса генерирует навигацию из опубликованных уроков. Готовые ссылки можно проверить до публикации. Для проверки сайта этого курса мы используем команду `npm run check` (как она работает расскажем ниже).

## Поставьте ссылку там, где она нужна

Внутри статьи полезно ссылаться на следующий шаг. Например, из инструкции по сбору запросов можно вести к [уроку о заголовке и описании](/seo/lessons/title-h1-description/), когда читатель уже выбрал тему. По тексту ссылки должно быть понятно, куда она ведёт. В Markdown это обычная ссылка, которая после сборки становится элементом `<a href>`:

```md
[Как написать заголовок и описание](/seo/lessons/title-h1-description/)
```

Если навигация сделана через кнопки с обработчиками JavaScript, проверьте исходный HTML. Для переходов между страницами используйте ссылки с адресом в `href`. Google документирует этот формат как доступный для обхода.

## Как работает npm run check

В `package.json` команда `check` запускает `node scripts/check-build.mjs`. Сначала соберите сайт, чтобы скрипт прочитал свежие файлы из `dist/`:

```sh
npm run build
npm run check
```

Вот часть, которая проверяет ссылки и якоря. `urls` — таблица путей и HTML-файлов, которую скрипт уже собрал.

```js
  for (const [, href] of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
    if (!href.startsWith('/') && !href.startsWith('#')) continue;
    const target = new URL(href, new URL(path, 'https://example.invalid'));
    const page = urls.get(target.pathname);
    assert(page, `Broken link on ${path}: ${href}`);
    if (target.hash) {
      assert(page.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`), `Broken fragment on ${path}: ${href}`);
    }
  }
```

<details>
<summary>Полный скрипт проверки</summary>

```js
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const read = (file) => readFileSync(new URL(file, dist), 'utf8');
const urls = new Map();

for (const file of readdirSync(dist, { recursive: true })) {
  if (file === '404.html') urls.set('/404.html', read(file));
  if (file === 'index.html' || file.endsWith('/index.html')) {
    urls.set('/' + file.slice(0, -'index.html'.length), read(file));
  }
}

assert(urls.has('/'), 'Missing home page');
assert(urls.has('/404.html'), 'Missing custom 404 page');
const origin = process.env.SITE_URL;
const indexable = [];

for (const [path, html] of urls) {
  assert.match(html, /<h1[ >]/, `Missing H1 on ${path}`);
  const head = html.slice(0, html.indexOf("</head>"));
  const canonical = head.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (origin && path !== '/404.html') {
    assert.equal(canonical, new URL(path, origin).href, `Incorrect canonical on ${path}`);
    assert.doesNotMatch(head, /<meta name="robots" content="noindex"/, `Unexpected noindex on ${path}`);
    indexable.push(canonical);
  } else {
    assert.equal(canonical, undefined);
    assert.match(head, /<meta name="robots" content="noindex"/, `Missing noindex on ${path}`);
  }

  for (const [, href] of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
    if (!href.startsWith('/') && !href.startsWith('#')) continue;
    const target = new URL(href, new URL(path, 'https://example.invalid'));
    const page = urls.get(target.pathname);
    assert(page, `Broken link on ${path}: ${href}`);
    if (target.hash) {
      assert(page.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`), `Broken fragment on ${path}: ${href}`);
    }
  }
}

const sitemap = Array.from(read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g), ([, loc]) => loc);
assert.deepEqual(sitemap.sort(), indexable.sort(), 'Sitemap differs from indexable pages');
const robots = read('robots.txt');
if (origin) {
  assert(robots.includes(`Sitemap: ${new URL('/sitemap.xml', origin).href}\n`), 'Missing sitemap in robots.txt');
} else {
  assert(!robots.includes('Sitemap:'), 'Unexpected sitemap in preview robots.txt');
}

console.log(`Verified ${urls.size} HTML pages and ${sitemap.length} sitemap entries.`);
```

</details>

Сначала скрипт обходит `dist/` и создаёт таблицу «путь → HTML». Например, файл `dist/seo/lessons/internal-links/index.html` получает ключ `/seo/lessons/internal-links/`. Затем скрипт ищет в каждом документе ссылки `<a href="…">` и проверяет те, у которых адрес начинается с `/` или `#`. Так, для `/seo/#program` он находит главную по ключу `/seo/` и проверяет, есть ли в её HTML `id="program"`. Ссылку вида `#program` без пути он проверит на той странице, где она находится.

Если целевого HTML нет, скрипт завершится с ошибкой `Broken link`. Если HTML есть, но нужный `id` отсутствует, сообщение будет `Broken fragment`. В обоих случаях вывод показывает исходную страницу и адрес ссылки. По ним можно найти запись в Markdown или шаблоне, исправить её, пересобрать сайт и повторить проверку.

Скрипт также проверяет H1, `canonical`, `noindex` и соответствие sitemap опубликованным страницам. Если задаёте `SITE_URL` при сборке, передайте то же значение и в `npm run check`. Без него проверка ожидает сборку для предпросмотра с `noindex` и пустой картой. Скрипт читает готовые файлы. Для проверки HTTP-ответов хостинга и внешних ссылок нужны отдельные проверки.

## Практика

1. Откройте урок с главной, затем представьте, что нашли его через поиск. Проверьте, куда ведут хлебные крошки и как перейти дальше.
2. Выберите место в статье, где у читателя может возникнуть конкретный вопрос. Добавьте одну ссылку на материал, который отвечает на него.
3. Соберите сайт и запустите `npm run check`. В локальной копии попробуйте заменить адрес ссылки на `/seo/#missing-section`, пересоберите сайт и найдите сообщение `Broken fragment`. Верните рабочую ссылку и повторите проверку.

## Источники

- [Google о ссылках, доступных для обхода, и тексте ссылок](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Как робот Яндекса обходит сайт](https://yandex.ru/support/webmaster/ru/yandex-indexing/site-indexing)
