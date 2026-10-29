import { readFileSync } from "node:fs";
import { themes } from "@gpuixui/tokens";
import {
  MESSAGE_SCROLLER_ITEM,
  MESSAGE_SCROLLER_JUMP,
  MESSAGE_SCROLLER_ROOT,
  classesToStyle,
} from "@gpuixui/tw";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageScrollerDemo, atEnd, jumpLabel } from "./message-scroller-demo";

/**
 * The message-scroller drawing, held to the component it documents.
 *
 * The bugs this guards: the transcript was a bordered box sized by its rows with
 * the inset on each row and the fake "Scroll up" button deciding the pin, so it
 * never scrolled, the item painted chrome of its own, the jump control sat below
 * the transcript in a rail, and the debug readout printed the state. The
 * viewport is now a fixed-height scroll container, the content owns the padding,
 * the rows paint nothing, and the control floats over the viewport's bottom
 * edge — the placement the component's absolute root gives it.
 *
 * The style claims are read from the component's recipes, so a component change
 * fails here until the drawing follows it.
 */

const markup = renderToStaticMarkup(<MessageScrollerDemo />);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

/** The declarations of the first `selector { … }` block in the sheet. */
const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

const style = (recipe: string): ReturnType<typeof classesToStyle>["style"] =>
  classesToStyle(recipe, themes.dark).style;

describe("the message-scroller drawing", () => {
  it("scrolls a fixed-height viewport whose content owns the inset", () => {
    const viewport = rule(".gx-scroller-viewport");
    expect(viewport).toContain("height: 236px");
    expect(viewport).toContain("overflow-y: auto");
    expect(viewport).not.toContain("padding");
    expect(viewport).not.toContain("max-height");
    expect(rule(".gx-scroller-content")).toContain("padding: 12px;");
    expect(markup).toContain('class="gx-scroller-content"');
  });

  it("paints a row as text, never as a box", () => {
    const row = rule(".gx-scroller-row");
    expect(row).not.toContain("border");
    expect(row).not.toContain("background");
    expect(row).not.toContain("padding");
    expect(row).not.toContain("border-radius");
    const item = style(MESSAGE_SCROLLER_ITEM);
    expect(item).not.toHaveProperty("borderWidth");
    expect(item).not.toHaveProperty("backgroundColor");
    expect(item).not.toHaveProperty("paddingLeft");
  });

  it("floats the jump control over the viewport's bottom edge, centred", () => {
    expect(rule(".gx-scroller-stage")).toContain("position: relative");
    const jump = rule(".gx-scroller-jump");
    expect(jump).toContain("position: absolute");
    expect(jump).toContain("bottom: 12px");
    expect(jump).toContain("left: 0");
    expect(jump).toContain("right: 0");
    expect(jump).toContain("justify-content: center");
    expect(jump).toContain("pointer-events: none");
    expect(rule(".gx-scroller-jump .gx-btn")).toContain("pointer-events: auto");
    // The component's root is the positioned box and its control takes no
    // pointer until it is mounted: the drawing uses the same pair.
    expect(style(MESSAGE_SCROLLER_ROOT).position).toBe("relative");
    expect(style(MESSAGE_SCROLLER_JUMP).pointerEvents).toBe("none");
  });

  it("paints the control only while the reader is away from the end", () => {
    expect(markup).not.toContain("gx-scroller-jump");
    expect(markup).not.toContain("Jump to latest");
    expect(markup).toContain(">Append message</button>");
    expect(markup).not.toContain(">Scroll up</button>");
    expect(markup).not.toContain("pinned:");
  });
});

describe("the message-scroller rules", () => {
  it("reads the distance to the tail from the browser's own box", () => {
    expect(
      atEnd({ scrollHeight: 500, scrollTop: 260, clientHeight: 240 }),
    ).toBe(true);
    expect(
      atEnd({ scrollHeight: 500, scrollTop: 236, clientHeight: 240 }),
    ).toBe(true);
    expect(
      atEnd({ scrollHeight: 500, scrollTop: 235, clientHeight: 240 }),
    ).toBe(false);
  });

  it("names the jump control by what it will do", () => {
    expect(jumpLabel(0)).toBe("Jump to latest");
    expect(jumpLabel(1)).toBe("1 new message");
    expect(jumpLabel(3)).toBe("3 new messages");
  });
});
