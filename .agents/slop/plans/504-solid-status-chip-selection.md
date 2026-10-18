# 504 — The solid status chip and the panel action on the inverse selection veil

**Phase:** F (integration and polish)
**Depends on:** 344 (the inverse veil and its two lists), 382 (the lists derived
from `filledControlFamilies`), 399 (the solid status fill as a chip), 394/397
(`softAction` and its scope), 090–095/300 (the soft fills as surfaces), 388/391
(the derived enumeration and the published reference).

**Owner:** `tokens-theme`. Paths: `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, `TODO.md`, `COMPONENTS.md`.

---

## 1. The defect

Plan `344` shipped `selectionOnFill` for *content painted on a filled action*
and plan `382` made both fill lists derive from `filledControlFamilies`. That
index is the four **interactive** families — `primary`, `secondary`,
`destructive`, `accent` — and two documented opaque fills that carry their own
on-colour are not in it:

1. **A solid status chip.** `docs/tokens.md` publishes a `Solid fill` column
   (`info` / `infoForeground`, `success` / `successForeground`, …),
   `statusTone(theme, tone).solid` resolves the pair, and
   `statusSolidStyles` in `src/status-tone.example.ts` is the copyable chip
   whose label is text a reader can drag over. Plan `399` made that fill
   first-class as a surface; the *selection* contract never learned about it.
2. **The status panel's raised action.** `softAction` is literally *the action
   a tone-tinted panel carries* (plan `394`), and the package's own rule says
   content on a filled action uses the veil — yet `softAction` is missing from
   both lists.

The accent-tinted `selection` wash therefore has no pair on any of them, and on
several shipped sets it is not perceivable at all. Measured with the package's
own helpers (floor 1.05:1 at default and high contrast, `contrastFloors[level].surface`):

| Set | composition | ratio (before) |
| --- | --- | --- |
| identity light | `selection` over `success` | **1.0456:1** |
| identity dark | `selection` over `success` | **1.0240:1** |
| identity dark | `selection` over `info` | **1.0274:1** |
| macOS light | `selection` over `success` | **1.0259:1** |
| Linux light | `selection` over `success` | **1.0266:1** |
| Linux light | `selection` over `info` | **1.0474:1** |
| Windows light | `selection` over `info` | **1.0109:1** |
| Windows 7 light (Aero recipe) | `selection` over `info` | **1.0108:1** |
| every high-contrast dark set (identity, macOS, Linux, Windows, XP, Aero) | `selection` over `softAction` | **1.0468:1** |

Fourteen shipped compositions, in other words, where dragging over a solid
status chip's label or an Alert's `softAction` label paints no visible
highlight — the plan-344 defect one family and one surface over. For contrast,
the already-covered `destructive` fill has the same defect in identity light
(1.0465:1), identity dark (1.0044:1) and XP light (1.0186:1); the veil fixes it,
which is why the coverage must be the *kind* of fill, not a hand-typed family
list.

Two consequences beyond the highlight:

- `themeContrastFailures` returns `[]` for a copied theme whose `selectionOnFill`
  equals `success`, `info`, `warning` or `softAction`, because no pair exists —
  the edited-theme guarantee misses a composition the docs teach.
- `statusSolidStyles` does not apply the fill selector at all, so the copyable
  solid chip inherits the application's accent-tinted wash and reproduces the
  invisible highlight above.

---

## 2. The fix

One derived index and two derived lists, plus one AAA value move.

`selectionFillRoles` is the opaque fills that carry their own on-colour: the
four `filledControlFamilies`, the three solid status chips that are not already
an action fill (`info`, `success`, `warning`), and `softAction`. Both
`selectionFillWashPairs` and `selectionFillPairs` derive from it, so a fifth
filled family, a fifth tone or a future panel action joins one place.

Every shipped set passes the veil and the text through it:

| Pair | Tightest after | Set |
| --- | --- | --- |
| veil (`selectionOnFill` over each fill) | **1.060:1** | high-contrast dark, `info` |
| text (`xForeground` through the veil) | **4.827:1** | macOS dark, `accentForeground` on `accent` (unchanged) |

The one colour move is forced by the high-contrast floor: a 15% white veil over
the AAA dark `softAction` (`#3A414D`) leaves its white label at **6.623:1**,
under the 7:1 on-colour floor. Weakening the veil is not an option — at 10% the
veil stops being perceivable on `primary` (1.048:1) and `info` (1.040:1) — and
the label is already white, so the fill moves one step darker:

| File | Role | Before | After |
| --- | --- | --- | --- |
| `src/color.ts` (`highContrastDarkColors`) | `softAction` | `#3A414D` | `#343B47` |

After the move the white label measures **7.165:1** through the veil and the
raised action still clears 1.05:1 on every AAA soft tint (**1.071:1** on
`warningSoft` at the tightest); the accent wash over it also becomes
perceivable (the fourteen measured compositions drop to the eleven solid-status
ones). No other palette value changes: the two fill lists are separate from
`contrastPairs` (394), so the history at 394 stands and only the
selection-contract totals move (4 + 4 → 8 + 8, i.e. the checker's list grows by
eight pairs).

---

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

Replace the block that currently reads (around lines 1307–1326):

```ts
export const selectionFillWashPairs: readonly ContrastPair[] =
  filledControlFamilies.map(
    (fill): ContrastPair => ["selectionOnFill", fill, "surface"],
  );

/** The family foreground through the inverse veil, at the on-colour floor. */
export const selectionFillPairs: readonly ContrastPair[] =
  filledControlFamilies.map(
    (fill): ContrastPair => [`${fill}Foreground`, fill, "secondary"],
  );
```

(with its existing JSDoc) with:

```ts
/**
 * The opaque fills that carry their own on-colour and therefore cannot use the
 * accent-tinted `selection`: the four filled control families, the solid status
 * chips a chip's label is painted on (`info`, `success`, `warning`; `destructive`
 * is already an action family), and `softAction`, the raised action a tone-tinted
 * status panel carries. Every one of them is a filled surface a reader can drag a
 * selection over, and the accent wash is under the perceivability floor on
 * several shipped sets — identity light `success` 1.046:1, Windows light `info`
 * 1.011:1 and every high-contrast dark `softAction` 1.047:1 — so the inverse
 * veil is the wash. `statusTones` is the owner of the tone list, so a fifth tone
 * joins here with no second edit.
 */
export const selectionFillRoles = [
  ...filledControlFamilies,
  ...statusTones.filter((tone) => tone !== "destructive"),
  "softAction",
] as const;

/** One veil pair per opaque fill. */
export const selectionFillWashPairs: readonly ContrastPair[] =
  selectionFillRoles.map(
    (fill): ContrastPair => ["selectionOnFill", fill, "surface"],
  );

/**
 * The on-colour foreground every opaque fill carries, through the inverse veil,
 * at the floor that foreground already has on its fill.
 */
export const selectionFillPairs: readonly ContrastPair[] =
  selectionFillRoles.map(
    (fill): ContrastPair => [`${fill}Foreground`, fill, "secondary"],
  );
```

Update the long `contrastPairs` JSDoc paragraph and the
`themeContrastFailures` doc block where they describe the veil:

- `contrastPairs` JSDoc, around line 815: it says "the shipped secondary Button
  still paints those washes…" and the fill-selection story is in
  `themeContrastFailures` below; in the `themeContrastFailures` bullet list,
  replace

  ```
   * - `selectionFillPairs` and `selectionFillWashPairs` — the inverse
   *   `selectionOnFill` veil on every filled family; the list derives from
   *   `filledControlFamilies`, so `accent` is included.
  ```

  with

  ```
   * - `selectionFillPairs` and `selectionFillWashPairs` — the inverse
   *   `selectionOnFill` veil on every opaque fill that carries its own
   *   on-colour: the four filled control families, the three solid status chips
   *   (`destructive` is already a family) and the status panel's `softAction`.
   *   The list is `selectionFillRoles`, so a fifth tone joins one place.
  ```

- `contrast.test.ts`'s header comment is guarded prose of its own; leave it.

### 3.2 `packages/tokens/src/color.ts`

`highContrastDarkColors.softAction`: `"#3A414D"` → `"#343B47"`, with a comment
stating why: the white label keeps its AAA 7:1 floor through the inverse veil
(7.165:1) while the raised action still clears 1.05:1 on every AAA soft tint
(1.071:1 on `warningSoft`). Add one sentence to the palette's JSDoc paragraph
(the one ending "…plan 503"). The default `darkColors.softAction` stays
`#3A414D`; only the AAA set moves.

### 3.3 `packages/tokens/src/styles.ts`

`selectionStyle`'s JSDoc currently says "Content painted on a filled action uses
…". Broaden it to the filled surface, naming the solid chip and the panel
action, e.g.:

```
 * Content painted on an opaque filled surface — a filled action such as
 * `softAction`, or a solid status chip — uses `selectionStyle(theme, "fill")`:
 * the accent-tinted wash cannot be perceived on those fills, while the neutral
 * veil steps away from every one of them in both modes.
```

### 3.4 `packages/tokens/src/status-tone.example.ts`

`statusSolidStyles` is the copyable solid chip; its container must carry the
fill selector, because its label is selectable:

```ts
import {
  selectionStyle,
  statusTone,
  textStyle,
  type StatusTone,
  type Theme,
} from "./index.js";
…
export const statusSolidStyles = (theme: Theme, tone: StatusTone) => {
  const { solid } = statusTone(theme, tone);
  return {
    container: {
      ...selectionStyle(theme, "fill"),
      backgroundColor: solid.background,
      …
```

(Add `selectionStyle` to the existing import.)

### 3.5 `packages/tokens/src/selection-on-fill.test.ts`

- Header: add the second regression — the solid status chip and the panel
  action, the fourteen compositions measured before the fix and the eleven that
  remain under the accent wash afterwards, plan `504`.
- Replace the `filledControlFamilies`-built expectations with the new index:

  ```ts
  import { selectionFillRoles, statusTones } from "./index.js";
  …
  expect(selectionFillWashPairs.map(([role, fill, pairClass]) => [role, fill, pairClass]))
    .toEqual(selectionFillRoles.map((fill) => ["selectionOnFill", fill, "surface"]));
  expect(selectionFillPairs.map(([role, fill]) => [role, fill]))
    .toEqual(selectionFillRoles.map((fill) => [`${fill}Foreground`, fill]));
  ```

- Add a case holding the index to its owners:

  ```ts
  it("covers every opaque fill a reader can select a label on", () => {
    expect(selectionFillRoles).toEqual([
      ...filledControlFamilies,
      ...statusTones.filter((tone) => tone !== "destructive"),
      "softAction",
    ]);
    expect(selectionFillRoles).toHaveLength(8);
    expect(new Set(selectionFillRoles).size).toBe(8);
  });
  ```

- The shipped-set loop (`keeps every shipped set's veil and family text at
  their floors`) must iterate `selectionFillRoles` instead of
  `filledControlFamilies`; keep the `1.05`/`secondary` calculations.
- Keep the existing `records the accent wash the veil replaces` case (the six
  `primary` sets) and add a second one over `[...statusTones, "softAction"]`.
  It records the eleven compositions that remain under the accent wash after
  the fix — `destructive`, `success` and `info` on the light sets named in §1.
  `softAction` is no longer in the list because §3.2 moved the AAA dark fill;
  the case's comment must say so. Use `shippedThemes` labels and `toSorted()`:

  | role | sets |
  | --- | --- |
  | `destructive` | identity light, identity dark, Windows XP light |
  | `success` | identity light, identity dark, macOS light, Linux light |
  | `info` | identity dark, Linux light, Windows light, Windows 7 light |
  | `softAction` | none after §3.2 |
- Add the two regression cases that fail without the fix (they are the
  two-directions proof):

  ```ts
  it("reports a veil that matches a solid status fill", () => {
    const base = getTheme("light");
    const regressed = extendTheme(base, {
      colors: { selectionOnFill: base.colors.success },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ wash, background, pairClass }) =>
        wash === "selectionOnFill" &&
        background === "success" &&
        pairClass === "surface",
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]?.ratio).toBe(1);
  });
  ```

  and the same for `softAction` in `getTheme("dark", "high")` (use
  `background === "softAction"`), plus a `successForeground` set to `success`
  that reports a `secondary` text failure on `success` through the veil.
- Add a case asserting the example chip paints the veil:

  ```ts
  it("paints the solid chip with the inverse veil", () => {
    shippedThemes.forEach(({ theme }) => {
      statusTones.forEach((tone) => {
        expect(statusSolidStyles(theme, tone).container).toMatchObject(
          selectionStyle(theme, "fill"),
        );
      });
    });
  });
  ```

  (`statusTones` here is the one exported by `styles`.)

### 3.6 `packages/tokens/src/status-solid.test.ts`

Its `paints the chip with the solid pair` case (or equivalent) must also assert
the container carries `selectionStyle(theme, "fill").selectionColor`. Keep the
existing solid-pair assertions.

### 3.7 `packages/tokens/src/contrast.test.ts`

- `expect(selectionFillPairs).toHaveLength(4)` → `8`;
  `expect(selectionFillWashPairs).toHaveLength(4)` → `8`; the fill-name list
  becomes `["primary", "secondary", "destructive", "accent", "info", "success",
  "warning", "softAction"]`.
- The "reports a selection veil that paints nothing on a filled action" case
  sets `selectionOnFill: primary`; with the solid fills in the list it also
  fails on `info` (1.011:1), so filter the case to
  `background === "primary"` — the composition it states. Do the same in
  `selection-on-fill.test.ts`'s "veil matches its fill" case.

### 3.8 `packages/tokens/src/docs.test.ts`

- `quotes the tightest filled-action selection text and veil`: iterate
  `selectionFillRoles` instead of `filledControlFamilies` (import it), and change
  the expected veil label/ratio to
  `["identity dark high info", 1.060]`. The text expectation stays
  `["macOS dark accent", 4.827]`. Update the two `markdownProse` assertions to

  ```
  "**4.827:1** at the tightest (macOS dark, `accentForeground` on `accent`)"
  "**1.060:1** at the tightest (identity dark high, `selectionOnFill` on `info`)"
  ```

  (derive the numbers from the run if the third decimal differs; never
  hand-write a ratio the suite prints differently).
- `states the inverse veil for content on a filled action`: update the guarded
  sentence to the new wording (see §3.8) and keep the three names; add
  `selectionFillRoles` to the named list.
- Accessibility floor table rows (two literals around lines 1968–1969): replace
  the four-family lists with the eight roles, e.g.

  ```
  | text selection on an opaque filled surface (`primaryForeground`/`secondaryForeground`/`destructiveForeground`/`accentForeground`/`infoForeground`/`successForeground`/`warningForeground`/`softActionForeground` over the composited `selectionOnFill` veil) | 4.5:1 | 7:1 |
  | text selection veil on an opaque filled surface (`selectionOnFill` over `primary`/`secondary`/`destructive`/`accent`/`info`/`success`/`warning`/`softAction`) | 1.05:1 | 1.05:1 |
  ```

  Keeping the literal rows is correct — the floor table is checked row by row
  and a derived string would hide a missing role — but the plan's acceptance
  requires the eight names to be the full list.
- The verification paragraph that lists the contract's lists (around line 2557)
  already names `selectionFillPairs`/`selectionFillWashPairs`; no count there.

### 3.9 Docs

`docs/tokens.md`:

- The two `selectionOnFill` value-table rows (lines 252 and 529): change the
  description from "text selection veil for content painted on a filled action"
  to "…on an opaque filled surface (a filled action or a solid status chip)".
- §Text selection (around 1242–1280):
  - the opening sentence becomes "Content painted on an **opaque filled
    surface** — a filled action, the status panel's `softAction`, or a solid
    status chip — uses `selectionOnFill` instead of `selection`.";
  - name the eight roles via `selectionFillRoles` (the four control families,
    the three solid status chips, `softAction`) and the two lists;
  - state the tightest figures **4.827:1** text (macOS dark `accent`) and
    **1.060:1** veil (high-contrast dark `info`);
  - add the measured reason: the accent wash is under the 1.05 floor on a solid
    `success` chip in identity light (1.046:1), macOS light (1.026:1) and Linux
    light (1.027:1) and on an `info` chip in Windows light (1.011:1); state that
    the AAA dark `softAction` measured 1.047:1 before the fill move in §3.2 and
    that the move also keeps its white label at 7.165:1 through the veil and
    the action at 1.071:1 on every AAA soft tint;
  - the paragraph that says "The eight pairs join the checker" becomes
    "sixteen", and the plan sentence gains plan `504`.
- Pair-count history (around line 2244): after the plan-382 sentence, append a
  plan-504 sentence: both fill lists derive from `selectionFillRoles`, so the
  solid status chips and `softAction` join the veil — the selection-contract
  total moves from **eight** to **sixteen** pairs, and the AAA dark `softAction`
  moves one step darker so its label keeps the AAA floor through the veil.
- Add `selectionFillRoles` wherever the reference enumerates the public
  selection lists (the "Text selection" section is enough).

`docs/design-system.md`:

- §8 `text selection` row: "content painted on a filled action uses
  `selectionOnFill`" → "content painted on an opaque filled surface — a filled
  action, `softAction`, or a solid status chip — uses `selectionOnFill`", and
  keep the 1.000:1 `primary` evidence.
- §9 floor table rows (470–481): the two fill-selection rows become the
  eight-role wording of §3.7.

`packages/tokens/README.md` (§Selection and scrollbars, around 586):

- "Content painted on a filled action uses…" → "Content painted on an opaque
  filled surface — a filled action, `softAction`, or a solid status chip —
  uses…", and "hold all four filled families' (`primary`, `secondary`,
  `destructive`, `accent`)" → "hold all eight opaque fills'
  (`primary`, `secondary`, `destructive`, `accent`, `info`, `success`, `warning`,
  `softAction`)".

### 3.10 Ledger

- `COMPONENTS.md`:
  - Design tokens row: the sentence "content painted on a filled action uses
    the neutral `selectionOnFill` veil … because the accent wash is invisible on
    the accent fill" gains the solid status chip / `softAction` scope and plan
    `504`.
  - Theme contrast check row: "4 fill-selection text pairs, 4 fill-veil pairs"
    → "8 fill-selection text pairs, 8 fill-veil pairs"; append a plan-504
    sentence with the measured sets, the AAA fill move and its two figures.
  - Status tones row: state that a solid chip's label uses the inverse veil.
- `TODO.md`: add a ticked row under the tokens section:
  "Hold a solid status chip's and the panel action's text selection — … (plan
  504)". Keep it one paragraph, the defect and the fix.
- `.agents/slop/plans/README.md`: add the plan row
  `| [504](./504-solid-status-chip-selection.md) | The solid status chip and the
  panel action on the inverse selection veil | F | 344, 382, 394, 399 | done |`
  and one short prose paragraph after the 503 entry.

---

## 4. Commands and expected results

Run from the worktree root.

```sh
nub run --filter @gpuixui/tokens test
```

Expected: every file green. Before the implementation the two new cases in
`selection-on-fill.test.ts` fail (see §6). After it: 102 files, all green.

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: exit 0, no output. If `selectionFillRoles`'s spread widens a template
literal past `keyof ThemeColors`, fix the type at the list (the role names are
still `${role}Foreground` keys) — do not cast.

```sh
nub run check
nub run lint
nub run test
```

Expected: all green. `nub run check` includes the test-shape guard, lint,
format and the workspace type check.

---

## 5. STOP conditions

Stop and report instead of improvising if:

- any shipped set fails a veil or text pair after §2 — the measurements above
  were taken on this tree; a new failure means a value was mistyped or a set
  changed;
- the tightest veil is not `info` in a high-contrast dark set — re-measure and
  update §2/§3.7 from the output rather than guessing;
- `themeContrastFailures` on `getTheme("light")` returns a new failure after
  the list grows — the veil must pass on every shipped fill;
- a `docs.test.ts` figure disagrees with the suite's output — update the prose to
  the derived figure; never hand-write a ratio;
- a change would require editing `packages/primitives`, `packages/components`,
  `apps/docs` or `apps/playground` — record it in `TODO.md` and continue. In
  particular the **consumer** rows for painting the veil on a real solid Badge
  or a status-panel action are cross-team; this plan ships the token, the
  pair and the example only.

---

## 6. Test plan (prove both directions)

1. **Fails without the fix.** Add the two cases from §3.5 (`selectionOnFill =
   success` and `= softAction` must be reported) and the index case before
   editing `contrast.ts`. Run the package suite: all three fail — the checker
   returns `[]` for the new fills because `selectionFillRoles` does not exist
   and the lists still derive from the four control families.
2. **Passes with the fix.** Apply §3.1–§3.6 and re-run; every case green.
3. **The regression can be re-broken.** Temporarily remove `"info"` from the
   derived list and confirm the index case and the `info` failure case go red;
   restore. Do the same for `softAction`.
4. **Every shipped set.** The suite already enumerates `shippedThemes`
   (plan 388 guard). Do not hand-build a set list.
5. **The example is load-bearing.** Delete `...selectionStyle(theme, "fill")`
   from `statusSolidStyles` and confirm the new example case fails; restore.
6. **Docs.** `docs.test.ts` must pass with the derived figures; the floor rows
   are literal, so a missing role in the page fails the exact-row case.

## 7. Acceptance

- `selectionFillRoles` is exported and equals the four control families, the
  three solid status chips and `softAction` (eight roles, no duplicate).
- `selectionFillWashPairs` and `selectionFillPairs` each have eight pairs and
  derive from that index; `contrastPairs` stays 394.
- All 24 shipped sets pass `themeFailures`; the veil's tightest pair is
  1.060:1 (high-contrast dark, `info`) and the text's is 4.827:1 (macOS dark,
  `accent`). The only colour move is the AAA dark `softAction` (`#3A414D` →
  `#343B47`), which brings its white label through the veil to 7.165:1 while
  clearing 1.071:1 on every AAA soft tint.
- `themeContrastFailures` reports a copied theme whose veil equals a solid
  status fill or `softAction`.
- `statusSolidStyles` applies the fill selector, held by a test.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
  `COMPONENTS.md` and the plan index state the eight roles, the measured sets
  and plan `504`; every quoted ratio is derived by `docs.test.ts`.
- The three gates are green and the branch is pushed.
