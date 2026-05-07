import { defineConfig, envField } from 'astro/config'
import solid from '@astrojs/solid-js'
import cloudflare from '@astrojs/cloudflare'
import sitemap from '@astrojs/sitemap'
import icon from 'astro-icon'
import { getBuildBlogPosts, getBuildProjects } from './src/lib/build-data'

const blog_posts = await getBuildBlogPosts()
const projects = await getBuildProjects()

const site = 'https://forbit.dev'

const blog_urls = blog_posts.map((post) => `${site}/blog/${post.group}/${post.slug}`)
const project_urls = projects.map((project) => `${site}/projects/${project.project_id}`)

// https://astro.build/config
export default defineConfig({
    integrations: [
        solid(),
        icon(),
        sitemap({
            customPages: [...blog_urls, ...project_urls],
        }),
    ],
    output: 'server',
    adapter: cloudflare({
        platformProxy: {
            enabled: true,
        },
    }),
    site,
    experimental: {
        env: {
            schema: {
                DEVPAD_API_KEY: envField.string({
                    context: 'server',
                    access: 'secret',
                }),
                DEVTO_KEY: envField.string({
                    context: 'server',
                    access: 'secret',
                }),
                POSTS_URL: envField.string({
                    context: 'server',
                    access: 'secret',
                }),
                DEVPAD_URL: envField.string({
                    context: 'server',
                    access: 'secret',
                    default: 'https://devpad.tools/api/v1',
                }),
            },
        },
    },
})
