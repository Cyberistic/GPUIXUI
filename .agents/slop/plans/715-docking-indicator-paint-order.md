# 715 — The docking drop indicator, in the frame: it paints above the pane

**Phase:** F (evidence). **Depends on:** `184` (the docking probe), `189`/`536`
(the live pointer gesture), `674`/`676`/`701`/`713` (the frame samplers and the
sRGB composite). **Number:** the last landed plan is `714`; `715` is the first
free number at the time of writing.

---

## 1. Why this plan exists

`docking-layout` (plan `184`) asserts the drop indicator's **box** and its
**authored style**:

- `dock-indicator-editor` is `4 × height` at the pane's right edge;
- `paintedStyle("dock-indicator-editor").backgroundColor` is
  `palettes.dark.colors.primary`.

Both would pass if the indicator were painted **underneath** the pane. And that
is exactly the open gap the docs record: `apps/playground/README.md`'s docking
section says *"the indicator's paint order is inferred from the last-child rule
(`toast-lifecycle`) and not asserted"*. The indicator is the group's last child
(`docking.tsx`, `{indicator}` after `role="tabpanel"`), so the inference is
probable — but nothing reads the pixels, and a future reorder of those three
children (tablist, panel, indicator) would silently hide the drop indicator
while every current check stayed green.

The claim to prove:

1. the right-edge bar paints **`primary`** at its own reported centre **and at
   the tab strip's row** — i.e. it is above the tab strip (`muted`) and the
   panel body (`card`), not under either;
2. the bar's paint has an **edge**: 10 px to its inner side the body paints
   `card`, and 10 px to its inner side at the strip's row the strip paints
   `muted` — so the bar is a bar, not a wash over the whole pane;
3. the centre zone's overlay paints **`primary` at 18 %** over the body — the
   coarse blend of the twemoji-free `opacity: 0.18` — and disappears when the
   pointer leaves the pane, restoring `card`.

That converts "an indicator element with a primary background exists" into "a
drop indicator is visible above the pane it targets".

Non-goals: no claim that the indicator is out of the hit path (`pointerEvents:
"none"` is reported by the style, and moves go to the pressed element, so a hit
test cannot distinguish it — a null test; do not add one), no OS-level detach, no
docking package.

## 2. What the runtime already gives us (measured, do not re-derive)

- `packages/testing`'s `Pixels` (`decodePng`, `frameScale`, `framePoint`,
  `pixelAt`, `hexToRgba`, `rgbaNear`) and `frames.ts`'s capture/sampling helpers
  (`captureHeadless`, `captureLive`, `pixelAtPoint`, `expectColour`,
  `TOLERANCE = 2`) — both hosts capture at device scale **2**.
- Both runners mount every scenario under `ThemeProvider theme={palettes.dark}`
  (`apps/playground/src/smoke/run.ts`, `.../live/run.ts`), so the three tokens
  are `palettes.dark.colors`: `primary #A7A9FF`, `card #191D25`,
  `muted #222730`.
- `blendOver` (rounded straight-sRGB composite) exists **twice** already —
  `scenarios/highlight-pixels.ts` and `scenarios/crop-pixels.ts` — and plan `701`
  measured that the runtime composites 30 % and 65 % washes this way. This plan
  adds a third consumer, so the helper is hoisted (§4.1) instead of copied.
- `docking.tsx` paints the group `card`, the tab strip `muted`, the indicator
  `primary` with `opacity: 1` for an edge zone and `opacity: 0.18` for the
  centre zone, and clips the group with `overflow: "hidden"`.
- Reported bounds are **content** boxes: the group has a 1 px border and
  `getElementBounds` excludes it (plan `529` §6.3). The measured right bar is at
  `editor.x + editor.width − 2`, i.e. its 4 px box straddles the content edge
  and the 1 px border; its centre is inside the painted bar, so **sample the
  indicator's own reported centre** rather than deriving it from the model.
- The strip's row is read from a **tab's** bounds (`dock-tab-main.ts`), not a
  constant: the strip's height is a function of the caption type scale.
- The live pointer gesture is `pressWindow` → `movePointer` (which always sends
  `pressedButton: 0`) → `releasePointer`; the press must commit before the move
  (plan `536`). `live-docking` currently uses the atomic `host.drag`, which
  cannot be observed mid-gesture.

## 3. The samples

`bar` = `bounds("dock-indicator-editor")`, `group` = `bounds("dock-group-editor")`,
`tab` = `bounds("dock-tab-main.ts")`, measured during a **held** drag over the
editor's right band.

| # | sample | point | expected |
| - | ------ | ----- | -------- |
| 1 | bar body | `(bar.x + bar.width/2, bar.y + bar.height/2)` | `primary` |
| 2 | bar over the strip | `(bar.x + bar.width/2, tab.y + tab.height/2)` | `primary` |
| 3 | body beside the bar | `(bar.x − 10, bar.y + bar.height/2)` | `card` |
| 4 | strip beside the bar | `(bar.x − 10, tab.y + tab.height/2)` | `muted` |

Samples 1/3 and 2/4 are pairs: the first proves the bar paints, the second
proves what is underneath it at the same row. Sample 2 is the **paint-order
discriminator** — move `{indicator}` before `<div role="tablist">` and it reads
`muted` while 1/3/4 still pass.

Centre zone (live only, after the split), `left` = `bounds("dock-group-left")`:

| # | sample | point | expected |
| - | ------ | ----- | -------- |
| 5 | centre overlay on the body | `(left.x + left.width/2, left.y + left.height − 40)` | `blendOver(primary, 0.18, card)` |
| 6 | the overlay is gone | the same point after the pointer leaves the pane | `card` |

`y − 40` is clear of the body's `Readout` label (top-left, caption size) and of
the 1 px border. The derived composite for the dark palette is `#33364C`; the
code computes it, never hardcodes it.

## 4. Files to change

### 4.1 `packages/testing/src/pixels.ts` (+ `pixels.test.ts`)

- Add `export const blendOver = (over: Rgba, amount: number, under: Rgba):
  Rgba` — `round(amount·over + (1 − amount)·under)` per channel, alpha `255`;
  JSDoc: straight-sRGB compositing as the runtime performs it, `amount` in
  `[0, 1]`.
- One test in `pixels.test.ts`: `blendOver(primary, 0.18, card)` is
  `r 51, g 54, b 76` and differs from both inputs; direction is proven by
  swapping the operands (`blendOver(card, 0.18, primary)` is not the same).
  Guards a tint/rounding mistake in the shared helper.

### 4.2 `apps/playground/src/scenarios/frames.ts`

- Add `export const parseColour = (label: string, hex: string):
  Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError>` — `hexToRgba` or a
  labelled failure naming the unparseable colour. (Second consumer; `crop-pixels`
  deletes its local copy.)

### 4.3 `apps/playground/src/scenarios/crop-pixels.ts` (+ its test)

- Use `parseColour` from `frames.ts` and `Pixels.blendOver`; delete both local
  definitions. No behaviour change: the crop tests keep their existing exact
  composites (`#224072`, `#6C4B14`).

### 4.4 `apps/playground/src/scenarios/highlight-pixels.ts` (+ its test if it
imports `blendOver`)

- Use `Pixels.blendOver`; delete the local copy. No behaviour change
  (`#31365F`, `#575EAF` stay the expectations).

### 4.5 `apps/playground/src/scenarios/dock-pixels.ts` (new)

Pure expectations + two frame-check helpers. No Node, no binding, JSDoc on every
export.

- `export const CENTRE_OPACITY = 0.18` — imported by `docking.tsx` so the view
  and the expectation cannot drift.
- `export interface DockPalette { readonly primary: string; readonly card:
  string; readonly muted: string }` — the three tokens, structurally.
- `export interface DockBarSamples { barBody; barStrip; bodyBeside; stripBeside
  }` where each entry is `{ label, point: { x, y } }`; `bar` and `group` and
  `tab` are `Smoke.Bounds`.
- `export const dockBarSamples = (bar, tab): DockBarSamples` — the four rows of
  §3, sample 3/4 always 10 px **towards the pane's centre** (the pane's inset is
  not known here; the caller only uses the right bar, and the helper documents
  that it assumes a bar on the right of its container).
- `export const dockCentrePoint = (group): { x, y }` — row 5.
- `export const dockBarChecks = <E>(ctx, reader, frame, bar, tab, palette)` —
  four `pixelAtPoint` + `expectColour` checks; parses the palette once and fails
  by name if a token is unparseable.
- `export const dockCentreChecks = <E>(ctx, reader, frame, group, palette,
  label?)` — one check comparing with `Pixels.blendOver(primary,
  CENTRE_OPACITY, card)`.
- `export const dockRestoredCheck = <E>(ctx, reader, frame, point, palette)` —
  one check that the same point now paints `card` (row 6).

### 4.6 `apps/playground/src/scenarios/dock-pixels.test.ts` (new)

Header comment names the bug being guarded: *the indicator was asserted by box
and authored style only, so a bar painted under the tab strip passed every
check*.

- `dockBarSamples` returns points **inside** the bar for rows 1/2 and
  **outside** the bar for rows 3/4 but still inside the group.
- The two "beside" points are 10 px from the bar's left edge and on the bar's
  mid row — so a hardcoded absolute point fails when the bar moves.
- `blendOver(primary, CENTRE_OPACITY, card)` is `#33364C`, differs from `card`
  and from `primary`, and `CENTRE_OPACITY` is the value `docking.tsx` uses.
- All three palette tokens parse with `Pixels.hexToRgba`.

### 4.7 `apps/playground/src/scenarios/docking.tsx`

- Import `CENTRE_OPACITY` from `./dock-pixels.js` (replace the literal `0.18`)
  and the checks/readers it needs.
- After the existing right-bar assertions and **before**
  `ctx.host.releasePointer(...)`: read `dock-tab-main.ts`, `captureHeadless`,
  run `dockBarChecks` against `palettes.dark.colors`. Comment it
  `2. Pixels: the bar paints above the pane`, renumber the following comments.
- Keep the existing `paintedStyle` check (authored colour ≠ painted colour; both
  claims are cheap and different).

### 4.8 `apps/playground/src/live/scenarios.tsx` (`live-docking`)

- Replace the atomic `host.drag("dock-tab-notes", …)` with
  `pressWindow(tab centre)` → `settle` → `movePointer(pane.right − 10,
  pane centre y)` → `waitFor("dock-indicator-editor")` → `settle`.
- Capture the held state to `${LIVE_ARTIFACTS}/${docking.id}-drop.png`, run
  `dockBarChecks`, then `releasePointer` at the same point and keep every
  existing split assertion unchanged.
- Append the centre-zone probe after the split assertions: press
  `dock-tab-search` at its bounds centre, `movePointer` to the left group's
  centre, `waitFor("dock-indicator-left")`, `settle`, capture to
  `${docking.id}-centre.png`, run `dockCentreChecks`; then `movePointer(10, 10)`
  (outside every group), `settle`, assert `bounds("dock-indicator-left")` is
  `null`, capture to `${docking.id}-restored.png`, run `dockRestoredCheck`, and
  `releasePointer(10, 10)` (no target: no drop). Assert the left group's tab
  list is unchanged after the release.
- Keep the final screenshot.

### 4.9 Docs and ledgers

- `apps/playground/README.md` — the docking table gains a **paint order** row
  and a **centre zone** row; the limits paragraph loses "paint order … not
  asserted"; the scenario table rows for `docking-layout` / `live-docking` gain
  their new check counts; the pixel-evidence section names `dock-pixels.ts`.
- `COMPONENTS.md` — the **Docking layouts** row (or the Tier 4 workspace row
  that cites `docking-layout`): the indicator's paint order is measured, with
  the scenario ids.
- `TODO.md` — one `[x]` entry at the top of the playground workstream block:
  counts, ids run, mutation proofs, and the measured centres.
- `.agents/slop/plans/README.md` — this plan's row, plus one sentence in the
  playground number narrative.
- `PLAN.md` §4 — one decision row only if the measurement changes a rule (e.g.
  `opacity` does not composite); otherwise no row.

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/playground`.

1. `nub run --filter @gpuixui/testing test` → `pixels.test.ts` green with the new
   `blendOver` test (testing **68 → 69**).
2. `nub run --filter playground test -- dock-pixels` → the new unit tests pass
   (4–5 tests). If the filter is ignored, the whole package runs; expected green.
3. `nub run --filter playground build` → `dist/smoke/run.js` and
   `dist/live/run.js` rewritten; the binding install prints
   `gpuix-native.darwin-x64.node is current`.
4. `nub apps/playground/dist/smoke/run.js --only docking-layout` → `1/1`, exit
   `0`, **80 → 84** checks (4 new). A failure prints `expected #a7a9ffff, got
   #…` — read the actual colour before changing code.
5. `nub apps/playground/dist/live/run.js --only live-docking` → `1/1`, exit `0`,
   **8 → 16** checks (4 bar + 2 centre + 2 restored). Run it **twice**; both
   green.
6. `nub run check && nub run lint && nub run test` → green (playground unit
   tests **466 → 470±**, testing **69**, components 308, primitives 282, tokens
   196, tw 103, icons 19, docs 7).
7. End-of-task full headless registry: `nub apps/playground/dist/smoke/run.js`
   → **106/106**, exit `0`, checks **3887 + 4 = 3891**. No live `--all` (merge
   gate; a focused `live-docking` is this task's live evidence).

## 6. Test plan — unit tests that can fail

`dock-pixels.test.ts` and `pixels.test.ts`, as in §4.1/§4.6. Prove each fails
once, then revert:

- return the "beside" points 10 px to the **right** (outside the pane) → the
  "inside the group" test fails;
- use `CENTRE_OPACITY = 1` → the composite test fails (equals `primary`);
- swap `blendOver`'s operands → the `#33364C` test fails with the bleached
  value;
- hardcode a point instead of deriving it from `bar` → the "moves with the bar"
  test fails.

## 7. Runtime mutation proofs (observe, then revert — all must exit `1`)

| # | Mutation | Expected failing check |
| - | -------- | ---------------------- |
| M1 | move `{indicator}` **before** `<div role="tablist">` | `the drop bar paints over the tab strip` (reads `muted`) |
| M2 | delete `backgroundColor` from the indicator | `the drop bar paints the primary colour` (reads `card`) |
| M3 | render `{indicator}` before `role="tabpanel"` only | **null result is expected if the strip/pane children are transparent** — record what it reads; it proves which single child is load-bearing |
| M4 | `opacity: 1` on the centre zone (drop the conditional) | the centre composite check (`expected #33364cff, got #a7a9ffff`) |
| M5 | `CENTRE_OPACITY = 0.4` | the centre composite check (both the view and the expectation import the constant → **null result**, the one-source-of-truth property; record it like plan `713` M2) |
| M6 | sample the bar's **right** edge instead of its centre | may fail because the bar straddles the content edge — record the measured pixel; do not widen the tolerance |

Record each exact message in §10 and `TODO.md`.

## 8. STOP conditions

Stop and report instead of improvising if:

- the bar's frame pixel is **not** `primary` in both hosts while
  `paintedStyle` still reports it: the authored colour does not reach the frame
  (the `paintedStyle` gap is real). Record the measured colour and stop rather
  than weakening the check.
- the centre composite reads **opaque `primary`**: `opacity` does not composite
  in 0.10.0. Then the honest fix is the probe's recipe — paint the centre zone
  with `alpha(primary, CENTRE_OPACITY)` (proven by plans `701`/`713`) — and
  record the `opacity` finding in `PLAN.md` §4, the README and `COMPONENTS.md`.
  That is a **documented** deviation, not a silenced check.
- the live held-drag capture needs a sleep longer than `settle`/`waitFor`, or
  flakes twice: stop and report the timing; do not add retries.
- any sample needs a tolerance wider than `TOLERANCE = 2`: the point is on an
  edge; move it inwards.
- `nub run check` fails anywhere: fix it before claiming the task.

## 9. Acceptance

- `dock-pixels.ts` + its tests exist; `docking.tsx` imports `CENTRE_OPACITY`.
- `docking-layout` reports **84** checks and `live-docking` **16**, both green.
- Six runtime mutations observed (five red, at most one recorded null) and
  reverted; the unit-test mutations observed red and reverted.
- The duplicated `blendOver` is gone (one definition in `packages/testing`);
  `parseColour` is shared through `frames.ts`.
- Ledgers updated with the real counts and the exact ids run.
- `nub run check`, `nub run lint`, `nub run test` green; full headless
  **106/106** with **3891** checks, exit `0`.
- Commit(s) on `agent/playground`, pushed to origin. Never push to master.

## 10. As measured (2026-10-20)

The claim holds in both hosts: the indicator paints above the pane.

- `docking-layout` **80 → 85** checks (the four samples, plus one `bounds of
  dock-tab-main.ts`); `live-docking` **8 → 22** (four bar samples, the centre
  composite, the removal, the "indicator gone" bounds check, and the extra
  `bounds`/`waitFor` checks around the two held gestures). Three consecutive
  focused live runs: 18.9 s, 19.2 s, 20.1 s, all green. Headless with the capture
  is ~9 s (was 0.5 s).
- Colours are exact: `primary #A7A9FF` at the bar body and at the strip's row;
  `card #191D25` and `muted #222730` 10 px inside it; the centre zone composites
  to `#33364C` (`primary` at 18 % over `card`) and returns to `#191D25` when the
  pointer leaves every pane.
- Full headless **106/106**, **3892** checks, exit `0` (150.9 s).
  `nub run check` / `lint` / `test` green (playground **472**, testing **69**).

### 10.1 A measured correction to §3 and §2

**The bar's reported centre is the pane's border.** The first run read
`#2A303B` (`palettes.dark.colors.border`) at `bar.x + bar.width / 2`: the model's
4 px box at `box.width − 4` straddles the group's 1 px border, the group's
`overflow: "hidden"` clips the last pixel, and **the border paints over the
bar's outermost pixel**. The painted bar is **2 px**, not 4. The samples
therefore sit `INSET = 1` px inside the bar's left edge (2 device px at scale 2).
This is a finding for the docking component, not a probe bug: a component must
inset its bar inside the content box to paint the width it asks for.

### 10.2 Mutation proofs observed and reverted

| # | Mutation | Result |
| - | -------- | ------ |
| M1 | move `{indicator}` before `<div role="tablist">` | `the drop bar paints over the tab strip: expected #a7a9ffff, got #222730ff` |
| M2 | delete the indicator's `backgroundColor` | failed at the **authored-style** check first (`expected "#A7A9FF", got "transparent"`), so it does not isolate the pixel check |
| M2′ | keep the colour, set the edge zone's `opacity` to `0` | `the drop bar paints the primary colour: expected #a7a9ffff, got #191d25ff` — the pixel check alone catches a bar that paints nothing |
| M3 | `{indicator}` after the tablist but before the panel | **null result** (green): the panel body is transparent, so only the tablist sibling is load-bearing |
| M4 | centre zone `opacity: 1` | `the centre drop zone washes the pane at 18 %: expected #33364cff, got #a7a9ffff` |
| M5 | `CENTRE_OPACITY = 0.4` | **null result** (green): the view and the expectation import the same constant — the one-source-of-truth property, as in plan `713` M2 |
| U1 | `Pixels.blendOver` operands swapped | testing **68 → 1 failed** (`[141,144,216]` vs `[51,54,76]`), playground **5 failed** (crop, dock centre, both highlight washes) |
| U2 | `dockBarSamples` returns a fixed `barX` | `samples the bar at its own centre and at the strip's row: expected false to be true` |

`M4` is also the **first measurement of `opacity`** in this suite: 0.18
composites in straight sRGB, so the centre zone needs no `alpha()` colour; the
`drop.edge === "center"` branch is correct as written.

