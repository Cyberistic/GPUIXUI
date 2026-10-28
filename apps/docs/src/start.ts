import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";

/**
 * Cache policy for the responses the Worker renders.
 *
 * A prerendered page (`src/lib/prerender-pages.ts`) is a static asset: the
 * asset layer answers it before the Worker runs, under the HTML policy
 * `packages/deploy/alchemy.run.docs.ts` sets, and Cloudflare replaces the whole
 * asset set with each deploy. That is the guarantee that matters here — an HTML
 * copy from an earlier deploy would dynamically import hashed assets this
 * deploy deleted ("Failed to fetch dynamically imported module"). This policy
 * covers the documents the Worker still renders (`/live`) and the machine
 * routes. Hashed assets under `/assets/` are content-addressed, so they can be
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

/**
 * Same-origin validation for every server function call.
 *
 * The two server functions on this site are GET readers (`loadDocsPage`,
 * `readPageMarkdown`), but they are still RPC endpoints: a cross-site page can
 * call them and read the response unless the request's origin is checked.
 * TanStack's own guidance is to install this middleware rather than trust the
 * browser's same-origin policy; the filter scopes it to server functions so a
 * document request pays nothing.
 */
const serverFnOrigin = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [serverFnOrigin, cachePolicy],
}));
