# Plan 733 — the unchecked selection control: an off switch's groove and knob

**Workstream:** `tokens-theme` · **Phase:** B (design tokens and theming) ·
**Depends on:** plans `347` (the `track` groove), `503` (the groove on the washes
and soft fills), `084`/`601` (the functional control boundary), `651`
(`selectedActive`).

## 1. The defect this plan closes

A selection control has three states: checked, unchecked and indeterminate. The
tokens package publishes the designed paint of almost every control state —
`filledControl(theme, family)` for a filled action, `disabledControl(theme)` for
an unavailable one, `focusRing`/`invalidFocusRing` for focus and error,
`insetFocusRing` for a ring inside a fill, `softAction(theme)` for a panel
action, `selectionStyle` for a selection wash — but **the unchecked state of a
selection control has no owner**: no helper, no contract pair for its knob, and
no row in `docs/design-system.md` §8's interaction-state table.

The shipped consumer fills that vacuum with the wrong roles, in
`packages/primitives/src/core/selection.ts` (another workstream's path — this
plan only records the fix):

| Paint | Role today | What it is |
| ----- | ---------- | ---------- |
| `selectionBoxStyle` fill (unchecked) | `undefined` | correct: the panel shows through the box |
| `selectionBoxStyle` / `switchTrackStyle` edge (unchecked) | `input` | a *field fill* role, not an edge |
| `switchTrackStyle` fill (unchecked) | `muted` | a *surface* role, not a fill |
| `switchThumbStyle` knob (unchecked) | `foreground` | correct, and **unmeasured** |

Two consequences, both measured on the 24 shipped sets (`shippedThemes`):

1. **The off switch has no shape where it is used.** `muted` is the quiet panel:
   identity dark's `muted` is its `popover`, and every platform dark style's
   `muted` is its card and popover — the same fact plan `347` records — so the
   track measures **1.000:1** there. In the same sets the `input` edge also
   measures **1.000:1** on a card (Linux, Windows, XP and Aero dark all set
   `input` to the card), and in identity light the track is **1.027:1** on a
   card while the edge is **1.000:1**. A switch in a settings row, a dialog or a
   menu therefore paints nothing at rest in at least six shipped sets.
2. **The knob is not in the contract at all.** `trackMarkPairs` holds the four
   progress fills on the groove, and `markPairs` holds the solid roles on the
   plain surfaces, the `input` fill and the row fills — but nothing measures the
   disc painted *on* the groove when a switch is off (`foreground` on `track`).
   An edited theme whose `foreground` equals its `track` ships a switch with no
   knob while `themeFailures` returns `[]`.

This is the same class of gap plans `347` and `503` closed for
`Progress`/`Meter`/`Slider`: a surface role cannot carry the unfilled part of a
value indicator, and a mark needs its own pair. A switch is a value indicator
whose two states are the groove filled (on) and the groove empty with a knob
(off).

## 2. The design decision this plan records

The unchecked selection control keeps the panel and takes the two designed
boundary roles:

- **Box (checkbox, radio)** — no fill of its own, so the panel shows through,
  with the **`borderStrong`** edge. This is already the design system's rule
  (§7: `borderStrong` is the functional control boundary, "so a checkbox or
  field is perceivable without relying on fill alone"); the consumer paints
  `input` instead, which is cross-team row `601` of `TODO.md`.
- **Switch track (off)** — the **`track`** groove, exactly like an empty
  progress bar or a slider's unfilled span, with the **`borderStrong`** edge.
- **Switch knob (off)** — **`foreground`**, the role the shipped primitive
  already paints. It is now a measured mark on the groove.

The checked states do not move: the accent family's fill with its on-colour
(`filledControl`), the knob at that on-colour, and `insetFocusRing` for a ring
drawn inside the fill.

## 3. Files to change

All paths are relative to this worktree
(`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`).

### 3.1 `packages/tokens/src/contrast.ts`

1. In `trackMarkPairs`, add the off switch's knob and explain it:

```ts
export const trackMarkPairs: readonly ContrastPair[] = [
  ["primary", "track", "mark"],
  ["success", "track", "mark"],
  ["destructive", "track", "mark"],
  ["mutedForeground", "track", "mark"],
  // A switch at rest is the groove with its knob on it, not a filled pill:
  // `switchThumbStyle` paints the knob with `foreground`, so the disc is a mark
  // on `track` like a progress segment is.
  ["foreground", "track", "mark"],
];
```

2. Extend the JSDoc above `trackMarkPairs` so the list's owner is the truth: the
   four `PROGRESS_TONES` **and** the knob of a switch at rest. Keep the sentence
   in the same voice; do not restate a count ("four") unless it is derived.

3. Extend the `trackSurfaces` JSDoc's first sentence to name the switch's
   unfilled track beside the progress bar, meter and slider rail. The surface
   list itself does not change — a switch sits on the same panels and washes.

4. **Amendment found while implementing — a text tier is not a mark.** The new
   `foreground` on `track` pair made `track` a *shared surface* of the
   `mutedForeground`/`foreground` text tier, because the hierarchy check and the
   figure table derived a tier's surfaces from every pair a role appears in. The
   hierarchy would then compare a switch's knob with a muted progress fill on a
   groove, and the catalogue's "thirteen shared surfaces for secondary text
   below body copy" would have become fourteen — a false statement about where
   copy is measured. Export one owner from `contrast.ts`,
   `textTierSurfaces(role)`, which reads only the `body`, `secondary` and
   `inactive` classes; `themeTextTierFailures`, `figures.ts`'s `tierSurfaces`
   and `disabled-press-surfaces.test.ts`'s local `surfaceSet` all read it, so the
   rule has one implementation instead of three and the count stays thirteen.
   Name it in the catalogue's hierarchy paragraph (the public-value guard
   requires it).

**STOP** if any shipped set fails the new pair. Measure first (§5); if a set
fails, stop and report the set and the ratio instead of moving a colour — this
plan is evidence-gated on "no colour moves".

### 3.2 `packages/tokens/src/track-contrast.test.ts`

The suite pins the list exactly:

- rename `progressMarks` to a name that owns both kinds, or keep the name and add
  the knob with a comment;
- add `"foreground"` to the array it compares against `trackMarkPairs`;
- update the case title "publishes twelve surface pairs and four mark pairs" to
  the new count **five** (do not hardcode it twice: derive it from
  `trackMarkPairs.length` if the title allows, otherwise state five and let the
  equality assertion pin it).

### 3.3 `packages/tokens/src/unchecked-selection.test.ts` (new)

See §5 for the cases. Header comment must state the bug being guarded (the
erased off switch and the unmeasured knob), per `AGENTS.md` §3.

### 3.4 `packages/tokens/src/unchecked-selection.example.ts` (new)

A copyable, executable composition: an off switch (groove, edge, knob) and an
empty checkbox (edge, no fill) built from the public roles only. Import
`getTheme` and read `theme.colors.*`; no literals. The test in §3.3 executes it
and asserts the three roles it returns match the contract's pair list, so the
example cannot drift.

### 3.5 `docs/design-system.md`

1. §8 *Interaction states* — add one row, in table order after `selected` and
   before `link` (the state is a resting/selection state, not a pointer state):

```
| unchecked | the resting shape of a selection control: a checkbox or radio paints no fill of its own, so the panel shows through the box, and both it and a switch's off track carry the functional `borderStrong` edge on `background`/`card`/`popover`/`muted`, the `hover`/`active`/`accent`/`selected` washes and the pressed `selectedActive`, the four soft status fills and the field's `input` fill; a switch's empty track is the `track` groove …; its knob is `foreground` on the groove (`trackMarkPairs`) …; the checked state takes the accent family's fill and its on-colour instead |
```

   The row must name **every** surface each role is measured on, because the
   guard in §5 derives them (the §8 guard's `expand` helper already understands
   "the four soft status fills" and "the four row washes", but the derived case
   for this row will compare literal backticked names — use the explicit role
   names in the row).

2. §7 *Radii, borders and elevation* — the `borderStrong` bullet already names
   every surface it is measured on. No change unless the guard in §5 finds a
   missing one.

### 3.6 `docs/tokens.md`

1. The catalogue's `track` role-table cell (two occurrences: the default table
   and the high-contrast table) says "the unfilled groove of a progress bar,
   meter or slider rail". Extend to "…slider rail, and a switch that is off".

2. The groove section (search `A value indicator's unfilled groove is a role of
   its own`) gains one paragraph: a switch at rest is the groove plus its knob,
   the knob is `foreground` and is now measured on the groove, the shipped
   primitive paints the track with `muted` and the edge with `input` (1.000:1 on
   the platform dark cards and on an identity-light card respectively), and the
   `primitives` migration is a cross-team row.

3. The pair-count history line that ends at **464** becomes **465**, and the
   paragraph states the new pair. Search `396 to **464**` and edit that sentence
   only; the count is also asserted by `contrast.test.ts` and
   `resting-fill-scrim.test.ts` (§3.8).

### 3.7 `COMPONENTS.md`

The **Theme contrast check** row states "the same 464 contrast pairs". Change to
465 and, in the same row's list of what the tracker holds, name the off switch's
knob on the groove — one clause, no other edits.

### 3.8 Count pins

- `packages/tokens/src/contrast.test.ts` line ~650: `464` → `465`.
- `packages/tokens/src/resting-fill-scrim.test.ts` line ~133: `464` → `465`.
- Any other `464` the test run reports (grep first: `rg -n '\b464\b'`).

### 3.9 `packages/tokens/README.md`

The `track` paragraph says "`trackMarkPairs` holds the four progress fills to the
mark floor on it". Extend it to include the off switch's knob. Do not restate a
count if the README's guard derives one.

### 3.10 `TODO.md`

1. Add and tick a row under *Design tokens and theming* describing this plan.
2. Add an **unticked cross-team** row for `primitives`: `switchTrackStyle`'s
   unchecked fill is `muted` (a surface role, 1.000:1 on every platform dark
   card and 1.027:1 on an identity-light card) and should be `track`; the edge
   is already covered by row `601` (`input` → `borderStrong`). Record the
   measured evidence and reference this plan.

### 3.11 `.agents/slop/plans/README.md`

Index this plan in the `tokens-theme` table with status `done` once the gates
pass, and add a short paragraph to the "recent plans" narrative.

## 4. Commands and expected results

Run from the worktree root.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/tokens test` | all files pass; the new suite runs |
| `nub run check-types` | clean |
| `nub run lint` | clean |
| `nub run fmt` | clean |
| `nub run check` | clean (check:tests + lint + fmt + types) |
| `nub run test` | clean |

Targeted runs while iterating:

```sh
cd packages/tokens
nub exec vitest run src/unchecked-selection.test.ts src/track-contrast.test.ts src/contrast.test.ts src/docs.test.ts src/resting-fill-scrim.test.ts
```

## 5. Test plan

Every case must be able to fail; state the bug in the file header.

`unchecked-selection.test.ts`:

1. **The knob ships.** Every shipped set (`shippedThemes`) clears the `mark`
   floor for `foreground` on `track`; record the tightest in the assertion
   message. This case fails if a palette move later erases the knob.
2. **The pair is in the contract.** `contrastPairs` contains
   `["foreground", "track", "mark"]` exactly once. Fails before the change.
3. **A planted theme reports the erased knob.** Build a theme with
   `extendTheme(getTheme("light"), { colors: { foreground: getTheme("light").colors.track } })`
   — `themeFailures(theme)` must include a `contrast` failure with
   `foreground: "foreground"`, `background: "track"`. **This is the
   both-directions proof**: without §3.1 it returns `[]`.
4. **The shipped consumer's roles are the defect.** Prove, from
   `shippedThemes`, that the off switch as painted today is invisible: on every
   platform dark style `muted` equals the card (ratio 1) *and* `input` equals it
   too; in identity light `muted` on a card is under the 1.05 surface floor and
   `input` on a card is 1.000:1. Fail if a palette change silently makes the
   claim false (then the plan's rationale must be re-measured).
5. **The designed composition passes.** The example in §3.4 returns
   `track`/`borderStrong`/`foreground`; assert each pair is measured —
   `track` on the four base surfaces via `trackSurfacePairs`, `borderStrong` via
   `contrastPairs`, `foreground` on `track` via `trackMarkPairs`.

`docs.test.ts` (extend the existing §8 suite):

6. Add `"unchecked"` to the `has a row for every interaction state` list, and a
   case that derives from the contract: the row names `track`, `borderStrong`
   and `foreground`, every surface `trackSurfacePairs` measures, and every
   surface `borderStrong` is paired with (the row may use the shared helpers —
   `missing(label, surfaces)` — so keep the surfaces literal in the row).

Both-directions verification (`scripts/verify-two-directions.sh` is `jj`-based
and does not run on these git worktrees — `TODO.md` records that for repo
tooling): verify by hand — remove the new pair and the new §8 row, run the
suite, and confirm cases 2, 3 and 6 fail; restore, run again, confirm they pass.
Record both runs in the commit message.

## 6. STOP conditions

- Any shipped set fails the new mark pair → stop, report the set and ratio. Do
  not move a colour: this plan promises "no colour moves".
- `docs.test.ts`'s existing §8 guard (the pinned floor-table rows at the end of
  the interaction-state suite) rejects the new row because a row-order array is
  pinned → extend that array; if the guard's structure makes a new state a
  redesign, stop and report.
- A test asserts a pair count that this plan does not list (§3.8) → add it to
  the plan's file list in the commit message, not to unrelated rows.
- Anything outside the paths in §3, other than the two count pins, is out of
  scope. Record it in `TODO.md`.

## 7. Acceptance

- `themeFailures` reports an edited theme whose `foreground` equals its `track`,
  and no shipped set moves a value.
- `docs/design-system.md` §8 has an `unchecked` row naming `track`,
  `borderStrong` and `foreground`, guarded from the contract.
- `docs/tokens.md`, the README and `COMPONENTS.md` state the new pair and the
  switch as a groove user.
- The `primitives` migration is recorded in `TODO.md` with the measured
  evidence.
- `nub run check`, `nub run lint` and the tokens suite pass.
