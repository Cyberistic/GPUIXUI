/** @jsxImportSource @gpuix/react */
import { describe, expect, it } from "vitest";
import { MotionGrid } from "../motion-grid.js";
import { RotatingText } from "../rotating-text.js";
import { TypingText } from "../typing-text.js";
import {
  a11yNodes,
  renderComponent,
} from "@gpuixui/components/authoring/testing";

const names = (
  page: ReturnType<typeof renderComponent>,
): ReadonlyArray<string> => a11yNodes(page.renderer).map((node) => node.name);

const survived = (page: ReturnType<typeof renderComponent>): void =>
  expect(page.renderer.getAllText()).toContain("Before");

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
