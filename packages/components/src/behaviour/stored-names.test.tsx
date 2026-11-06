/** @jsxImportSource @gpuix/react */
import { describe, expect, it } from "vitest";
import { a11yNodes, nodesWithRole } from "../internal/a11y.js";
import { clickCentreOf } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { AvatarGroup } from "../avatar-group.js";
import { CodeBlock } from "../code-block.js";
import { CopyButton } from "../copy-button.js";
import { CountingNumber } from "../counting-number.js";
import { ImageZoom } from "../image-zoom.js";
import { PinnedList } from "../pinned-list.js";
import { ScrollFade } from "../scroll-fade.js";
import { ScrollProgress } from "../scroll-progress.js";
import { SlidingNumber } from "../sliding-number.js";

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
  it("names the copy action with its default, at rest and after a press", () => {
    const page = renderComponent(
      <Frame>
        <CopyButton
          testId="copy"
          text="npm install"
          onCopy={() => undefined}
          // @ts-expect-error — the names a store wrote as numbers.
          label={42}
          // @ts-expect-error — the second name a store wrote as a number.
          copiedLabel={42}
        />
      </Frame>,
    );
    try {
      survived(page);
      expect(names(page)).toContain("Copy");
      clickCentreOf(page, "copy");
      expect(names(page)).toContain("Copied");
    } finally {
      page.unmount();
    }
  });

  it("names the picture with its default", () => {
    const page = renderComponent(
      <Frame>
        <ImageZoom
          testId="zoom"
          src="preview.png"
          // @ts-expect-error — the caption a store wrote as a number.
          alt={42}
        />
      </Frame>,
    );
    try {
      survived(page);
      expect(
        nodesWithRole(page.renderer, "image").map((node) => node.name),
      ).toEqual(["Picture"]);
    } finally {
      page.unmount();
    }
  });

  it("names an avatar group by its size", () => {
    const page = renderComponent(
      <Frame>
        <AvatarGroup
          testId="group"
          // @ts-expect-error — the name a store wrote as a number.
          label={42}
          members={[{ name: "Ada Lovelace" }, { name: "Grace Hopper" }]}
        />
      </Frame>,
    );
    try {
      survived(page);
      expect(
        nodesWithRole(page.renderer, "group").map((node) => node.name),
      ).toEqual(["2 avatars"]);
    } finally {
      page.unmount();
    }
  });

  it("names a count by the value it reads", () => {
    const page = renderComponent(
      <Frame>
        <CountingNumber
          testId="count"
          // @ts-expect-error — the name a store wrote as a number.
          label={42}
          value={7}
        />
      </Frame>,
    );
    try {
      survived(page);
      expect(
        page.renderer.findByTestId("count")?.customProps?.["aria-label"],
      ).toBe("7");
    } finally {
      page.unmount();
    }
  });

  it("names a sliding number by the value it reads", () => {
    const page = renderComponent(
      <Frame>
        <SlidingNumber
          testId="sliding"
          // @ts-expect-error — the name a store wrote as a number.
          label={42}
          value={7}
        />
      </Frame>,
    );
    try {
      survived(page);
      expect(
        nodesWithRole(page.renderer, "status").map((node) => node.name),
      ).toEqual(["7"]);
    } finally {
      page.unmount();
    }
  });

  it("names a scroll region with the primitives' default", () => {
    const page = renderComponent(
      <Frame>
        <ScrollFade
          testId="fade"
          // @ts-expect-error — the region name a store wrote as a number.
          label={42}
          style={{ height: 120 }}
        >
          <text>Rows</text>
        </ScrollFade>
      </Frame>,
    );
    try {
      survived(page);
      expect(names(page)).toContain("Scroll region");
      expect(names(page)).not.toContain("42");
    } finally {
      page.unmount();
    }
  });

  it("names a reading line's region with the primitives' default", () => {
    const page = renderComponent(
      <Frame>
        <ScrollProgress
          testId="progress"
          // @ts-expect-error — the region name a store wrote as a number.
          label={42}
          style={{ height: 120 }}
        >
          <text>Rows</text>
        </ScrollProgress>
      </Frame>,
    );
    try {
      survived(page);
      expect(names(page)).toContain("Scroll region");
      expect(names(page)).not.toContain("42");
    } finally {
      page.unmount();
    }
  });

  it("names a pinned list's region with the primitives' default", () => {
    const page = renderComponent(
      <Frame>
        {/* @ts-expect-error — the region name a store wrote as a number. */}
        <PinnedList
          testId="pinned"
          aria-label={42}
          style={{ height: 120 }}
          sections={[
            { title: "One", children: <text>First</text> },
            { title: "Two", children: <text>Second</text> },
          ]}
        />
      </Frame>,
    );
    try {
      survived(page);
      expect(names(page)).toContain("Scroll region");
      expect(names(page)).toContain("One");
    } finally {
      page.unmount();
    }
  });

  it("names a code block with its default", () => {
    const page = renderComponent(
      <Frame>
        <CodeBlock
          testId="block"
          code={"const a = 1;"}
          aria-label={42}
          // @ts-expect-error — the action names a store wrote as numbers.
          copyLabel={42}
          // @ts-expect-error — the second action name a store wrote as a number.
          copiedLabel={42}
        />
      </Frame>,
    );
    try {
      survived(page);
      expect(names(page)).toContain("Code");
    } finally {
      page.unmount();
    }
  });
});
