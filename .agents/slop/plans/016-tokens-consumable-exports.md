# 016 — `@gpuixui/tokens` resolvable without a prebuilt `dist`

**Workstream:** `tokens-theme`
**Phase:** B (working foundation), fixing a defect in the delivered plan 011
**Depends on:** plan 011 (the implemented `@gpuixui/tokens`)
**Files owned:** `packages/tokens/package.json`, `packages/tokens/README.md`,
`packages/tokens/src/exports.test.ts` (new), `packages/tokens/src/styles.test.ts`
(duplicate-block cleanup only), this plan, `.agents/slop/plans/README.md` (index
row only), `TODO.md` (this workstream only).

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

`packages/tokens/package.json` exports **build output**:

```json
"exports": {
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./react": { "types": "./dist/react.d.ts", "import": "./dist/react.js" }
}
```

`dist/` is gitignored (repo `.gitignore`, "Build / cache artifacts"). So in a
clean checkout the paths do not exist and a consumer cannot resolve the package
until someone runs `nub run --filter @gpuixui/tokens build` by hand. Every
consumer's `tsc`/`vitest` run fails before that, and `nub run check` is red on a
fresh tree.

This is not hypothetical. The `primitives` workstream hit it and worked around it
by declaring its own structural copy of the theme:

> `workspaces/primitives/packages/primitives/src/core/theme.ts`
> "`TODO:` depend on `@gpuixui/tokens` directly and delete this declaration once
> the tokens package is in the tree — its `exports` points at an uncommitted
> `dist`, so a consumer cannot resolve it yet."

Evidence the tokens package is the outlier: every other workspace package exports
source.

| Package | `exports["."]` |
| ------- | -------------- |
| `@gpuixui/primitives` | `{ "types": "./src/index.ts", "default": "./src/index.ts" }` |
| `@gpuixui/icons` | `{ "types": "./src/index.ts", "default": "./src/index.ts" }` |
| `@gpuixui/components` | `"./src/index.ts"` |
| `@gpuixui/tokens` | `{ "types": "./dist/index.d.ts", "import": "./dist/index.js" }` |

`moduleResolution: "bundler"` (repo base tsconfig) resolves the map above, so
pointing tokens at `src` is what makes a clean-checkout `nub run check-types` and
`nub run test` green in every consumer.

The build itself stays: `nub run --filter @gpuixui/tokens build` still emits
`dist/` with declarations, and the release plan (Phase G) flips `exports` to
`dist` when the package stops being private and starts being published.

## 2. Design decisions (do not re-litigate)

1. **Source exports, no build step for consumers.** Match the siblings exactly.
2. **`build` script and `tsconfig.build.json` stay.** They validate that the
   package compiles to JS + declarations for the eventual publish.
3. **`files: ["dist"]` is dropped.** The field describes what a publish would
   include, and nothing is published while `private: true`. Phase G re-adds it
   together with the `dist` `exports`.
4. **A guard test encodes the invariant** so the defect cannot come back
   silently: every `exports` target must exist and must not be a gitignored build
   directory. This is the regression test for the bug this plan fixes.
5. **`private: true` stays.** Release readiness owns flipping it.
6. The `./react` target is `.tsx`; consumers that import it already compile JSX.

## 3. Exact changes

### 3.1 `packages/tokens/package.json`

Replace the `exports` and remove `files`:

```json
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./react": {
      "types": "./src/react.tsx",
      "default": "./src/react.tsx"
    }
  },
```

Leave `private`, `type`, `sideEffects`, `scripts`, `peerDependencies`,
`peerDependenciesMeta` and `devDependencies` untouched.

### 3.2 `packages/tokens/src/exports.test.ts` (new)

Header comment must state the bug being guarded. Shape:

```ts
/**
 * Guards the defect fixed in plan 016: `@gpuixui/tokens` exported `./dist/*`,
 * but `dist/` is gitignored, so a consumer in a clean checkout could not
 * resolve the package and every workspace depending on it had to build it
 * first (the `primitives` package worked around it with a structural copy of
 * the theme). A workspace package must export source.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");

interface ExportTarget {
  readonly subpath: string;
  readonly target: string;
}

/** Every `exports` target, following one level of condition nesting. */
const exportTargets = (): ReadonlyArray<ExportTarget> => {
  const manifest = JSON.parse(
    readFileSync(join(packageDir, "package.json"), "utf8"),
  ) as { exports: Record<string, string | Record<string, string>> };
  return Object.entries(manifest.exports).flatMap(([subpath, entry]) =>
    typeof entry === "string"
      ? [{ subpath, target: entry }]
      : Object.entries(entry).map(([, target]) => ({ subpath, target })),
  );
};

describe("package exports", () => {
  it("exposes at least the core and react entries", () => {
    const subpaths = exportTargets().map((entry) => entry.subpath);
    expect(subpaths).toContain(".");
    expect(subpaths).toContain("./react");
  });

  it("points every entry at a file in the repository, not a build artifact", () => {
    exportTargets().forEach(({ subpath, target }) => {
      // A gitignored build directory is absent from a clean checkout.
      expect(target, subpath).not.toMatch(/^\.\/(dist|build)\//);
      expect(existsSync(join(packageDir, target)), `${subpath} → ${target}`).toBe(
        true,
      );
    });
  });
});
```

`JSON.parse` is allowed here: it is a test reading the tree's own manifest, not
domain code (AGENTS §5 applies to `packages/tokens/src/*.ts` sources, and this
file is a test).

### 3.3 `packages/tokens/README.md`

In "Limitations" replace the trailing bullet list's `dist` silence with an
explicit note, and add one sentence under `## Scripts`:

- Limitations gains: `- Exports point at `src/`; the package is private and no
  build step is required to consume it. Phase G flips `exports` to `dist` for
  publishing.`
- Scripts gains a note: `build` emits `dist/` (JS + declarations) for the future
  publish; consumers never need it.

### 3.4 `packages/tokens/src/styles.test.ts` (housekeeping)

The file has two copies of `describe("statusTone", …)` and two copies of
`describe("status tone example", …)` — a leftover from the concurrent-writer
collision recorded in `.agents/slop/plans/../blockers/`. Delete the copy that
appears first (lines ~91–146) and keep the later, more complete copy. Test
count must stay meaningfully covered: every assertion that exists twice keeps
one copy. Verify with the two-direction check in §5.

### 3.5 Docs

No `docs/tokens.md` change is required: it documents the public API, and the
`exports` map is a packaging detail. Add nothing there.

## 4. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme

# 1. Failing first: the guard test fails before the package.json fix.
git stash push -- packages/tokens/package.json    # or temporarily revert it
nub run --filter @gpuixui/tokens test             # expect exports.test.ts FAIL
git stash pop
```

The failing direction can also be shown by reverting only the `exports` map with
`edit`, running the test, and restoring it.

```sh
# 2. After the fix
nub run --filter @gpuixui/tokens check-types   # expect exit 0
nub run --filter @gpuixui/tokens test          # expect all files pass
nub run check                                  # expect exit 0
nub run lint                                   # expect exit 0
nub run test                                   # expect exit 0
```

```sh
# 3. Prove a consumer can resolve the package with no dist present
mv packages/tokens/dist /tmp/tokens-dist-backup   # only if it exists
nub run check-types                               # expect exit 0
mv /tmp/tokens-dist-backup packages/tokens/dist
```

If step 3 fails there is no consumer package in this worktree (`packages/` holds
`config`, `deploy`, `tokens`), so the stronger check is: run
`nub run --filter @gpuixui/tokens build` is **not** required before
`nub run check`. Record the result of step 3 either way.

## 5. Test plan

- **New test:** `packages/tokens/src/exports.test.ts`.
  - Must fail with the current `dist` map (the `not.toMatch` assertion) and pass
    with the `src` map.
  - Proves the guard is real, not decorative: temporarily set `exports["."]` to
    `./dist/index.js` and confirm the test fails at that subpath.
- **Both directions:** run `scripts/verify-two-directions.sh` if it applies to
  this package; otherwise capture the red and green runs of the new test in the
  commit message.
- **Existing tests:** `styles.test.ts` must still pass after the duplicate-block
  cleanup, with the same set of meaningful assertions.
- **No test may be weakened** to make the cleanup pass.

## 6. STOP conditions

- STOP if a package other than `tokens` must change to make consumers resolve.
  Record it in `TODO.md` as an interlock for its owner instead.
- STOP if `moduleResolution` in `packages/config/tsconfig.base.json` is not
  `"bundler"` — source exports assume it.
- STOP if `nub run check` reports an error outside `packages/tokens/**`,
  `docs/tokens.md`, `docs/design-system.md`, `TODO.md` or `COMPONENTS.md`.
- STOP if the guard test cannot be made to fail before the fix.

## 7. Acceptance criteria

- [ ] `packages/tokens/package.json` exports `./src/index.ts` and
      `./src/react.tsx`; `files` is gone; `build` and `tsconfig.build.json`
      remain.
- [ ] `packages/tokens/src/exports.test.ts` exists, fails against the `dist` map
      and passes against the `src` map.
- [ ] The duplicated `statusTone` / `status tone example` blocks in
      `styles.test.ts` are removed.
- [ ] `nub run --filter @gpuixui/tokens check-types`, `test`, and the repo
      `nub run check`, `nub run lint`, `nub run test` all exit 0.
- [ ] `packages/tokens/README.md` states the source-export rule and the Phase G
      flip.
- [ ] `TODO.md` records the fix; `COMPONENTS.md` is unchanged (no component
      behaviour changed).
- [ ] Committed on `agent/tokens-theme` and pushed.
