/**
 * Breadcrumb behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a trail that dropped the current page when collapsed; a
 * separator left behind after its item was hidden; a current page that stayed in
 * the tab order; a link that only answered the mouse; Space activating a link on
 * key down instead of on release; an authored separator glyph that was replaced
 * by `/`; a collapsed middle that used the fallback separator instead of the
 * hidden entry's; and a current page announced by colour alone; and a
 * non-finite `maxItems` that painted an ellipsis over a missing tail (plan 649).
 */

import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../breadcrumb.js";

const Trail = ({
  maxItems,
  onSelect,
}: {
  readonly maxItems?: number;
  readonly onSelect?: () => void;
}) => (
  <Breadcrumb maxItems={maxItems}>
    <BreadcrumbList testId="list">
      <BreadcrumbItem>
        <BreadcrumbLink testId="projects" onSelect={onSelect}>
          Projects
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink testId="gpuixui" onSelect={onSelect}>
          GPUIXUI
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink testId="packages" onSelect={onSelect}>
          packages
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage testId="current">components</BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
);

const separators = (texts: ReadonlyArray<string>): number =>
  texts.filter((text) => text === "/").length;

describe("Breadcrumb", () => {
  it("renders every entry with one separator between neighbours", () => {
    const trail = renderComponent(<Trail />);

    expect(trail.renderer.findByTestId("list")?.customProps?.role).toBe("list");
    expect(trail.renderer.getAllText()).toEqual([
      "Projects",
      "/",
      "GPUIXUI",
      "/",
      "packages",
      "/",
      "components",
    ]);
    expect(separators(trail.renderer.getAllText())).toBe(3);

    trail.unmount();
  });

  it("reports a selected link and not the current page", () => {
    const onSelect = vi.fn();
    const trail = renderComponent(<Trail onSelect={onSelect} />);

    clickCentreOf(trail, "gpuixui");
    expect(onSelect).toHaveBeenCalledTimes(1);

    // The current page is text: it has no interaction and no tab stop.
    expect(
      trail.renderer.findByTestId("current")?.customProps?.tabIndex,
    ).toBeUndefined();
    clickCentreOf(trail, "current");
    expect(onSelect).toHaveBeenCalledTimes(1);

    expect(trail.renderer.findByTestId("packages")?.customProps?.tabIndex).toBe(
      0,
    );

    trail.unmount();
  });

  it("triggers a link from the keyboard", () => {
    const onSelect = vi.fn();
    const trail = renderComponent(<Trail onSelect={onSelect} />);
    trail.renderer.focusElement(
      trail.renderer.findByTestId("projects")?.id ?? -1,
    );

    trail.renderer.simulateKeystrokes("enter");

    expect(onSelect).toHaveBeenCalledTimes(1);

    trail.unmount();
  });

  it("activates Space on release, not on press", () => {
    const onSelect = vi.fn();
    const trail = renderComponent(<Trail onSelect={onSelect} />);
    const link = trail.renderer.findByTestId("projects");
    expect(link).toBeDefined();
    if (link === undefined) return;

    trail.renderer.nativeSimulateKeyDown(link.id, "space");
    expect(onSelect).not.toHaveBeenCalled();

    trail.renderer.nativeSimulateKeyUp(link.id, "space");
    expect(onSelect).toHaveBeenCalledTimes(1);

    trail.unmount();
  });

  it("collapses the middle but always keeps the first and last entries", () => {
    const trail = renderComponent(<Trail maxItems={3} />);
    const texts = trail.renderer.getAllText();

    expect(texts).toContain("Projects");
    expect(texts).toContain("components");
    expect(texts).not.toContain("GPUIXUI");
    expect(texts).not.toContain("packages");
    expect(texts).toContain("…");

    trail.unmount();
  });

  it("keeps the whole trail when maxItems is not a finite number", () => {
    // The bug this guards (plan 649): a `NaN` budget skipped the "fits" branch,
    // `Arr.takeRight` treated the NaN tail length as 0, and the trail painted
    // `Projects …` — the current page and every middle entry were gone.
    const trail = renderComponent(<Trail maxItems={Number.NaN} />);
    const texts = trail.renderer.getAllText();

    expect(texts).toContain("Projects");
    expect(texts).toContain("GPUIXUI");
    expect(texts).toContain("packages");
    expect(texts).toContain("components");
    expect(texts).not.toContain("…");

    trail.unmount();
  });

  it("leaves the collapsing ellipsis out of the tab order", () => {
    const trail = renderComponent(<Trail maxItems={3} />);
    const ellipsis = trail.renderer.findByText("…");

    expect(ellipsis).toBeDefined();
    expect(ellipsis?.customProps?.tabIndex).toBeUndefined();
    // Only the one visible link is a tab stop.
    expect(trail.renderer.findByTestId("projects")?.customProps?.tabIndex).toBe(
      0,
    );
    expect(trail.renderer.findByTestId("packages")).toBeUndefined();

    trail.unmount();
  });

  it("reflects autoFocus in its focus state", () => {
    // The runtime focuses `autoFocus` after React's effects, so `onFocus` never
    // runs; the link's ring must still be painted (plan 388).
    const trail = renderComponent(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink testId="projects" autoFocus>
              Projects
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(focusedTestId(trail)).toEqual(Option.some("projects"));
    expect(
      trail.renderer.findByTestId("projects")?.style.boxShadow,
    ).toBeDefined();

    trail.unmount();
  });

  it("paints an authored separator glyph", () => {
    // The part used to render a literal `/` after spreading props, so the
    // caller's child never reached the runtime.
    const trail = renderComponent(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink>Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>›</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>components</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(trail.renderer.getAllText()).toEqual([
      "Projects",
      "›",
      "components",
    ]);

    trail.unmount();
  });

  it("keeps the hidden entry's separator at the collapsed ellipsis", () => {
    // The ellipsis used the root fallback, so a collapsed authored trail read
    // `Projects / … › components`.
    const trail = renderComponent(
      <Breadcrumb maxItems={3}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink>Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>›</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink>GPUIXUI</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>›</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink>packages</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>›</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>components</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(trail.renderer.getAllText()).toEqual([
      "Projects",
      "›",
      "…",
      "›",
      "components",
    ]);

    trail.unmount();
  });

  it("describes the item that holds the current page", () => {
    // 0.10.0 has no aria-current, so colour alone announced nothing; the item
    // carries the supported description instead.
    const trail = renderComponent(<Trail />);
    const described = nodesWithRole(trail.renderer, "listitem").filter((node) =>
      Option.isSome(node.description),
    );

    expect(described).toHaveLength(1);
    expect(described[0]?.description).toEqual(Option.some("Current page"));

    trail.unmount();
  });

  it("describes a current BreadcrumbLink", () => {
    const asLink = renderComponent(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink current>components</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(nodesWithRole(asLink.renderer, "listitem")[0]?.description).toEqual(
      Option.some("Current page"),
    );

    asLink.unmount();
  });

  it("lets the caller own the current label and description", () => {
    const custom = renderComponent(
      <Breadcrumb currentLabel="Seite">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>components</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(nodesWithRole(custom.renderer, "listitem")[0]?.description).toEqual(
      Option.some("Seite"),
    );

    custom.unmount();

    const authored = renderComponent(
      <Breadcrumb currentLabel="Seite">
        <BreadcrumbList>
          <BreadcrumbItem aria-description="You are here">
            <BreadcrumbPage>components</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(
      nodesWithRole(authored.renderer, "listitem")[0]?.description,
    ).toEqual(Option.some("You are here"));

    authored.unmount();
  });
});
