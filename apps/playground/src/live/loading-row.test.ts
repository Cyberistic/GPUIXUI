/**
 * Guards the restore rule the `loading-row-correction` live probe paints.
 *
 * The probe's point is that the loading void is the list's anchor and that a
 * page splice therefore replaces the screen unless the app re-anchors. Two
 * mistakes would leave it green while it stopped measuring that:
 *
 *   - a rule that always returns `None` would make the "naive" and "corrected"
 *     lists behave identically, so the probe's difference checks — the only
 *     reason it mounts two lists — would assert nothing;
 *   - a rule that corrected a message-anchored reader would move them twice,
 *     because gpui already shifts the anchor index across the splice.
 *
 * Both are held here, along with the fixture's pixel arithmetic, so the
 * numbers the probe asserts are derived rather than copied.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  EDGE_HEIGHT,
  MESSAGE_TOP,
  READER_TOP,
  VOID_TOP,
  VIEWPORT_HEIGHT,
  loadingRowRestore,
  messageIds,
  pageFirstId,
  voidRow,
  type PageArrival,
} from "./loading-row.js";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

/** One Markdown section, from its heading to the next heading of any rank. */
const section = (heading: string): string => {
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const after = readme.indexOf("\n#", start + heading.length);
  return readme
    .slice(start, after === -1 ? readme.length : after)
    .replace(/\s+/g, " ");
};

/** A reader waiting in the top void: the void is the anchor at offset 0. */
const topVoid: PageArrival = {
  direction: "prepend",
  anchor: { itemIndex: 0, offsetInItem: 0, viewportHeight: VIEWPORT_HEIGHT },
  voidRow: 0,
  pageRows: 2,
  edgeHeight: EDGE_HEIGHT,
};

/** A reader resting on the at-end sentinel of a ten-message list. */
const atEnd: PageArrival = {
  direction: "append",
  anchor: {
    itemIndex: 11,
    offsetInItem: 0,
    viewportHeight: VIEWPORT_HEIGHT,
  },
  voidRow: 10,
  pageRows: 2,
  edgeHeight: EDGE_HEIGHT,
};

describe("the loading row's restore", () => {
  it("anchors the message under the top void at the pixel it held", () => {
    // The void is row 0, the page's two rows join at 1..2, the message is row 3,
    // and a negative offset puts it back `EDGE_HEIGHT` below the viewport top.
    expect(loadingRowRestore(topVoid)).toEqual(
      Option.some({ index: 3, offsetInItem: -MESSAGE_TOP }),
    );
  });

  it("leaves a prepend alone once the reader is past the void", () => {
    expect(
      loadingRowRestore({
        ...topVoid,
        anchor: {
          itemIndex: 1,
          offsetInItem: 0,
          viewportHeight: VIEWPORT_HEIGHT,
        },
      }),
    ).toEqual(Option.none());
  });

  it("pins the first new row where the bottom void began at the at-end sentinel", () => {
    // The page's first row takes the trailing void's old row index, and the
    // rule's offset is exactly the void's top edge.
    expect(loadingRowRestore(atEnd)).toEqual(
      Option.some({ index: 10, offsetInItem: -VOID_TOP }),
    );
    expect(-VOID_TOP).toBe(EDGE_HEIGHT - VIEWPORT_HEIGHT);
  });

  it("keeps the anchor's own offset when the viewport top is the void's top", () => {
    expect(
      loadingRowRestore({
        ...atEnd,
        anchor: {
          itemIndex: 10,
          offsetInItem: 0,
          viewportHeight: VIEWPORT_HEIGHT,
        },
      }),
    ).toEqual(Option.some({ index: 10, offsetInItem: 0 }));
  });

  it("leaves an append alone when a message row is the anchor", () => {
    expect(
      loadingRowRestore({
        ...atEnd,
        anchor: {
          itemIndex: 9,
          offsetInItem: 0,
          viewportHeight: VIEWPORT_HEIGHT,
        },
      }),
    ).toEqual(Option.none());
  });
});

describe("the loading row fixture", () => {
  it("keeps the void and the row above it inside one viewport", () => {
    // The at-end formula is `edgeHeight - viewportHeight`; it lands the row at
    // VOID_TOP only while the void's bottom is the viewport bottom.
    expect(VOID_TOP + EDGE_HEIGHT).toBe(VIEWPORT_HEIGHT);
    expect(READER_TOP).toBe(VOID_TOP - 40);
    expect(MESSAGE_TOP).toBe(EDGE_HEIGHT);
  });

  it("prepends a page above the messages and appends one below them", () => {
    expect(messageIds("prepend", 1)[0]).toBe(98);
    expect(messageIds("prepend", 1).at(-1)).toBe(109);
    expect(messageIds("append", 1).at(-1)).toBe(11);
    expect(pageFirstId("prepend", 1)).toBe(98);
    expect(pageFirstId("append", 1)).toBe(10);
  });

  it("puts the void at the edge the direction names", () => {
    expect(voidRow("prepend", 10)).toBe(0);
    expect(voidRow("append", 10)).toBe(10);
  });
});

describe("the prepend section's correction claim", () => {
  it("sends the reader to the correction the window measured", () => {
    // The prepend probe is headless and cannot drive `scrollToItem`, so it must
    // name the window probe that does instead of calling the correction open.
    const prepend = section("## A prepended page");
    expect(prepend).not.toContain("Not measured here");
    expect(prepend).not.toContain("it is a TODO row below");
    expect(prepend).toContain("`loading-row-correction`");
    expect(prepend).toContain("headless host exposes no `scrollToItem`");
    expect(prepend).toContain("§`loading-row-correction` below");
  });

  it("records a correction the registry actually runs", () => {
    const correction = section("### `loading-row-correction`");
    expect(correction).toContain("58 checks");
    expect(correction).toContain("`--only loading-row-correction`");
    expect(correction).toContain("`flushSync`");
    expect(
      liveRegistry.some((probe) => probe.id === "loading-row-correction"),
    ).toBe(true);
  });
});
