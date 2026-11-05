/**
 * Where the download of a spec is, for Redoc 3's `downloadUrls`.
 *
 * Redoc 3 has one page per tag and operation, and it reads a relative download
 * URL against the page it is on, so `openapi.yaml` would point at
 * `/api/pets/openapi.yaml` from the Pets page and 404. Anchor a relative URL to
 * the API's route instead, so it is the same everywhere.
 *
 * - an absolute URL is used as is
 * - by default a relative URL is relative to the site's `baseUrl`
 *   (`withBaseUrl` is it, already prefixed)
 * - with `normalizeUrl: false` it is relative to the API's route, which is
 *   where a spec file kept next to the page ends up
 */
export function pickDownloadUrl({
  url,
  normalize = true,
  withBaseUrl,
  routeBaseUrl,
}: {
  url: string | undefined;
  normalize?: boolean;
  /** `url` with the site's `baseUrl` in front of it */
  withBaseUrl: string;
  /** The API's route, with the `baseUrl` and without a trailing slash */
  routeBaseUrl: string;
}): string | undefined {
  if (!url) {
    return undefined;
  }
  if (/^([a-z][a-z\d+.-]*:|\/\/)/i.test(url)) {
    return url;
  }
  if (normalize) {
    return withBaseUrl;
  }
  return routeBaseUrl ? `${routeBaseUrl}/${url.replace(/^\.?\//, '')}` : url;
}
