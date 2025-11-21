// src/utils/setCacheHeaders.js
export function setCacheHeaders(Astro, cacheTag) {
  // The browser should always check freshness
  Astro.response.headers.set("cache-control", "public, max-age=0, must-revalidate");
  // The CDN should cache for a year, but revalidate if the cache tag changes
  Astro.response.headers.set("netlify-cdn-cache-control", "s-maxage=31536000");
  // Tag the page with a cache tag
  const tag = cacheTag ?? Astro.url.pathname.replace(/^\/|\/$/g, "");
  Astro.response.headers.set("netlify-cache-tag", tag);
}