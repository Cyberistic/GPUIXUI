import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const logic = read("./logic.ts");
const controller = read("./use-tree.ts");
const treeView = read("./tree-view.tsx");
const virtualTree = read("../virtual/tree.tsx");
const components = read("../../../components/package.json");

describe("the tree's type-ahead", () => {
  it("reads the published seam from both modules", () => {
    expect(logic).toContain(
      'import { typeaheadMatchIndex } from "@gpuixui/components/typeahead"',
    );
    expect(controller).toContain(
      'import { typedChar, useTypeahead } from "@gpuixui/components/typeahead"',
    );

    expect(components).toContain('"./typeahead": "./src/typeahead.ts"');

    expect(treeView).toContain("useTree({");
    expect(virtualTree).toContain("useTree({");
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
      expect(controller).not.toContain(copy);
      expect(treeView).not.toContain(copy);
      expect(virtualTree).not.toContain(copy);
    });

    expect(logic).not.toMatch(/500/);
    expect(controller).not.toMatch(/500/);
    expect(treeView).not.toMatch(/500/);
    expect(virtualTree).not.toMatch(/500/);
  });
});
