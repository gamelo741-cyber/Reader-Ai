const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

if (import.meta.env.PROD && !configuredApiUrl) {
  console.warn(
    'VITE_API_URL is not set; using the Reader AI production API URL.'
  )
}

export const API_URL = (
  configuredApiUrl ||
  (import.meta.env.PROD
    ? 'https://reader-ai-kzme.onrender.com'
    : 'http://127.0.0.1:8000')
).replace(/\/+$/, '')
