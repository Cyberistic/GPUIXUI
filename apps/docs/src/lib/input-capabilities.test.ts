import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ABSENT_INPUT_CLAIM,
  inputCapabilityViolations,
  inputHandlers,
} from "./input-capabilities";
import { installedNativeDeclarations } from "./native-declarations.testing";

/**
 * The bug guarded (plan 621): `/docs/accessibility` documented ARIA, keyboard
 * and focus but never the pointer surface, so `touch`, `touchscreen`, `stylus`
 * and `pointer input` reached a component limitation, Styling or nothing. The
 * installed runtime declares mouse and key handlers and no touch, pointer or
 * stylus handler; the page now says so.
 *
 * These cases feed the pure rule both the installed declarations and fixtures,
 * so a package that adds `onTouchStart`, a page that stops naming `onMouseMove`
 * or a page that drops the absence sentence each fail by name. `node:fs` is
 * test-only, as in `accessibility-page.test.ts`.
 */

const page = readFileSync(
  fileURLToPath(
    new URL("../../content/docs/accessibility.mdx", import.meta.url),
  ),
  "utf8",
);

const DECLARATIONS = installedNativeDeclarations().join("\n");

const fixture = (body: string): string =>
  `export interface HostProps {\n${body}\n}`;

const BASE_HANDLERS = [
  "onClick?: (event: EventPayload) => void;",
  "onMouseDown?: (event: EventPayload) => void;",
  "onMouseMove?: (event: EventPayload) => void;",
  "onKeyDown?: (event: EventPayload) => void;",
  "onScroll?: (event: EventPayload) => void;",
].join("\n");

describe("input capabilities", () => {
  it("groups the installed handlers and finds no touch surface", () => {
    const handlers = inputHandlers(DECLARATIONS);
    expect(handlers.mouse).toContain("onMouseDownOutside");
    expect(handlers.keyboard).toContain("onKeyDown");
    expect(handlers.scroll).toEqual(["onScroll"]);
    expect(handlers.touch).toEqual([]);
  });

  it("accepts the page against the installed declarations", () => {
    expect(
      inputCapabilityViolations({ declarations: DECLARATIONS, page }),
    ).toEqual([]);
    expect(page).toContain(ABSENT_INPUT_CLAIM);
  });

  it("fails when the package declares a touch handler the page denies", () => {
    const declarations = fixture(
      `${BASE_HANDLERS}\nonTouchStart?: (event: EventPayload) => void;`,
    );
    expect(inputCapabilityViolations({ declarations, page })).toEqual([
      "the page claims no touch input while the package declares onTouchStart",
    ]);
  });

  it("fails when the page stops naming a declared handler", () => {
    const withoutMouseMove = page.replaceAll("`onMouseMove`", "`a move event`");
    expect(
      inputCapabilityViolations({
        declarations: fixture(BASE_HANDLERS),
        page: withoutMouseMove,
      }),
    ).toEqual(["onMouseMove is declared but not named on the page"]);
  });

  it("fails when the absence sentence is removed", () => {
    const withoutClaim = page.replaceAll(ABSENT_INPUT_CLAIM, "some input");
    expect(
      inputCapabilityViolations({
        declarations: fixture(BASE_HANDLERS),
        page: withoutClaim,
      }),
    ).toEqual([
      "the page does not state that touch, pointer and stylus events are absent",
    ]);
  });
});
