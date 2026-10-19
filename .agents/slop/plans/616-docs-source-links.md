# Plan 616 — the catalogue's source links

**Workstream:** `tokens-theme` · **Phase:** F (docs truth) · **Depends on:** 355, 356, 613

## 1. The defect

Four relative links in `docs/tokens.md` point at a path that does not exist. The
document sits in `docs/`, so a target that starts `./src/` resolves to
`docs/src/…`, not to `packages/tokens/src/…`. Nothing read the link targets, so
the page shipped with four dead "runnable example" links while every gate was
green:

| Line | Written | Resolves to | Should be |
| ---- | ------- | ----------- | --------- |
| 1640 | `./src/native-field.example.ts` | `docs/src/native-field.example.ts` | `../packages/tokens/src/native-field.example.ts` |
| 1874 | `./src/native-highlight.test.ts` | `docs/src/native-highlight.test.ts` | `../packages/tokens/src/native-highlight.test.ts` |
| 1876 | `./src/native-highlight-code-surface.test.ts` | `docs/src/native-highlight-code-surface.test.ts` | `../packages/tokens/src/native-highlight-code-surface.test.ts` |
| 1889 | `./src/native-text.example.ts` | `docs/src/native-text.example.ts` | `../packages/tokens/src/native-text.example.ts` |

The other 30-odd relative links in the three guarded documents already resolve
(checked with a resolver over every `](…)` target). The failure is a link
resolution defect, not a missing file.

## 2. Fix

**File to change: `docs/tokens.md`** — rewrite the four targets above, nothing
else in the page changes.

**File to create: `packages/tokens/src/docs-links.test.ts`** — a guard that
resolves every relative Markdown file link in the three documents the package
already guards (`docs/tokens.md`, `docs/design-system.md`,
`packages/tokens/README.md`) against the document's own directory.

Rules the guard implements:

- Match `](target)` targets; ignore absolute URLs (`http:`, `https:`, `mailto:`)
  and same-page anchors (`#…`).
- Consider only relative targets (`./…`, `../…`).
- Strip a `#fragment` from the target.
- Resolve with `new URL(target, new URL(document, root))`, where `root` is
  `new URL("../../../", import.meta.url)` from `packages/tokens/src/`.
- Assert `existsSync(resolved)`; report `"<document> -> <target>"` for every
  miss, in document order.

`node:fs` is allowed here for the same reason `docs.test.ts` states: this is a
documentation test over the tree's own files and the package ships no runtime
dependency in production. No other import is needed.

Shape:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../../", import.meta.url);
const documents = [
  "docs/tokens.md",
  "docs/design-system.md",
  "packages/tokens/README.md",
] as const;

const isRelative = (target: string): boolean =>
  target.startsWith("./") || target.startsWith("../");

const linkTargets = (source: string): ReadonlyArray<string> =>
  Array.from(source.matchAll(/\]\(([^)\s]+)\)/g), (match) => match[1]).filter(
    (target): target is string => target !== undefined,
  );

const missingLinks = (
  document: string,
  source: string,
): ReadonlyArray<string> =>
  linkTargets(source)
    .filter(isRelative)
    .filter(
      (target) =>
        !existsSync(
          new URL(target.split("#")[0] ?? "", new URL(document, root)),
        ),
    );

describe("document links", () => {
  it("resolves every relative file link in the guarded documents", () => {
    const missing = documents.flatMap((document) =>
      missingLinks(document, readFileSync(new URL(document, root), "utf8")).map(
        (target) => `${document} -> ${target}`,
      ),
    );
    expect(missing).toEqual([]);
  });

  it("catches a link resolved against the document's directory", () => {
    expect(
      missingLinks("docs/tokens.md", "[example](./src/example.ts)"),
    ).toHaveLength(1);
  });

  it("accepts a link that climbs to the package", () => {
    expect(
      missingLinks(
        "docs/tokens.md",
        "[example](../packages/tokens/src/index.ts)",
      ),
    ).toEqual([]);
  });
});
```

The header comment must state the bug being guarded: the four `docs/src/…`
targets that resolved nowhere while the suite was green.

## 3. Commands and expected results

From the worktree root:

1. **Prove the guard fails before the fix.** Leave `docs/tokens.md` untouched and
   run only the new case:

   ```sh
   nub run --filter @gpuixui/tokens exec vitest run src/docs-links.test.ts
   ```

   Expected: the first case fails with four entries —
   `docs/tokens.md -> ./src/native-field.example.ts`,
   `docs/tokens.md -> ./src/native-highlight.test.ts`,
   `docs/tokens.md -> ./src/native-highlight-code-surface.test.ts`,
   `docs/tokens.md -> ./src/native-text.example.ts`. The two synthetic cases
   pass already.

2. Apply the four link edits.

3. **Prove it passes after the fix.**

   ```sh
   nub run --filter @gpuixui/tokens exec vitest run src/docs-links.test.ts
   ```

   Expected: 3 passed.

4. **The package gate.**

   ```sh
   nub run --filter @gpuixui/tokens test
   nub run --filter @gpuixui/tokens check-types
   ```

   Expected: 161 test files pass (the previous 160 plus the new one), and
   `tsc` is clean.

5. **The repo gate.**

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: every command exits 0. `check` runs `check:tests`, `lint`, `fmt`
   and the recursive type check.

## 4. STOP conditions

Stop and report, do not improvise, if any of these happen:

- Step 1 reports a missing link **other than** the four named above. The page
  may have gained a new broken link from another workstream; report it instead
  of mass-rewriting.
- A document cannot be read at the computed root (wrong relative depth), or
  `existsSync` rejects a `URL` argument under this Node version.
- The guard would need a new dependency, a Markdown parser, or a network call.
- A link target resolves to a directory on one run and not another, or the test
  depends on the working directory rather than `import.meta.url`.
- Fixing a link requires editing a file outside this workstream's paths
  (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`).

## 5. Test plan

- **The guard can fail.** Case 2 is the synthetic proof: a `docs/` page linking
  `./src/example.ts` is reported. Case 1 fails on the unfixed page with exactly
  the four entries; that is the regression evidence.
- **The guard can pass.** Case 3 accepts a target that climbs out of `docs/` to
  the package; case 1 passes once the four targets are corrected.
- **No tautology.** The guard derives the target list from the document under
  test and resolves it on disk; the synthetic cases use strings that are not the
  shipped page, so the detector is proven independently of the fix.
- **Both directions observed before completion.** Run step 1 before editing,
  record the four-entry failure, then run step 3 after editing. Quote both runs
  in the commit message.

## 6. Acceptance

- The four links in `docs/tokens.md` resolve to files that exist.
- `docs-links.test.ts` guards every relative file link in the three documents
  and proves both directions.
- `nub run --filter @gpuixui/tokens test`, `check-types`, and the root
  `nub run check`, `nub run lint`, `nub run test` pass.
- `TODO.md` gains a ticked row describing the defect and the guard; the plan
  index gains this row; the branch is committed and pushed.
- No token, colour, pair, floor, metric, platform style, recipe or theme value
  changes.
