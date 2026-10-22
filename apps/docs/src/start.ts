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

/**
 * Cross-origin isolation for the live surface.
 *
 * `/live` boots `@gpuix/native`'s wasm build, which instantiates a
 * `shared: true` `WebAssembly.Memory`; the document must be isolated or
 * `SharedArrayBuffer` does not exist and the renderer never starts. Scoped to
 * the one route so the rest of the docs keeps its embeds. Development sets the
 * same pair in `vite.config.ts`.
 */
const withLiveIsolation = (response: Response, pathname: string): Response => {
  if (!pathname.startsWith("/live")) return response;
  const headers = new Headers(response.headers);
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set("cross-origin-embedder-policy", "require-corp");
  headers.set("cross-origin-resource-policy", "same-origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const cachePolicy = createMiddleware().server(async ({ next, request }) => {
  const { pathname } = new URL(request.url);
  const result = await next();
  return {
    ...result,
    response: withLiveIsolation(
      withCacheHeaders(result.response, pathname),
      pathname,
    ),
  };
});

export const startInstance = createStart(() => ({
  requestMiddleware: [cachePolicy],
}));
