import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  TYPEAHEAD_WINDOW_MS,
  focusAfterClose,
  idleTyped,
  keyboardAnchor,
  pointerAnchor,
  restoresFocus,
  rightPress,
  typeChar,
  typed,
  typedMatch,
  type TypedRow,
} from "./context-menu-preview";

/**
 * The context menu model has to say four things the component does: the
 * keyboard route opens at the trigger's bottom-left, only a keyboard-opened
 * menu restores focus, a right press outside the trigger cannot open a surface,
 * and a typed prefix searches after the current row with a 500 ms window.
 *
 * Each is invisible in a drawing and easy to get subtly wrong: a menu restored
 * after a pointer press steals focus from where the reader pressed, and a
 * type-ahead that does not advance makes `s` stick on the first row beginning
 * with `s`. The last case reads the shipped `context-menu.tsx` and
 * `internal/typeahead.ts`, so this model cannot drift from them.
 */

const component = readFileSync(
  new URL(
    "../../../../../packages/components/src/context-menu.tsx",
    import.meta.url,
  ),
  "utf8",
);

const typeahead = readFileSync(
  new URL(
    "../../../../../packages/components/src/internal/typeahead.ts",
    import.meta.url,
  ),
  "utf8",
);

const flat = (source: string): string => source.replace(/\s+/g, " ");

/** The rows the preview's menu lists, in declaration order. */
const rows: ReadonlyArray<TypedRow> = [
  { label: "Open" },
  { label: "Rename" },
  { label: "Copy path" },
  { label: "Share" },
  { label: "Duplicate", disabled: true },
  { label: "Show hidden files" },
  { label: "Delete" },
];

describe("where a context menu opens", () => {
  it("opens at the trigger's bottom-left from Shift+F10", () => {
    expect(keyboardAnchor({ x: 40, y: 120, width: 220, height: 32 })).toEqual({
      x: 40,
      y: 152,
    });
  });

  it("keeps the pointer point the aux click reported", () => {
    expect(pointerAnchor({ x: 312, y: 208 })).toEqual({ x: 312, y: 208 });
  });

  it("opens at the origin when the payload carries no point", () => {
    // The component falls back to `?? 0` rather than refusing to open, so the
    // drawing must not invent a fallback of its own.
    expect(pointerAnchor({})).toEqual({ x: 0, y: 0 });
    expect(pointerAnchor({ x: null, y: null })).toEqual({ x: 0, y: 0 });
  });

  it("reads both points from the shipped component's own handlers", () => {
    const source = flat(component);

    expect(source).toContain("openAt({ x: event.x ?? 0, y: event.y ?? 0 })");
    expect(source).toContain(
      "openFromKeyboard({ x: bounds.x, y: bounds.y + bounds.height })",
    );
    // The right press is the only path that opens from a pointer.
    expect(source).toContain("event.isRightClick !== true");
    expect(source).toContain("if (isMenuKey(event)) openFromKey();");
  });
});

describe("what one press does", () => {
  it("ignores a primary press", () => {
    expect(
      rightPress({ isRightClick: false, onTrigger: true, open: false }),
    ).toBe("ignore");
  });

  it("opens on the trigger and closes an open surface behind it", () => {
    // `openAt` sets the new point before it opens, so a second right click on
    // the trigger moves the surface rather than stacking a second one.
    expect(
      rightPress({ isRightClick: true, onTrigger: true, open: false }),
    ).toBe("open");
    expect(
      rightPress({ isRightClick: true, onTrigger: true, open: true }),
    ).toBe("open");
  });

  it("closes on a right press outside the trigger and never opens there", () => {
    expect(
      rightPress({ isRightClick: true, onTrigger: false, open: true }),
    ).toBe("close");
    expect(
      rightPress({ isRightClick: true, onTrigger: false, open: false }),
    ).toBe("ignore");
  });
});

describe("where focus goes after a close", () => {
  it("returns to the trigger only for a keyboard-opened menu", () => {
    expect(restoresFocus("keyboard", "dismiss")).toBe(true);
    expect(restoresFocus("keyboard", "activate")).toBe(true);
    expect(restoresFocus("pointer", "dismiss")).toBe(false);
    expect(restoresFocus("pointer", "activate")).toBe(false);
  });

  it("leaves focus where the reader went for Tab and an outside press", () => {
    expect(focusAfterClose("keyboard", "leave")).toBe("none");
    expect(focusAfterClose("keyboard", "outside")).toBe("none");
  });

  it("mirrors the component's restore gate", () => {
    // The gate is one condition in the component: a recorded restore target and
    // one of the two reasons that use it.
    const source = flat(component);

    expect(source).toContain("restoreFocus.current = true;");
    expect(source).toContain('(reason === "activate" || reason === "dismiss")');
    expect(source).toContain("restoreFocus.current = false;");
    expect(source).toContain(
      'close(event.eventType === "keyDown" ? "dismiss" : "outside")',
    );
  });
});

describe("type-ahead", () => {
  it("jumps to the first row beginning with the typed letter", () => {
    expect(typedMatch(rows, undefined, "r")).toBe(1);
  });

  it("searches after the current row, so a repeat advances", () => {
    // Two rows begin with `s`; the second `s` is the desktop convention for
    // "the next one", not a wider prefix.
    const first = typeChar(rows, undefined, idleTyped, "s", 1_000);
    expect(first.index).toBe(3);
    const second =
      first.index === undefined
        ? first
        : typeChar(rows, first.index, first.buffer, "s", 1_100);
    expect(second.index).toBe(5);
  });

  it("appends a different letter and wraps to an earlier match", () => {
    const start = typeChar(rows, undefined, idleTyped, "c", 1_000);
    expect(start.index).toBe(2);
    // `co` still matches "Copy path" — and because the match is *before* the
    // current row, the search wraps rather than starting a second one.
    const longer =
      start.index === undefined
        ? start
        : typeChar(rows, start.index, start.buffer, "o", 1_100);
    expect(longer.index).toBe(2);
    expect(longer.buffer.text).toBe("co");
    // A prefix no row carries clears the buffer instead of poisoning the next
    // keystroke with an unmatched search.
    const miss =
      longer.index === undefined
        ? longer
        : typeChar(rows, longer.index, longer.buffer, "z", 1_200);
    expect(miss.index).toBeUndefined();
    expect(miss.buffer).toEqual(idleTyped);
  });

  it("skips a disabled row even when its label matches", () => {
    expect(typedMatch(rows, undefined, "d")).toBe(6);
  });

  it("starts a fresh prefix after the window closes", () => {
    const first = typeChar(rows, undefined, idleTyped, "s", 1_000);
    const buffer = first.buffer;
    expect(buffer.text).toBe("s");
    expect(typed(buffer, "h", 1_000 + TYPEAHEAD_WINDOW_MS + 1).text).toBe("h");
    expect(typed(buffer, "h", 1_000 + TYPEAHEAD_WINDOW_MS).text).toBe("sh");
  });

  it("reads the window and the advance rule from the shipped module", () => {
    const source = flat(typeahead);

    expect(TYPEAHEAD_WINDOW_MS).toBe(500);
    expect(source).toContain("Duration.millis(500)");
    expect(source).toContain("candidate.index > fromIndex");
    expect(source).toContain("Option.orElse(() => Arr.head(candidates))");
  });
});
