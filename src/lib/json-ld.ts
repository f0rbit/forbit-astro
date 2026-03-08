import type { Post } from '../types'

export function websiteJsonLd() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'forbit',
        url: 'https://forbit.dev',
        author: {
            '@type': 'Person',
            name: 'forbit',
            url: 'https://forbit.dev/about',
        },
    }
}

export function personJsonLd() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'forbit',
        url: 'https://forbit.dev',
        sameAs: [],
    }
}

export function articleJsonLd(post: Post, url: string, ogImage: string) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.description,
        image: ogImage,
        datePublished: post.published_at,
        author: {
            '@type': 'Person',
            name: 'forbit',
            url: 'https://forbit.dev/about',
        },
        publisher: {
            '@type': 'Person',
            name: 'forbit',
            url: 'https://forbit.dev',
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': url,
        },
        keywords: post.tag_list,
    }
}
