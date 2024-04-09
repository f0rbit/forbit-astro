// map of project-id to list of technologies


// first we define all available technologies used in all projects
export const TECHNOLOGY = {
    JAVA: "java",
    GAMEMAKER: "gamemaker",
    HTML: "html",
    CSS: "css",
    JAVASCRIPT: "javascript",
    GO: "go",
    TYPESCRIPT: "typescript",
    CPP: "cpp",
    RUST: "rust",
    REACT: "react",
    SOLIDJS: "solidjs",
    VUEJS: "vuejs",
    ASTRO: "astro",
		TAILWIND: "tailwind",
		NEXTJS: "nextjs",
		PYTHON: "python"
}

export type Technology = (typeof TECHNOLOGY)[keyof typeof TECHNOLOGY];


export const TECH_MAP: Record<string, Technology[]> = {
    "gm-server": [TECHNOLOGY.GAMEMAKER, TECHNOLOGY.JAVA],
    "dungeon-generator": [TECHNOLOGY.JAVA],
    "file-xxplorer": [TECHNOLOGY.REACT, TECHNOLOGY.RUST, TECHNOLOGY.TYPESCRIPT],
    "bit-quest": [TECHNOLOGY.GAMEMAKER],
    "arena": [TECHNOLOGY.GAMEMAKER, TECHNOLOGY.JAVA],
    "clumsy-santa": [TECHNOLOGY.GAMEMAKER],
    "pixel-fly": [TECHNOLOGY.GAMEMAKER],
    "rich-frog": [TECHNOLOGY.GAMEMAKER],
    "devpad": [TECHNOLOGY.REACT, TECHNOLOGY.TYPESCRIPT],
    "forbit-dev": [TECHNOLOGY.ASTRO, TECHNOLOGY.SOLIDJS, TECHNOLOGY.TYPESCRIPT],
    "dev-blog": [TECHNOLOGY.GO, TECHNOLOGY.REACT, TECHNOLOGY.TYPESCRIPT],
    "comet-events": [TECHNOLOGY.VUEJS, TECHNOLOGY.TYPESCRIPT],
    "todo-tracker": [TECHNOLOGY.JAVASCRIPT, TECHNOLOGY.GO, TECHNOLOGY.TYPESCRIPT],
    "java-timeline": [TECHNOLOGY.JAVA],
    "chamber": [TECHNOLOGY.NEXTJS, TECHNOLOGY.GO, TECHNOLOGY.PYTHON, TECHNOLOGY.TYPESCRIPT]
}


