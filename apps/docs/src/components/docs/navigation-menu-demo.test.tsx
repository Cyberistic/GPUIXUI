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
