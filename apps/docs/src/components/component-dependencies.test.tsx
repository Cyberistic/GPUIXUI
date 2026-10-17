import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComponentDependencies } from "./component-dependencies";

/**
 * Guards the rendered `Dependencies` block (plan 428): the record is right but a
 * grouping or filter bug can still print an empty section or an unlinked
 * component. The preview tests are the precedent for rendering at this boundary.
 */
describe("component dependencies block", () => {
  it("prints the package, the modules and a link for every composed component", () => {
    const html = renderToStaticMarkup(
      <ComponentDependencies slug="command-menu" />,
    );

    expect(html).toContain("@gpuixui/components");
    expect(html).toContain("@gpuix/react/floating");
    expect(html).toContain('href="/docs/components/dialog"');
    expect(html).toContain("Dialogs");
  });

  it("says so when a component needs nothing beyond its peers", () => {
    const html = renderToStaticMarkup(<ComponentDependencies slug="box" />);

    expect(html).toContain("Nothing beyond the peer packages.");
    expect(html).not.toContain("Composes");
  });

  it("reports an unknown component instead of rendering an empty block", () => {
    const html = renderToStaticMarkup(
      <ComponentDependencies slug="does-not-exist" />,
    );

    expect(html).toContain("Unknown component");
  });
});
