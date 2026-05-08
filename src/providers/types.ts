import type { Result } from '@devpad/api'
import type { DevpadProvider } from './devpad'
import type { DevtoProvider } from './devto'
import type { PostsFeedProvider } from './posts-feed'

export type { Result }

export type ProviderError = { code: string; message: string }

export type AppProviders = {
    devpad: DevpadProvider
    devto: DevtoProvider
    postsFeed: PostsFeedProvider
}
