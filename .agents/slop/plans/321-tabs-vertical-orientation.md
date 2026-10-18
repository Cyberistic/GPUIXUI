# 321 — Tabs vertical orientation: prove the axis, then show it

- **Phase:** C (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 113 (Tabs), 117 (behaviour harness)
- **Status:** done, 2026-10-18. 4 native tests (Tabs 10 → 14, behaviour
  437 → 441), a vertical example, docs and inventory synced. Proof in §10.

`Tabs` already accepts `orientation`, switches its root/list flex direction, and
maps `ArrowDown`/`ArrowUp` to movement when the set is vertical
(`packages/components/src/tabs.tsx` §`direction`). `docs/tabs.mdx` states
"vertical tab sets stack the triggers". **No test, example or inventory record
covers it**, so a later refactor could invert the axis, drop the vertical key
branch, or leak Up/Down into a horizontal set and every gate would stay green.
That is the whole gap: this plan proves the declared behaviour and makes it
visible, or fixes it if the proof fails.

Scope is orientation only. No new prop, no change to the controlled-state rule,
no vertical-specific styling beyond what the existing token-based styles already
do.

---

## 1. Files

```
src/behaviour/tabs.test.tsx      # + 4 native tests (10 → 14)
examples/tabs.example.tsx        # + a vertical variant in the same file
docs/tabs.mdx                    # verification list, orientation section
COMPONENTS.md                    # Tabs row: note the verified vertical axis
TODO.md                          # tick the task
.agents/slop/plans/README.md     # index this plan
```

`src/tabs.tsx` changes **only** if a test in §3 fails (see §4).

## 2. What is already true (read before writing a test)

- `Tabs` root: `flexDirection` is `"column"` horizontally and `"row"`
  vertically (`src/tabs.tsx` ~line 308).
- `TabsList`: `"row"` horizontally, `"column"` vertically (~line 378).
- `TabsList.handleKeyDown` reads `orientation` from the root context and maps
  only Down/Up vertically, only Right/Left horizontally (~line 339).
- `TabsTriggerState` exposes `orientation`; the state-style suite has one
  horizontal case only.
- The test renderer can read a node's style (`stepper.test.tsx` already asserts
  `flexDirection`) and simulate keys with `simulateKeystrokes("down")`.

## 3. Tests — `src/behaviour/tabs.test.tsx`

Update the file header comment to name the bugs these guard: a vertical tab set
whose arrows moved along the wrong axis, whose layout stayed horizontal, or
whose horizontal sibling started reacting to Up/Down.

Reuse a local `VerticalSettings` fixture (three triggers, the middle disabled,
same values as `Settings`) built with `orientation="vertical"`. Keep the existing
`Settings` fixture untouched so the ten current tests prove nothing regressed.

1. **"moves along the vertical axis and selects with Down and Up"**
   - Focus the first trigger; `down` lands real focus on the last enabled
     trigger (the disabled middle is skipped) and switches the panel.
   - `down` again wraps to the first enabled trigger; `up` returns to the last.
   - Assert `focusedTestId` and the mounted panel, not only a highlight.
2. **"ignores Left and Right in a vertical tab set"**
   - Focus the first trigger, send `right` then `left`.
   - Focus and the selected panel are unchanged. This is the axis-leak guard for
     `direction()`.
3. **"lays a vertical tab set in a row with a column rail"**
   - `renderComponent(<VerticalSettings />)`.
   - The root (`testId="tabs-root"`, add it to the fixture) has
     `style.flexDirection === "row"`; the list has `"column"`.
   - The horizontal fixture keeps root `"column"` and list `"row"`. Two
     assertions per orientation in one test; they must fail independently in §5.
4. **"waits for Enter before switching in a vertical manual set"**
   - `activation="manual"`, `orientation="vertical"`: `down` moves focus without
     switching; `enter` switches. Guards that the activation rule is shared by
     the vertical branch rather than reimplemented inside it.

No new logic file: orientation is one comparison, already in place, and a pure
test would restate the implementation. These must run in the real renderer
because they assert real focus and painted layout.

## 4. If a test fails

- **Wrong axis** (test 1 or 2): fix the `direction` helper in `src/tabs.tsx` so
  the vertical branch reads Up/Down; do not change the tests to match.
- **Wrong layout** (test 3): fix the two `flexDirection` expressions in `Tabs`
  and `TabsList`; the mapping is root `row`/`column` inverse to the rail's
  `column`/`row`.
- **Manual activation** (test 4): `selectsOnFocus(activation)` is shared; a
  failure means the vertical branch bypasses `focusRow(row, select)`. Fix the
  call, not `selectsOnFocus`.
- Any other failure → STOP (§7).

## 5. Both-direction proof (required before the task is done)

1. In `src/tabs.tsx`, change `orientation === "horizontal"` in the `direction`
   helper to `"vertical"` (invert the axis), run the behaviour suite: tests 1 and
   2 must fail. Revert.
2. Change the root `flexDirection` mapping to the horizontal value, run: test 3
   must fail. Revert.
3. Remove `activation` from the vertical fixture and default it: test 4 still
   passes; then set `activation` back to `"manual"` and assert it fails if
   `selectsOnFocus` is forced to `true`. Revert.

Record the observed failures in §9. A test that did not fail in either direction
is not evidence; rewrite it.

## 6. Example, docs, inventory

- `examples/tabs.example.tsx`: export one additional component,
  `VerticalTabsExample`, beside `TabsExample` — a short vertical settings rail
  (three triggers, one disabled) in a `Card`. Reuses the existing `Row` helper.
  Keep it small; the example exists to show the axis, not a second product.
- `docs/tabs.mdx`:
  - add an "Orientation" section with the two shapes and the keyboard-axis rule
    (Down/Up vs Right/Left, Home/End unchanged);
  - update the Verification paragraph from "10 tests" to "14 tests" and list the
    four new cases;
  - the "Vertical tab sets stack the triggers" line stays, now backed by a test.
- `COMPONENTS.md`: Tabs row gains "vertical and horizontal axes verified; arrows
  follow the axis" in place of the untested claim; keep the `aria-orientation`
  limitation.
- `src/inventory.ts`: the Tabs limitation array keeps the two ARIA entries; add
  the vertical axis as a capability only if the row text needs it (the inventory
  test checks the `COMPONENTS.md` row, not prose equality).
- `TODO.md`: add and tick "Tabs vertical orientation verified (plan 321)" under
  Tier 2 hardening.

## 7. Commands and expected results

```sh
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 296 unit tests, unchanged, pass
nub run --filter @gpuixui/components test:behaviour   # Tabs 10 -> 14, behaviour 437 -> 441
nub run check                                         # exit 0 (tests-can-fail, lint, fmt, types)
nub run lint                                          # exit 0
```

## 8. STOP conditions

1. `simulateKeystrokes("down")` does not reach the list in a vertical layout even
   though `right` works horizontally → STOP and report the event target: the
   runtime may deliver arrow keys to a different node when the rail is a column.
2. The test renderer does not expose `style.flexDirection` on the root or list →
   STOP and replace test 3 with a bounds assertion **only if** `getElementBounds`
   distinguishes the shapes; do not assert an untestable style.
3. Adding the second example export breaks the example registry or the inventory
   test's one-example-per-component rule → STOP; keep one export and add a
   `orientation` prop toggle inside `TabsExample` instead, after checking the
   inventory test.
4. Any existing Tabs test changes behaviour → STOP: the tests are the
   specification for the ten landed cases and must still pass untouched.

## 9. Acceptance criteria

- [x] Four native tests added; each fails with its guard removed (§5 evidence
      recorded in §10).
- [x] Existing ten Tabs tests pass unchanged; behaviour suite green (441).
- [x] Vertical example exported and typechecked; no new dependency.
- [x] Docs Verification list and Orientation section match the suite.
- [x] `COMPONENTS.md`, inventory and `TODO.md` updated in the same commit.
- [x] Gate commands in §7 pass.

## 10. Deviations, recorded during implementation (2026-10-18)

1. **No `src/tabs.tsx` change was needed.** The measured vertical branch, the
   row/column layout and the shared activation rule were already correct; the
   plan's §4 fixes were drilled, not applied.
2. **The axis-isolation test needed tightening during the proof.** Sending
   `right` then `left` let an inverted mapping cancel itself out, so the test
   passed in the wrong direction. It now asserts after `right` alone, then again
   after `left`; with the axis inverted it fails with `tab-danger` focus.
3. **Both-direction evidence:**
   - invert `orientation === "horizontal"` in the `direction` helper →
     "moves along the vertical axis…" and "ignores Left and Right…" fail;
   - swap the root `flexDirection` mapping → "lays a vertical tab set…" fails
     with `expected 'column' to be 'row'`;
   - force `selectsOnFocus` to `true` → "waits for Enter… in a vertical manual
     set" fails because the panel switched on focus.
   All three were restored and the suite is 14/14.
4. **A failed test leaves the renderer root mounted** (the harness allows one
   root at a time), so the first proof run cascaded into twelve failures. Each
   subsequent proof used a `-t` filter to isolate the case and avoid the cascade;
   no harness change was needed.
5. **Both example shapes live in one file** (`TabsExample`,
   `VerticalTabsExample`) because the inventory records one example path per
   component; §8 STOP 3 was not hit.
6. **The fixture gained `testId="tabs-root"`.** The layout test needs a node to
   read `flexDirection` from; the existing ten tests are untouched otherwise.
