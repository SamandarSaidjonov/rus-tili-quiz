import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';

// GitHub Pages: https://samandarsaidjonov.github.io/rus-tili-quiz/
export default defineConfig({
  site: 'https://samandarsaidjonov.github.io',
  base: '/rus-tili-quiz',
  trailingSlash: 'always',
  integrations: [mdx(), preact({ compat: false })],
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Noto Sans',
      cssVariable: '--font-uz',
      weights: [400, 500, 700],
      styles: ['normal'],
      subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
      fallbacks: ['Segoe UI', 'system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'PT Serif',
      cssVariable: '--font-ru',
      weights: [400, 700],
      styles: ['normal', 'italic'],
      subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
      fallbacks: ['Georgia', 'serif'],
    },
  ],
});
