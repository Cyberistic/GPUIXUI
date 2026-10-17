# 056 — Docs truth guard for the token catalogue

**Workstream:** `tokens-theme`
**Phase:** F (docs truth), scoped to the files this workstream owns
**Depends on:** plans 010–019, 050–055 (the implemented package and its docs)
**Files owned:** `packages/tokens/**`, `docs/tokens.md`, this plan,
`.agents/slop/plans/README.md` (index row only), `TODO.md` (this workstream
only), `COMPONENTS.md` (design-system section only).

Self-contained. Follow the steps in order.

---

## 1. Why

`docs/tokens.md` is the public catalogue of every colour, type, spacing, radius,
density and size token. Its colour tables repeat **196 values** (49 roles × four
colour sets) that the implementation already holds. Nothing connects the two:
`color.test.ts` proves the implementation is internally consistent, but a
palette edit that forgets the docs — or a docs edit that invents a value — ships
silently. The docs would then be a second, wrong source of truth.

The mission's quality bar includes "accurate examples and API info" and
"documentation that cannot drift". A test that reads the catalogue and compares
it with `themes`/`highContrastThemes` is the cheapest way to make that true.

## 2. Decision (do not re-litigate)

- Guard **exactly the colour role tables and the two role-count sentences**.
  They are the high-risk, high-volume part of the catalogue. Type, spacing,
  radius and size tables have far fewer rows and their values are already the
  subject of `scale.test.ts` / `typography.test.ts`; parsing every section
  would add parser code for little extra protection.
- Use `node:fs` in the test, exactly as `exports.test.ts` already does. The
  package ships zero runtime dependencies by design, so it must not borrow
  Effect's `FileSystem` for a test over its own tree.
- Do **not** generate `docs/tokens.md` from the package. The page is prose plus
  tables; generation would turn readable documentation into a build artifact.
  The guard detects drift; it does not own the page.

## 3. Exact change

### 3.1 `packages/tokens/src/docs.test.ts` (new)

Header comment must state the bug guarded: *a palette or role change that is not
mirrored in `docs/tokens.md` ships a catalogue that disagrees with the theme.*

Contents:

```ts
/**
 * Guards `docs/tokens.md` against drift: its colour tables repeat the 49
 * semantic roles for both default and high-contrast themes, so a palette or
 * role edit that is not mirrored in the docs would ship a catalogue that
 * disagrees with the theme. The test parses the documented rows and compares
 * them with the implementation.
 *
 * `node:fs` is used deliberately: this is a documentation test over the tree's
 * own files, and the tokens package ships zero runtime dependencies by design.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colorRoles } from "./color.js";
import { highContrastThemes, themes } from "./theme.js";

interface DocumentedRole {
  readonly role: string;
  readonly light: string;
  readonly dark: string;
}

const documentedRows = (markdown: string): ReadonlyArray<DocumentedRole> =>
  markdown.split("\n").flatMap((line) => {
    const match = /^\| `([A-Za-z]+)` \| `(#[0-9A-F]{6,8})` \| `(#[0-9A-F]{6,8})` \|/.exec(
      line,
    );
    return match === null
      ? []
      : [{ role: match[1], light: match[2], dark: match[3] }];
  });

const markdown = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);

const expected = colorRoles.map((role) => ({
  role,
  light: themes.light.colors[role],
  dark: themes.dark.colors[role],
  hcLight: highContrastThemes.light.colors[role],
  hcDark: highContrastThemes.dark.colors[role],
}));
```

Then one `describe("docs/tokens.md")` with three tests:

1. **"lists every colour role once per table, in role order"** — the parsed rows
   equal `expected.length * 2`; the first half projects `{ role, light, dark }`
   and equals `expected.map(({ role, light, dark }) => …)`; the second half
   equals the HC projection (`hcLight → light`, `hcDark → dark`).
2. **"documents the implementation's values"** — the same comparison already
   covers values, so this test asserts the prose counts:
   `expect(markdown).toContain(\`There are ${colorRoles.length} roles.\`)` and
   `expect(markdown).toContain(\`the same ${colorRoles.length} roles\`)`.
   Keep it separate so a stale sentence fails with a readable name.
3. **"has a non-empty default and high-contrast table"** — both halves have
   `colorRoles.length` rows. This fails loudly if the regex stops matching after
   a table-format edit, rather than passing on an empty array.

Use `toEqual` on the projected arrays, not per-value loops, so a failure prints
the diverging row.

### 3.2 `docs/tokens.md`

In `## Verification`, after the `color.test.ts` paragraph, add one sentence:

> `packages/tokens/src/docs.test.ts` parses the colour tables above and fails
> if they disagree with the shipped themes or fall out of role order, so this
> page cannot drift from the implementation.

### 3.3 `packages/tokens/README.md`

In `## Limitations`, the line "There is no runtime theme schema" stays as it is.
No other change is needed; do not duplicate the guard description in the
package README.

### 3.4 `TODO.md` (this workstream only)

- Add and tick: `[x]` Guard the token catalogue against drift from the
  implementation (plan 056).
- Update the section's progress bar and count to the tracked total (21/29 at
  the time of writing; plans 054 and 055 each add a task).

### 3.5 `COMPONENTS.md` (design-system section only)

Extend the "Design tokens" row's notes with
`the colour catalogue is guarded against docs drift`. Do not add a row.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test          # exit 0; 3 new docs tests pass
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run test                                   # exit 0
```

Prove the guard can fail, capture the output, restore, and record it in the
commit body:

1. Change one documented value in `docs/tokens.md` (for example `primaryHover`
   light to `#000000`) and run the package tests: capture the `toEqual` failure
   naming the role.
2. Change `There are 49 roles.` to `There are 48 roles.` and run again: capture
   the prose failure.

## 5. STOP conditions

- If the regex matches rows outside the two colour tables, stop and report the
  offending lines rather than widening the pattern.
- If reading `docs/tokens.md` from the package test is rejected by the workspace
  tsconfig or build, stop and report; do not move the docs file.
- If a gate fails for a reason outside `packages/tokens` and `docs`, report it
  and leave it alone.

## 6. Acceptance criteria

- [ ] `packages/tokens/src/docs.test.ts` compares all 98 documented colour rows
      with the four shipped colour sets in role order.
- [ ] A changed hex or a stale role count fails the test; both directions were
      observed.
- [ ] `docs/tokens.md` names the guard in `## Verification`.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.
