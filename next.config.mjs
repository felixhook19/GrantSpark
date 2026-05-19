/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Anthropic SDK is bundled as a CommonJS dependency that Next's
  // server build otherwise tries to trace as ESM. Keep this even though
  // /api/match currently uses fetch() rather than the SDK -- removing it
  // breaks the build the moment the SDK is reintroduced.
  serverExternalPackages: ['@anthropic-ai/sdk'],
}

export default nextConfig
