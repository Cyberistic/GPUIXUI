/**
 * The surface contract's error boundary.
 *
 * The bug this guards: an adapter failure that arrives as an unknown cause must
 * become one typed `SurfaceError` naming the lifecycle edge, not a thrown
 * `Error` or a silently swallowed string (plan `696`).
 */

import { describe, expect, it } from "vitest";
import { surfaceError, SurfaceError } from "./adapter.js";

describe("surface adapter errors", () => {
  it("keeps the operation and a real Error's message", () => {
    const error = surfaceError("resize", new Error("boom"));
    expect(error).toBeInstanceOf(SurfaceError);
    expect(error.operation).toBe("resize");
    expect(error.message).toBe("boom");
  });

  it("stringifies a non-Error cause instead of losing it", () => {
    expect(surfaceError("create", "no host").message).toBe("no host");
    expect(surfaceError("destroy", 42).message).toBe("42");
  });
});
