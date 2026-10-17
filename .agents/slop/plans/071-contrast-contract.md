# 071 — A contrast contract the consumer can run

| Field | Value |
| ----- | ----- |
| Phase | F (theme extension and accessibility) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `013` (high contrast), `014` (status tones), `057` (status text), `059` (contrast completeness), `063` (platform styles) |
| Status | done |

This plan is self-contained. A weaker executor can follow it in order.

---

## 1. Why

The package promises the library's themes meet specific WCAG floors, and the
mission promises that a consumer can take a platform theme file, edit it, and
ship their own look. The first promise is enforced: `color.test.ts` and
`platforms.test.ts` hold every shipped colour set to the pair list and the
floors in `src/testing/contrast.ts`. The second promise has no check at all: a
consumer who edits `primary`, `mutedForeground` or `selection` has no way to ask
whether their theme still clears the guarantee, and `src/testing/contrast.ts`
is not exported. They would have to reimplement WCAG maths and retype 40 pairs —
exactly the drift the package exists to prevent.

The floors are also stated twice as prose: `docs/design-system.md` §9 and the
two test files' inline `floors` objects. One implementation, exported, removes
the second copy and gives the consumer the same check the library runs.

## 2. Design decision

1. **Move the maths and the catalogue into `src/contrast.ts`** and export it:
   - `contrastRatio(foreground, background)` — WCAG 2.x relative-luminance
     ratio for **opaque** `#RRGGBB` values; a value that does not parse yields
     `NaN`, so it can never pass a floor (`NaN >= floor` is false).
   - `compositeOver(color, background)` — composite an 8-digit translucent
     colour over an opaque one and return `#RRGGBB`. Unparseable input is
     returned unchanged, the same convention as `alpha`.
   - `contrastPairs` — the 40 documented role pairs and their class, moved
     verbatim from the test helper.
   - `contrastFloors` — the floors by contrast level and pair class:
     `default` = 7 / 4.5 / 3, `high` = 7 / 7 / 4.5.
   - `themeContrastFailures(theme, contrast = "default")` — every documented
     pair (and the selection wash, composited over `background` and `card`)
     that misses its floor. An empty array is the library's guarantee.
2. **The suites consume the public module.** `color.test.ts` and
   `platforms.test.ts` import `contrastPairs`, `contrastFloors`,
   `contrastRatio` and `compositeOver`; `src/testing/contrast.ts` is deleted, so
   there is one description of "what good contrast means".
3. **The wash is part of the check.** A theme whose `selection` role is opaque —
   or missing — reports a failure for each surface, because the ratio is measured
   on the composited colour. This closes the one pair class the tests already
   check but the consumer API would otherwise skip.
4. **No new dependency, no schema, no cast.** The package stays inert data and
   total functions; a colour that cannot be parsed is reported as a failure
   rather than hidden.

## 3. Exact files to create or change

All paths relative to the **tokens-theme worktree**:

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/071-contrast-contract.md` | **create** (this file) |
| `packages/tokens/src/contrast.ts` | **create** — maths, pair list, floors, `contrastRatio`, `compositeOver`, `themeContrastFailures` |
| `packages/tokens/src/index.ts` | **add** `export * from "./contrast.js";` |
| `packages/tokens/src/contrast.test.ts` | **create** — the public contract |
| `packages/tokens/src/contrast.example.ts` | **create** — a brand theme and its one-line check |
| `packages/tokens/src/testing/contrast.ts` | **delete** — the maths and pairs moved to the public module |
| `packages/tokens/src/color.test.ts` | **edit** imports; `floors` comes from `contrastFloors` |
| `packages/tokens/src/platforms.test.ts` | **edit** imports; `floors` comes from `contrastFloors.default`; add a `themeContrastFailures` assertion for every variant |
| `packages/tokens/src/docs.test.ts` | **add** a guard that the catalogue names the checker |
| `docs/tokens.md` | **add** "Checking a theme" under Theme API; name the helper in Verification |
| `docs/design-system.md` | **edit** §9 and §11 to name the consumer check |
| `packages/tokens/README.md` | **add** a short "Checking a theme" section |
| `COMPONENTS.md` | **add** a "Theme contrast check" design-system row |
| `TODO.md` | **add** one ticked task; correct the section's stale progress bar |
| `.agents/slop/plans/README.md` | **add** the `071` index row and explanation |

## 4. The implementation

`src/contrast.ts`:

```ts
import type { ThemeColors } from "./color.js";
import type { Theme, ThemeContrast } from "./theme.js";

/** The floor class a documented pair belongs to. */
export type ContrastPairClass = "body" | "secondary" | "boundary";

/** A foreground/background role pair and the class of text it carries. */
export type ContrastPair = readonly [
  keyof ThemeColors,
  keyof ThemeColors,
  ContrastPairClass,
];

/** Every documented text, status and boundary pair. */
export const contrastPairs: readonly ContrastPair[] = [ /* the 40 entries */ ];

/** WCAG floors by contrast level and pair class. */
export const contrastFloors: Readonly<
  Record<ThemeContrast, Readonly<Record<ContrastPairClass, number>>>
> = {
  default: { body: 7, secondary: 4.5, boundary: 3 },
  high: { body: 7, secondary: 7, boundary: 4.5 },
};

/** A documented pair that misses its floor in one theme. */
export interface ContrastFailure {
  readonly foreground: keyof ThemeColors;
  readonly background: keyof ThemeColors;
  /** Present when the pair sits on a translucent wash composited over `background`. */
  readonly wash?: keyof ThemeColors;
  readonly pairClass: ContrastPairClass;
  readonly floor: number;
  /** `NaN` when a role is not an opaque `#RRGGBB`. */
  readonly ratio: number;
}

export function contrastRatio(foreground: string, background: string): number { /* ... */ }

export function compositeOver(color: string, background: string): string { /* ... */ }

export function themeContrastFailures(
  theme: Theme,
  contrast: ThemeContrast = "default",
): ReadonlyArray<ContrastFailure> { /* ... */ }
```

`contrastRatio` is the existing `contrast` maths with a hex guard: a
`/^#[0-9A-Fa-f]{6}$/` test, then relative luminance, then
`(max + 0.05) / (min + 0.05)`. A non-match returns `Number.NaN`; `Math.max(NaN,
x)` keeps it `NaN`, so no branch is needed.

`compositeOver` is the existing `composite` maths: an 8-digit `#RRGGBBAA`
overlay blended channel-by-channel onto `#RRGGBB`, rounded and upper-cased. If
either input does not match its grammar, the colour is returned unchanged.

`themeContrastFailures`:

```ts
const surfaces = ["background", "card"] as const;

export function themeContrastFailures(theme, contrast = "default") {
  const floors = contrastFloors[contrast];
  const pairs = contrastPairs.flatMap(([foreground, background, pairClass]) => {
    const ratio = contrastRatio(theme.colors[foreground], theme.colors[background]);
    return ratio >= floors[pairClass]
      ? []
      : [{ foreground, background, pairClass, floor: floors[pairClass], ratio }];
  });
  const wash = surfaces.flatMap((background) => {
    const ratio = contrastRatio(
      theme.colors.foreground,
      compositeOver(theme.colors.selection, theme.colors[background]),
    );
    return ratio >= floors.body
      ? []
      : [{
          foreground: "foreground" as const,
          background,
          wash: "selection" as const,
          pairClass: "body" as const,
          floor: floors.body,
          ratio,
        }];
  });
  return [...pairs, ...wash];
}
```

The exact 40 pairs are copied from `src/testing/contrast.ts` lines 19–60
without edits. Do not add or remove a pair in this plan.

`src/testing/contrast.ts` is **deleted** and its two consumers change imports:

- `color.test.ts`: `compositeOver`, `contrastFloors`, `contrastPairs`,
  `contrastRatio` from `./contrast.js`; `floors: contrastFloors.default` and
  `floors: contrastFloors.high` in the colour-set table.
- `platforms.test.ts`: the same imports; `floors: contrastFloors.default` in
  `platformColourSets`; `pairs` → `contrastPairs`; `composite` →
  `compositeOver`; `contrast` → `contrastRatio`; `PairClass` →
  `ContrastPairClass`.
- Add to `platforms.test.ts`, inside the existing per-variant loop:

  ```ts
  expect(
    themeContrastFailures(getPlatformTheme(platform, mode)),
    `${platform} ${mode}`,
  ).toEqual([]);
  ```

`contrast.example.ts`:

```ts
import { extendTheme, getTheme, themeContrastFailures } from "./index.js";

/** A brand theme whose body text is deliberately too quiet. */
export const quietBrandTheme = extendTheme(getTheme("light"), {
  name: "Quiet",
  colors: { mutedForeground: "#B8BCC4" },
});

/** The one line a consumer's test adds; `[]` is the library's guarantee. */
export const quietBrandFailures = themeContrastFailures(quietBrandTheme);
```

## 5. Tests

`contrast.test.ts` (new; each test can fail):

1. `contrastRatio` returns the known WCAG values: white on black `21`, a colour
   on itself `1`, `#767676` on `#FFFFFF` at least `4.5`, `#777777` on `#FFFFFF`
   below `4.5`. A wrong luminance formula fails the last two.
2. `contrastRatio` returns `NaN` for an 8-digit value, a three-digit value, a
   CSS function and a non-string. A silent fallback to `1` fails.
3. `compositeOver("#00000080", "#FFFFFF")` is `#808080`; a 6-digit overlay is
   returned unchanged; a non-colour input is returned unchanged.
4. `contrastFloors` is exactly `default` 7/4.5/3 and `high` 7/7/4.5.
5. `themeContrastFailures` returns `[]` for all four shipped themes at their own
   contrast level.
6. `themeContrastFailures(quietBrandTheme)` reports every pair that reads
   `mutedForeground` with `floor` 4.5 (and only those pairs); the reported
   `ratio` is under `4.5`.
7. A theme whose `selection` is opaque reports the two wash failures on
   `background` and `card`, and a six-digit `selection` counts as opaque.
8. A theme role with an unparseable value is reported as a failure, not skipped
   (`NaN` cannot pass a floor).

`docs.test.ts`: one new assertion that `docs/tokens.md` names
`themeContrastFailures`, `contrastRatio`, `contrastPairs`, `contrastFloors` and
`compositeOver`, and one that builds the six floor rows of
`docs/design-system.md` §9 from `contrastFloors`. (The existing namespace-wide
public-values guard covers the same names; the sentence assertion states the
reason, and the floor-row guard closes the one table plan `062` left as prose.)

## 6. Documentation edits

`docs/tokens.md`, under **Theme API**, after the merge rules:

> ### Checking a theme
>
> An edited theme can be held to the same guarantee as the shipped ones:
>
> ```ts
> import { themeContrastFailures } from "@gpuixui/tokens";
>
> themeContrastFailures(brandTheme); // [] when every pair clears its floor
> themeContrastFailures(highContrastBrand, "high");
> ```
>
> `themeContrastFailures(theme, contrast?)` measures `contrastPairs` against
> `contrastFloors`; `contrastRatio(fg, bg)` is the WCAG ratio for opaque
> `#RRGGBB` values (`NaN` when a value does not parse, so it always fails), and
> `compositeOver(colour, base)` composites a translucent role so the selection
> wash is measured as it paints. The floors are the ones in
> [`design-system.md` §9](./design-system.md#9-accessibility). `contrastPairs`
> and `contrastFloors` are the data behind both.

In **Verification**, add one sentence: the suites and the documented contract
now read `contrastPairs`/`contrastFloors`, so a new pair or floor cannot land in
only one of them.

`docs/design-system.md`:

- §9 after "It can fail": "The same check is public: `themeContrastFailures(theme)`
  returns every pair an edited theme misses, so a brand theme can be held to the
  same floors in its own test suite."
- §11 Extension, after the merge sentence: "Verify an edited theme with
  `themeContrastFailures(theme, contrast)`; an empty array is the library's
  guarantee."

`packages/tokens/README.md`, after **High contrast**:

> ## Checking a theme
>
> `themeContrastFailures(theme, contrast?)` returns every documented pair the
> theme misses, so a brand theme or an edited platform style is held to the same
> floors as the shipped ones:
>
> ```ts
> import { themeContrastFailures } from "@gpuixui/tokens";
>
> themeContrastFailures(brandTheme); // []
> ```
>
> `contrastRatio`, `contrastPairs`, `contrastFloors` and `compositeOver` expose
> the parts.

`COMPONENTS.md`: a new design-system row, **Theme contrast check**.

`TODO.md`: tick the new task; the section's bar currently says `38/57` but the
section holds 52 tracked tasks, 37 of them done — correct it to `38/53` after
this task lands (recount with the command in §7).

## 7. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # exit 0; record the observed count
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run fmt                                    # exit 0
nub run test                                   # exit 0
```

Recount the tokens section's tasks:

```sh
awk '/### Design tokens and theming/{f=1} /## Phase C/{f=0} f' TODO.md \
  | grep -c '^`\[x\]`'   # done, including the bar line
awk '/### Design tokens and theming/{f=1} /## Phase C/{f=0} f' TODO.md \
  | grep -c '^`\[ \]`'   # pending
awk '/### Design tokens and theming/{f=1} /## Phase C/{f=0} f' TODO.md \
  | grep -c '^`\[!\]`'   # blocked
```

The bar counts tasks, not the bar line: done / (done + pending + blocked).

## 8. STOP conditions

Stop and report if:

- the 40 pairs cannot be moved without changing a pair — the list is the
  contract; record the difference instead of editing it;
- `contrastRatio` needs to accept a CSS function or a named colour — the package
  ships hex roles only, and widening the grammar without a parser is a
  behaviour change that needs its own plan;
- `themeContrastFailures` needs `Option`/`Effect` — the package has zero runtime
  dependencies by design; `NaN` + a failure entry is the dependency-free
  representation, and the README's "Why no Effect here" section already argues
  it;
- a test has to import the deleted `testing/contrast.ts` to pass — update the
  import to `./contrast.js`, do not resurrect the duplicate;
- the docs namespace guard reports an export not named in `docs/tokens.md` —
  name it in the new section; do not add an export the docs do not explain.

## 9. Test plan and both directions

1. Change the body floor in `contrastFloors.default` to `6.9` → the floors test
   fails. Restore.
2. Delete the selection-wash block from `themeContrastFailures` → test 7 fails.
   Restore.
3. Make `contrastRatio` return `1` instead of `NaN` on a bad hex → test 2 and
   test 8 fail. Restore.
4. Lower `lightColors.mutedForeground` to `#B8BCC4` → `color.test.ts` fails on
   the muted pairs, and the shipped-theme `themeContrastFailures` assertion
   fails. Restore.
5. Delete the new docs section → the docs guard and the namespace-wide guard
   fail. Restore.
6. Delete the `themeContrastFailures` assertion from `platforms.test.ts` → the
   variant check disappears; verify by temporarily breaking one variant accent
   (e.g. `macos` light `mutedForeground` to `#C9C9CE`) that the assertion is the
   one that catches it. Restore.

## 10. Acceptance criteria

- `contrast.ts` is exported, typed and documented; the example compiles and is
  executed by the test suite.
- `color.test.ts` and `platforms.test.ts` consume the public pair list and
  floors; `src/testing/contrast.ts` is gone; no duplicated WCAG maths remains.
- `themeContrastFailures` returns `[]` for every shipped theme and names the
  offending pairs for a brand theme, an opaque selection wash and an
  unparseable role.
- `docs/tokens.md`, `docs/design-system.md`, `README.md` and `COMPONENTS.md`
  describe the check; the design-system's §9 floor table is held to
  `contrastFloors`; `TODO.md` carries the ticked task and an honest bar.
- The gate commands exit 0, and every failing direction in §9 was observed.
