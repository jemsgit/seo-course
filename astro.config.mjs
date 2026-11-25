import { defineConfig } from 'astro/config';

const site = process.env.SITE_URL;
if (site) {
  const url = new URL(site);
  if (url.protocol !== 'https:' || url.href !== url.origin + '/') {
    throw new Error('SITE_URL must be an HTTPS origin');
  }
}

export default defineConfig({ site, output: 'static', trailingSlash: 'always' });
