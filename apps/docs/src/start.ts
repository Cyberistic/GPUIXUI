import { createMiddleware, createStart } from "@tanstack/react-start";

/**
 * Cache policy for the docs Worker.
 *
 * The document must not be cached: a deploy replaces the hashed asset names,
 * and an HTML copy from the previous deploy then dynamically imports a file
 * that no longer exists ("Failed to fetch dynamically imported module").
 * Hashed assets under `/assets/` are content-addressed, so they can be
 * immutable.
 */
const withCacheHeaders = (response: Response, pathname: string): Response => {
  const headers = new Headers(response.headers);
  if (pathname.startsWith("/assets/")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  } else {
    headers.set("cache-control", "no-cache, must-revalidate");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const cachePolicy = createMiddleware().server(async ({ next, request }) => {
  const { pathname } = new URL(request.url);
  const result = await next();
  return { ...result, response: withCacheHeaders(result.response, pathname) };
});

export const startInstance = createStart(() => ({
  requestMiddleware: [cachePolicy],
}));
