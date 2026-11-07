import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  NavigationMenuDemo,
  NavigationMenuStates,
  navigationMenuDemoSource,
  navigationMenuStatesSource,
} from "./navigation-menu-demo";

const workflow = renderToStaticMarkup(<NavigationMenuDemo />);
const states = renderToStaticMarkup(<NavigationMenuStates />);

const panels = (markup: string): number =>
  (markup.match(/role="group"/g) ?? []).length;

const triggers = (markup: string): number =>
  (markup.match(/class="gx-nav-trigger"/g) ?? []).length;

describe("the navigation menu previews", () => {
  it("opens one panel on the workflow and names it in the readout", () => {
    expect(triggers(workflow)).toBe(3);
    expect(panels(workflow)).toBe(1);
    expect(workflow).toContain("open: Platform");
    expect(workflow).toContain('aria-expanded="true"');
    expect(workflow).toContain('aria-expanded="false"');

    expect((workflow.match(/tabindex="0"/g) ?? []).length).toBe(1);
    expect((workflow.match(/tabindex="-1"/g) ?? []).length).toBeGreaterThan(0);
  });

  it("paints the panel as a group named by the item's value, with its links as buttons", () => {
    expect(workflow).toContain('aria-label="platform"');
    expect(workflow).toContain('class="gx-nav-content" role="group"');
    const links = workflow.match(/class="gx-nav-link"/g) ?? [];
    expect(links).toHaveLength(3);
    expect(workflow).toContain(">Overview<");
    expect(workflow).toContain("Press outside the nav");
  });

  it("renders three stills, and a disabled trigger that opens nothing", () => {
    expect(triggers(states)).toBe(9);

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

const scale = readFileSync(
  new URL("../../../../../packages/tokens/src/scale.ts", import.meta.url),
  "utf8",
);
const registry = readFileSync(
  new URL("../../../../../packages/icons/src/registry.ts", import.meta.url),
  "utf8",
);

const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

const px = (body: string, property: string): number => {
  const value = new RegExp(`${property}:\\s*(-?\\d+)px`).exec(body)?.[1];
  return value === undefined ? Number.NaN : Number(value);
};

describe("the navigation menu's chevron", () => {
  it("paints both lucide marks in one fixed slot on every trigger", () => {
    expect(workflow).not.toMatch(/[⌄⌃]/);

    expect(workflow.match(/class="gx-nav-chevron"/g)).toHaveLength(3);
    expect(workflow.match(/data-mark="down"/g)).toHaveLength(3);
    expect(workflow.match(/data-mark="up"/g)).toHaveLength(3);

    const xs = /export const iconSize[^}]*xs: (\d+)/.exec(scale)?.[1];
    expect(block(".gx-nav-chevron")).toContain(`width: ${xs}px`);
    expect(block(".gx-nav-chevron")).toContain(`height: ${xs}px`);
    expect(block(".gx-nav-chevron")).toContain("flex: none");

    expect(registry).toContain('"chevron-down": \'<path d="m6 9 6 6 6-6"/>\'');
    expect(workflow).toContain('d="m6 9 6 6 6-6"');
    expect(workflow).toContain('d="m18 15-6-6-6 6"');
  });

  it("cross-fades the marks and slides the panel in", () => {
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
    const panel = 138;
    const overshoot = panel - 7;

    expect(px(block(".gx-nav-scene"), "padding-bottom")).toBeGreaterThanOrEqual(
      overshoot,
    );

    expect(workflow).toContain('</nav></div><div class="gx-nav-controls">');
  });
});
