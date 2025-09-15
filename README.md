# Forbit Portfolio

Personal portfolio website built with Astro, showcasing my projects, experience, and blog posts. The site pulls data from external APIs including my DevPad project tracker and various blog platforms.

## Tech Stack

-   **Framework**: Astro with SSR (Node.js adapter)
-   **Styling**: Tailwind CSS
-   **UI**: Solid.js components with React components
-   **Icons**: Astro Icon with Iconify collections
-   **Deployment**: Static generation with dynamic routes

## Project Structure

```
src/
├── assets/          # Static data (experience, skills, technology)
├── components/      # Reusable UI components
│   ├── about/       # About page components (experience, skills)
│   ├── activity/    # Timeline and commit activity
│   ├── blog/        # Blog post cards and listings
│   └── projects/    # Project showcase components
├── layouts/         # Page layouts (Home, Page)
├── pages/           # Route definitions
│   ├── blog/        # Dynamic blog routes [group]/[slug]
│   ├── projects/    # Dynamic project routes [project_id]
│   └── *.astro      # Static pages
└── utils.ts         # API utilities and data fetching
```

## Key Features

-   **Dynamic Content**: Projects and blog posts fetched from external APIs
-   **Timeline View**: GitHub activity visualization with commit grouping
-   **Skills Tracking**: Interactive experience timeline with skill progression
-   **Multi-source Blog**: Aggregates posts from Dev.to and personal blog server
-   **Project Showcase**: Auto-generated project pages with specifications and status
-   **Responsive Design**: Tailwind-based responsive layouts

## Data Sources

-   **Projects**: DevPad API for project management and tracking
-   **Blog Posts**: Dev.to API + personal blog server
-   **Timeline**: GitHub activity feed
-   **Experience**: Static TypeScript data with detailed career progression

## Commands

| Command           | Action                   |
| ----------------- | ------------------------ |
| `bun dev`         | Start development server |
| `bun run build`   | Build for production     |
| `bun run preview` | Preview production build |

Site deployed at [forbit.dev](https://forbit.dev)
