interface CacheHeadersContext {
  response: { headers: Headers };
  url: URL;
}

export function setCacheHeaders(Astro: CacheHeadersContext, cacheTag?: string): void {
  // The browser should always check freshness
  Astro.response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  // The CDN should cache for a year, but revalidate if the cache tag changes
  Astro.response.headers.set("Netlify-CDN-Cache-Control", "public, s-maxage=31536000, stale-while-revalidate=86400");
  // Tag the page with a cache tag
  const tag = cacheTag ?? Astro.url.pathname.replace(/^\/|\/$/g, "");
  Astro.response.headers.set("Netlify-Cache-Tag", tag);
}