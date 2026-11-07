import { readFileSync } from "node:fs";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  addTokens as componentAddTokens,
  removeToken as componentRemoveToken,
  splitDraft as componentSplitDraft,
} from "../../../../../packages/components/src/tag-input/logic.js";
import {
  addTokens,
  atLimit,
  describeRefusal,
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

const block = (sheet: string, selector: string): string =>
  [...sheet.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, names]) =>
      (names ?? "").split(",").some((one) => one.trim() === selector),
    )
    .map(([, , body]) => body ?? "")
    .join("\n");

describe("the preview's chip paint", () => {
  const css = readFileSync(
    new URL("../../styles/demos.css", import.meta.url),
    "utf8",
  );

  it("takes the recipe's fill and label roles, not a grey of its own", () => {
    expect(block(css, ".gx-tag-chip")).toContain(
      "background: var(--secondary)",
    );
    expect(block(css, ".gx-tag-chip-text")).toContain(
      "color: var(--foreground)",
    );
    expect(block(css, ".gx-tag-chip-remove")).toContain(
      "color: var(--muted-foreground)",
    );
  });
});

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
    const next = typed(emptyKeywords, "design,do", keywordRules);

    expect(next.tokens).toEqual(["design"]);
    expect(next.draft).toBe("do");
  });

  it("pastes a comma list in one edit and trims the empty segments", () => {
    const next = typed(emptyKeywords, "design, , docs,", keywordRules);

    expect(next.tokens).toEqual(["design", "docs"]);
    expect(next.draft).toBe("");
  });

  it("clears the draft on Enter even when every token was refused", () => {
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
      "2 of 5 keywords added, 3 more will fit.",
    );
  });

  it("says why a cleared draft added nothing, in a sentence", () => {
    const repeat: Keywords = { tokens: ["react"], draft: "" };
    const full: Keywords = {
      tokens: ["a", "b", "c", "d", "e"],
      draft: "",
    };

    expect(Option.isNone(describeRefusal(repeat, keywordRules, 0))).toBe(true);
    expect(describeRefusal(repeat, keywordRules, 1)).toStrictEqual(
      Option.some("That keyword was refused: it is already on the list."),
    );
    expect(describeRefusal(full, keywordRules, 2)).toStrictEqual(
      Option.some("That keyword was refused: the list is full."),
    );
  });

  it("says the limit is reached rather than printing a zero", () => {
    const state: Keywords = {
      tokens: ["react", "gpuix", "components", "tokens", "motion"],
      draft: "",
    };

    expect(atLimit(state, keywordRules)).toBe(true);
    expect(describeBudget(state, keywordRules)).toBe(
      "5 of 5 keywords added: the list is full.",
    );
  });
});

describe("the preview's publish gate", () => {
  it("refuses to publish on a draft alone, because the draft is not a token", () => {
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
    const state: Keywords = { tokens: ["design"], draft: "do" };

    expect(canPublish(state)).toBe(true);
  });
});
