import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import solid from "@astrojs/solid-js";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";

import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), solid(), icon(), sitemap()],
  output: "server",
  adapter: node({
    mode: "standalone"
  }),
	site: "https://forbit.dev"
});
