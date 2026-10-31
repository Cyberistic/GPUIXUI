/**
 * Disclosure in the real GPUix renderer (plan 725).
 *
 * Bugs guarded: a folded section that still mounts its body, a triangle that
 * keeps pointing down when the section folds (the runtime cannot rotate it,
 * so the glyph must be swapped), and a header Enter does not toggle.
 */

import { afterEach, describe, expect, it } from "vitest";
import { Disclosure } from "../disclosure.js";
import {
  clickCentreOf,
  settleMotion,
  waitFor,
} from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

let page: ComponentTestRoot | undefined;
afterEach(() => {
  page?.unmount();
  page = undefined;
});

const Section = ({ open }: { readonly open: boolean }) => (
  <Disclosure title="Details" defaultOpen={open} testId="header">
    <text testId="body">Owner · Killua</text>
  </Disclosure>
);

/** The triangle's markup: the first svg the header paints. */
const glyph = (root: ComponentTestRoot): unknown =>
  root.renderer.findByType("svg")[0]?.customProps?.["source"];

describe("Disclosure", () => {
  it("opens on a press and mounts its body", () => {
    page = renderComponent(<Section open={false} />);
    expect(page.renderer.findByTestId("body")).toBeUndefined();
    clickCentreOf(page, "header");
    settleMotion(page);
    expect(page.renderer.findByTestId("body")).toBeDefined();
  });

  it("toggles with Enter from the header", async () => {
    const root = renderComponent(<Section open />);
    page = root;
    root.renderer.focusElement(root.renderer.findByTestId("header")?.id ?? -1);
    root.renderer.simulateKeystrokes("enter");
    await waitFor(() =>
      expect(root.renderer.findByTestId("body")).toBeUndefined(),
    );
  });

  it("swaps the triangle with the state", () => {
    const open = renderComponent(<Section open />);
    const down = glyph(open);
    open.unmount();
    page = renderComponent(<Section open={false} />);
    expect(down).toBeTypeOf("string");
    expect(glyph(page)).not.toEqual(down);
  });
});
