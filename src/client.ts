import ApiClient from '@devpad/api'
import { DEVPAD_API_KEY, DEVPAD_URL } from 'astro:env/server'

export const devpad = new ApiClient({
    base_url: DEVPAD_URL,
    api_key: DEVPAD_API_KEY,
})
