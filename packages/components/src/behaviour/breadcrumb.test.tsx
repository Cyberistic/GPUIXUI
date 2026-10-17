/**
 * Breadcrumb behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a trail that dropped the current page when collapsed; a
 * separator left behind after its item was hidden; a current page that stayed in
 * the tab order; and a link that only answered the mouse.
 */

import { describe, expect, it, vi } from "vitest";
import { clickCentreOf } from "../internal/interaction.js";
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
});
