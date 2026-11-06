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

const section = (heading: string): string => {
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const after = readme.indexOf("\n#", start + heading.length);
  return readme
    .slice(start, after === -1 ? readme.length : after)
    .replace(/\s+/g, " ");
};

const topVoid: PageArrival = {
  direction: "prepend",
  anchor: { itemIndex: 0, offsetInItem: 0, viewportHeight: VIEWPORT_HEIGHT },
  voidRow: 0,
  pageRows: 2,
  edgeHeight: EDGE_HEIGHT,
};

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
