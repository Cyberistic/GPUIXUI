import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  addTokens as componentAddTokens,
  removeToken as componentRemoveToken,
  splitDraft as componentSplitDraft,
} from "../../../../../packages/components/src/tag-input/logic.js";
import {
  addTokens,
  atLimit,
  canPublish,
  committed,
  describeBudget,
  describeGate,
  emptyKeywords,
  keywordRules,
  removeLabel,
  removeToken,
  removed,
  remaining,
  splitDraft,
  typed,
  type Keywords,
  type KeywordRules,
} from "./tag-input-preview";

/**
 * The tag preview's copies of the component's rules, and the publish gate.
 *
 * A tag field looks the same whether a comma commits the words before it and
 * keeps the rest or commits the whole line, whether a duplicate is refused or
 * repeated, and whether the cap refuses the sixth token or the fifth — so the
 * preview's copies are held to `packages/components/src/tag-input/logic.ts`
 * over a sweep instead of being reviewed by eye. The gate is the app's own
 * rule: a draft is not a keyword, so a form must not save over one.
 *
 * `node:fs` is the test's own read of a checked-in file, not runtime I/O.
 */

const component = readFileSync(
  new URL(
    "../../../../../packages/components/src/tag-input.tsx",
    import.meta.url,
  ),
  "utf8",
);

const rules = (max: number, allowDuplicates: boolean): KeywordRules => ({
  max,
  allowDuplicates,
});

const drafts = [
  "",
  " ",
  "design",
  " design ",
  "design,",
  "design, docs",
  "design, , docs",
  ",,,",
  "a,b,c,d,e,f,g",
];

const lists: ReadonlyArray<ReadonlyArray<string>> = [
  [],
  ["design"],
  ["design", "docs"],
  ["react", "gpuix", "components", "tokens", "motion"],
  ["design", "design"],
];

describe("the preview's token rules", () => {
  it("splits a draft exactly as the component does", () => {
    const drifted = drafts.filter(
      (draft) =>
        splitDraft(draft).join("\u0000") !==
        componentSplitDraft(draft).join("\u0000"),
    );

    expect(drifted).toEqual([]);
  });

  it("adds exactly the tokens the component accepts, over every cap and rule", () => {
    interface Drift {
      readonly current: string;
      readonly incoming: string;
      readonly rules: string;
      readonly preview: string;
      readonly component: string;
    }

    const drifted = lists.flatMap((current) =>
      drafts.flatMap((draft) =>
        [0, 1, 2, 3, 5].flatMap((max) =>
          [true, false].flatMap<Drift>((allowDuplicates) => {
            const incoming = componentSplitDraft(draft);
            const preview = addTokens(
              current,
              incoming,
              rules(max, allowDuplicates),
            );
            const shipped = componentAddTokens(current, incoming, {
              max,
              allowDuplicates,
            });
            return preview.join("\u0000") === shipped.join("\u0000")
              ? []
              : [
                  {
                    current: current.join(","),
                    incoming: incoming.join(","),
                    rules: `max=${max} duplicates=${allowDuplicates}`,
                    preview: preview.join(","),
                    component: shipped.join(","),
                  },
                ];
          }),
        ),
      ),
    );

    expect(drifted).toEqual([]);
  });

  it("removes the first match exactly as the component does", () => {
    const drifted = lists.flatMap((tokens) =>
      ["design", "docs", "absent"].flatMap((value) => {
        const preview = removeToken(tokens, value);
        const shipped = componentRemoveToken(tokens, value);
        return preview.join("\u0000") === shipped.join("\u0000")
          ? []
          : [`${tokens.join(",")} minus ${value}`];
      }),
    );

    expect(drifted).toEqual([]);
  });
});

describe("the preview's field transitions", () => {
  it("commits the words before a typed comma and keeps the remainder", () => {
    // The bug this guards: a preview that commits the whole line. Typing
    // `design,do` must leave `do` in the field, not add it.
    const next = typed(emptyKeywords, "design,do", keywordRules);

    expect(next.tokens).toEqual(["design"]);
    expect(next.draft).toBe("do");
  });

  it("pastes a comma list in one edit and trims the empty segments", () => {
    // A pasted list arrives through one `onChange`: only the text after the
    // final comma is still a draft, and the empty segment between the two
    // commas is not a token.
    const next = typed(emptyKeywords, "design, , docs,", keywordRules);

    expect(next.tokens).toEqual(["design", "docs"]);
    expect(next.draft).toBe("");
  });

  it("clears the draft on Enter even when every token was refused", () => {
    // A duplicate that stayed in the field would invite a second try at a token
    // the list already holds.
    const full: Keywords = {
      tokens: ["react", "gpuix", "components", "tokens", "motion"],
      draft: "react",
    };
    const next = committed(full, keywordRules);

    expect(next.tokens).toEqual(full.tokens);
    expect(next.draft).toBe("");
  });

  it("refuses every edit path while the group is disabled", () => {
    const state: Keywords = { tokens: ["design"], draft: "docs" };

    expect(typed(state, "docs,", keywordRules, true)).toEqual(state);
    expect(committed(state, keywordRules, true)).toEqual(state);
    expect(removed(state, "design", true)).toEqual(state);
  });

  it("removes a chip and leaves the draft alone", () => {
    const state: Keywords = { tokens: ["design", "docs"], draft: "mo" };

    expect(removed(state, "design")).toEqual({
      tokens: ["docs"],
      draft: "mo",
    });
  });

  it("names the removal control the way the component does", () => {
    // A preview that prints `Remove docs` while the component prints
    // `Remove design` would teach a locator no automation can find.
    expect(component).toContain("`Remove ${value}`");
    expect(removeLabel("docs")).toBe("Remove docs");
  });
});

describe("the preview's budget", () => {
  it("counts the tokens still allowed and the cap that refuses the next", () => {
    const state: Keywords = { tokens: ["design", "docs"], draft: "" };

    expect(remaining(state, keywordRules)).toBe(3);
    expect(atLimit(state, keywordRules)).toBe(false);
    expect(describeBudget(state, keywordRules)).toBe(
      "2 of 5 keywords · 3 left",
    );
  });

  it("says the limit is reached rather than printing a zero", () => {
    const state: Keywords = {
      tokens: ["react", "gpuix", "components", "tokens", "motion"],
      draft: "",
    };

    expect(atLimit(state, keywordRules)).toBe(true);
    expect(describeBudget(state, keywordRules)).toBe(
      "5 of 5 keywords · limit reached",
    );
  });
});

describe("the preview's publish gate", () => {
  it("refuses to publish on a draft alone, because the draft is not a token", () => {
    // The component keeps the field's draft privately, so the gate can only
    // read the tokens: a half-typed keyword does not open the gate, and a form
    // that needs it to must ask the reader to commit it.
    const state: Keywords = { tokens: [], draft: "docs" };

    expect(describeGate(state)).toBe("Add a keyword before publishing.");
    expect(canPublish(state)).toBe(false);
  });

  it("asks for a keyword when the list and the field are both empty", () => {
    expect(describeGate(emptyKeywords)).toBe(
      "Add a keyword before publishing.",
    );
    expect(canPublish(emptyKeywords)).toBe(false);
  });

  it("opens the gate once the list has a token", () => {
    const one: Keywords = { tokens: ["design"], draft: "" };
    const three: Keywords = {
      tokens: ["design", "docs", "tokens"],
      draft: "",
    };

    expect(describeGate(one)).toBe("Ready to publish 1 keyword.");
    expect(describeGate(three)).toBe("Ready to publish 3 keywords.");
    expect(canPublish(one)).toBe(true);
    expect(canPublish(three)).toBe(true);
  });

  it("stays open on a pending draft beside a committed token", () => {
    // The other direction: a draft must not close a gate the list already
    // earned, because the caller cannot see it.
    const state: Keywords = { tokens: ["design"], draft: "do" };

    expect(canPublish(state)).toBe(true);
  });
});
