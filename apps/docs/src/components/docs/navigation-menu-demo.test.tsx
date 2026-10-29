import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  NavigationMenuDemo,
  NavigationMenuStates,
  navigationMenuDemoSource,
  navigationMenuStatesSource,
} from "./navigation-menu-demo";

/**
 * The navigation menu previews, as they render.
 *
 * The page's two drawings are the only place a reader sees one panel open, and
 * a demo that lost the `aria-expanded` mark or rendered two panels would still
 * build. These cases hold the markup to the rules the model owns: one open
 * panel on the workflow, three stills in the states scene, a disabled trigger
 * that cannot be opened, and source strings that name the parts they teach.
 */

const workflow = renderToStaticMarkup(<NavigationMenuDemo />);
const states = renderToStaticMarkup(<NavigationMenuStates />);

/** The panels a rendering paints: a `role="group"` per open item. */
const panels = (markup: string): number =>
  (markup.match(/role="group"/g) ?? []).length;

/** The triggers a rendering paints, expanded or not. */
const triggers = (markup: string): number =>
  (markup.match(/class="gx-nav-trigger"/g) ?? []).length;

describe("the navigation menu previews", () => {
  it("opens one panel on the workflow and names it in the readout", () => {
    expect(triggers(workflow)).toBe(3);
    expect(panels(workflow)).toBe(1);
    expect(workflow).toContain("open: Platform");
    expect(workflow).toContain('aria-expanded="true"');
    expect(workflow).toContain('aria-expanded="false"');
    // One trigger is the group's tab stop; the other two are reachable by key.
    expect((workflow.match(/tabindex="0"/g) ?? []).length).toBe(1);
    expect((workflow.match(/tabindex="-1"/g) ?? []).length).toBeGreaterThan(0);
  });

  it("paints the panel as a group named by the item's value, with its links as buttons", () => {
    // The native panel takes the item's `value`, not its visible label; the
    // drawing mirrors that so the page's accessibility note is visible.
    expect(workflow).toContain('aria-label="platform"');
    expect(workflow).toContain('class="gx-nav-content" role="group"');
    const links = workflow.match(/class="gx-nav-link"/g) ?? [];
    expect(links).toHaveLength(3);
    expect(workflow).toContain(">Overview<");
    expect(workflow).toContain("Press outside the nav");
  });

  it("renders three stills, and a disabled trigger that opens nothing", () => {
    expect(triggers(states)).toBe(9);
    // At rest, one open, and a disabled trigger: exactly one panel in the scene.
    expect(panels(states)).toBe(1);
    expect(states).toContain('disabled=""');
    expect(states).toContain("A disabled trigger");
    expect(states).toContain("At rest");
  });

  it("ships a copyable source that names the parts each drawing uses", () => {
    expect(navigationMenuDemoSource).toContain("NavigationMenuItem");
    expect(navigationMenuDemoSource).toContain("NavigationMenuTrigger");
    expect(navigationMenuDemoSource).toContain("onValueChange");
    expect(navigationMenuStatesSource).toContain("defaultValue");
    expect(navigationMenuStatesSource).toContain(
      "<NavigationMenuTrigger disabled>",
    );
  });
});

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

/** The icon scale's smallest step, and the two lucide marks. */
const scale = readFileSync(
  new URL("../../../../../packages/tokens/src/scale.ts", import.meta.url),
  "utf8",
);
const registry = readFileSync(
  new URL("../../../../../packages/icons/src/registry.ts", import.meta.url),
  "utf8",
);

/** The declarations of the first `selector { … }` block. */
const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

/** A pixel declaration, or `NaN` when the drawing does not declare it. */
const px = (body: string, property: string): number => {
  const value = new RegExp(`${property}:\\s*(-?\\d+)px`).exec(body)?.[1];
  return value === undefined ? Number.NaN : Number(value);
};

describe("the navigation menu's chevron", () => {
  it("paints both lucide marks in one fixed slot on every trigger", () => {
    expect(workflow).not.toMatch(/[⌄⌃]/);
    // Three triggers, two marks each: down is at rest, up is the open flip.
    expect(workflow.match(/class="gx-nav-chevron"/g)).toHaveLength(3);
    expect(workflow.match(/data-mark="down"/g)).toHaveLength(3);
    expect(workflow.match(/data-mark="up"/g)).toHaveLength(3);

    // The slot is one box the size of the icons' `xs` step, so the open state
    // cannot change the trigger's width.
    const xs = /export const iconSize[^}]*xs: (\d+)/.exec(scale)?.[1];
    expect(block(".gx-nav-chevron")).toContain(`width: ${xs}px`);
    expect(block(".gx-nav-chevron")).toContain(`height: ${xs}px`);
    expect(block(".gx-nav-chevron")).toContain("flex: none");

    // The two paths are the icon set's own, not a hand-drawn caret.
    expect(registry).toContain('"chevron-down": \'<path d="m6 9 6 6 6-6"/>\'');
    expect(workflow).toContain('d="m6 9 6 6 6-6"');
    expect(workflow).toContain('d="m18 15-6-6-6 6"');
  });

  it("cross-fades the marks and slides the panel in", () => {
    // The native trigger cross-fades 2px on the `normal` level; the drawing's
    // marks do the same, and the panel fades 4px out from its trigger.
    expect(block(".gx-nav-chevron-mark")).toContain("transition:");
    expect(
      block('.gx-nav-chevron[data-open] .gx-nav-chevron-mark[data-mark="up"]'),
    ).toContain("opacity: 1");
    expect(block(".gx-nav-content")).toContain(
      "animation: gx-nav-panel-in 200ms ease-out",
    );
  });
});

describe("the navigation menu's panel room", () => {
  it("keeps the whole panel inside the stage", () => {
    // The bug this guards: the panel is out of flow, so the stage's content
    // ended above the panel's last row and `overflow: auto` cut it — the panel
    // reached 620.4px against a 613.8px stage at every width. The scene now
    // reserves the panel's own box under the bar, and the demo's controls
    // follow the reserve, so the stage always contains what the nav opens.
    const panel = 138; // measured: three 40px rows, 6px insets, a 1px border
    const overshoot = panel - 7; // the panel starts inside the bar's padding

    expect(px(block(".gx-nav-scene"), "padding-bottom")).toBeGreaterThanOrEqual(
      overshoot,
    );
    // The controls are a sibling of the scene, below the reserved box.
    expect(workflow).toContain('</nav></div><div class="gx-nav-controls">');
  });
});
