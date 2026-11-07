import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";

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

const serverFnOrigin = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [serverFnOrigin, cachePolicy],
}));
