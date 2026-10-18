# Plan 397 — the panel action's scope: a tinted panel, not a floating card

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
014 (status tones), 348 (the Toast's tone on its card), 362 (selection in a
status panel), 392 (the text tiers), 394 (`softAction`), 395 (the scrim over the
panel action), 396 (the type index's claims).

**Status:** executed on `agent/tokens-theme` (2026-10-18).

---

## 1. The measured gap

Plan 394 shipped `softAction` as "the raised neutral action on a status panel"
and every document since names **an Alert, Badge or Toast** as the composition
that paints it. Two of those three are true. A Toast is not a tinted panel: its
card is a `popover` surface.

Evidence from the consumer's source, read on the `components` worktree:

- `packages/components/src/toast/viewport.tsx:100` paints the card
  `backgroundColor: theme.colors.popover`;
- `:101` paints the title `theme.colors.popoverForeground`;
- `:111` paints the 3px tone bar `palette.fg`, an `xSoftForeground` **on the
  card**, not on a soft fill — the composition plan 348 already records;
- the action (`:170`) is a `secondary` `Button` and the dismiss control is an
  `IconButton`; both sit on the card.

So a Toast never paints `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft`.
If a consumer follows the reference and gives the Toast's action
`softAction(theme)`, the rest fill is the card itself in every light shipped set.

Measured on the built package with its own `contrastRatio`, `softAction` against
`popover` across all 24 shipped sets:

| theme | rest | hover | active |
| ----- | ---- | ----- | ------ |
| identity light, both AAA light sets, macOS / Linux / Windows light, Windows 7 light | **1.0000:1** | 1.0902:1 | 1.1921:1 |
| Windows XP light | **1.0190:1** | 1.0699:1 | 1.1699:1 |
| every dark set | 1.2841–1.7924:1 | 1.5496–2.1630:1 | 1.7295–2.4141:1 |

**All 12 light sets are under the 1.05:1 surface floor, 11 of them exactly
1.0000:1.** The label stays readable (16.57–21.00:1), so the failure is silent:
the action looks like a ghost control with no fill at rest while
`themeContrastFailures` returns `[]`, because `softActionPairs` measures the
family only on the four soft fills — correctly, since those are the surfaces it
was designed for.

The same false attribution appears in the rationale of pairs that are themselves
right for an Alert or Badge: the focus ring and `borderStrong` on the soft fills
("a Toast's action button is focused while it sits on its own tint"), the
inactive label, the selection wash, the decorative divider and the modal scrim
("the four soft status panels an Alert, Badge or Toast paints"). Those pairs
measure a real composition — a control inside a tone-tinted Alert or Badge — but
the documents credit it to a component that paints no tint at all.

The Toast's actual action is already covered: `secondary` on `popover` is a
`stateFillSurfacePairs` pair (1.1329–1.3473:1 at rest), its hover and press are
measured on the same surface, `stateStepPairs` holds the ladder, and
`secondaryForeground` is held on all three fills. The designed replacement for
the Toast action is `filledControl(theme, "secondary")` — the canvas neutral
family — not `softAction`.

## 2. Decision

1. **State the family's scope as a tone-tinted panel** — an Alert or Badge —
   everywhere the reference, the design system, the README and the source JSDoc
   name it. A Toast is a `popover` card, documented as such.
2. **Do not add `popover` to `softActionPairs`.** The family cannot be
   perceivable on both a white `popover` and the light soft-fill band with one
   ladder: the tints sit at luminance `0.742–0.765`, so a fill that clears white
   (≥ 1.05:1 means leaving `0.806–1.0`) lands *inside* the tint band and
   disappears on the panel; the only family that clears both would be darker
   than every tint (`≤ 0.70`), a grey button on a pastel Alert and a redesign of
   all 24 sets. The panel is the composition the family exists for.
3. **Point the Toast at the measured canvas family** in the guidance and in the
   cross-team migration row: `filledControl(theme, "secondary")` (or the four
   roles) on its `popover` card.
4. **Correct the false attributions** in the pair rationales and documents; the
   pairs and their counts do not change.
5. **Guard the scope with a test that can fail**: the floating-card measurement
   (12 light sets under the floor, identity light exactly 1.0000:1), the
   measured canvas alternative on the same card, and a documentation guard that
   forbids the phrase "Alert, Badge or Toast" anywhere in the package's public
   prose once the corrections land.

Rejected alternatives:

- **Move the light family below the tint band.** A rest, hover and press all
  darker than `#FFDF9A` is a heavy grey action inside a pastel Alert; it breaks
  the raised-neutral intent and moves four roles in 12 sets plus every platform
  style and recipe for a composition no shipped component paints.
- **Ship a second, popover-tuned family.** Four more roles for a Toast action
  that the existing designed `secondary` family already serves and the contract
  already measures — the redundant-role rule the reference states.
- **Add `popover` to the family's measured surfaces and leave the values.** The
  checker would fail 12 shipped sets; a check that cannot pass is not a guard.
- **Leave the prose.** The reference is the copy-and-own contract: a consumer
  following it ships an invisible action, and the checker's `[]` tells them it
  is fine.

## 3. Exact edits

### 3.1 `packages/tokens/src/color.ts`

- The `softAction` role JSDoc (~line 188): "an action inside an Alert, Badge or
  Toast" → "an action inside a tone-tinted Alert or Badge panel", plus one
  sentence: a Toast is a `popover` card and paints the canvas neutral family.
- The `borderStrong` rationale (~line 376): "inside an Alert or Toast" → "inside
  a tone-tinted Alert".
- No values move.

### 3.2 `packages/tokens/src/contrast.ts`

Correct only the rationale comments — pairs, lists and counts are unchanged:

- `softDividerPairs` (line ~189): "An Alert or Toast can separate…" → "An
  Alert can separate…".
- `inactiveSoftPairs` (line ~390): "An Alert or Toast carries a disabled
  action" → "An Alert carries a disabled action".
- the `borderStrong` soft-fill block (line ~437): "An Alert or Toast carries
  actions" → "An Alert carries actions".
- the `ring` soft-fill block (line ~490): "a Toast's action button is focused
  while it sits on `warningSoft` or `destructiveSoft`" → "an Alert's action
  button is focused while it sits on its own tint".
- `softActionPairs` (line ~676): "an action inside an Alert, Badge or Toast
  paints" → "a tone-tinted Alert or Badge paints"; add the Toast sentence.
- `overlaySurfaces` (line ~1294): "the four soft status panels an Alert, Badge
  or Toast paints" → "an Alert or Badge paints"; "the raised action an Alert or
  Toast paints" (line ~1303) → "an Alert paints".
- `selectionSoftPairs`/`selectionSoftWashPairs` and `softPanelTextPairs`: drop
  any Toast attribution if present; the Alert/Badge wording is already correct
  elsewhere.
- `softAction` list JSDoc (the reference paragraph above
  `themeContrastFailures`): no numeric or list change.

### 3.3 `packages/tokens/src/styles.ts`

- `StatusToneStyle` (line ~77): "an Alert, Badge or Toast spreads" → "an Alert
  or Badge spreads; a Toast paints its tone on a `popover` card".
- `softAction` JSDoc (line ~189): name the tone-tinted panel, and state the
  Toast's measured alternative (`filledControl(theme, "secondary")`) in one
  sentence.

### 3.4 `packages/tokens/src/soft-action.test.ts`

Two new cases (header comment gains the plan-397 bug statement):

1. `"states the floating card the family cannot carry"`:
   - `shippedThemes.filter(({ theme }) => theme.mode === "light")` has length 12;
   - every one measures `softAction` on `popover` under
     `contrastFloors[contrast].surface`;
   - identity light is exactly `1` (the same value) and XP light is under the
     floor;
   - dark sets clear the floor (the record is asymmetric by mode).
2. `"measures the canvas family a Toast action actually paints"`:
   - for every shipped set, `filledControl(theme, "secondary")`'s background on
     `popover` ≥ the surface floor;
   - `hover` from `background` and `active` from `hover` ≥ the `step` floor;
   - the family foreground on each of the three fills ≥ the `secondary` floor.

### 3.5 `packages/tokens/src/docs.test.ts`

- Update the exact sentence at line ~1567 ("because a Toast's action button is
  focused while it sits on its own tint" → "because an Alert's action button is
  focused while it sits on its own tint") so the guard matches the corrected
  document.
- Add `it("offers the panel action only to a tone-tinted panel")`:
  - for `docs/tokens.md`, `docs/design-system.md` and `packages/tokens/README.md`:
    the text contains `A Toast is a \`popover\` card`, and does not contain
    `Alert, Badge or Toast`;
  - read the package's non-test `src/**/*.ts` modules and assert the same
    phrase is absent there (the JSDoc is published documentation).
- Keep every existing derived row/floor guard untouched.

### 3.6 `docs/tokens.md`

- §Colour roles:
  - "the four soft status fills an Alert, Badge or Toast paints" → "an Alert or
    Badge paints";
  - "the action inside an Alert, Badge or Toast is a raised fill" → "inside a
    tone-tinted Alert or Badge panel";
  - "Alert, Badge and Toast share four status families" stays (the tone
    families are shared), but the sentence after it names the Toast's
    `popover` card as the one exception (it already does).
- §Status tones: "so an Alert, Badge or Toast stays perceivable" → "so an Alert
  or Badge stays perceivable".
- §An action inside a status panel: add one sentence after `softAction(theme)`
  — "A Toast is a `popover` card, so its action paints the canvas neutral
  family (`filledControl(theme, "secondary")`); `softAction` is the family for a
  tone-tinted panel." — and one sentence in the verification paragraph naming
  the measured 1.0000:1 and the 12 light sets.
- §Selection, §inactive, §dividers, §scrim and the audit history: change
  "a Toast's or Alert's action" / "an Alert or Toast" / "an Alert, Badge or
  Toast" to the Alert/Badge composition, and keep the Toast sentences that are
  about its tone on the card (plan 348).
- The plan-394 history sentence: "the raised family an Alert, Badge or Toast
  action paints" → "an Alert or Badge action paints"; it is history, not a
  claim about the Toast.

### 3.7 `docs/design-system.md`

- §Surfaces (line ~248): "the four soft status fills an Alert or Toast" → "an
  Alert".
- §Interaction states: no change beyond the existing soft-panel wording.
- §Status: add the Toast scope sentence beside `softAction` (the existing
  plan-348 exception row stays).
- §Contrast floor table: the "status-panel action" row already names the four
  soft fills; no surface changes.

### 3.8 `packages/tokens/README.md`

- The `softAction` paragraph: name the tone-tinted panel and the Toast
  alternative in one sentence.
- The selection, boundary, divider, inactive and scrim paragraphs: "Alert,
  Badge or Toast" → the Alert/Badge composition. Keep the plan-348 Toast
  paragraph about its glyph and bar.

### 3.9 `COMPONENTS.md`

- **Status tones** row: state that `softAction` is a tone-tinted-panel family,
  and that a Toast card is `popover` where the canvas neutral is the action.
- **Filled control states** row: the same one-clause distinction.

### 3.10 `TODO.md`

- Edit the open cross-team row (line ~1216): the Alert's action migrates to
  `softAction(theme)`; the Toast's action keeps the canvas neutral family
  because its card is `popover`, and the row states the measured reason.
- Add a ticked row under `tokens-theme` for this plan, bump the header count
  (163/220 → 164/221 if no other row lands first).

### 3.11 `.agents/slop/plans/README.md`

- Add the 397 row after 396 and a closing paragraph with the measurement.

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
nub run --filter @gpuixui/tokens test
# EXPECT: 100 files, every test passes, including the two new soft-action
# cases and the documentation-scope guard.
```

```sh
# Direction 1 — the floating-card measurement must be able to fail:
git stash push -- packages/tokens/src/soft-action.test.ts
# (the new cases are gone; the file passes, which is the pre-fix state)
git stash pop

# Direction 2 — the documentation guard must be able to fail:
git stash push -- docs/tokens.md
(cd packages/tokens && ./node_modules/.bin/vitest run src/docs.test.ts)
# EXPECT: "offers the panel action only to a tone-tinted panel" fails on the
# stale "Alert, Badge or Toast" phrase and the missing Toast sentence.
git stash pop

# Direction 3 — the corrected prose must pass the same guard:
(cd packages/tokens && ./node_modules/.bin/vitest run src/docs.test.ts src/soft-action.test.ts)
# EXPECT: both files pass.
```

Then the gate:

```sh
nub run check
nub run lint
nub run test
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- a shipped set fails the new canvas-family case for the Toast action — quote
  the set and ratio; the plan does not authorise a colour move;
- the documentation guard cannot be satisfied without changing a sentence that
  is true (e.g. line 297's "Alert, Badge and Toast share four status families")
  — that sentence uses "and", not "or", so it must remain;
- a gate fails for a reason outside the files this plan names.

## 6. Acceptance criteria

- Every document and source JSDoc names the family's scope as a tone-tinted
  Alert or Badge panel, and none credits a Toast with painting a soft status
  fill.
- The Toast action is guided to the canvas neutral family, which the contract
  measures on `popover`.
- `soft-action.test.ts` proves the 12 light sets fail the family on `popover`
  (identity exactly 1.0000:1) and that the canvas family passes.
- `docs.test.ts` fails on the stale "Alert, Badge or Toast" phrase or a missing
  Toast sentence.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Cross-team

One row in `TODO.md` (owner `components`): the Alert action moves to
`softAction(theme)`; the Toast action stays on the canvas neutral family
(`filledControl(theme, "secondary")`) because its card is `popover`. No token
value moves, so no other consumer change follows.
