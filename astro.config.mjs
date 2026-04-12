// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 4321,
    allowedHosts: ['stories-revelation-notebooks-compound.trycloudflare.com', 'all'],
  },
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  output: 'hybrid',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});
