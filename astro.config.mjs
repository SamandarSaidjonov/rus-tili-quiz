import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';

// GitHub Pages: https://samandarsaidjonov.github.io/rus-tili-quiz/
export default defineConfig({
  site: 'https://samandarsaidjonov.github.io',
  base: '/rus-tili-quiz',
  trailingSlash: 'always',
  integrations: [mdx(), preact({ compat: false })],
  // Дизайн тизимидаги учта оила: ўзбекча матн PT Sans, русча матн PT Serif,
  // сарлавҳа ва рақамлар PT Sans Narrow. Учаласи ҳам ў, қ, ғ, ҳ ва урғу белгисини кўрсатади.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'PT Sans',
      cssVariable: '--font-uz',
      weights: [400, 700],
      styles: ['normal'],
      subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
      fallbacks: ['Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'PT Serif',
      cssVariable: '--font-ru',
      weights: [400, 700],
      styles: ['normal', 'italic'],
      subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'PT Sans Narrow',
      cssVariable: '--font-display',
      weights: [700],
      styles: ['normal'],
      subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
      fallbacks: ['Arial Narrow', 'Roboto Condensed', 'sans-serif'],
    },
  ],
});
