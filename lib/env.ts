// Small helper to fail fast (and clearly) when a required env var is
// missing, rather than letting Supabase / Anthropic throw a generic
// "fetch failed" deep inside an API route.

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function optionalEnv(name: string, fallback = ''): string {
  return process.env[name] || fallback
}
