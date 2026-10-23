/**
 * One activation contract for the action.
 *
 * This package's `Button` used to install its own key activation, because the
 * primitives ran a caller's key handler **before** their own: a trigger opens
 * in `onKeyDown` and records the row its surface must focus, so an activation
 * that ran second cleared the record. The primitive now leads a key, so the
 * adapter hands the caller's press to `onActivate` and forwards the caller's
 * key handlers untouched. This guard fails when a second contract returns: the
 * adapter naming `activationHandlers` or `decideActivation`, or wiring the
 * press through both `onClick` and `onActivate` — the primitive's
 * `composePress` calls both on one click, so that would run a handler twice.
 *
 * `node:fs` reads the two sources because this is a test-time repository check
 * (plan 117 §3, the same authorisation `inventory.test.ts` records), not a
 * component runtime path.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** This package's adapter over the primitive's action. */
const adapter = (): string => read("./internal/button.tsx");

/** The primitive whose activation order the adapter depends on. */
const primitive = (): string =>
  read("../../primitives/src/components/Button.tsx");

describe("the action's activation", () => {
  it("hands the caller's press to the primitive's one activation", () => {
    const source = adapter();

    expect(source).toContain("onActivate={onClick}");
    expect(source).not.toContain("onClick={onClick}");
    expect(source).not.toContain("activationHandlers");
    expect(source).not.toContain("decideActivation");
  });

  it("depends on the order the primitive documents", () => {
    const source = primitive();

    // The action's own handler is composed first, so a caller's handler sees
    // the record a trigger wrote intact.
    expect(source).toContain(
      'onKeyDown={composeEvent<KeyEvent>(onKey("down"), onKeyDown)}',
    );
    expect(source).toContain(
      'onKeyUp={composeEvent<KeyEvent>(onKey("up"), onKeyUp)}',
    );
    expect(source).toContain(
      "The key pair composes the other way round: the activation runs **before**",
    );
  });
});
