import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const directory = path.resolve('dist');
const origin = process.env.SITE_URL;
const lessons = fs.readdirSync(path.join(directory, 'redux/lessons'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
assert.ok(lessons.length, 'Redux lessons are missing');
const pages = ['redux/index.html', ...lessons.map((slug) => `redux/lessons/${slug}/index.html`)];
const titles = new Set();
const descriptions = new Set();
for (const file of pages) {
  const html = fs.readFileSync(path.join(directory, file), 'utf8');
  assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, `${file}: one h1`);
  assert.match(html, /<html lang="ru"/);
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/s)?.[1];
  assert.ok(title && !titles.has(title), `${file}: unique title`); titles.add(title);
  assert.ok(description && !descriptions.has(description), `${file}: unique description`); descriptions.add(description);
  const route = '/' + file.replace(/index.html$/, '');
  if (origin) {
    assert.ok(html.includes(`rel="canonical" href="${new URL(route, origin).href}"`), `${file}: canonical`);
  } else {
    assert.match(html, /name="robots" content="noindex"/);
  }
  if (file.startsWith('redux/lessons/')) {
    // Inspect actual article HTML before hydration, not just source MDX.
    const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/)?.[1];
    assert.ok(article && article.length > 3000, `${file}: static article`);
    assert.match(article, /https:\/\/redux\.js\.org\//, `${file}: official source`);
    assert.match(article, /<code/, `${file}: code examples`);
    assert.ok(html.includes('aria-label="Переход между уроками"'));
  }
  for (const match of html.matchAll(/href="(\/[^"#?]*)(?:#[^"]*)?"/g)) {
    const href = match[1];
    const target = href.endsWith('/') ? `${href}index.html` : href;
    assert.ok(fs.existsSync(path.join(directory, target)), `${file}: broken internal link ${href}`);
  }
}
for (const file of ['when-redux', 'data-flow']) {
  const html = fs.readFileSync(path.join(directory, 'redux', 'lessons', file, 'index.html'), 'utf8');
  const islands = Array.from(html.matchAll(/<astro-island[^>]* component-url="([^"]+)"/g));
  assert.ok(islands.length, `${file}: React lab or quiz is missing`);
  for (const [, asset] of islands) {
    assert.ok(fs.existsSync(path.join(directory, asset)), `${file}: missing React bundle ${asset}`);
  }
}
console.log(`Verified ${pages.length} static pages: headings, metadata, canonical, article content, code, sources, internal links, and React bundles.`);
