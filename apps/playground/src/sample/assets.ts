/**
 * Absolute URL for a file in `public/`. Email clients need absolute image URLs, and the
 * renderer only accepts http(s) ones, so sample images are resolved against wherever the
 * playground is being served (localhost, a tailnet host, or the GitHub Pages demo).
 */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  return new URL(`${base}${path.replace(/^\//, '')}`, origin).href;
}
