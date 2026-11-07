import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MENU_CLOSE_GRACE_MS,
  SUBMENU_GAP,
  SUBMENU_OPEN_DELAY_MS,
  TYPEAHEAD_WINDOW_MS,
  focusAfterClose,
  idleTyped,
  keyboardAnchor,
  placeSurface,
  pointerAnchor,
  restoresFocus,
  rightPress,
  submenuPlacement,
  typeChar,
  typed,
  typedMatch,
  type TypedRow,
} from "./context-menu-preview";

const component = readFileSync(
  new URL(
    "../../../../../packages/components/src/context-menu.tsx",
    import.meta.url,
  ),
  "utf8",
);

const typeahead = readFileSync(
  new URL(
    "../../../../../packages/components/src/typeahead.ts",
    import.meta.url,
  ),
  "utf8",
);

const menuHover = readFileSync(
  new URL(
    "../../../../../packages/components/src/menu/hover.ts",
    import.meta.url,
  ),
  "utf8",
);

const menuSub = readFileSync(
  new URL(
    "../../../../../packages/components/src/menu/sub.tsx",
    import.meta.url,
  ),
  "utf8",
);

const demo = readFileSync(
  new URL("./context-menu-demo.tsx", import.meta.url),
  "utf8",
);

const flat = (source: string): string => source.replace(/\s+/g, " ");

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
    expect(pointerAnchor({})).toEqual({ x: 0, y: 0 });
    expect(pointerAnchor({ x: null, y: null })).toEqual({ x: 0, y: 0 });
  });

  it("reads both points from the shipped component's own handlers", () => {
    const source = flat(component);

    expect(source).toContain("openAt({ x: event.x ?? 0, y: event.y ?? 0 })");
    expect(source).toContain(
      "openFromKeyboard({ x: bounds.x, y: bounds.y + bounds.height })",
    );

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

    const longer =
      start.index === undefined
        ? start
        : typeChar(rows, start.index, start.buffer, "o", 1_100);
    expect(longer.index).toBe(2);
    expect(longer.buffer.text).toBe("co");

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

describe("opening the drawing moves nothing", () => {
  it("rests the surface inside the frame it is drawn in", () => {
    const frame = { width: 520, height: 206 };
    const surface = { width: 208, height: 156 };

    expect(placeSurface({ x: 300, y: 120 }, surface, frame)).toEqual({
      x: 300,
      y: 50,
    });

    expect(placeSurface({ x: 40, y: 20 }, surface, frame)).toEqual({
      x: 40,
      y: 20,
    });
  });

  it("never places a surface outside its frame, even one that cannot fit", () => {
    expect(
      placeSurface(
        { x: 500, y: 500 },
        { width: 640, height: 320 },
        { width: 520, height: 206 },
      ),
    ).toEqual({ x: 0, y: 0 });
  });

  it("flips the second level inside the frame it opens beside", () => {
    const frame = { width: 520, height: 320 };
    const submenu = { width: 208, height: 60 };
    const parent = { x: 312, y: 84, width: 208, height: 156 };
    const row = { x: 317, y: 88, width: 196, height: 28 };

    const flipped = submenuPlacement({ parent, row, submenu, frame });
    const flippedBox = {
      left: parent.x + flipped.x,
      top: parent.y + flipped.y,
      right: parent.x + flipped.x + submenu.width,
      bottom: parent.y + flipped.y + submenu.height,
    };

    expect(flippedBox.right).toBe(parent.x - SUBMENU_GAP);
    expect(flippedBox.left).toBeGreaterThanOrEqual(0);
    expect(flippedBox.top).toBe(row.y);
    expect(flippedBox.bottom).toBeLessThanOrEqual(frame.height);

    const roomy = submenuPlacement({
      parent: { ...parent, x: 40 },
      row,
      submenu,
      frame,
    });
    expect(roomy).toEqual({
      x: parent.width + SUBMENU_GAP,
      y: row.y - parent.y,
    });

    expect(flat(demo)).toContain("submenuPlacement({");
    expect(flat(menuSub)).toContain("const SUBMENU_GAP = 4");
    expect(SUBMENU_GAP).toBe(4);
  });

  it("focuses the surface without scrolling the page it opened over", () => {
    expect(flat(demo)).toContain(
      "surface.current?.focus({ preventScroll: true })",
    );
    expect(flat(demo)).not.toContain("surface.current?.focus();");
  });

  it("keeps Base UI's two waits, read from the shipped menu", () => {
    expect(SUBMENU_OPEN_DELAY_MS).toBe(100);
    expect(MENU_CLOSE_GRACE_MS).toBe(80);
    expect(flat(menuHover)).toContain("submenuOpenDelayMs = 100");
    expect(flat(menuHover)).toContain("menuCloseGraceMs = 80");
  });
});
