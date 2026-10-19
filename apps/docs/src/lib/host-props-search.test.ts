import { describe, expect, it } from "vitest";
import { promotedNameRank, TOKEN_MATCH_RANK } from "./generated-search";
import { hostPropsSearchEntry } from "./host-props-search";
import { sharedHostProps } from "./host-props";
import { search } from "./search";

/**
 * The bug guarded (plan 587): the component API's shared props are rendered
 * React, and plan 479 deliberately drops generated type-table rows from search,
 * so `testId` reached Meter and `onKeyDown` reached Cards. This entry promotes
 * the distinctive host names only: `style`, `highlight` and `motion` stay prose
 * so Theming and the component pages keep them.
 */
const sharedNames = sharedHostProps.map((row) => row.name);

describe("shared host props search entry", { timeout: 120_000 }, () => {
  it("promotes only names the shared table really documents", () => {
    expect(hostPropsSearchEntry.names.length).toBeGreaterThan(0);
    expect(
      hostPropsSearchEntry.names.filter((name) => !sharedNames.includes(name)),
    ).toEqual([]);
  });

  it("promotes the camelCase props a reader types", () => {
    expect(promotedNameRank(hostPropsSearchEntry, "testId")).toBe(0);
    expect(promotedNameRank(hostPropsSearchEntry, "onMouseDownOutside")).toBe(
      0,
    );
    expect(promotedNameRank(hostPropsSearchEntry, "on key down")).toBe(
      TOKEN_MATCH_RANK,
    );
  });

  it("leaves plain words and accessibility-owned props out of the promotion", () => {
    const ranks = ["style", "highlight", "motion", "autoFocus", "role"].map(
      (query) => promotedNameRank(hostPropsSearchEntry, query),
    );
    expect(ranks).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("points at the section the page renders", () => {
    expect(hostPropsSearchEntry.index.url).toBe(
      "/docs/component-api#shared-host-props",
    );
    expect(hostPropsSearchEntry.index.content).toContain(
      "testId: A stable locator",
    );
  });

  it("is the first result for a shared prop", async () => {
    const [exact, phrase] = await Promise.all([
      search("testId", 5),
      search("on key down", 5),
    ]);
    expect(exact[0]).toMatchObject({
      type: "page",
      url: "/docs/component-api#shared-host-props",
    });
    expect(phrase[0]).toMatchObject({
      type: "page",
      url: "/docs/component-api#shared-host-props",
    });
  });

  it("keeps an ARIA attribute on the accessibility page", async () => {
    const [first] = await search("aria-label", 5);
    expect(first?.url.startsWith("/docs/accessibility")).toBe(true);
  });
});
