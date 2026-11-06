import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8");

const sources = (relative = "src/"): ReadonlyArray<string> => {
  const directory = fileURLToPath(new URL(relative, packageRoot));
  return Arr.flatMap(
    readdirSync(directory, { withFileTypes: true }),
    (entry) => {
      const path = `${relative}${entry.name}`;
      if (entry.isDirectory()) return sources(`${path}/`);
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    },
  );
};

const hintHosts: ReadonlyArray<string> = [
  "src/chat.tsx",
  "src/combobox.tsx",
  "src/command-menu.tsx",
  "src/field.tsx",
  "src/mention-input.tsx",
  "src/search-input.tsx",
  "src/tag-input.tsx",
  "src/time-picker.tsx",
];

const production = Arr.filter(
  sources(),
  (path) => !Str.includes(".test.")(path),
);

const callers = Arr.filter(production, (path) =>
  Str.includes("fieldHint(")(read(path)),
);

describe("the painted hint's single implementation", () => {
  it("declares the package whose seam it paints with", () => {
    const manifest = read("package.json");
    expect(manifest).toContain('"@gpuixui/primitives": "workspace:*"');
  });

  it("keeps no second copy of the hint rule", () => {
    expect(
      existsSync(fileURLToPath(new URL("src/internal/hint.tsx", packageRoot))),
    ).toBe(false);

    const declared = Arr.filter(production, (path) =>
      /export (const|function) (textHint|renderHint|hintFrame|hintHost)\b/.test(
        read(path),
      ),
    );
    expect(declared).toStrictEqual([]);
  });

  it("paints every hinted host through the published subpath", () => {
    expect(callers).toStrictEqual(hintHosts);

    const offSeam = Arr.filter(
      callers,
      (path) => !Str.includes('from "@gpuixui/primitives/hint"')(read(path)),
    );
    expect(offSeam).toStrictEqual([]);
  });

  it("reaches the subpath, never the primitives' barrel", () => {
    const throughBarrel = Arr.filter(production, (path) =>
      Str.includes('from "@gpuixui/primitives"')(read(path)),
    );
    expect(throughBarrel).toStrictEqual([]);
  });

  it("is the seam the shared API document names", () => {
    const page = read("../../docs/component-api.md");
    expect(page).toContain("`@gpuixui/primitives/hint`");
    expect(page).not.toContain("internal/hint.tsx");
  });
});
