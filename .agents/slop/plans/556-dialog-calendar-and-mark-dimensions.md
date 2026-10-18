# Plan 556 — The dialog, calendar and mark metrics the dimension audits missed

**Workstream:** `tokens-theme`
**Phase:** B/F (component dimensions; metric-contract completeness)
**Depends on:** 353 (the `dimensions` group), 530 (drawer/chat/carousel
members), 554 (every surface metric walks the theme's own group), 550 (border
ladder), 389 (a platform style carries `dimensions`)
**Status:** ready

## 1. Why

`docs/design-system.md` §6 already promises:

> They live in `theme.dimensions` so a brand can widen a **dialog** or a toast
> without touching component source.

That sentence is false on this branch. `packages/components/src/dialog.tsx`
ships `MAX_WIDTH` as a local literal record — `sm: 360`, `md: 480`, `lg: 640` —
and `theme.dimensions` has no dialog member, so a brand that widens
`theme.dimensions` cannot widen a dialog. The same audit of the fixed metrics in
`packages/components` finds three more literals that are conceptually the same
class plan 530 collected (a surface, a piece of field chrome and a mark that
does not change with density):

| Consumer literal | File | Concept |
| ---------------- | ---- | ------- |
| `MAX_WIDTH = { sm: 360, md: 480, lg: 640 }` | `dialog.tsx:56` | the three dialog surface widths |
| `const CELL = 34` | `date-picker.tsx:361` | a calendar day cell |
| `const SEGMENT_WIDTH = 26` | `time-picker.tsx:113` | the hours/minutes segment of a time field |
| `const DOT = 10` | `avatar.tsx:47` | the presence dot on an avatar |

None can be changed through a theme or a copied `PlatformStyle`; each is read
only from component source. That contradicts the group's own rationale
(`scale.ts`: "Fixed surface metrics shared by components") and plan 389's
promise that a platform style owns every numeric group.

The two audits that built the group (353, 530) were explicit about their scope:
353 took the overlay, field, toast, preview-card and keycap metrics; 530 took
the drawer ladders, message viewport and carousel marks. Both missed the four
above — the dialog is the most visible surface in the system and the calendar
and time field are the two fixed grid metrics.

There is a second, narrower defect: `cells` and `dots` are only positive-checked
by plan 554's walk, so an edited theme can make a dialog ladder where `lg` is
narrower than `md`, a day cell smaller than the smallest control, a time segment
narrower than one body em, or a presence dot larger than half the smallest
avatar while all seven checks return `[]`. Those relationships are what the
components rely on, so they belong to `themeMetricFailures` like the drawer
ladders, the carousel mark and the inline-avatar fit.

## 2. What changes

### 2.1 `packages/tokens/src/scale.ts` — five new members

Add to the `Dimensions` interface, in the existing documentation order (after
`carouselIndicatorActiveWidth`):

```ts
  /** 360px — a small dialog's maximum surface width. */
  readonly dialogWidthSm: number;
  /** 480px — the default dialog's maximum surface width. */
  readonly dialogWidthMd: number;
  /** 640px — a large dialog's maximum surface width. */
  readonly dialogWidthLg: number;
  /** 34px — one day cell in a calendar grid; at least a small control. */
  readonly calendarCellSize: number;
  /** 26px — the hours or minutes segment of a time field; at least one body em. */
  readonly timeSegmentWidth: number;
  /** 10px — an avatar's presence dot; at most half the smallest avatar. */
  readonly avatarPresenceDotSize: number;
```

Add the same six members to the `dimensions` constant with `360`, `480`, `640`,
`34`, `26` and `10`. The names are `dialogWidth*` rather than `maxWidth`
because the consumer clamps to the window (`Math.min(MAX_WIDTH[size],
available)`), exactly like `drawerWidth*` and `overlayWidth`, which are also
maximums.

Do **not** add `WIDTH`/`HEIGHT` for the drawer (plan 530 shipped those),
`overlayWidth` (220) for the date-picker trigger, or a member for
`empty-state.tsx`'s 360px prose measure: the first two already exist and the
last is a text measure, not a surface (see §6).

### 2.2 `packages/tokens/src/metrics.ts` — three relationships and one fit

Immediately after the carousel-mark rule (the `atLeast` on
`carouselIndicatorActiveWidth`, around line 731), add:

```ts
    // A dialog is offered in three sizes and "large" may not be narrower
    // than "medium": the surface a consumer asks for by name must grow.
    ...ladder(
      "dimensions",
      [
        ["dialogWidthSm", dimensions.dialogWidthSm],
        ["dialogWidthMd", dimensions.dialogWidthMd],
        ["dialogWidthLg", dimensions.dialogWidthLg],
      ],
      "increasing",
    ),
    // A calendar day is a control: a cell smaller than the theme's own small
    // control clips the label a reader clicks.
    ...atLeast(
      "dimensions",
      "calendarCellSize",
      dimensions.calendarCellSize,
      density.controlHeight.sm,
    ),
    // A time segment holds two body digits, so it is at least one em wide; a
    // segment narrower than its own type clips the value it edits.
    ...atLeast(
      "dimensions",
      "timeSegmentWidth",
      dimensions.timeSegmentWidth,
      typography.body.fontSize,
    ),
    // A presence dot sits on the smallest avatar's corner, so it may not be
    // larger than half that avatar. The shipped dot is exactly half of the
    // 20px `avatarSize.xs`.
    ...atMost(
      "dimensions",
      "avatarPresenceDotSize",
      dimensions.avatarPresenceDotSize,
      avatarSize.xs / 2,
    ),
```

The rules read the theme's own values (not the shipped constants) for the same
reason plan 552 moved the ladders: a `PlatformStyle` may carry a
`dimensions` override. `density`, `typography` and `avatarSize` are already
destructured locals in `themeMetricFailures`.

The JSDoc bullet for `dimensions` gains one sentence: "A dialog's three widths
must grow, a calendar cell fits the small control, a time segment is at least
one body em wide, and an avatar's presence dot is at most half the smallest
avatar."

### 2.3 `packages/tokens/src/dimensions.example.ts` — show one new member

Add `dialogWidthMd: 520` to `narrowDrawerTheme` and rename the comment to say it
narrows the drawer and widens the default dialog. The file stays two
statements; its test asserts both.

### 2.4 New test — `packages/tokens/src/fixed-surface-metrics.test.ts`

Header comment states the bug being guarded: the design system promised a brand
could widen a dialog through `theme.dimensions` while `dialog.tsx` kept a local
`MAX_WIDTH` of 360/480/640, and the same audit found the calendar cell, time
segment and avatar presence dot as literals; the relationships those components
rely on were not in the metric contract.

Use the public entry (`./index.js`), a spread variable for the dimension object
(the way a copied or decoded style arrives; no cast), and `shippedThemes`.

Cases:

1. **shipped metrics** — `dimensions.dialogWidthSm/Md/Lg` are 360/480/640,
   `calendarCellSize` 34, `timeSegmentWidth` 26, `avatarPresenceDotSize` 10.
2. **inherited by every shipped set** — every `shippedThemes` entry carries the
   six values.
3. **the dialog ladder is editable and ordered** —
   `extendTheme(lightTheme, { dimensions: { dialogWidthMd: 520 } })` keeps `sm`
   and `lg` and moves only `md`; `themeMetricFailures` stays `[]`.
4. **a collapsed dialog ladder is reported** — `{ ...dimensions, dialogWidthMd:
   300 }` reports exactly one
   `{ group: "dimensions", member: "dialogWidthMd", rule: "increasing",
   actual: 300, bound: 360 }`.
5. **a day cell below the small control is reported** —
   `calendarCellSize: 20` reports exactly one
   `{ group: "dimensions", member: "calendarCellSize", rule: "at-least",
   actual: 20, bound: 28 }` (the shipped comfortable `density.controlHeight.sm`).
6. **a segment narrower than one body em is reported** — `timeSegmentWidth: 12`
   reports exactly one `at-least` at bound `14` (the shipped `body.fontSize`).
7. **a presence dot larger than half the smallest avatar is reported** —
   `avatarPresenceDotSize: 11` reports exactly one `at-most` at bound `10`.
8. **the rules are not blanket minimums** — the shipped values, and a theme that
   only widens a dialog, return `[]`; a zero `timeSegmentWidth` is still the
   generic `positive` diagnostic, not `at-least`, so one value keeps one report.

Cases 4–7 must fail on the pre-rule implementation (`themeMetricFailures`
returns `[]` for each). Record the real output before adding §2.2.

### 2.5 `packages/tokens/src/dimensions.test.ts` — the coherence case

Extend "keeps the drawer ladders and the carousel mark coherent" (or add a
sibling case) with the shipped dialog ladder `sm < md < lg`, the calendar cell
against `controlHeight(lightTheme, "sm")`, the time segment against
`lightTheme.typography.body.fontSize`, and the presence dot against
`lightTheme.avatarSize.xs / 2`. Extend the example case to assert
`dialogWidthMd: 520` and the inherited `dialogWidthSm`/`dialogWidthLg`.

### 2.6 `docs/tokens.md` — the table, the type index and the prose

- Add the six table rows after `carouselIndicatorActiveWidth`:
  `dialogWidthSm` 360 "small dialog maximum width"; `dialogWidthMd` 480
  "default dialog maximum width"; `dialogWidthLg` 640 "large dialog maximum
  width; the three sizes must grow"; `calendarCellSize` 34 "one calendar day
  cell; at least a `small` control"; `timeSegmentWidth` 26 "hours/minutes
  segment of a time field; at least one `body` em";
  `avatarPresenceDotSize` 10 "presence dot on an avatar; at most half
  `avatarSize.xs`".
- In the prose after the table, extend the ladder paragraph: the dialog widths
  are a third ladder, a calendar cell fits the small control, a time segment is
  at least one body em, and the presence dot is at most half the smallest
  avatar.
- In the `Dimensions` row of the type index (around line 90), add "dialog,
  calendar and time-segment sizes, and the avatar presence mark".
- The table is guarded by `docs.test.ts`'s `Object.entries(dimensions)` case
  (line ~906); the rows must be present or the suite fails.

### 2.7 `docs/design-system.md` — the sentence the plan makes true

In §6 (lines 237–245), keep the existing sentence and add after "…beside an
idle 8px one.":

> A dialog's surface is 360/480/640px wide at `sm`/`md`/`lg`, a calendar day
> cell is 34px, a two-digit time segment is 26px, and an avatar's presence dot
> is 10px — at most half the smallest avatar.

`docs.test.ts` has a hard-coded mirror of these sentences ("states the drawer,
chat and carousel dimensions", line ~2379). Update that case's `sentence`
string with the new members, or add a sibling case; do not leave the prose
unguarded. Keep the existing "a brand can widen a dialog or a toast" sentence —
it is now true.

### 2.8 `packages/tokens/README.md` — the dimension clause

Extend "Component dimensions include the drawer ladders, the shortest message
viewport and the carousel marks" (line ~142) with the dialog ladder, the
calendar cell, the time segment and the avatar presence mark.

### 2.9 `COMPONENTS.md` — the Design tokens row

In the `Design tokens` row, extend the dimensions parenthesis after the plan-530
phrase: "the dialog width ladder, the calendar day cell, the time segment and
the avatar presence mark (plan 556) included".

### 2.10 `TODO.md`, the plan index and the RD note

- Add and tick under "Design tokens and theming":
  "Ship the dialog, calendar, time-segment and avatar-presence metrics — the
  design system promised a brand could widen a dialog through
  `theme.dimensions` while `dialog.tsx` kept 360/480/640 as a local
  `MAX_WIDTH`; the calendar day cell (34), the time segment (26) and the avatar
  presence dot (10) were the same class, so all three are dimensions with a
  dialog ladder, a cell fit, a segment em and a dot bound (plan 556)".
- Add cross-team rows for `components`: `dialog.tsx` reads
  `theme.dimensions.dialogWidthSm/Md/Lg`, `date-picker.tsx` reads
  `calendarCellSize`, `time-picker.tsx` reads `timeSegmentWidth`, and
  `avatar.tsx` reads `avatarPresenceDotSize` instead of the literals (owner:
  `components`; plan 556).
- Re-count the progress bar from the file; do not quote a number before
  counting.
- Add plan 556 to `.agents/slop/plans/README.md` after 555 with status `done`,
  and append one commentary paragraph in the voice of 546–555.
- Add `.agents/slop/rd/2026-10-19-tokens-next-556.md` with what landed, the
  test count, the queue state and the re-checked candidates (§6).

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline before the plan lands:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS — 137 files, 5,684 tests (measured on 2026-10-19). STOP if red.
2. Implement §2.1 and §2.3 first, then add §2.4 and run only the new file:
   ```sh
   cd packages/tokens && nub exec vitest run src/fixed-surface-metrics.test.ts
   ```
   Expected: FAIL on cases 4–7 — `themeMetricFailures` returns `[]` for the
   collapsed dialog ladder, the short cell, the narrow segment and the oversized
   dot. Cases 1–3 and 8 pass. Record the real output.
3. Implement §2.2 (the rules and the JSDoc), re-run the file:
   ```sh
   cd packages/tokens && nub exec vitest run src/fixed-surface-metrics.test.ts
   ```
   Expected: PASS, 8 tests.
4. Update §2.5–2.9, then the whole package:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS — 138 files, 5,692 tests (one file, eight cases more).
5. Gates:
   ```sh
   nub run check
   nub run lint
   nub run test
   ```
   Expected: all green.
6. Prove no shipped colour or theme value moved:
   ```sh
   git diff --stat packages/tokens/src/color.ts packages/tokens/src/typography.ts packages/tokens/src/platform-styles packages/tokens/src/platform-recipes.ts
   ```
   Expected: empty. The only value edits are the six new `dimensions` members,
   which every theme inherits.
7. Commit and push:
   ```sh
   git add -A
   git commit -m "feat(tokens): ship the dialog, calendar and mark dimensions"
   git push origin agent/tokens-theme
   ```

## 4. STOP conditions

Stop and report instead of improvising if:

- adding the members requires a change to `Theme`, `ThemeOverrides` or
  `PlatformStyleStructure` — they already carry `Dimensions`; a new field must
  merge field by field through the existing `mergeDefined` path;
- a shipped theme, platform variant or recipe reports a new metric failure after
  §2.2 (its shipped value would violate a rule this plan invented; do not
  silence the rule — report the finding);
- a document guard fails because a count or a sentence is now stale beyond the
  cases named here — update the guard's expected sentence/derived phrase, not
  the contract;
- `dimensions.example.ts`'s widened dialog trips another rule (for example a
  preview or overlay bound) — the dialog ladder is independent; do not edit an
  unrelated metric;
- any new case needs an `as`, `any` or a suppression — the spread-variable
  pattern reaches the checker without one;
- the package was already red before the change for reasons outside this
  workstream.

## 5. Acceptance

- `theme.dimensions` owns the dialog widths, the calendar cell, the time segment
  and the avatar presence dot; `extendTheme` and every shipped theme, platform
  variant and recipe carry them.
- The design system's "a brand can widen a dialog" sentence is true, and the
  six members are named in the catalogue, README and the design system.
- `themeMetricFailures` reports a collapsed dialog ladder, a day cell below the
  small control, a segment narrower than one body em and a dot above half the
  smallest avatar, with one diagnostic per defect.
- The new suite fails without §2.2 and passes with it; every shipped set returns
  `[]`.
- No colour, type or theme value moves.
- `TODO.md`, `COMPONENTS.md` and the plan index are current; cross-team rows
  record the four consumer migrations.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 6. Candidates left out (and why)

- **The empty-state prose measure (360px, `empty-state.tsx:16`)** — it is a text
  measure, not a surface or a mark, and the theme carries no font-metric model
  to bound it honestly. Revisit only if the system gains measure tokens.
- **The toast tone bar's 3px width (`toast/viewport.tsx:101`)** — it is a
  decorative accent beside the tone glyph; the glyph carries the status. The
  carousel and avatar marks encode state and got dimensions; the bar does not.
- **The popover's 200px minimum and the combobox's 280px scroll height** — both
  are already recorded as `components` rows (TODO, plan 353 audit): they must
  either read `overlayMinWidth`/`overlayMaxHeight` or be settled as a compact
  overlay concept. Not a token gap until that decision lands.
- **The timeline dot's 8px** — it is exactly `spacing.sm`; the consumer can read
  the spacing scale. No new dimension.
