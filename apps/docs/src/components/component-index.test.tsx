import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { bySlug, components, groups } from "@/component-meta/registry";
import type { ComponentMetaInput } from "@/component-meta/schema";
import { supportLegend } from "@/component-meta/support";
import {
  ComponentIndex,
  filterGroups,
  filterQueryFromSearch,
  matchesComponent,
  withFilterQuery,
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

  it("matches an exported part name on a compound record only", () => {
    expect(matchesComponent(record("dialog"), "DialogTitle")).toBe(true);
    expect(matchesComponent(record("dialog"), "dialogtitle")).toBe(true);
    expect(matchesComponent(button, "DialogTitle")).toBe(false);
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
