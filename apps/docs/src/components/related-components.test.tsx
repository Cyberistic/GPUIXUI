import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ComponentMetaInput } from "@/component-meta/schema";
import { RelatedComponents, RelatedEntry } from "./related-components";

/**
 * Guards the 404 the first real component page exposed (plan 422): a related
 * record that is still `planned` has no page, so an unconditional link sent the
 * reader to a missing route. A planned record must render as a label; the link
 * returns when the page exists.
 */
const related = (status: ComponentMetaInput["status"]): ComponentMetaInput => ({
  slug: "button-group",
  title: "Button groups",
  tier: "1",
  group: "foundational",
  status,
  gpuix: "yes",
  summary: "Groups related buttons into one control.",
  packageName: "@gpuixui/primitives",
  sourcePath: null,
  dependencies: [],
  related: [],
  playgroundScreen: null,
  screenshots: [],
  limitations: [],
});

describe("related components", () => {
  it("labels a planned record instead of linking to a page that does not exist", () => {
    const html = renderToStaticMarkup(
      <RelatedEntry record={related("planned")} />,
    );
    expect(html).toContain("Button groups (planned)");
    expect(html).not.toContain('href="/docs/components/button-group"');
  });

  it("links a delivered record to its page", () => {
    const html = renderToStaticMarkup(<RelatedEntry record={related("wip")} />);
    expect(html).toContain('href="/docs/components/button-group"');
  });

  it("renders nothing for an unknown component", () => {
    expect(renderToStaticMarkup(<RelatedComponents slug="nope" />)).toBe("");
  });
});
