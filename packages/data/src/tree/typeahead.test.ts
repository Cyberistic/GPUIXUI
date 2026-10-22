/**
 * The tree reads the **published** type-ahead seam, not a second copy of it.
 *
 * The bug this guards: `tree/logic.ts` carried its own window, repeat rule and
 * character rule (`TYPE_AHEAD_WINDOW_MS`, `typeAheadPress`, a local
 * `typedChar`), because the components package's copy was private. A list, a
 * menu and a tree that each own the rule drift: a window moves in one and the
 * other keeps 500 ms, and a typed `Enter` is read as a newline in one surface
 * and an activation in another. `@gpuixui/components/typeahead` is the one
 * seam; the tree keeps only the position-to-key step.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const logic = read("./logic.ts");
const treeView = read("./tree-view.tsx");
const components = read("../../../components/package.json");

describe("the tree's type-ahead", () => {
  it("reads the published seam from both modules", () => {
    expect(logic).toContain(
      'import { typeaheadMatchIndex } from "@gpuixui/components/typeahead"',
    );
    expect(treeView).toContain(
      'import { typedChar, useTypeahead } from "@gpuixui/components/typeahead"',
    );
    // The subpath a surface outside the components package reaches it through.
    expect(components).toContain('"./typeahead": "./src/typeahead.ts"');
  });

  it("keeps no second window, buffer or character rule", () => {
    const copies = [
      "TYPE_AHEAD_WINDOW_MS",
      "interface TypeAheadBuffer",
      "const typeAheadPress",
      "const typedChar =",
      "useRef<TypeAheadBuffer>",
    ];
    Arr.forEach(copies, (copy) => {
      expect(logic).not.toContain(copy);
      expect(treeView).not.toContain(copy);
    });
    // The 500 ms window is named in one place only.
    expect(logic).not.toMatch(/500/);
    expect(treeView).not.toMatch(/500/);
  });
});
