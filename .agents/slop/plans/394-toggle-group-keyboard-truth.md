# 394 — The ToggleGroup page promises arrow keys the group never receives

| | |
| --- | --- |
| Phase | F (truth pass) |
| Workstream | primitives |
| Depends on | 030, 041, 047, 056, 074, 359, 390 |
| Status | done |

## 0. The bug, measured

`docs/toggle-group.mdx` §Keyboard says, for **both** selection modes:

```md
| `←` `↑` | move focus **and** select the previous item, wrapping | move focus only |
| `→` `↓` | move focus **and** select the next item, wrapping | move focus only |
```

That is four arrow keys in both orientations. The implementation answers only
the group's **own** axis: `renderToggleGroup` calls
`decideMove(cursorIndex, count, key, orientation, isDisabled)`, and
`src/core/keyboard.ts` maps `horizontal → { forward: "right", backward: "left" }`
and `vertical → { forward: "down", backward: "up" }`. `decideMove` returns
`Option.none()` for the other axis on purpose (its own case says so:
`"ignores the other axis's keys"`).

Measured on this host, GPUix 0.10.0, with a throwaway runtime probe (deleted
after the measurement), a horizontal `single` group with
`defaultValue="left"`:

| Step | Focused item | Announced |
| ---- | ------------ | --------- |
| click `Left` | `tg-left` | Left pressed |
| `Up` down + up | `tg-left` (unchanged) | Left pressed |
| `Right` down | `tg-centre` | Centre pressed |

So `↑`/`↓` are inert in a horizontal group, exactly as `←`/`→` are in a
vertical one. The behaviour is the correct contract — it matches
`RadioGroup`'s page, which already qualifies its rows
(`| ↑ / ↓ (vertical) |`, `| ← / → (horizontal) |`) and matches every
orientation-aware roving composite. The **page** is the defect, the same class
as plans `338` (`NumberField` advertised caret keys it never got), `360`
(`OTPField`'s "once") and `367` (which element fades): a documented contract the
delivered one does not meet.

Nothing guards a keyboard table against the pure rule it describes. This plan
fixes the page and adds that guard, so the over-claim cannot return.

## 1. The correction

The page must say what the keyboard does:

| Key | `single` | `multiple` |
| --- | -------- | ---------- |
| `←` / `→` (horizontal) | move focus **and** select the previous / next item, wrapping | move focus only |
| `↑` / `↓` (vertical) | the same on the vertical axis | the same on the vertical axis |
| `Home` / `End` | focus and select the first / last enabled item | focus the first / last enabled item |
| `Enter` / `Space` | unchanged | unchanged |

A sentence after the table: **the group answers only its orientation's axis**;
the cross-axis arrow is inert, as it is in `RadioGroup`. That is the ARIA
orientation rule and it keeps a horizontal segmented control from moving when a
user scrolls a form with the arrow keys.

The implementation does not change. `decideMove` is right; only the prose is
wrong.

## 2. Exact changes

All paths are under `packages/primitives/` unless stated.

### 2.1 `docs/toggle-group.mdx`

1. Replace the two arrow rows in §Keyboard with the qualified rows in §1.
2. Add the cross-axis sentence after the table, before the "A disabled option is
   skipped …" paragraph.
3. In §Verification, add:
   `src/docs-keyboard.test.ts` — the page's arrow rows match
   `core/keyboard.ts`'s orientation rule (plan `394`).

### 2.2 `src/docs-keyboard.test.ts` (new)

Reads `docs/toggle-group.mdx`, `docs/radio-group.mdx` and
`src/core/keyboard.ts` through `effect/FileSystem` + `effect/Path`, like
`src/capabilities.test.ts`. Three tests:

1. **The ToggleGroup page qualifies every arrow row.** Extract the `## Keyboard`
   section, take the Markdown table rows. A row containing `←`/`→` must contain
   `(horizontal)` and must not contain `↑`/`↓`; a row containing `↑`/`↓` must
   contain `(vertical)` and must not contain `←`/`→`. This fails on the old rows
   (they mix the axes and name neither orientation).
2. **Every arrow key the page names is delivered by the rule.** For each arrow
   row, resolve its orientation from the `(horizontal)`/`(vertical)` marker, map
   each named key (`←`→`left`, `↑`→`up`, …) and assert
   `Option.isSome(decideMove(0, 3, key, orientation))`; assert the cross-axis
   pair is `Option.none()`. This fails if the page and `keyboard.ts` drift in
   either direction — e.g. adding `↑` to the horizontal row, or changing
   `decideMove`'s axis map.
3. **The model page stays qualified.** `docs/radio-group.mdx` still states
   `(vertical)` and `(horizontal)` next to its arrow rows, so the corrected page
   has a peer the guard compares against.

Helpers mirror `src/capabilities.test.ts`: `section`, `cells`, and an arrow-key
map. No new dependency.

### 2.3 `runtime/toggle-group.runtime.test.tsx`

Add one case, "answers only its orientation's arrow axis":

```tsx
const runtime = await openWindow();
runtime.render(
  <Surface>
    <ToggleGroup
      type="single"
      testId="tg"
      label="Alignment"
      options={align}
      defaultValue="left"
    />
  </Surface>,
);
runtime.click("tg-left");
expect(focused(runtime)).toBe("tg-left");
runtime.keyDown("tg-left", "up");
runtime.keyUp("tg-left", "up");
expect(focused(runtime)).toBe("tg-left");
expect(announced(runtime, "Left")).toBe("pressed");
runtime.keyDown("tg-left", "right");
expect(focused(runtime)).toBe("tg-centre");
expect(announced(runtime, "Centre")).toBe("pressed");
```

The probe above already produced exactly these values on the current tree, so
the case is a regression guard, not a new behaviour. Add a second assertion in
the same case for a **vertical** group (`Up` moves, `Right` is inert) so both
orientations are covered.

### 2.4 `COMPONENTS.md`

In the **Toggle Group** row, after the keyboard sentence, append: the arrows
follow `orientation` only — `←`/`→` in a horizontal group, `↑`/`↓` in a vertical
one, the cross axis inert (measured in the runtime; plan `394`).

### 2.5 `TODO.md`

Under **Primitives workstream**, add a ticked row after plan `393` and raise the
counter to `134/134`.

### 2.6 `.agents/slop/plans/README.md`

Add the `394` row to the primitives table with status `done`, the measured
counts and the both-directions note.

## 3. Commands and expected results

Run from `packages/primitives/` unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test` | all offline files pass; the new file adds 3 tests |
| `nub exec vitest run --config vitest.runtime.config.ts runtime/toggle-group.runtime.test.tsx` | 9 tests pass (8 existing + the new case) |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` |
| `nub run lint` (repo root) | exit `0` |
| `nub run fmt` (repo root) | `All matched files use the correct format.` |

Do **not** run the full live suite as this plan's evidence: it is degraded on
this host's binding (plan `529`, 546 passed / 111 failed). The scoped file is
the runtime evidence, as plans `379`/`392`/`393` do; the full run stays the
merge gate.

## 4. Test plan

### 4.1 Offline — `src/docs-keyboard.test.ts`

| # | Case | Fails when |
| - | ---- | ---------- |
| 1 | the ToggleGroup arrow rows name their orientation and do not mix axes | the old `← ↑` / `→ ↓` rows return |
| 2 | every documented arrow key is `Some` for its orientation and the cross-axis pair is `None` | a page adds a key the rule ignores, or `keyboard.ts` changes axis |
| 3 | the RadioGroup page stays qualified | the model page loses its `(vertical)`/`(horizontal)` markers |

### 4.2 Runtime — `runtime/toggle-group.runtime.test.tsx`

One case, both orientations: horizontal `Up` leaves focus and value on the
first item, `Right` moves to the second; vertical `Right` is inert and `Down`
moves. It fails if `decideMove` is called without the orientation (which would
make the cross axis live) or if the group stops forwarding arrows.

### 4.3 Two-direction proof

1. Restore the old table rows in `docs/toggle-group.mdx` — test 1 fails with the
   row text; `check` fails until the page is corrected.
2. Change `decideMove` to accept `up`/`down` in a horizontal group (or call
   `decideMove` with the other orientation in `renderToggleGroup`) — the runtime
   case fails on the focus/value assertion and offline test 2 fails by key.
3. Restore both; everything passes.

## 5. STOP conditions

1. The runtime shows an arrow moving focus across the axis — then the page was
   right and `decideMove`/`ToggleGroup` is the defect; stop and report the
   measurement instead of editing prose.
2. The page's table shape changes enough that the parser cannot identify a row —
   stop and widen the parser; do not hard-code line numbers.
3. The scoped runtime file does not run on this host — report the exact error;
   do not ship a skipped test.
4. A gate fails for an unrelated reason — report it rather than editing another
   workstream's files.

## 6. Acceptance

- [x] `docs/toggle-group.mdx` states the orientation-qualified arrow contract and
      the cross-axis rule.
- [x] `src/docs-keyboard.test.ts` guards that page against `core/keyboard.ts` and
      fails on the old rows.
- [x] The runtime case proves both orientations and fails in the old direction.
- [x] `COMPONENTS.md`, `TODO.md` and the plan index are current.
- [x] Offline tests, `check-types`, lint and format pass; the scoped runtime file
      is green.

## 7. Outcome

Implemented.

- `docs/toggle-group.mdx`: the arrow rows are orientation-qualified, the
  cross-axis sentence is added, and Verification names the new guard.
- `src/docs-keyboard.test.ts` (3 tests): the ToggleGroup rows are axis-pure; every
  documented key is delivered by `decideMove` for its orientation and the
  cross-axis pair returns `None`; the RadioGroup page stays qualified.
- `runtime/toggle-group.runtime.test.tsx`: one new case covering both
  orientations (horizontal `Up` inert / `Right` moves; vertical `Right` inert /
  `Down` moves), 8 → 9 in the file.
- Both directions measured: restoring the old rows fails both arrow tests (`2
  failed | 1 passed`; the failure names the row) while the RadioGroup case stays
  green; passing the wrong orientation to `decideMove` in the group fails the new
  runtime case by name (`expected 'not pressed' to be 'pressed'`) and three
  existing arrow cases (`4 failed | 5 passed`). Restored, offline 695 → 698 and
  the scoped runtime file 9/9.
- `COMPONENTS.md` Toggle Group row, `TODO.md` and the plan index updated.
