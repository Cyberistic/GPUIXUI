import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { startInstance } from "../start";

/**
 * The docs server's request pipeline.
 *
 * The site has two server functions — `loadDocsPage` and `readPageMarkdown` —
 * and both are RPC endpoints a page can call. TanStack Start warns on every dev
 * boot when no CSRF middleware is installed, because a cross-site page can call
 * a server function and read its answer; the documented fix is
 * `createCsrfMiddleware` in `src/start.ts`, which is what this site installs.
 *
 * The middleware marks itself with `Symbol.for("tanstack-start:csrf-middleware")`
 * outside production, so the **instance** can be read rather than the source
 * only: the test checks that the proof-carrying middleware is the first request
 * middleware and that the page's cache policy follows it.
 */

const start = readFileSync(new URL("../start.ts", import.meta.url), "utf8");

describe("the docs request pipeline", () => {
  it("validates every server function's origin before the page policy", async () => {
    const options = await startInstance.getOptions();
    const middlewares = [...(options.requestMiddleware ?? [])];
    const csrf = Symbol.for("tanstack-start:csrf-middleware");

    expect(middlewares).toHaveLength(2);
    expect(Object.getOwnPropertySymbols(middlewares[0] ?? {})).toContain(csrf);
    expect(Object.getOwnPropertySymbols(middlewares[1] ?? {})).not.toContain(
      csrf,
    );
  });

  it("scopes the check to server functions, not document requests", () => {
    // A document request carries no server-function call, so the origin check
    // is skipped there; the cache policy is the one that runs on every request.
    expect(start).toContain("createCsrfMiddleware");
    expect(start).toContain('ctx.handlerType === "serverFn"');
    expect(start).toContain("requestMiddleware: [serverFnOrigin, cachePolicy]");
  });
});
