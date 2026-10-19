import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { bySlug, components, groups } from "@/component-meta/registry";
import type { ComponentMetaInput } from "@/component-meta/schema";
import { supportLegend } from "@/component-meta/support";
import {
  ComponentIndex,
  filterByPreview,
  filterGroups,
  filterQueryFromSearch,
  isLiveComponent,
  matchesComponent,
  previewQueryFromSearch,
  withFilterQuery,
  withPreviewFilter,
} from "./component-index";

/**
 * Guards the generated component index (plan 411 §1) and its local filter
 * (plans 417 and 454): every record must appear once with its status **and**
 * GPUix support, grouped under its tier, and the filter must search the title,
 * summary, documented props types and limitations case-insensitively. The
 * failures it catches are an index that drops the support column (a reader can
 * no longer tell `unverified` from `yes`), a group whose heading vanished, a
 * filter that silently matches nothing, and a filter that stops finding the
 * props type or limitation a record proves.
 */
const html = renderToStaticMarkup(<ComponentIndex />);

const record = (slug: string): ComponentMetaInput => {
  const found = bySlug.get(slug);
  if (found === undefined)
    throw new Error(`registry is missing the ${slug} record`);
  return found;
};

const button = record("button");

describe("component index", () => {
  it("renders one card per registry record", () => {
    const cards = html.match(/data-status=/g) ?? [];
    expect(cards).toHaveLength(components.length);
    Arr.forEach(components, (component) => {
      expect(html).toContain(component.title);
    });
  });

  it("shows GPUix support for every record, not just the status", () => {
    const supports = html.match(/data-gpuix=/g) ?? [];
    expect(supports).toHaveLength(components.length);
    Arr.forEach(components, (component) => {
      expect(html).toContain(`data-gpuix="${component.gpuix}"`);
    });
  });

  it("marks every record with a live scene and no other (plan 570)", () => {
    const live = Arr.filter(components, isLiveComponent);
    expect(html.match(/data-preview="live"/g)).toHaveLength(live.length);
    Arr.forEach(live, (component) => {
      expect(html).toContain(`href="/docs/components/${component.slug}"`);
    });
  });

  it("renders the preview facet with counts derived from the registry", () => {
    const live = Arr.filter(components, isLiveComponent);
    expect(html).toContain(`data-preview-filter="all"`);
    expect(html).toContain(`data-preview-filter="live"`);
    expect(html).toContain(`All components (${components.length})`);
    expect(html).toContain(`Live surface (${live.length})`);
  });

  it("heads every group with its tier", () => {
    Arr.forEach(groups, (group) => {
      expect(html).toContain(`Tier ${group.tier}`);
    });
  });

  it("translates every GPUix-support word in the legend", () => {
    Arr.forEach(supportLegend, ({ value }) => {
      expect(html).toContain(`<code>${value}</code>`);
    });
    expect(
      html.match(/<code>(?:yes|partial|reuse|ours|no|unverified)<\/code>/g),
    ).toHaveLength(supportLegend.length);
  });

  it("links only to components that have a page", () => {
    const planned = Arr.filter(components, (c) => c.status === "planned");
    const linked = html.match(/href="\/docs\/components\/[^"]+"/g) ?? [];
    expect(linked).toHaveLength(components.length - planned.length);
    Arr.forEach(planned, (component) => {
      expect(html).not.toContain(`href="/docs/components/${component.slug}"`);
    });
  });
});

describe("component filter", () => {
  it("renders one labelled search input and the live count", () => {
    expect(html.match(/id="component-filter"/g)).toHaveLength(1);
    expect(html.match(/for="component-filter"/g)).toHaveLength(1);
    expect(html).toContain(
      `${components.length} of ${components.length} components`,
    );
    expect(html).toContain('aria-live="polite"');
  });

  it("matches a title case-insensitively", () => {
    expect(matchesComponent(button, "BUTTON")).toBe(true);
    expect(matchesComponent(button, "  button  ")).toBe(true);
  });

  it("matches a summary, not only the title", () => {
    const words = button.summary.split(" ");
    const phrase = words.slice(0, 2).join(" ");
    expect(matchesComponent(button, phrase)).toBe(true);
  });

  it("matches a documented props type, not only prose", () => {
    expect(matchesComponent(button, "ButtonProps")).toBe(true);
    expect(matchesComponent(button, "buttonprops")).toBe(true);
  });

  it("matches an exported symbol whose inventory title differs", () => {
    expect(matchesComponent(record("spinner"), "Spinner")).toBe(true);
    expect(matchesComponent(record("scroll-area"), "ScrollArea")).toBe(true);
    expect(matchesComponent(record("inline-validation"), "Field")).toBe(true);
    expect(matchesComponent(record("stack"), "Grid")).toBe(true);
  });

  it("matches an exported part name on a compound record only", () => {
    expect(matchesComponent(record("dialog"), "DialogTitle")).toBe(true);
    expect(matchesComponent(record("dialog"), "dialogtitle")).toBe(true);
    expect(matchesComponent(button, "DialogTitle")).toBe(false);
  });

  it("matches the words readers use for a component (plan 566)", () => {
    expect(matchesComponent(record("text-input"), "textbox")).toBe(true);
    expect(matchesComponent(record("checkbox"), "check box")).toBe(true);
    expect(matchesComponent(record("otp-field"), "one time password")).toBe(
      true,
    );
    // An alias belongs to one record: `check box` must not find Boxes.
    expect(matchesComponent(record("box"), "check box")).toBe(false);
    expect(matchesComponent(record("combobox"), "check box")).toBe(false);
  });

  it("matches a documented limitation and returns the records that name it", () => {
    expect(matchesComponent(record("checkbox"), "aria-checked")).toBe(true);
    const slugs = Arr.flatMap(filterGroups("aria-checked"), (group) =>
      Arr.map(group.items, (item) => item.slug),
    );
    expect(slugs).toContain("checkbox");
    expect(slugs).toContain("switch");
    expect(slugs).not.toContain("card");
  });

  it("still rejects a word no field proves", () => {
    expect(matchesComponent(button, "portal")).toBe(false);
  });

  it("treats blank queries as match-all and unknown queries as match-none", () => {
    expect(Arr.filter(components, (c) => matchesComponent(c, ""))).toHaveLength(
      components.length,
    );
    expect(
      Arr.filter(components, (c) => matchesComponent(c, "   ")),
    ).toHaveLength(components.length);
    expect(
      Arr.filter(components, (c) => matchesComponent(c, "zzz")),
    ).toHaveLength(0);
  });

  it("drops empty groups and keeps only matching items", () => {
    const filtered = filterGroups("combobox");
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(groups.length);
    expect(
      Arr.every(
        filtered,
        (group) =>
          group.items.length > 0 &&
          group.items.every(
            (item) => matchesComponent(item, "combobox") === true,
          ),
      ),
    ).toBe(true);
    expect(filterGroups("zzz")).toHaveLength(0);
  });
});

describe("component preview facet", () => {
  const live = Arr.filter(components, isLiveComponent);
  const cardRecord = record("card");

  it("keeps exactly the live records, once each, in registry order", () => {
    const filtered = filterByPreview(groups, "live");
    const slugs = Arr.flatMap(filtered, (group) =>
      Arr.map(group.items, (item) => item.slug),
    );
    expect(slugs).toEqual(Arr.map(live, (component) => component.slug));
  });

  it("drops a non-live record from the live facet", () => {
    expect(isLiveComponent(cardRecord)).toBe(false);
    const filtered = filterByPreview(
      [
        {
          tier: cardRecord.tier,
          group: cardRecord.group,
          items: [cardRecord],
        },
      ],
      "live",
    );
    expect(filtered).toHaveLength(0);
  });

  it("leaves every group untouched for the all facet", () => {
    expect(filterByPreview(groups, "all")).toBe(groups);
  });

  it("intersects with the text filter in both directions", () => {
    const liveButton = filterByPreview(filterGroups("button"), "live");
    expect(
      Arr.flatMap(liveButton, (group) => Arr.map(group.items, (i) => i.slug)),
    ).toContain("button");

    expect(isLiveComponent(cardRecord)).toBe(false);
    expect(
      filterByPreview(filterGroups(cardRecord.title), "live"),
    ).toHaveLength(0);
  });

  it("reads the facet a deep link carried, defaulting unknown to all", () => {
    expect(previewQueryFromSearch("?preview=live")).toBe("live");
    expect(previewQueryFromSearch("?preview=all")).toBe("all");
    expect(previewQueryFromSearch("?preview=zzz")).toBe("all");
    expect(previewQueryFromSearch("")).toBe("all");
  });

  it("writes the facet without losing the query or platform", () => {
    expect(withPreviewFilter("?q=Dialog&platform=win32", "live")).toBe(
      "?q=Dialog&platform=win32&preview=live",
    );
    expect(withPreviewFilter("?q=Dialog&preview=live", "all")).toBe(
      "?q=Dialog",
    );
    expect(withPreviewFilter("", "all")).toBe("");
  });
});

describe("component filter URL", () => {
  it("reads the filter a search result carried", () => {
    const query = filterQueryFromSearch("?q=Dialogs");
    expect(query).toBe("Dialogs");
    expect(
      Arr.every(filterGroups(query), (group) =>
        group.items.every((item) => matchesComponent(item, query)),
      ),
    ).toBe(true);
  });

  it("treats an absent or blank query as no filter", () => {
    expect(filterQueryFromSearch("")).toBe("");
    expect(filterQueryFromSearch("?q=%20%20")).toBe("");
  });

  it("keeps unrelated parameters when the filter changes", () => {
    expect(withFilterQuery("?platform=win32", "Dialog")).toBe(
      "?platform=win32&q=Dialog",
    );
  });

  it("removes the filter when it is cleared, keeping the platform", () => {
    expect(withFilterQuery("?q=Dialog", "")).toBe("");
    expect(withFilterQuery("?platform=win32&q=Dialog", "")).toBe(
      "?platform=win32",
    );
  });
});
