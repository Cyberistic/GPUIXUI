/**
 * The harness's own contract, in the real renderer.
 *
 * The bug these guard: a test whose assertion fails before `unmount()` leaves its
 * native root mounted, and every later test in the file dies at `renderComponent`
 * with "a root is still mounted" — one real defect reported as a cascade, naming
 * tests that never ran. The setup file's `afterEach` owns teardown instead.
 *
 * The first test deliberately leaks its root; that is the failure this harness
 * has to survive. Both assertions read the renderer's own text, so neither can
 * pass vacuously.
 */

import { describe, expect, it } from "vitest";
import { renderComponent } from "../internal/test-root.js";

describe("behaviour harness", () => {
  it("renders a tree and leaves its root mounted, like a failed assertion", () => {
    const leaked = renderComponent(<text>first</text>);

    expect(leaked.renderer.getAllText()).toEqual(["first"]);
    // No unmount: the setup's afterEach is responsible for the window.
  });

  it("renders in a clean window after the previous test leaked its root", () => {
    const next = renderComponent(<text>second</text>);

    expect(next.renderer.getAllText()).toEqual(["second"]);
  });
});
