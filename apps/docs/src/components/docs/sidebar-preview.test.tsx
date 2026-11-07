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

const read = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const css = read("../../styles/demos.css").replace(/\/\*[\s\S]*?\*\//g, "");
const logic = read("../../../../../packages/components/src/sidebar/logic.ts");
const timing = read("../../../../../packages/motion/src/timing.ts");
const drawing = read("./sidebar-demo.tsx");

const rules = (selector: string): ReadonlyArray<string> =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) =>
      (selectors ?? "").split(",").some((one) => one.trim() === selector),
    )
    .map(([, , body]) => body ?? "");

const block = (selector: string): string => rules(selector)[0] ?? "";

const constant = (name: string): number => {
  const value = new RegExp(`export const ${name} = (\\d+);`).exec(logic)?.[1];
  if (value === undefined) throw new Error(`logic.ts: ${name} is not a number`);
  return Number(value);
};

const panel = (mode: (typeof SIDEBAR_MODES)[number], open: boolean): string =>
  renderToStaticMarkup(<SidebarPanel mode={mode} open={open} />);

const scene = renderToStaticMarkup(<SidebarDemo />);

describe("the sidebar drawing", () => {
  it("opens on a framed window with an app bar, not a floating card", () => {
    expect(scene).toContain('class="gx-drawer-frame gx-sidebar-frame"');
    expect(scene).toContain('class="gx-drawer-appbar"');
    expect(scene).toContain('class="gx-drawer-apptitle"');
    expect(scene).toContain('class="gx-drawer-readout"');
    expect(scene).toContain('class="gx-sidebar-body"');
    expect(scene).toContain('class="gx-sidebar-inset"');

    expect(block(".gx-drawer-frame")).toContain("height: 420px");
    expect(block(".gx-drawer-frame")).toContain("overflow: hidden");
    expect(block(".gx-sidebar-frame")).toContain("flex-direction: column");
    expect(block(".gx-sidebar-body")).toContain("flex: 1");
  });

  it("paints the panel at the component's width in every mode", () => {
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

    expect(panel("icon", false)).toContain(`width:${SIDEBAR_ICON_WIDTH}px`);
    expect(panel("offcanvas", false)).toContain(`width:${SIDEBAR_WIDTH}px`);
    expect(panel("offcanvas", false)).toContain(
      `margin-left:-${SIDEBAR_WIDTH}px`,
    );
    expect(panel("none", false)).toContain(`width:${SIDEBAR_WIDTH}px`);
  });

  it("reserves the room the component's gap reserves", () => {
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

    expect(block(".gx-sidebar-panel")).not.toContain("transform");
    expect(drawing).not.toMatch(/translate|transform/);
  });

  it("gives the footer identity the room the shipped panel gives it", () => {
    const expanded = panel("icon", true);
    expect(expanded).toContain(`width:${SIDEBAR_WIDTH}px`);
    expect(expanded).toContain(">Benji van der Brand</span>");
    expect(expanded).toContain(">benji@example.com</span>");
    expect(block(".gx-user-name")).toContain("white-space: nowrap");
    expect(block(".gx-user-name")).not.toContain("text-overflow");
    expect(block(".gx-user-name")).not.toContain("overflow");
    expect(block(".gx-sidebar-footer")).toContain("padding: 8px");

    const room = SIDEBAR_WIDTH - 2 * 8 - 2 * 8 - avatarSize.md - 8 - 8 - 16;

    expect(room).toBeGreaterThanOrEqual(150);
  });

  it("collapses the footer row to its avatar, and only with the panel", () => {
    const icons = panel("icon", false);
    expect(icons).toContain('data-collapsed=""');
    expect(icons).toContain('class="gx-avatar-photo"');
    expect(icons).not.toContain(">Benji van der Brand</span>");
    expect(icons).not.toContain(">benji@example.com</span>");

    expect(panel("none", false)).toContain(">Benji van der Brand</span>");
    expect(panel("offcanvas", false)).toContain(">Benji van der Brand</span>");
  });

  it("offers the collapse modes as a real toggle family", () => {
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
