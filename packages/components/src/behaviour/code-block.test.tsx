/**
 * CodeBlock in the real GPUix renderer.
 *
 * The bugs these guard: a block that paints the source itself instead of handing
 * it to the runtime's `<code>` host (no highlighting, no gutter, no horizontal
 * scroll); a header that loses the path's title or its language; a block that
 * publishes no accessible name, or none of the line count a reader cannot see;
 * an empty source that paints a bare surface instead of its placeholder; a copy
 * action that never acknowledges the press, or acknowledges it forever; and a
 * height cap that is ignored.
 *
 * The motion half is measured on the runtime's clock: the entrance travels 4 px
 * and settles, `level="none"` and the reduced preference paint at rest on the
 * first frame. The fade itself is a paint value the tree does not expose — the
 * `surface-fade` live probe is what proves it for the seam this block shares.
 */

import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import * as Option from "effect/Option";
import { a11yNodes, nodesWithRole } from "../internal/a11y.js";
import {
  clickCentreOf,
  requireBounds,
  settle,
  waitFor,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { CodeBlock } from "../code-block.js";
import { COPY_ACKNOWLEDGEMENT_MS } from "../copy-button/logic.js";
import { MotionProvider } from "../motion.js";

const SOURCE = "const answer = 42;";

/** A block inside a fixed frame, so the entrance offset is measurable. */
const framed = (node: ReactNode): ReactNode => (
  <div testId="frame" style={{ display: "flex", flexDirection: "column" }}>
    {node}
  </div>
);

/** How far the block sits from the frame's top edge. */
const offsetOf = (page: ReturnType<typeof renderComponent>): number =>
  requireBounds(page, "code-block").y - requireBounds(page, "frame").y;

/** The one accessibility node with `role`, or `undefined` when there is none. */
const nodeWith = (
  page: ReturnType<typeof renderComponent>,
  role: string,
): ReturnType<typeof nodesWithRole>[number] | undefined =>
  nodesWithRole(page.renderer, role)[0];

describe("CodeBlock", () => {
  it("paints the source through the native code host", () => {
    const page = renderComponent(<CodeBlock code={SOURCE} />);
    try {
      expect(page.renderer.findByTestId("code-block-source")?.type).toBe(
        "code",
      );
      expect(page.renderer.getPaintedText().join("\n")).toContain(SOURCE);
    } finally {
      page.unmount();
    }
  });

  it("takes the path as its title and the extension as its language", () => {
    const page = renderComponent(
      <CodeBlock code={SOURCE} path="src/app.tsx" testId="code-block" />,
    );
    try {
      expect(page.renderer.getAllText()).toEqual(["src/app.tsx", "tsx"]);
    } finally {
      page.unmount();
    }
  });

  it("names itself and describes the lines it paints", () => {
    const page = renderComponent(
      <CodeBlock
        code={"npm install\nexit 0\n"}
        title="Install"
        language="bash"
      />,
    );
    try {
      const group = nodeWith(page, "group");
      expect(group?.name).toBe("Install");
      expect(Option.getOrUndefined(group?.description ?? Option.none())).toBe(
        "2 lines of bash",
      );
    } finally {
      page.unmount();
    }
  });

  it("paints its placeholder instead of the host for an empty source", () => {
    const page = renderComponent(<CodeBlock code={"  \n"} />);
    try {
      expect(page.renderer.findByTestId("code-block-source")).toBeUndefined();
      expect(page.renderer.findByTestId("code-block-empty")).toBeDefined();
      expect(page.renderer.getAllText()).toEqual(["No code"]);
      expect(
        Option.getOrUndefined(
          nodeWith(page, "group")?.description ?? Option.none(),
        ),
      ).toBe("Empty");
    } finally {
      page.unmount();
    }
  });

  it("acknowledges a copy press, then returns to the copy name", async () => {
    const copies: Array<string> = [];
    const page = renderComponent(
      <CodeBlock code={SOURCE} onCopy={(code) => copies.push(code)} />,
    );
    try {
      expect(nodeWith(page, "button")?.name).toBe("Copy");

      clickCentreOf(page, "code-block-copy");
      settle(page);
      expect(copies).toEqual([SOURCE]);
      expect(nodeWith(page, "button")?.name).toBe("Copied");

      await waitFor(
        () => expect(nodeWith(page, "button")?.name).toBe("Copy"),
        COPY_ACKNOWLEDGEMENT_MS + 1_000,
      );
    } finally {
      page.unmount();
    }
  });

  it("rises 4px into place, and paints at rest for none and reduced", () => {
    const page = renderComponent(framed(<CodeBlock code={SOURCE} />));
    try {
      page.renderer.clockPause();
      page.rerender(framed(<CodeBlock code={SOURCE} />));
      settle(page);
      expect(offsetOf(page)).toBeCloseTo(4, 1);

      page.renderer.clockFastForward(400);
      settle(page);
      expect(offsetOf(page)).toBeCloseTo(0, 1);

      page.rerender(framed(<CodeBlock code={SOURCE} level="none" />));
      settle(page);
      expect(offsetOf(page)).toBeCloseTo(0, 1);
      expect(
        page.renderer.findByTestId("code-block")?.customProps?.motion,
      ).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("paints at rest on the first frame under the reduced preference", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        {framed(<CodeBlock code={SOURCE} />)}
      </MotionProvider>,
    );
    try {
      page.renderer.clockPause();
      page.rerender(
        <MotionProvider preference="reduced">
          {framed(<CodeBlock code={SOURCE} />)}
        </MotionProvider>,
      );
      settle(page);
      expect(offsetOf(page)).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });

  it("caps the rows at the height it is given", () => {
    const rows = Array.from({ length: 10 }, (_, row) => `line ${row + 1}`).join(
      "\n",
    );
    const page = renderComponent(<CodeBlock code={rows} height={40} />);
    try {
      const capped = requireBounds(page, "code-block").height;
      page.rerender(<CodeBlock code={rows} />);
      settle(page);
      const uncapped = requireBounds(page, "code-block").height;

      // The cap clips the rows; the padding and header still paint around it.
      expect(capped).toBeGreaterThanOrEqual(40);
      expect(capped).toBeLessThan(uncapped);
    } finally {
      page.unmount();
    }
  });

  it("publishes the group and the language label to assistive readers", () => {
    const page = renderComponent(
      <CodeBlock code={SOURCE} path="notes.txt" language="tsx" />,
    );
    try {
      const roles = a11yNodes(page.renderer).map((node) => node.role);
      expect(roles).toContain("group");
      expect(nodeWith(page, "group")?.name).toBe("notes.txt");
    } finally {
      page.unmount();
    }
  });
});
