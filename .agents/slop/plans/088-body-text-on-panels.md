# 088 — Default body text on the quiet panel and the floating surface

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `071` (contrast contract), `079` (secondary text on washes), `086` (total contract), `087` (selected secondary text) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

`contrastPairs` measures `foreground` on four surfaces: `background`, `card`,
`hover` and `active`. Two more surfaces paint it in the shipped library, and no
pair covers them:

| Painted pair | Where it is painted | Evidence |
| ------------ | ------------------- | -------- |
| `foreground` on `muted` | an avatar's fallback initials on the quiet disc | `packages/components/src/avatar.tsx:102` sets `backgroundColor: theme.colors.muted` on the wrapper and `:110` sets `color: theme.colors.foreground` on the initials |
| `foreground` on `popover` | a date picker's month header inside the floating calendar | `packages/components/src/date-picker.tsx:347` sets `backgroundColor: theme.colors.popover`, `:353` sets `color: theme.colors.foreground` on the month label |

The primitives make both compositions first-class, not accidents:
`surfaceStyle` accepts `muted` and `popover` as surface tones
(`packages/primitives/src/core/style.ts`, `SURFACE_TONES`), and the default
`Text` tone resolves to `foreground` (`tones.default`). So any `Surface
tone="muted"` or `tone="popover"` with default body text is exactly this pair.

This is the same class of gap plans `076`–`087` closed: a role was measured, but
not on every surface it paints. The completeness guard added by plan `086` is
**role-level** — `foreground` is measured *somewhere*, so it passes — and cannot
see a surface a role paints on.

Every shipped set clears the body floor with large margin today, so this plan
moves **no colour value**:

| Set | `foreground` on `muted` | `foreground` on `popover` |
| --- | ----------------------- | ------------------------- |
| identity light | 14.90:1 | 16.88:1 |
| identity dark | 13.23:1 | 13.23:1 |
| high-contrast light | 18.76:1 | 21.00:1 |
| high-contrast dark | 17.40:1 | 18.42:1 |
| macOS light / dark | 14.33 / 12.30 | 16.88 / 12.30 |
| Linux light / dark | 14.15 / 11.65 | 16.88 / 11.65 |
| Windows light / dark | 14.42 / 12.50 | 16.88 / 12.50 |

The defect is in the **gate**, not the palette: a brand theme or a copied
platform style may set `muted` or `popover` close to its `foreground` (a dark
quiet panel in a light theme is a common mistake) and every suite stays green
while an avatar's initials or a picker's month label become unreadable.

## 2. Design decisions (do not re-litigate)

1. **One list owns the surfaces.** A private `bodyTextSurfaces` list holds the
   six surfaces default body text is painted on and `bodyTextPairs` derives the
   pairs from it — the same "one list, derived pairs" rule plan `087` applied to
   `selectionSurfaces`. The four explicit `foreground` entries leave the literal
   `contrastPairs` array.
2. **Both new pairs are `body` class.** They are default body text: 7:1 in the
   default themes and 7:1 at high contrast, exactly like `foreground` on the
   canvas. Do not classify them as `secondary` to avoid a value move; no value
   moves at the `body` floor.
3. **No colour changes.** The table above proves the floor already passes in all
   ten shipped colour sets. If any set failed, this plan would STOP (see §6) —
   lowering the class or editing a role without an audit is not authorised.
4. **The list is an audit result, not a runtime observation.** The package cannot
   see which pairs a component paints. The list stays module-private (like
   `ringSurfaces` and `controlFillRoles`) and is documented as the surfaces the
   shipped library paints; a new painting surface is added by auditing the
   consumers and extending the list.
5. **The documents name the surfaces.** The catalogue's verification paragraph
   states where default body text is measured and why the quiet panel and the
   floating surface are real; the design system's floor table row for body text
   stops understating the contract (it currently omits `muted` and the two
   washes, which the contract already measured before this plan).
6. **No consumer change.** `packages/components` and `packages/primitives` are
   other workstreams' paths. Their `foreground`-on-`muted`/`popover` call sites
   are legitimate body text; the contract now covers them as painted.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/088-body-text-on-panels.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its paragraph |
| `packages/tokens/src/contrast.ts` | `bodyTextSurfaces`, `bodyTextPairs`, derive the `foreground` pairs |
| `packages/tokens/src/body-text-surfaces.test.ts` | **new** — shipped sets, both regressions, the pair list |
| `packages/tokens/src/contrast.test.ts` | pair count 103 → 105; header note |
| `packages/tokens/src/docs.test.ts` | the body-text row and the catalogue sentence; derive the surfaces |
| `packages/tokens/src/readme.test.ts` | the README's body-text sentence |
| `packages/tokens/README.md` | one sentence in *Checking a theme* |
| `docs/tokens.md` | one paragraph in *Verification* |
| `docs/design-system.md` | the §9 body-text floor row |
| `COMPONENTS.md` | *Design tokens* and *Theme contrast check* rows |
| `TODO.md` | one ticked row and the section bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's path.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

Add above `contrastPairs`:

```ts
/**
 * The surfaces default body text (`foreground`) is painted on: the canvas and
 * the card, the quiet panel an avatar's fallback initials sit on, the floating
 * surface a date picker's month header sits on, and the hover and pressed
 * washes a ghost row paints. `foreground` is the default `Text` tone on every
 * `Surface` tone in `primitives`, so the panel and the popover are compositions
 * the API invites, not accidents.
 */
const bodyTextSurfaces = [
  "background",
  "card",
  "muted",
  "popover",
  "hover",
  "active",
] as const;

const bodyTextPairs: readonly ContrastPair[] = bodyTextSurfaces.map(
  (background): ContrastPair => ["foreground", background, "body"],
);
```

In `contrastPairs`, delete these four lines:

```ts
["foreground", "background", "body"],
["foreground", "card", "body"],
["foreground", "hover", "body"],
["foreground", "active", "body"],
```

and put `...bodyTextPairs` where they were. The array order is not asserted, but
keeping the spread in that position keeps the printed failure order familiar.
The count goes 103 → 105.

Extend the JSDoc of `contrastPairs` with one clause: *including default body
text on the quiet panel and the floating surface*. Do not export
`bodyTextSurfaces` in this plan (decision 4).

### 4.2 `packages/tokens/src/body-text-surfaces.test.ts` (new)

Header comment must state the bug: *default body text was measured on four of
the six surfaces it paints: an avatar's fallback initials sit on `muted` and a
date picker's month header sits on `popover`, and neither pair was in the
contract, so an edited theme could make both unreadable while every suite stayed
green.*

```ts
/**
 * Guards the defect plan 088 fixed: ...
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const bodyTextPairs = contrastPairs.filter(
  ([foreground, , pairClass]) =>
    foreground === "foreground" && pairClass === "body",
);

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ["light", getTheme("light")],
  ["dark", getTheme("dark")],
  ["high-contrast light", getTheme("light", "high")],
  ["high-contrast dark", getTheme("dark", "high")],
  ...(["darwin", "linux", "win32"] as const).flatMap(
    (platform): ReadonlyArray<readonly [string, Theme]> =>
      (["light", "dark"] as const).map((mode) => [
        `${platform} ${mode}`,
        getPlatformTheme(platform, mode),
      ]),
  ),
];

describe("default body text surfaces", () => {
  it("measures every surface foreground is painted on", () => {
    expect(bodyTextPairs.map(([, background]) => background)).toEqual([
      "background",
      "card",
      "muted",
      "popover",
      "hover",
      "active",
    ]);
  });

  it("clears the body floor on every shipped set and surface", () => {
    themes.forEach(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].body;
      bodyTextPairs.forEach(([, surface]) => {
        expect(
          contrastRatio(theme.colors.foreground, theme.colors[surface]),
          `${label}: foreground on ${surface}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("names the quiet-panel regression", () => {
    // A light theme whose quiet panel is dark: the avatar fallback disappears.
    const regressed = extendTheme(getTheme("light"), {
      colors: { muted: "#3D4552" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background }) =>
        foreground === "foreground" && background === "muted",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      pairClass: "body",
      floor: 7,
    });
    expect(failures[0]?.ratio).toBeCloseTo(1.75, 2);
  });

  it("names the floating-surface regression", () => {
    const regressed = extendTheme(getTheme("light"), {
      colors: { popover: "#2A303B" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background }) =>
        foreground === "foreground" && background === "popover",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.ratio).toBeCloseTo(1.27, 2);
  });
});
```

**Both directions.** Removing `"muted"` (or `"popover"`) from
`bodyTextSurfaces` makes the matching regression test's `failures` empty, so the
test fails; restoring it makes the suite green. `?.[0]`/`[0]` indexing is fine
here — the length assertions prove the entry exists first; if `noUncheckedIndexedAccess`
is on, use `failures[0]?.ratio` and keep the `toHaveLength(1)` assertion above
it.

### 4.3 `packages/tokens/src/contrast.test.ts`

- Extend the header comment with one sentence naming plan `088`.
- `expect(contrastPairs.length).toBe(103)` → `105`.

### 4.4 `packages/tokens/src/docs.test.ts`

- The §9 floor-row test: replace
  `| body text on background/card/popover/input | ... |`
  with
  `| body text on \`background\`/\`card\`/\`muted\`/\`popover\`/\`input\` and the \`hover\`/\`active\` washes | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`.
- Add a test in the `docs/design-system.md` block that derives the surfaces:

  ```ts
  it("names every surface default body text is measured on", () => {
    const surfaces = contrastPairs
      .filter(
        ([foreground, , pairClass]) =>
          foreground === "foreground" && pairClass === "body",
      )
      .map(([, background]) => background);

    expect(surfaces).toEqual([
      "background",
      "card",
      "muted",
      "popover",
      "hover",
      "active",
    ]);
    surfaces.forEach((surface) => {
      expect(designSystem, surface).toContain(surface);
    });
  });
  ```

  The first assertion is the drift alarm: a seventh surface fails it and points
  the executor at the row above.
- Add a catalogue test to the `docs/tokens.md contrast surfaces` block:

  ```ts
  it("states where default body text is measured", () => {
    const sentence =
      "Default body text is measured on `background`, `card`, the `muted` panel, `popover` and the `hover`/`active` washes. The panel and the floating surface are not academic: an avatar's fallback initials sit on `muted`, and a date picker's month header sits on its `popover`. Both clear the body floor with margin in every shipped set, so no value moves; the pairs exist so an edited theme cannot break them silently.";
    expect(markdown.replace(/\s+/g, " ")).toContain(sentence);
  });
  ```

### 4.5 Documents

- `docs/tokens.md`, *Verification*: insert exactly the sentence above as its own
  paragraph after the paragraph ending `Palette edits must keep it green.`
- `docs/design-system.md` §9: the body-text row becomes
  `| body text on \`background\`/\`card\`/\`muted\`/\`popover\`/\`input\` and the \`hover\`/\`active\` washes | 7:1 | 7:1 |`
  (values from `contrastFloors`, as the test builds them).
- `packages/tokens/README.md`, *Checking a theme*: add one sentence after the
  focus-ring sentence:
  `Default body text is checked on the canvas, card, the \`muted\` panel, \`popover\` and the \`hover\`/\`active\` washes, so an avatar's initials on the quiet panel and a date picker's month header on its floating surface are held to the body floor.`
  Add a `readme.test.ts` assertion containing that sentence.
- `COMPONENTS.md`: in the *Theme contrast check* row, change `103 contrast pairs`
  to `105 contrast pairs` and append:
  *Plan 088 measures default body text on the quiet panel and the floating surface — an avatar fallback's initials on `muted` and a date picker's month header on `popover` — after both painted in shipped components while the contract measured `foreground` only on the canvas, card and two washes; both pairs pass in all ten shipped sets, so no value moves.*
  In the *Design tokens* row, the test list already names the suites; leave it.
- `TODO.md`: tick the new row under *Design tokens and theming* and keep the bar
  current (`55/73` → `56/74`).
- `.agents/slop/plans/README.md`: add the `088` row with status `done` and a
  paragraph after the `087` paragraph describing the gap and its evidence.

## 5. Commands, in order

```sh
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: the package suite passes (`body-text-surfaces.test.ts` is green and
every existing file still passes, including the updated counts); type-check and
`check` are clean; root `lint` and `test` pass.

**Two-direction proof, run before committing:**

1. Remove `"muted"` from `bodyTextSurfaces` and run the package suite:
   `body-text-surfaces.test.ts` must fail on the pair-list assertion and on the
   quiet-panel regression. Restore it.
2. Remove `"popover"` and repeat: the floating-surface regression must fail.
   Restore it.
3. Confirm the final suite is green.

## 6. STOP conditions

- If any shipped set measures below its body floor for either new pair, **stop**
  and report the set and the ratio. Do not lower the pair class, and do not edit
  a palette value without an audit of every other pair that role is in.
- If the new pairs make an existing test's expected failure list ambiguous (for
  example the `quietBrandTheme` fixture filters by `foreground`), narrow that
  test rather than deleting assertions.
- If `docs.test.ts` cannot build the §9 row without retyping the six surfaces
  twice, stop and report; do not duplicate the list in prose and code without a
  drift alarm.
- If `contrastPairs.length` is not 105 after the change, stop: a pair was added
  or dropped by accident, not derived.

## 7. Acceptance

- [ ] `bodyTextSurfaces` is the one source; `foreground` pairs are derived from
      it.
- [ ] `contrastPairs` holds 105 pairs and includes `foreground` on `muted` and
      `popover`.
- [ ] Every shipped colour set (identity, high contrast, macOS, Linux, Windows)
      clears the body floor on both new pairs.
- [ ] `themeContrastFailures` names the quiet-panel and floating-surface
      regressions with the surface, class and floor.
- [ ] No colour value changes.
- [ ] `docs/tokens.md`, `docs/design-system.md`, the package README and
      `COMPONENTS.md` state the new coverage.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.
- [ ] The plan index row is marked done and the `TODO.md` row is ticked.
