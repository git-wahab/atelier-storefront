/**
 * The API returns absolute image URLs on the admin host, so `next/image` has to
 * be told that host is allowed — it refuses any remote source that is not on
 * the list. Deriving it from the same variable the API client reads keeps the
 * two from drifting apart.
 */
const apiUrl = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    console.warn(`[next.config] NEXT_PUBLIC_API_URL is not a valid URL: ${raw}`);
    return null;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  ...(apiUrl
    ? {
        images: {
          remotePatterns: [
            {
              protocol: apiUrl.protocol.replace(":", ""),
              hostname: apiUrl.hostname,
              ...(apiUrl.port ? { port: apiUrl.port } : {}),
            },
          ],
        },
      }
    : {}),
};

export default nextConfig;
