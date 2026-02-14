import ApiClient from '@devpad/api'

const base_url = process.env.VITE_DEVPAD_URL ?? import.meta.env.VITE_DEVPAD_URL ?? 'https://devpad.tools/api/v1'
const api_key = process.env.VITE_DEVPAD_API_KEY ?? import.meta.env.VITE_DEVPAD_API_KEY

export const devpad = new ApiClient({
    base_url,
    api_key,
})
