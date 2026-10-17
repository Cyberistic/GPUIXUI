# Plan 174 — the tab strip's focus contract: clipped stops and the roving index

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B → C (Tier 2 **Tabs**; Tier 4 **Tabbed panels** keyboard navigation).
**Depends on:** plans `100`, `110`, `120`, `140`, `158`, `160`, `173`.

## 1. Why this plan exists

Plan `173` proved a tab strip can pan and reveal. It did not answer what happens
when a **keyboard** user walks into the overflowed part of the strip, which is
where two honest Tabs designs diverge:

- A naive strip gives every tab `tabIndex={0}`. Tab then visits every tab, and
  if the runtime does not scroll on focus, the user's focus disappears past the
  strip's right edge.
- A roving strip gives only the active tab `tabIndex={0}` and moves focus with
  arrows (the shadcn/ARIA tabs model). Tab leaves the strip entirely.

The suite has measured native focus, tab stops and programmatic focus, but never
combined them with an **overflowing** scroll container. `scroll-into-view`
measured that `focusElement` reveals a **virtual row** by itself; a plain
`overflowX` scroller may behave differently. A Tabs component cannot choose its
tabindex model without that answer.

## 2. What is built

One scenario, `tab-strip-focus` (capability `focus`), in
`apps/playground/src/scenarios/tab-focus.tsx`.

### 2.1 The view

Two 300 px strips, each with ten 72 px tabs, stacked with a `Pressable`
immediately after each in tree order:

- `naive-strip` — tabs `naive-0` … `naive-9`, **every** tab `tabIndex={0}`, no
  key handler, no reveal. `naive-after` is the next control.
- `roving-strip` — tabs `roving-0` … `roving-9`, `tabIndex` is `0` only for the
  active tab and `-1` otherwise; a click selects, `ArrowLeft`/`ArrowRight`/
  `Home`/`End` select, `renderer.focusElement` the target and
  `scrollIntoView` it; `roving-after` is the next control.
- Readouts `naive-active` and `roving-active` (`active=<n>`) so the selection
  half is visible independently of focus.

The strips are separate so one scenario can measure both models without a
remount (a remount would reset native focus).

### 2.2 The steps

1. Click `naive-0`: focus is `naive-0`, the strip's `x` is `0`.
2. `focusNext()` nine times. Record the focused id. **Assert it is `naive-9`**:
   a clipped tab is in the native tab order. (If the runtime skips clipped
   children, STOP branch in §5.)
3. Read the strip's offset after the traversal. Branch (§5):
   - unchanged at `0` → **focus does not reveal a clipped tab in a plain
     scroller**; the check asserts `0` and the limitation is recorded.
   - moved left → **focus reveals**; assert `x < 0`, and the strip needs no
     reveal of its own on focus (only on selection by other means).
4. `focusNext()` once more: focus is `naive-after`. The traversal continues past
   the strip, so the clipped tab did not trap focus.
5. Click `roving-0`, then `focusNext()` once: focus is `roving-after`. **A
   roving strip is one tab stop.**
6. Click `roving-3`, then `key("end")`: `roving-active` reads `active=9`, native
   focus is `roving-9`, and the strip's `x` is negative — selection, focus and
   reveal move together.
7. `key("home")`: focus returns to `roving-0` and the offset returns to the
   start region (`x > -72`), so the contract holds in both directions.

### 2.3 Honesty

Every focus assertion reads `getFocusedElementId`; every pan reads
`getScrollOffset`. The `active` readouts are only used to distinguish selection
from focus, never as the focus evidence.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/tab-focus.tsx` | new view + steps |
| `apps/playground/src/scenarios/index.ts` | import and register after `tabOverflowScenario` |
| `apps/playground/src/smoke/run.test.ts` | assert `tab-strip-focus` is registered |
| `apps/playground/README.md` | `42 → 43`; a focus-contract row |
| `COMPONENTS.md` | Tabs and Tabbed panels notes gain the tabindex verdict |
| `TODO.md` | tick the probe; progress `37 → 38` |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/140-…` §4 | the focus row gains the overflow fact |

No `packages/testing` change is expected: `click`, `focusNext`, `key`,
`focused` and `scrollOffset` cover the probe.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground build` | clean build |
| `nub apps/playground/dist/smoke/run.js --only tab-strip-focus` | green, exit `0`, `focus=verified` |
| `nub apps/playground/dist/smoke/run.js` | `43/43 scenarios passed`, exit `0` |
| `nub run --filter playground test` | registry test green |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proofs:**

1. Give the roving strip's inactive tabs `tabIndex={0}`; the run must exit `1`
   on "a roving strip is one tab stop". Restore and it is green.
2. Remove `renderer.focusElement` from the roving select path; the run must exit
   `1` on "End focuses the last tab". Restore and it is green.

Record both outputs in §8.

## 5. STOP conditions and branches

- **The traversal skips clipped tabs** (`focusNext` goes from `naive-5` to
  `naive-after`): record it and assert the skip. Then a naive strip is safe from
  invisible focus, but the roving model is still required for arrow behaviour;
  note the measured skip in `COMPONENTS.md`.
- **Focus reveals the clipped tab** (the offset moves): assert `x < 0` and
  record it as a runtime capability. Do not also claim the limitation.
- **`focusNext` loses focus entirely** (focused is `null` after a step): record
  the step and assert the focused sequence that was measured; do not loop.
- **The reveal in the roving strip cannot be observed** because End lands at the
  strip's end without panning: record the offset and assert native focus only;
  the pan itself is already measured by plan `173`.
- **A change outside the owned paths is required**: record it in `TODO.md` and
  do not edit it.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `tab-strip-focus` | native smoke | a clipped tab silently leaving the tab order; a roving strip with more than one stop; a selection that does not move native focus; an End/Home pair that stops revealing |
| two-direction runs (§4) | native smoke | the checks passing with every tab a stop, and with no programmatic focus |
| registry assertion | unit (`apps/playground`) | the scenario falling out of the registry |
| full suite | native smoke | the second strip disturbing later scenarios |

## 7. Acceptance criteria

- `tab-strip-focus` is registered, green, and the measured tabindex contract is
  in §8, the app README and `COMPONENTS.md`.
- The suite is **43/43**, exit `0`; both two-direction proofs are recorded.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Outcome

Executed on this host on 2026-10-17; **43/43 green**, exit `0`, `focus=verified`
in `.artifacts/smoke-report.json`. `tab-strip-focus` records **19 checks**.

Measured facts (also in plan `140` §4, `COMPONENTS.md` and the app README):

- **A clipped tab is still a native tab stop.** Nine `focusNext` presses from
  `naive-0` landed on `naive-9` — a tab scrolled out of the strip's 300 px
  viewport — and the strip's `x` stayed `0`.
- **Focus does not reveal a clipped tab in a plain `overflowX` scroller.** After
  the traversal the focused tab was `naive-9` and `getScrollOffset` still read
  `x = 0`. This is the opposite of plan `166`'s virtual list, where
  `focusElement` alone reveals a row. A Tabs strip therefore **must** reveal on
  focus/selection itself; the runtime will not do it.
- **The traversal is not trapped.** One more `focusNext` from `naive-9` reached
  `naive-after`, the control after the strip.
- **A roving strip (`tabIndex` `0` only on the active tab, `-1` elsewhere) is
  exactly one tab stop.** From `roving-0`, one `focusNext` landed on
  `roving-after` instead of the next tab.
- **Selection, native focus and reveal move together in the roving model.**
  `End` from `roving-3` selected the last tab, put native focus on `roving-9`
  through `renderer.focusElement`, and panned the strip to `x = -461`. `Home`
  returned focus to `roving-0` and the strip to `x = -5` (the same near-end
  inset plan `173` recorded — clamp the last pixel if an exact origin matters).
- **The tabindex model is a real contract, not a style choice:** a naive strip
  lets focus disappear past the viewport, while a roving strip keeps focus
  visible only because the component reveals on the arrow it handles.

Two-direction proofs:

1. Giving the roving strip's inactive tabs `tabIndex={0}` made the run exit `1`
   with
   `Tab leaves the roving strip after one press: expected "roving-after", got "roving-1"`
   and `focus=failed`; restoring the roving tabindex made it green (exit `0`).
2. Removing `renderer.focusElement` from the roving select path made the run
   exit `1` with
   `End focuses the last roving tab: expected "roving-9", got "roving-3"` and
   `focus=failed`; restoring it made the suite green again.

No change outside the owned paths. No `packages/testing` verb was needed:
`click`, `focusNext`, `key`, `focused` and `scrollOffset` covered the probe.

