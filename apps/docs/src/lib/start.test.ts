import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { startInstance } from "../start";

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
    expect(start).toContain("createCsrfMiddleware");
    expect(start).toContain('ctx.handlerType === "serverFn"');
    expect(start).toContain("requestMiddleware: [serverFnOrigin, cachePolicy]");
  });
});
