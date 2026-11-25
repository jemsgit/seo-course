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
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (origin && path !== '/404.html') {
    assert.equal(canonical, new URL(path, origin).href, `Incorrect canonical on ${path}`);
    assert.doesNotMatch(html, /name="robots" content="noindex"/);
    indexable.push(canonical);
  } else {
    assert.equal(canonical, undefined);
    assert.match(html, /name="robots" content="noindex"/);
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
