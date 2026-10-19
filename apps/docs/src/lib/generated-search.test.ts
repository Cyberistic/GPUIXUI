import { describe, expect, it } from "vitest";
import {
  promotedNameRank,
  TOKEN_MATCH_RANK,
  type GeneratedSearchEntry,
} from "./generated-search";

/**
 * Guards plan 564. The bug: a promoted name matched only its exact spelling, so
 * `file tree` returned the License page, `primary foreground` returned a
 * Timeline state and `chevrons up down` returned the Countdown page, while the
 * plural or camelCase form reached the page that documents it.
 *
 * These tests fail if the variant rule is removed (every `4` becomes
 * `undefined`), if the single-word floor is removed (`primary` would promote
 * `primaryForeground` and steal the Theming page from a plain word), and if a
 * partial name is allowed to outrank an exact one (`TOKEN_MATCH_RANK` must be
 * greater than `0`).
 */

const entry = (names: string[]): GeneratedSearchEntry => ({
  names,
  index: {
    title: "Fixture",
    description: "A fixture document.",
    content: names.join("\n"),
    url: "/docs/fixture",
    breadcrumbs: ["Fixture"],
  },
});

describe("promotedNameRank", () => {
  it("keeps the exact name at rank 0", () => {
    expect(promotedNameRank(entry(["File trees"]), "File trees")).toBe(0);
  });

  it("promotes a singular name for a plural target", () => {
    expect(promotedNameRank(entry(["File trees"]), "file tree")).toBe(
      TOKEN_MATCH_RANK,
    );
    expect(promotedNameRank(entry(["Log viewers"]), "log viewer")).toBe(
      TOKEN_MATCH_RANK,
    );
  });

  it("promotes the words of a longer name", () => {
    expect(
      promotedNameRank(entry(["Code editor integration"]), "code editor"),
    ).toBe(TOKEN_MATCH_RANK);
    expect(
      promotedNameRank(entry(["Resizable split panes"]), "split panes"),
    ).toBe(TOKEN_MATCH_RANK);
    expect(
      promotedNameRank(entry(["Property editors"]), "property editor"),
    ).toBe(TOKEN_MATCH_RANK);
    expect(
      promotedNameRank(entry(["Inspector panels"]), "inspector panel"),
    ).toBe(TOKEN_MATCH_RANK);
  });

  it("splits camelCase, acronyms and punctuation into words", () => {
    expect(
      promotedNameRank(entry(["primaryForeground"]), "primary foreground"),
    ).toBe(TOKEN_MATCH_RANK);
    expect(
      promotedNameRank(entry(["chevrons-up-down"]), "chevrons up down"),
    ).toBe(TOKEN_MATCH_RANK);
    expect(promotedNameRank(entry(["modal-focus-trap"]), "modal focus")).toBe(
      TOKEN_MATCH_RANK,
    );
    expect(promotedNameRank(entry(["OTPField"]), "otp field")).toBe(
      TOKEN_MATCH_RANK,
    );
  });

  it("never promotes a single plain word", () => {
    expect(promotedNameRank(entry(["primaryForeground"]), "primary")).toBe(
      undefined,
    );
    expect(promotedNameRank(entry(["inputForeground"]), "input")).toBe(
      undefined,
    );
  });

  it("requires every query word to name part of one name", () => {
    expect(promotedNameRank(entry(["File trees"]), "tree wallpaper")).toBe(
      undefined,
    );
    expect(
      promotedNameRank(entry(["File trees", "Log viewers"]), "tree viewer"),
    ).toBe(undefined);
    expect(promotedNameRank(entry(["File trees"]), "zzz")).toBe(undefined);
  });

  it("has no answer without an entry or a query", () => {
    expect(promotedNameRank(undefined, "file tree")).toBe(undefined);
    expect(promotedNameRank(entry(["File trees"]), "   ")).toBe(undefined);
  });

  it("ranks an exact name above a variant", () => {
    expect(TOKEN_MATCH_RANK).toBeGreaterThan(0);
  });
});
