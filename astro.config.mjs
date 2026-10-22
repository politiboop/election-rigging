import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://riggingelections.com',
  output: 'server',
  integrations: [sitemap()],
  adapter: vercel({
    webAnalytics: {
      enabled: true
    }
  }),
});
