import { avatarSize } from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SidebarDemo, SidebarPanel } from "./sidebar-demo";
import {
  SIDEBAR_ICON_WIDTH,
  SIDEBAR_MODES,
  SIDEBAR_WIDTH,
  panelGap,
  panelOffset,
  panelWidth,
} from "./sidebar-preview";

/**
 * The sidebar drawing has to be a picture of the window the component fills.
 *
 * The bugs these guard: the page drew a 176px floating card with no window
 * around it — no app bar, no inset, and the owner's name truncated to "Benji
 * van der …" — while `sidebar.tsx` ships a 256px panel and a 48px icon rail
 * inside the application's window. The drawing cannot mount the GPUix tree, so
 * its numbers are mirrored and the cases read them back out of the component.
 *
 * `node:fs` is a test-time read of checked-in files.
 */

const read = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const css = read("../../styles/demos.css").replace(/\/\*[\s\S]*?\*\//g, "");
const logic = read("../../../../../packages/components/src/sidebar/logic.ts");
const timing = read("../../../../../packages/motion/src/timing.ts");
const drawing = read("./sidebar-demo.tsx");

/** Every block whose selector list names `selector` exactly. */
const rules = (selector: string): ReadonlyArray<string> =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) =>
      (selectors ?? "").split(",").some((one) => one.trim() === selector),
    )
    .map(([, , body]) => body ?? "");

/** The declarations of the first `selector { … }` block. */
const block = (selector: string): string => rules(selector)[0] ?? "";

/** A number `logic.ts` exports. */
const constant = (name: string): number => {
  const value = new RegExp(`export const ${name} = (\\d+);`).exec(logic)?.[1];
  if (value === undefined) throw new Error(`logic.ts: ${name} is not a number`);
  return Number(value);
};

/** One panel, at the mode and state a case is about. */
const panel = (mode: (typeof SIDEBAR_MODES)[number], open: boolean): string =>
  renderToStaticMarkup(<SidebarPanel mode={mode} open={open} />);

const scene = renderToStaticMarkup(<SidebarDemo />);

describe("the sidebar drawing", () => {
  it("opens on a framed window with an app bar, not a floating card", () => {
    // The bug this guards: the old drawing was one rounded box around the
    // panel, so a reader never saw the window the panel is the left of.
    expect(scene).toContain('class="gx-drawer-frame gx-sidebar-frame"');
    expect(scene).toContain('class="gx-drawer-appbar"');
    expect(scene).toContain('class="gx-drawer-apptitle"');
    expect(scene).toContain('class="gx-drawer-readout"');
    expect(scene).toContain('class="gx-sidebar-body"');
    expect(scene).toContain('class="gx-sidebar-inset"');

    // The frame is a clipped window with a fixed height, and its body is the
    // row the panel and the inset share.
    expect(block(".gx-drawer-frame")).toContain("height: 420px");
    expect(block(".gx-drawer-frame")).toContain("overflow: hidden");
    expect(block(".gx-sidebar-frame")).toContain("flex-direction: column");
    expect(block(".gx-sidebar-body")).toContain("flex: 1");
  });

  it("paints the panel at the component's width in every mode", () => {
    // A preview is never the authority: the widths are the component's own.
    expect(SIDEBAR_WIDTH).toBe(constant("SIDEBAR_WIDTH"));
    expect(SIDEBAR_ICON_WIDTH).toBe(constant("SIDEBAR_WIDTH_ICON"));
    expect(logic.replace(/\s+/g, " ")).toContain(
      `Schema.Literals([${SIDEBAR_MODES.map((mode) => `"${mode}"`).join(", ")}])`,
    );

    for (const mode of SIDEBAR_MODES) {
      expect(panel(mode, true), `${mode} open`).toContain(
        `width:${SIDEBAR_WIDTH}px`,
      );
    }
    // Only the icon mode shrinks; offcanvas keeps its width and travels, and
    // `none` does not collapse at all.
    expect(panel("icon", false)).toContain(`width:${SIDEBAR_ICON_WIDTH}px`);
    expect(panel("offcanvas", false)).toContain(`width:${SIDEBAR_WIDTH}px`);
    expect(panel("offcanvas", false)).toContain(
      `margin-left:-${SIDEBAR_WIDTH}px`,
    );
    expect(panel("none", false)).toContain(`width:${SIDEBAR_WIDTH}px`);
  });

  it("reserves the room the component's gap reserves", () => {
    // The panel is in flow, so its occupied width is where the inset starts:
    // an icon rail gives back what it shrinks by, and a parked offcanvas panel
    // gives back its whole width. This is `sidebarGap` in `logic.ts`.
    for (const mode of SIDEBAR_MODES) {
      for (const open of [true, false]) {
        expect(panelWidth(mode, open) + panelOffset(mode, open)).toBe(
          panelGap(mode, open),
        );
      }
    }
    expect(panelGap("offcanvas", false)).toBe(0);
    expect(panelGap("icon", false)).toBe(SIDEBAR_ICON_WIDTH);
  });

  it("moves the panel with the component's own timing, not a literal", () => {
    const level = /useMoveTiming\("(\w+)"\)/.exec(
      read("../../../../../packages/components/src/sidebar.tsx"),
    )?.[1];
    if (level === undefined)
      throw new Error("the sidebar names no timing level");
    const milliseconds = Number(
      new RegExp(`${level}: (\\d+)`).exec(timing)?.[1],
    );
    expect(milliseconds).toBeGreaterThan(0);
    expect(block(".gx-sidebar-panel")).toContain(
      `--gx-sidebar-ms: ${milliseconds}ms`,
    );
    expect(block(".gx-sidebar-panel").replace(/\s+/g, " ")).toContain(
      "transition: width var(--gx-sidebar-ms) ease, margin-left var(--gx-sidebar-ms) ease",
    );
    // The runtime has no `transform`, so the drawing moves the panel by an edge
    // offset rather than translating a layer.
    expect(block(".gx-sidebar-panel")).not.toContain("transform");
    expect(drawing).not.toMatch(/translate|transform/);
  });

  it("gives the footer identity the room the shipped panel gives it", () => {
    // The bug this guards: at the old 176px width the account row squeezed the
    // name into "Benji van der …". `USER_MENU_NAME` truncates only when its
    // column is too narrow, so the panel width and the row's chrome are the
    // whole story — the name is never given an ellipsis by this drawing.
    const expanded = panel("icon", true);
    expect(expanded).toContain(`width:${SIDEBAR_WIDTH}px`);
    expect(expanded).toContain(">Benji van der Brand</span>");
    expect(expanded).toContain(">benji@example.com</span>");
    expect(block(".gx-user-name")).toContain("white-space: nowrap");
    expect(block(".gx-user-name")).not.toContain("text-overflow");
    expect(block(".gx-user-name")).not.toContain("overflow");
    expect(block(".gx-sidebar-footer")).toContain("padding: 8px");

    const room = SIDEBAR_WIDTH - 2 * 8 - 2 * 8 - avatarSize.md - 8 - 8 - 16;
    // At 176px the same row left 80px, which cannot hold the name; the shipped
    // 256px panel leaves it whole.
    expect(room).toBeGreaterThanOrEqual(150);
  });

  it("collapses the footer row to its avatar, and only with the panel", () => {
    const icons = panel("icon", false);
    expect(icons).toContain('data-collapsed=""');
    expect(icons).toContain('class="gx-avatar-photo"');
    expect(icons).not.toContain(">Benji van der Brand</span>");
    expect(icons).not.toContain(">benji@example.com</span>");
    // The other modes hide nothing: `none` never collapses, and an offcanvas
    // panel is the full row parked outside the window.
    expect(panel("none", false)).toContain(">Benji van der Brand</span>");
    expect(panel("offcanvas", false)).toContain(">Benji van der Brand</span>");
  });

  it("offers the collapse modes as a real toggle family", () => {
    // The controls are the library's pressed-toggle family, above the frame,
    // and the collapse control names the action it will take.
    expect(scene).toContain('class="gx-tgroup"');
    expect(scene).toContain('aria-label="Collapsible mode"');
    for (const mode of SIDEBAR_MODES) {
      expect(scene).toContain(`>${mode}</button>`);
    }
    expect(scene).toContain('aria-pressed="true"');
    expect(scene).toContain('aria-expanded="true"');
    expect(scene).toContain(">Collapse sidebar</button>");
    expect(block(".gx-toggle[data-pressed]")).toContain(
      "background: var(--accent)",
    );
  });
});
