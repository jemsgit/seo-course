import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  build: {
    rolldownOptions: {
      input: ['index.html', 'starter.html', 'test.html']
        .map(file => fileURLToPath(new URL(file, import.meta.url))),
    },
  },
});
