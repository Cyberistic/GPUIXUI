import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appDir = fileURLToPath(new URL("../../", import.meta.url));

type IgnoreVerdict = "ignored" | "tracked" | "unavailable";

const ignoreVerdict = (path: string): IgnoreVerdict => {
  const { status } = spawnSync(
    "git",
    ["check-ignore", "--quiet", "--no-index", path],
    { cwd: appDir, stdio: "ignore" },
  );
  if (status === 0) return "ignored";
  if (status === 1) return "tracked";
  return "unavailable";
};

const generated: ReadonlyArray<string> = [
  ".tanstack/routeTree.gen.ts",
  ".source/index.ts",
  "dist/index.html",

  "../../.artifacts/live/docs-live-route-before.png",
];

const source: ReadonlyArray<string> = [
  "content/docs/introduction.mdx",
  "src/lib/layout.shared.tsx",
  "README.md",
];

describe("the docs build's generated trees", () => {
  it("stays untracked by the ignore rules git actually applies", () => {
    expect(
      generated.filter((path) => ignoreVerdict(path) !== "ignored"),
    ).toEqual([]);
  });

  it("never swallows the files a contributor edits", () => {
    expect(source.filter((path) => ignoreVerdict(path) !== "tracked")).toEqual(
      [],
    );
  });
});
