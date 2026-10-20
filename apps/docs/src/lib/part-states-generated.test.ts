import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isDistinctiveName, promotedNameRank } from "./generated-search";
import { stateTypes } from "./part-states.generated";
import { partStatesSearchEntry } from "./part-states-search";
import { readPartStates, renderPartStatesModule } from "./part-states-source";

/**
 * The bug guarded (plan 623): the component page names a handful of state
 * fields in prose, but nothing listed the real 25 `*State` interfaces, so a
 * consumer styling `InlineEdit` by `editing` had to read the package. The table
 * is rendered React, which the page index cannot see, so this suite guards the
 * generated data, its regeneration and its search document in both directions:
 * a state added, renamed or dropped in `packages/components/src` fails here
 * until `nub run --filter docs part-states` is run.
 *
 * The search half also guards the collision measured while landing it:
 * `checkboxState` is an exported helper, and promoting state names by token
 * made `MenuCheckboxItemState` outrank `/docs/api-values`. State names are
 * precise symbols, so this entry promotes whole names only.
 *
 * `node:fs` is test-only, as in the other content guards.
 */

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const generatedUrl = new URL("./part-states.generated.ts", import.meta.url);

describe("the generated part-state table", () => {
  it("matches the package in both directions", () => {
    expect(stateTypes).toEqual(readPartStates(root));
  });

  it("keeps the committed module byte-identical to its renderer", () => {
    expect(readFileSync(generatedUrl, "utf8")).toBe(
      renderPartStatesModule(readPartStates(root)),
    );
  });

  it("names every state once, with fields and a real file", () => {
    expect(stateTypes.length).toBeGreaterThanOrEqual(20);
    expect(new Set(stateTypes.map((state) => state.name)).size).toBe(
      stateTypes.length,
    );
    expect(
      stateTypes.filter(
        (state) =>
          !state.name.endsWith("State") ||
          state.fields.length === 0 ||
          !state.file.startsWith("packages/components/src/") ||
          !existsSync(`${root}${state.file}`),
      ),
    ).toEqual([]);
  });

  it("states the command that regenerates it", () => {
    expect(readFileSync(generatedUrl, "utf8")).toContain(
      "nub run --filter docs part-states",
    );
  });
});

describe("the part-state search document", () => {
  it("sends a state type to the generated table", () => {
    expect(partStatesSearchEntry.index.url).toBe(
      "/docs/component-api#every-state-type",
    );
    expect(partStatesSearchEntry.names).toEqual(
      stateTypes.map((state) => state.name).filter(isDistinctiveName),
    );
  });

  it("indexes every type and field without promoting a plain field", () => {
    const content = partStatesSearchEntry.index.content;

    expect(
      stateTypes.filter(
        (state) =>
          !content.includes(state.name) ||
          state.fields.some((field) => !content.includes(field)),
      ),
    ).toEqual([]);
    expect(isDistinctiveName("editing")).toBe(false);
    expect(partStatesSearchEntry.names).not.toContain("editing");
  });

  it("promotes a whole state name, never a token another symbol owns", () => {
    expect(promotedNameRank(partStatesSearchEntry, "InlineEditState")).toBe(0);
    expect(partStatesSearchEntry.exactNamesOnly).toBe(true);
    // MenuCheckboxItemState must not steal the exported `checkboxState` helper.
    expect(
      promotedNameRank(partStatesSearchEntry, "checkboxState"),
    ).toBeUndefined();
  });
});
