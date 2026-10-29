import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The docs app writes three generated trees beside the files a contributor
 * edits: TanStack Start's route tree (`.tanstack/`, rebuilt on every start),
 * Fumadocs' collection output (`.source/`) and the build (`dist/`). All three
 * have to stay invisible to git: the swarm stages a lane with
 * `git add apps/docs`, so a swallowed route tree becomes a committed build
 * artifact.
 *
 * `.tanstack/` was the one nothing ignored, which is why `apps/docs/.gitignore`
 * exists. The other two are ignored by the repository root; this guard holds
 * all three together so a moved root rule cannot quietly expose one. It carries
 * the **live probes' evidence directory** (`.artifacts/`, at the repository
 * root) for the same reason: the docs probes capture frames there, and the
 * policy used to tell a reader to delete the directory by hand because no rule
 * covered it.
 *
 * Git answers, rather than a pattern reader: a hand-written matcher would be a
 * second implementation of gitignore semantics that can disagree with the tool
 * that actually decides. The source paths are the negative control, so an
 * ignore-everything rule fails this case instead of passing it.
 *
 * `node:child_process` is deliberate here: this is a test asking the version
 * control tool a question, not application code spawning a process. `spawnSync`
 * is the only interface git offers, and the answer is read from its exit status.
 */

const appDir = fileURLToPath(new URL("../../", import.meta.url));

type IgnoreVerdict =
  /** The path matches an ignore rule. */
  | "ignored"
  /** The path is not matched by any rule. */
  | "tracked"
  /** Git did not run, so the question was not answered. */
  | "unavailable";

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

/** The paths each build writes, as git sees them from the app directory. */
const generated: ReadonlyArray<string> = [
  ".tanstack/routeTree.gen.ts",
  ".source/index.ts",
  "dist/index.html",
  // The live probes' frames are written at the repository root, not in the app,
  // so this one is named from here rather than asserted in the app's own rules.
  "../../.artifacts/live/docs-live-route-before.png",
];

/** Files a contributor edits, which must never be ignored. */
const source: ReadonlyArray<string> = [
  "content/docs/introduction.mdx",
  "src/lib/layout.shared.tsx",
  "README.md",
];

describe("the docs build's generated trees", () => {
  it("stays untracked by the ignore rules git actually applies", () => {
    // A tool that failed to run is reported by name rather than read as a pass.
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
