import type { Post } from "../types";

export function website_json_ld() {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: "forbit",
		url: "https://forbit.dev",
		author: {
			"@type": "Person",
			name: "forbit",
			url: "https://forbit.dev/about",
		},
	};
}

export function person_json_ld() {
	return {
		"@context": "https://schema.org",
		"@type": "Person",
		name: "forbit",
		url: "https://forbit.dev",
		sameAs: [],
	};
}

export function article_json_ld(post: Post, url: string, og_image: string) {
	return {
		"@context": "https://schema.org",
		"@type": "Article",
		headline: post.title,
		description: post.description,
		image: og_image,
		datePublished: post.published_at,
		author: {
			"@type": "Person",
			name: "forbit",
			url: "https://forbit.dev/about",
		},
		publisher: {
			"@type": "Person",
			name: "forbit",
			url: "https://forbit.dev",
		},
		mainEntityOfPage: {
			"@type": "WebPage",
			"@id": url,
		},
		keywords: post.tag_list,
	};
}
