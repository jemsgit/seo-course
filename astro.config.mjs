import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

const site = process.env.SITE_URL;
if (site) {
  const url = new URL(site);
  if (url.protocol !== 'https:' || url.href !== url.origin + '/') {
    throw new Error('SITE_URL must be an HTTPS origin');
  }
}

export default defineConfig({ site, output: 'static', integrations: [react(), mdx()], trailingSlash: 'always' });
