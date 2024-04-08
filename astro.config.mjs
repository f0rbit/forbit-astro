import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import solid from "@astrojs/solid-js";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import { getBlogPosts, getProjects } from './src/utils';

const blog_posts = await getBlogPosts();
const projects = await getProjects();

const site = "https://forbit.dev";

const blog_urls = blog_posts.map((post) => `${site}/blog/${post.group}/${post.slug}`);
const project_urls = projects.map((project) => `${site}/projects/${project.project_id}`);


// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), solid(), icon(), sitemap({
		customPages: [ ...blog_urls, ...project_urls ]
	})],
  output: "server",
  adapter: node({
    mode: "standalone"
  }),
	site
});
