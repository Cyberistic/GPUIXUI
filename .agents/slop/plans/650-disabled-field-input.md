# 650 — The disabled field's label on the fill it edits

**Phase:** F (the contrast contract's inactive half) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 306 (the inactive pair and its surfaces), 317 (the placeholder
and typed text on the field's `input` fill), 510/524 (the inactive label through
the selection wash), 539 (`disabledControl` and the field-dim evidence) ·
**Number block:** 500–699 (`tokens-theme` overflow; `647` is owned by
`components` and `648` by `playground`, so `650` is the next free) ·
**Status:** done

## 1. The defect

`docs/tokens.md` says, in the paragraph that excuses a disabled field from the
body pairs:

> a disabled field is out of scope for these body pairs because the designed
> state reads `disabledForeground`, which `inactivePairs` measures — the shipped
> primitives still dim the field at 50 %, which measures **3.273:1** on the macOS
> light `input` fill …

`disabledControl(theme)` is the documented replacement for that dim: it returns
the `disabled` fill, the `disabledForeground` label and the `border` edge
(plan 605), and `src/disabled-state.example.ts` builds the control shape from it.
A **field** keeps its own `input` fill — it is the surface the field edits — and
paints the designed label on it.

But `inactiveBaseSurfaces` is:

```ts
const inactiveBaseSurfaces = [
  "disabled",
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;
```

The field's `input` fill is not in it, so `inactivePairs` and
`selectionInactivePairs` have no pair for `disabledForeground` on `input`,
although `input` is already one of the nine `selectionSurfaces` (the wash itself
is measured there by `selectionWashPairs`). The docs' claim that
`inactivePairs` measures the designed disabled field is false.

A probe (2026-10-19) built a whole theme that passes **all ten checks** on the
pre-650 tree and whose only defect is the disabled field's label:

```ts
const planted = extendTheme(getTheme("light"), {
  colors: {
    input: "#B0B0B0",
    inputForeground: "#0D0F13",
    placeholder: "#404040",
    mutedForeground: "#2A2A2A",
    disabledForeground: "#6A6A6A",
    borderStrong: "#4A4A4A",
    primary: "#1B45A8",
    primaryHover: "#163C95",
    primaryActive: "#12327D",
    destructive: "#A32017",
    destructiveHover: "#8B1B13",
    destructiveActive: "#75160F",
    infoText: "#0E356E",
    successText: "#0A3F2A",
    warningText: "#4A3000",
    destructiveText: "#5A1116",
    primaryText: "#241C5C",
  },
});
```

`themeFailures(planted)` returns `[]`, while
`contrastRatio(disabledForeground, input)` is **2.494:1** — under the 3:1
inactive floor. A consumer who edits a field's fill can therefore ship an
unreadable disabled field while the package's one assertion says the theme is
good. The shipped 24 sets pass the missing pair at rest and through the wash
(6.610:1 at the tightest at rest, 4.944:1 washed), so only the contract grows.

## 2. Decision

The field's `input` fill is a surface an inactive label paints on, exactly like
the `disabled` fill and the four plain surfaces. Add it to the one owner,
`inactiveBaseSurfaces`, so both the at-rest and washed lists derive it:

- `inactivePairs` +1: `["disabledForeground", "input", "inactive"]`
  (13 → 14 pairs);
- `selectionInactivePairs` +1: the same through the `selection` wash
  (13 → 14 pairs);
- `selectionWashPairs` does **not** change: `input` is already a
  `selectionSurface`, so `["selection", "input", "surface"]` is measured;
- `contrastPairs` 421 → 422.

No colour moves. No role, floor, check kind, dimension or pair count other than
those two joins.

### 2.1 `packages/tokens/src/contrast.ts`

In `inactiveBaseSurfaces`, add `"input"` beside `"disabled"`:

```ts
const inactiveBaseSurfaces = [
  "disabled",
  "input",
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;
```

Extend its JSDoc to name the field: the `disabled` fill is the control's own
surface and `input` is the field's, because `disabledControl(theme)` keeps the
field on its `input` fill and paints `disabledForeground` on it — so an edited
field fill cannot erase its label.

Extend `inactivePairs`' JSDoc with the field sentence: a disabled field is the
shipped case that does not use the `disabled` fill (`FieldInput` paints `input`),
and the pair is the reason the catalogue can say `inactivePairs` measures the
designed disabled field. Say, too, that `input` is already a selection surface,
so the washed list's ground is measured by `selectionWashPairs` without a second
entry.

`selectionInactivePairs`' JSDoc already says the list derives from
`inactiveSurfaces`; no edit is needed beyond the derivation (verify the prose
does not restate a count — it does not).

### 2.2 The planted regression theme

The values in §1 are the fixture, not shipped data. Do **not** move a shipped
colour, and do not add the fixture to any example.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `.agents/slop/plans/650-disabled-field-input.md` | this plan |
| `packages/tokens/src/contrast.ts` | add `"input"` to `inactiveBaseSurfaces`; extend the two JSDoc blocks |
| `packages/tokens/src/disabled-field-input.test.ts` | new regression suite |
| `packages/tokens/src/contrast.test.ts` | `contrastPairs.length` 421 → 422 |
| `packages/tokens/src/resting-fill-scrim.test.ts` | the same literal 421 → 422 |
| `packages/tokens/src/docs.test.ts` | the exact inactive sentence gains the field fill; the design-system's exact floor-table row gains it |
| `docs/tokens.md` | the current-tense inactive surfaces, the pair-count history and the disabled-field rationale |
| `docs/design-system.md` | §interaction states text and the exact inactive floor-table row |
| `packages/tokens/README.md` | the disabled-state paragraph |
| `COMPONENTS.md` | **Theme contrast check** counts and a plan clause |
| `TODO.md` | add and tick the row; bump the counter and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary paragraph |
| `.agents/slop/rd/2026-10-19-tokens-next-650.md` | the probe and the runtime/component evidence |

No other file. **Do not** edit `packages/components`, `packages/primitives`,
`apps/docs` or a shipped value.

## 4. `packages/tokens/src/disabled-field-input.test.ts`

Header:

```ts
/**
 * Guards the defect plan 650 fixes: the catalogue said a disabled field is out
 * of scope for the body pairs because the designed state reads
 * `disabledForeground`, "which `inactivePairs` measures", but the inactive
 * surface list omitted the field's `input` fill. `disabledControl(theme)` keeps
 * a field on its `input` fill and paints that label on it, so a copied theme
 * could erase a disabled field while `themeFailures` returned `[]`; the planted
 * theme below passes all ten checks on the pre-650 tree with its disabled label
 * at 2.494:1 on `input`.
 */
```

Imports from `./index.js`: `compositeOver`, `contrastFloors`, `contrastRatio`,
`extendTheme`, `getTheme`, `inactivePairs`, `inactiveSurfaces`,
`selectionInactivePairs`, `selectionWashPairs`, `shippedThemes`,
`themeContrastFailures`, `themeFailures`, `type ContrastPair`, `type Theme`.

Constants:

- `planted` — the theme in §1.
- `preFixSurfaces` — the thirteen surfaces the pre-650 list held
  (`disabled`, `background`, `card`, `popover`, `muted`, `hover`, `active`,
  `accent`, `selected`, and the four soft fills). Derive the soft fills from the
  shipped list rather than retyping them where possible; this constant exists
  only to prove the fixture was accepted, and its comment says so.
- `ratio` helper: `contrastRatio(planted.colors.disabledForeground, planted.colors[surface])`,
  and `washed(surface)` = the same over
  `compositeOver(planted.colors.selection, planted.colors[surface])`.

Cases:

1. **The pre-650 checker accepted the fixture** — for every `preFixSurfaces`
   entry, both the at-rest ratio and the washed ratio clear
   `contrastFloors.default.inactive` (3), and `themeContrastFailures(planted)`
   filtered to `pairClass === "inactive"` is `[]` is **not** asserted here (the
   fix makes it non-empty); instead assert the direct walk and state in the
   header that this is the old list. This is a fixture-coherence case, not a
   guard, and says so.
2. **The field fill joins the inactive contract** — `inactiveSurfaces` contains
   `"input"`; `inactivePairs` contains `["disabledForeground", "input", "inactive"]`;
   `selectionInactivePairs` contains the same triple. On the pre-fix tree all
   three fail.
3. **The planted theme reports its disabled field** — the `inactive` failures
   in `themeContrastFailures(planted)` are exactly two, both with
   `background: "input"`: one at rest (`wash === undefined`) and one with
   `wash === "selection"`; both ratios are below `contrastFloors.default.inactive`
   and the at-rest ratio is approximately 2.494. On the pre-fix tree the list is
   empty.
4. **The total check tags them `contrast`** — `themeFailures(planted)` has
   exactly two entries, both `kind: "contrast"` and both
   `background: "input"`; on the pre-fix tree it is `[]`.
5. **Every shipped set passes the new pairs** — iterate `shippedThemes`; the
   at-rest and `selection`-washed `disabledForeground` on `input` clear
   `contrastFloors[theme.contrast].inactive`, and `themeFailures(theme)` stays
   `[]`.
6. **The washed pair's ground is already measured** — `selectionWashPairs`
   contains `["selection", "input", "surface"]`, so the new washed pair does not
   sit on an unmeasured wash; its length is unchanged
   (`selectionSurfaces.length + 1`).
7. **The two lists stay one owner** — `inactivePairs.length ===
   inactiveSurfaces.length` and `selectionInactivePairs.length ===
   inactiveSurfaces.length`, so a future surface cannot join one and not the
   other.

Every surface and role in the expectations derives from the exported lists and
the fixture; the only literals are the fixture's colours and the 2.494
approximation.

## 5. `contrast.test.ts` and `resting-fill-scrim.test.ts`

Two suites pin the whole contract's size; both move one literal:

```ts
expect(contrastPairs.length).toBe(422); // was 421
```

`resting-fill-scrim.test.ts`'s comment ("the plain `contrastPairs` list stays
421") becomes 422. No other expectation in either file changes.

## 6. Documents

`docs/tokens.md`:

- The inactive-state paragraph (the one guarded by
  `docs.test.ts`: "`inactivePairs` measures `disabledForeground` on its own
  fill, the plain surfaces, the four row washes and the four soft status
  fills"): add the field's `input` fill to the enumeration, and say that a
  disabled field is the reason it is there.
- The other current-tense "thirteen" claims about `inactiveSurfaces` / the
  inactive pair (the "same thirteen surfaces" through the wash, the
  "thirteen-surface inactive list", and the earlier "thirteen `inactiveSurfaces`
  it paints on") become **fourteen** and name the `input` fill. Leave plan
  `306`/`510`'s historical sentences ("over thirteen surfaces", "adds a washed
  pair on each of the thirteen") alone; they describe what shipped then.
- The pair-count history sentence `396 to **421** across plans 527, 557, 595
  and 619` becomes `396 to **422** across plans 527, 557, 595, 619 and 650`.
- The disabled-field rationale ("which `inactivePairs` measures") stays true
  after the fix; add that the field keeps its `input` fill and its fill is now
  one of the surfaces.

`docs/design-system.md`:

- The interaction-state row for `disabled` names the surfaces; add the field's
  `input` fill.
- The exact inactive floor-table row asserted in `docs.test.ts` gains "the
  field's `input` fill" and changes "thirteen" to "fourteen".
- The historical plan-510 narrative sentence ("on the same thirteen surfaces")
  may stay; do not present it as the current count.

`packages/tokens/README.md`:

- The disabled-state paragraph ("holds that label through the text-selection
  wash on the same thirteen surfaces") becomes fourteen and names the field's
  fill.

`COMPONENTS.md`:

- **Theme contrast check** row: `421 contrast pairs` → `422`; `13
  inactive-selection text pairs` → `14`; append a clause: "Plan 650 adds the
  disabled field's label — `disabledForeground` on the `input` fill it edits,
  at rest and through the `selection` wash — after the catalogue claimed
  `inactivePairs` measured the designed disabled field while the list omitted
  that fill; the planted theme passed all ten checks with its label at 2.494:1,
  every shipped set already passes (6.610:1 at rest, 4.944:1 washed), and the
  pair lists grow 13 → 14 with the contract 421 → 422."

## 7. Commands and expected results

Run in `packages/tokens`:

```sh
nub exec vitest run src/disabled-field-input.test.ts
```

Before the fix: cases 2 and 3 fail (no pair, no failure), case 4 fails
(`themeFailures` is `[]`); record that as the both-directions proof. After the
fix all seven cases pass.

```sh
nub exec vitest run src/contrast.test.ts src/resting-fill-scrim.test.ts src/docs.test.ts
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
```

Then, in `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

```sh
nub run check:tests
nub run check
nub run lint
nub run test
```

Expected: clean. If another workstream's package fails for its own reason,
record the exact failure and do not claim this plan's workspace gate passed.

## 8. STOP conditions

Stop and report with evidence if:

- a shipped set fails the new at-rest or washed pair — only the pair lists may
  grow; do not move a shipped colour to hide it;
- `contrastPairs` does not settle at 422, or a fourth suite pins the old
  literal — search for `421` across `packages/tokens/src` and the documents
  before implementing;
- adding `input` to `inactiveBaseSurfaces` also changes `selectionWashPairs` —
  it must not, because `input` is already a `selectionSurface`; if it does, the
  lists have drifted and the owner must be re-read;
- the docs guard's exact sentence or the design-system's exact row is asserted
  elsewhere (search the literal before editing);
- a test claims "every shipped set" without importing `shippedThemes` — the
  full-set guard in `shipped-themes.test.ts` will fail; use the enumeration.

## 9. Acceptance

- [x] `inactiveBaseSurfaces` contains `input`; `inactivePairs` and
      `selectionInactivePairs` each grow 13 → 14; `selectionWashPairs` is
      unchanged and `contrastPairs` is 422.
- [x] The planted theme reports exactly two `inactive` failures on `input`
      (at rest and washed) and two `contrast` entries through `themeFailures`;
      on the pre-fix tree both were `[]`.
- [x] Every shipped set passes the new pairs at rest and through the wash, with
      no colour moving.
- [x] The catalogue, design system, README, ledger, plan index and TODO row
      describe the rule the checker enforces; the commands in §7 were run and
      their results recorded in the commit message.
