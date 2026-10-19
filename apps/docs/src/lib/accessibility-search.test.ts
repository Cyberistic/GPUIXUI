import { describe, expect, it } from "vitest";
import { components } from "@/component-meta/registry";
import { missingAria, supportedAria } from "./accessibility";
import { accessibilitySearchEntry } from "./accessibility-search";
import { promotedNameRank } from "./generated-search";

/**
 * The bug guarded: the accessibility page's tables and limitation list are
 * rendered React, so the Fumadocs page index cannot see them. Without this
 * generated document, `aria-valuenow` returns nothing and a reader cannot find
 * the page that explains why the attribute is absent. The test fails when an
 * attribute is added to the module but not indexed, or when the document stops
 * promoting the attribute names.
 */
const attributes = [...supportedAria, ...missingAria].map(
  (row) => row.attribute,
);

const content = accessibilitySearchEntry.index.content;

describe("the accessibility search document", () => {
  it("indexes every supported and missing attribute", () => {
    expect(attributes.filter((name) => !content.includes(name))).toEqual([]);
    expect(
      attributes.filter(
        (name) => !accessibilitySearchEntry.names.includes(name),
      ),
    ).toEqual([]);
    expect(
      attributes.filter(
        (name) => !accessibilitySearchEntry.index.keywords?.includes(name),
      ),
    ).toEqual([]);
  });

  it("promotes an attribute to the accessibility page", () => {
    expect(promotedNameRank(accessibilitySearchEntry, "aria-valuenow")).toBe(0);
    expect(promotedNameRank(accessibilitySearchEntry, "aria-checked")).toBe(0);
    expect(promotedNameRank(accessibilitySearchEntry, "aria-label")).toBe(0);
  });

  it("never promotes an ordinary host prop", () => {
    expect(promotedNameRank(accessibilitySearchEntry, "role")).toBeUndefined();
    expect(
      promotedNameRank(accessibilitySearchEntry, "tabIndex"),
    ).toBeUndefined();
  });

  it("carries every limitation a delivered component records", () => {
    const limited = components.filter(
      (component) =>
        component.status !== "planned" && component.limitations.length > 0,
    );
    expect(limited.length).toBeGreaterThan(0);
    const missing = limited.flatMap((component) =>
      component.limitations
        .filter((limitation) => !content.includes(limitation))
        .map((limitation) => `${component.slug}: ${limitation}`),
    );
    expect(missing).toEqual([]);
  });

  it("sends a reader to the page that owns the answer", () => {
    expect(accessibilitySearchEntry.index.url).toBe("/docs/accessibility");
  });
});
