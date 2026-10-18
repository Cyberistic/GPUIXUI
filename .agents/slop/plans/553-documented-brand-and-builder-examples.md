# Plan 553 — The documented brand is a theme the contract rejects

**Workstream:** `tokens-theme`
**Phase:** F (documentation truth)
**Depends on:** 098 (the brand example passes the contract), 347 (the `track`
role), 355/356 (the snippet and JSDoc guards), 526 (the brand scrim figure)
**Status:** done

## 1. Why

Plans 098, 355 and 356 established two promises:

1. the documented copy-and-own brand is a theme the package's own checker
   accepts ("the documented template cannot ship below a floor", plan 098);
2. the documented snippets and the source `@example` blocks name only public
   API (plans 355 and 356).

Neither promise covers the **theme a documented example builds**. The surfaces
drifted:

### 1.1 The docs and README brand omit the value groove

`docs/tokens.md` (Theme API, "A brand that changes `primary`…") and
`packages/tokens/README.md` both show:

```ts
export const brandTheme = createTheme({
  mode: "dark",
  name: "Acme",
  colors: {
    primary: "#7C5CFF",
    primaryForeground: "#000000",
    primaryHover: "#8F73FF",
    primaryActive: "#A28CFF",
    primaryText: "#C9BDFF",
    ring: "#9B8CFF",
    overlay: "#000000D9",
  },
  radius: { md: 8 },
  density: "compact",
});
```

That is the palette of the executed `src/brand-theme.example.ts` **minus
`track`**. The executed example ships `track: "#20202E"` for the reason plan 347
gives: `primary` is painted as a progress segment on the groove, and the
identity dark groove (`#3D4552`) leaves this brand's fill at **2.225:1**, under
the 3:1 mark floor.

Probe on this branch (the exact documented object):

```ts
themeFailures(documentedBrand);
// [{ kind: "contrast", foreground: "primary", background: "track",
//    pairClass: "mark", floor: 3, ratio: 2.225… }]
```

A reader who follows the page — the page whose next paragraph says the executed
example "is this exact family" — ships a theme the package's own checker
rejects, while every gate stays green because no test builds the snippet.

### 1.2 The builder JSDoc examples are half a theme

`packages/tokens/src/theme.ts` documents the two public builders with:

```ts
const brand = extendTheme(darkTheme, { name: "Acme", colors: { primary: "#7C5CFF" } });
const brand = createTheme({ mode: "dark", name: "Acme", colors: { primary: "#7C5CFF" }, density: "compact" });
```

Each result fails `themeFailures` three times:

- `primaryForeground` on the inherited dark foreground: **4.243:1** (floor 4.5);
- `primary` on the inherited `track`: **2.225:1** (mark floor 3);
- the dialog face (`popover` over the inherited `overlay`) over the brand's
  `primary`: **1.038:1** (surface floor 1.05).

These are the first builder examples a consumer sees, and they teach the exact
half-family change plan 098 and the Theme API section forbid.

### 1.3 The example's rationale quotes a figure plan 503 moved

`src/brand-theme.example.ts` says "the identity groove leaves this fill at
2.67:1". The shipped identity dark `track` is `#3D4552` after plan 503 and the
pair measures **2.225:1**; 2.67 is a value the current palette does not
produce. Nothing derives the sentence, so the stale figure survives a green
suite — the class of defect plans 536–544 removed from the two documents.

## 2. What changes

### 2.1 `docs/tokens.md` — the brand snippet names its groove

In the Theme API fenced `ts` block (around line 1556, the block that exports
`brandTheme`), add one line after `primaryText`:

```ts
    track: "#20202E",
```

In the paragraph that follows ("A brand that changes `primary` sets the whole
family…"), add one sentence after the scrim sentence:

> A dark brand also moves the value groove: `primary` is a progress segment
> painted on `track`, and the identity groove leaves this fill under the 3:1
> mark floor, so the example names its own neutral step.

Do **not** add a new ratio to the page: the figure is already guarded in the
example's own JSDoc by §2.5, and a second copy would need its own derivation.

Change "this exact family" to "this exact palette" in the sentence that points at
`src/brand-theme.example.ts` (the palette now matches role for role).

### 2.2 `packages/tokens/README.md` — the same line, the same rule

In the fenced `ts` block around line 147, add `track: "#20202E",` after
`primaryText`.

In "A theme that moves a filled family moves the whole family…", extend the
role list with the groove, e.g.:

> … `accentHover` and `accentActive` belong beside `accent`, `selection` is the
> accent's translucent wash, and a fill painted as a value indicator names
> `track` too — the identity groove leaves this brand's fill under the 3:1 mark
> floor.

`docs/design-system.md`'s §3 carries the same rule in prose. Extend its "A brand
that changes a fill moves the whole family" paragraph with one sentence — a fill
that is also a value indicator moves `track` with it — and say the executed
example carries the complete **palette**, not only the family.

### 2.3 `packages/tokens/src/theme.ts` — examples that are themes

`ThemeOverrides.colors` JSDoc: add one sentence after "Override individual
semantic colour roles.":

> A filled family moves as a set — the fill, its foreground and its two pointer
> states — and a fill painted as a value indicator moves `track` with it; see
> `brand-theme.example.ts`.

`extendTheme` JSDoc — replace the `@example` with a shape-only override, which
is what this builder demonstrates that `createTheme` does not, and point at the
executed brand for colour:

````md
 * Derive a theme from a base theme without mutating it. A colour change moves
 * the whole filled family, the value groove included; the complete, executed
 * example is `src/brand-theme.example.ts`.
 *
 * @example
 * ```ts
 * import { darkTheme, extendTheme } from "@gpuixui/tokens";
 *
 * const compact = extendTheme(darkTheme, {
 *   name: "Acme compact",
 *   density: "compact",
 *   radius: { md: 8 },
 * });
 * ```
````

`createTheme` JSDoc — make the first `@example` the documented brand exactly as
§2.1 writes it (family, `ring`, `overlay`, `track`, `radius`, `density`) with its
import line. Keep the second, `contrast: "high"`, line unchanged.

The three copies (docs, README, JSDoc) must carry the **same colour map**; §2.5
holds them together.

### 2.4 `packages/tokens/src/brand-theme.example.ts` — derive the groove figure

Replace "the identity groove leaves this fill at 2.67:1" with the current
derived figure, "2.23:1" (`contrastRatio("#7C5CFF", "#3D4552")` = 2.2251…,
`toFixed(2)` = `"2.23"`). Do not change a value.

### 2.5 Tests

**`packages/tokens/src/snippets.test.ts`** — add a `describe("documented theme
examples")` after the existing block. It reuses the file's `snippets` list and
`stripJsdoc`.

Helpers:

```ts
/** The `colors: { … }` map a documented theme example names. */
const colourMapOf = (code: string): Readonly<Record<string, string>> => {
  const body = /colors:\s*\{([^}]*)\}/.exec(code)?.[1] ?? "";
  return Object.fromEntries(
    [...body.matchAll(/([A-Za-z]+):\s*"(#[0-9A-Fa-f]{6,8})"/g)].map(
      ([, role, value]) => [role ?? "", value ?? ""],
    ),
  );
};

/** The documented blocks that claim to build a theme with colours. */
const documentedBrands = snippets.filter(({ label, code }) =>
  label === "docs/tokens.md" || label === "packages/tokens/README.md"
    ? code.includes("brandTheme =")
    : label.includes("theme.ts @example") && code.includes("colors:"),
);

const buildDocumented = (code: string, colors: Record<string, string>) =>
  code.includes("createTheme(")
    ? createTheme({ mode: "dark", name: "Documented", colors })
    : extendTheme(darkTheme, { name: "Documented", colors });
```

Five cases:

1. **"finds every documented brand map"** — `documentedBrands` is non-empty and
   covers the three labels (`docs/tokens.md`, the README, `theme.ts @example`).
   A guard that silently matched nothing cannot pass.
2. **"builds a theme the contract accepts"** — for each block,
   `expect(themeFailures(buildDocumented(code, map)), label).toEqual([])`.
3. **"moves the whole filled family and the groove"** — each map names
   `primary`, `primaryForeground`, `primaryHover`, `primaryActive`,
   `primaryText` and `track`.
4. **"is the palette the executed example ships"** — for each map entry,
   `expect(brandTheme.colors[role]).toBe(value)`, importing `brandTheme` from
   `./brand-theme.example.js`.
5. **"the guard catches the snippet it replaced"** — build the pre-fix map
   (case 2's map minus `track`), assert `themeFailures` contains
   `{ foreground: "primary", background: "track", pairClass: "mark" }` with a
   ratio below `contrastFloors.default.mark`. This is the regression mechanism
   and proves the new case can fail.

Footgun to avoid: `colourMapOf` matches the **first** `colors:` block in a
snippet. In the docs block that is the brand (the `scoped` `extendTheme` follows
it), and in the README block the brand is the only one. If a future snippet puts
another colour object first, name the fixture or split the fence; do not widen
the regex to "last match".

**`packages/tokens/src/theme.test.ts`** — add one case under the existing
"brand example" describe:

```ts
it("quotes the shipped identity groove in its rationale", () => {
  const source = readFileSync(
    new URL("./brand-theme.example.ts", import.meta.url),
    "utf8",
  );
  const groove = contrastRatio(brandTheme.colors.primary, darkTheme.colors.track);
  expect(groove).toBeLessThan(contrastFloors.default.mark);
  expect(source).toContain(`leaves this fill at ${groove.toFixed(2)}:1`);
});
```

`readFileSync` is deliberate, like `contrast.test.ts` and `snippets.test.ts`:
this is a policy check over the tree's own source, not runtime I/O.

## 3. Commands and expected results

Run from the workstream root unless stated.

1. **Write the tests first, before any document/example fix.**

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: **fail**. `documented theme examples` reports the docs and README
   map missing `track` (cases 2–4), the `theme.ts` JSDoc map missing the family
   and groove (cases 2–4), and the brand rationale quoting `2.67` instead of
   `2.23` (the new `theme.test.ts` case). Record the failure output in the commit
   message body or the plan's completion note.

2. Apply §2.1–§2.4.

3. ```sh
   nub exec vitest run src/snippets.test.ts src/theme.test.ts
   ```

   Expected: all pass, including the five new cases and the rationale case.

4. ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: `136+ files`, all pass (was 136 files / 5669 tests before the plan).

5. ```sh
   nub run --filter @gpuixui/tokens check-types
   ```

   Expected: `Done`, no diagnostics.

6. ```sh
   nub run lint && nub run fmt
   ```

   Expected: clean.

7. Whole-repo gate before committing the final state:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   The whole-repo gates may include other workstreams' trees; this worktree only
   holds `packages/tokens`, so record any failure outside `packages/tokens` as a
   cross-team note in `TODO.md` rather than editing another owner's path.

## 4. Two-directions verification

`scripts/verify-two-directions.sh` is written against `jj` and does not run on
these git worktrees (`TODO.md`, harness row). Prove both directions by hand, in
this order:

1. With the new tests written and **before** the document/example edits, run
   step 1 and capture the failure. The failure output must name:
   - `docs/tokens.md` — `track` missing / contract failure;
   - `packages/tokens/README.md` — same;
   - `theme.ts @example` — missing family roles;
   - `theme.test.ts` — `2.67` vs `2.23`.
2. Apply the fix, run step 3, and confirm the same cases pass.
3. Re-introduce one line of the old state (`track` removed from the README map)
   and confirm the suite fails again, then restore. This is the regression case
   5 in a real edit, not only an in-memory fixture.

## 5. STOP conditions

Stop and report instead of improvising if:

- the docs/README brand snippet is not the block named `brandTheme`
  (`rg -n "brandTheme =" docs/tokens.md packages/tokens/README.md` returns
  nothing) — the page was restructured and this plan's anchors are stale;
- `brandTheme.colors[track]` is no longer `#20202E` — derive the new value from
  the executed example instead of typing one, and update §2.1/§2.2/§2.3 to it;
- the derived groove ratio is **not** below the mark floor — the rationale in
  §2.4 would be false; re-measure the pair and rewrite the sentence, then stop
  before removing the guard;
- `themeFailures` rejects the brand for a reason other than the groove (for
  example a later palette plan moved another role without moving the docs) —
  fix the docs to the executed example role for role; do not weaken the test;
- `snippets.test.ts` starts matching a snippet that is deliberately broken
  (`contrast.ts`/`opacity.ts`/`metrics.ts` failure examples) — scope the filter
  to `theme.ts` JSDoc plus the two documents' brand blocks; never assert that
  every `@example` passes the contract.

## 6. Acceptance

- `docs/tokens.md` and `packages/tokens/README.md` build, role for role, the
  palette `src/brand-theme.example.ts` exports, `track` included.
- `themeFailures` returns `[]` for every documented brand map and for the
  `theme.ts` builder examples that carry colours.
- `docs/design-system.md`'s brand paragraph names the groove as part of the
  family rule.
- `theme.ts`'s builder examples no longer teach a half-family change:
  `createTheme` shows the complete brand, `extendTheme` shows a shape-only
  override and points at the executed example.
- `brand-theme.example.ts`'s rationale quotes the shipped identity-groove ratio,
  caught by a derived assertion.
- The new cases fail on the pre-fix tree and pass after it (both directions
  recorded), and `nub run --filter @gpuixui/tokens test`,
  `... check-types`, `nub run lint` and `nub run fmt` are green.
- `TODO.md` has the task ticked, the design-tokens progress bar updated, and the
  plan indexed as done in `.agents/slop/plans/README.md`.
