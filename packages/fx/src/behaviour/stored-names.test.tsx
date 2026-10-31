/** @jsxImportSource @gpuix/react */
/**
 * The stored accessible names of the animated catalogue, in the real renderer.
 *
 * The bug these guard: a name is a stored value as often as a literal — a saved
 * toolbar's button labels, an image's caption, a grid's heading, a panel's
 * region name, an i18n row — so it arrives as whatever the record wrote: `null`
 * for a key it never carried, a number a settings column held, an object a
 * decoder answered. Every surface in this catalogue read the prop raw:
 * `accessibleName`/`Str.trim` threw `self.trim is not a function` out of the
 * first render for `RotatingText`
 * (taking the surface with it), and the rest published the number itself as an
 * `aria-label`, so a reader heard a value the caller never wrote. `nameOf`
 * (`internal/text.ts`) reads a name as text or nothing, and every surface takes
 * its documented fallback.
 *
 * Each case mounts the surface from a record that named it `42`, so a render
 * that threw paints no sibling and the assertions below cannot pass vacuously.
 */

import { describe, expect, it } from "vitest";
import { MotionGrid } from "../motion-grid.js";
import { RotatingText } from "../rotating-text.js";
import { TypingText } from "../typing-text.js";
import {
  a11yNodes,
  renderComponent,
} from "@gpuixui/components/authoring/testing";

/** The names the frame just painted into the accessibility tree. */
const names = (
  page: ReturnType<typeof renderComponent>,
): ReadonlyArray<string> => a11yNodes(page.renderer).map((node) => node.name);

/** A render that threw leaves no sibling behind; "Before" is the control. */
const survived = (page: ReturnType<typeof renderComponent>): void =>
  expect(page.renderer.getAllText()).toContain("Before");

/** The surface's frame: a sibling that proves the tree mounted at all. */
const Frame = ({ children }: { readonly children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", padding: 20 }}>
    <text testId="before">Before</text>
    {children}
  </div>
);

describe("a stored name that is not text", () => {
  it("names a rotation by the phrase on screen", () => {
    const page = renderComponent(
      <Frame>
        <RotatingText
          testId="rotating"
          // @ts-expect-error — the name a store wrote as a number.
          label={42}
          phrases={["First phrase", "Second phrase"]}
        />
      </Frame>,
    );
    try {
      survived(page);
      expect(names(page)).toContain("First phrase");
    } finally {
      page.unmount();
    }
  });

  it("names a reveal by the phrase it reveals", () => {
    const page = renderComponent(
      <Frame>
        <TypingText
          testId="typing"
          // @ts-expect-error — the name a store wrote as a number.
          label={42}
          text="Ada"
          speed={20}
          delay={1_000}
        />
      </Frame>,
    );
    try {
      survived(page);
      // The whole phrase is the name from the first frame, before any of it is
      // revealed; a name the store wrote as a number is no name, and the
      // half-typed content would answer for it.
      expect(names(page)).toContain("Ada");
    } finally {
      page.unmount();
    }
  });

  it("publishes no grid node for a name that is not text", () => {
    const page = renderComponent(
      <Frame>
        <MotionGrid
          testId="grid"
          // @ts-expect-error — the heading a store wrote as a number.
          label={42}
          items={[
            { id: "a", content: <text>Alpha</text> },
            { id: "b", content: <text>Beta</text> },
          ]}
        />
      </Frame>,
    );
    try {
      survived(page);
      expect(page.renderer.findByTestId("motion-grid-cell-a")).toBeDefined();
      const grid = page.renderer.findByTestId("grid");
      expect(grid?.customProps?.["aria-label"]).toBeUndefined();
      expect(grid?.customProps?.role).toBeUndefined();
    } finally {
      page.unmount();
    }
  });
});
