# 347 — The remaining shipped Tier 2 catalogue in the playground

**Status:** planned 2026-10-18 · **Phase:** C/D · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `155`, `156`, `159`, `188`, `330`,
`344`, `345`, `346`.

## 1. Why this plan exists

Plans `330`, `344` and `346` mounted the shipped Tier 2 **overlays**, the
**foundation/navigation** families and the **choice/form** families. Twelve
components still have only their in-package behaviour tests and have never been
mounted through the consumer path (the published root import compiled by
`apps/playground/tsconfig.vendor.json`, plan `330` §3) or driven in a real GPUix
window:

`Drawer`, `Stepper`, `Timeline`, `InlineEdit`, `TagInput`, `Carousel`,
`ColorPicker`, `MentionInput`, `NavigationMenu`, `HotkeyRecorder`,
`KeyboardShortcuts`, `Countdown`.

The gap matters for the same reasons as plans `344`/`346`, plus one of its own:

- the vendor compile is the path a consumer in this repo takes; an unmounted
  family can regress at import time with every gate still green;
- the playground is the docs' native evidence source, so a component it cannot
  mount cannot be shown honestly;
- `TODO.md` records a **docs-truth** defect: fifteen `packages/components/docs/*.mdx`
  pages say their example is "which the native playground mounts", and the
  playground mounts none of these families. This plan is the playground half of
  that task (the registry/wording half stays with `components`);
- several of these components lean on mechanisms the playground has measured as
  *partial* in 0.10.0 — `display: "none"` is a no-op (`workspace-panes`, plan
  `177`), and there is no caret API, no `preventDefault`, no anchor element and no
  `aria-haspopup`. Mounting them is the only way to know which of their
  documented limitations actually bite a consumer.

This plan changes **no package code**. If a shipped component is wrong, it is
measured, asserted as the current behaviour with a label that says so, and
recorded in `TODO.md` for the owning workstream.

## 2. What will be proven

Two consumer views, both capability `tier2`, one headless scenario each and one
live twin each. Mechanisms already measured elsewhere are **not** re-probed:
modal focus/trap (`modal-focus-trap` 155), floating placement (`156`), the native
editor (`text-entry` 188, `pointer-text-entry` 343), live key routing (`345`),
and `display: "none"` itself (`workspace-panes` 177 — this plan measures the
*consequence* for Carousel, not the mechanism again).

### 2.1 `tier2-editing` — input-centric components

| Component | Interaction asserted |
| --------- | -------------------- |
| InlineEdit | the display is a `div` at rest; a click swaps it for an `input` and focuses it; `cmd-a` + typing + Enter commits the new value once and returns to the display; Escape discards a draft and leaves the committed value; a second edit commits through blur (focus an inert sibling) |
| TagInput | Enter commits the draft and keeps focus in the field; a typed comma commits the token before it; a duplicate is ignored; a chip's removal control removes **that** chip (clicked by window coordinates derived from the chip's bounds — the control has no `testId` of its own); `max` refuses an addition past the cap |
| HotkeyRecorder | the placeholder paints when nothing is bound; a click starts recording (`Press keys…`); `ctrl-shift-k` records `ctrl+shift+k` once and stops recording; its clear control empties it without starting a recording |
| MentionInput | `@` opens the candidate list; a query narrows it (a non-match leaves the tree); Down moves the highlight and `aria-selected` follows; Enter inserts the highlighted name **with a trailing space** and reports one mention; a no-match query closes the list |
| Drawer | closed at rest; the trigger opens a right-edge surface sized `size="md"` = the window width `400` and full height, flush to the right edge; opening takes native focus on the surface; Tab moves focus to the first control inside it; Escape closes and returns focus to the trigger; an outside press (`clickWindow` at `12,12`) closes it without activating the trigger again; the accessible surface is a named `dialog` |

### 2.2 `tier2-flow` — display, stepping and the nav overlay

| Component | Interaction asserted |
| --------- | -------------------- |
| Stepper | three steps paint in declaration order with their descriptions; exactly the current step is `selected` in the accessibility tree; the consumer's step control moves the selection and the readout |
| Timeline | a named list with one `listitem` per event; timestamps, titles and descriptions paint; exactly the `current` event is selected; the last event paints no connector (its rail holds only the dot) |
| Countdown | `90_000` paints `01:30`; a consumer tick repaints a new value; `0` paints `00:00` in the **muted** role; the label names the text |
| KeyboardShortcuts | a named list with a named group; two rows paint their label and keycaps; the same chord renders `⌘ ⇧ P` for `platform="darwin"` and `Ctrl Shift P` for `platform="linux"` (the glyphs are chosen, not host-dependent) |
| Carousel | every slide is mounted; the active index drives the readout and the controls; Next/Prev step and clamp at both edges (Next disabled at the last slide, Prev at the first); Right/Left/Home/End step a focused carousel; a link to an inactive slide is **still hit-testable** on 0.10.0 (measured: `display: "none"` is a no-op, plan `177`) — asserted as the current limitation and recorded for `components` |
| ColorPicker | six theme swatches and a preview at the current value; a swatch paints the selected border role and reports the normalised hex; `#abc` + Enter commits `#aabbcc`; an invalid draft marks the field's border `destructive` and Enter does not commit it |
| NavigationMenu | no panel until a trigger is pressed; a press opens that item's panel below its trigger and reports `aria-expanded`; a second trigger replaces the open panel (exactly one open); ArrowDown opens and takes native focus into the panel; Left/Right move native focus between triggers **without** opening; Escape closes and returns focus to the trigger; a link runs once and closes the panel |

## 3. Files

Create:

- `apps/playground/src/scenarios/tier2-editing.tsx`
- `apps/playground/src/scenarios/tier2-flow.tsx`

Change:

- `apps/playground/src/scenarios/index.ts` — import and register both, beside the
  other `tier2-*` scenarios.
- `apps/playground/src/live/scenarios.tsx` — two live twins
  (`live-tier2-editing`, `live-tier2-flow`) that reuse the same views, plus their
  imports and registry entries.
- `apps/playground/README.md` — add both to the shipped-catalogue sentence.
- `COMPONENTS.md` — extend the `tier2` capability row and record the measured
  consumer facts.
- `TODO.md` — tick this task with the measured counts; record the measured
  Carousel limitation (and any other honest finding) as a cross-team task.
- `.agents/slop/plans/README.md` — add the `347` row; move the next free number
  to `348`.

Do **not** change `packages/components`, `packages/primitives`,
`packages/tokens` or `apps/docs`. A wrong shipped component becomes a `TODO.md`
cross-team task with measured evidence.

## 4. The views

Both frames follow the existing shape (`tier2-choice`, `tier2-forms`): one root
sized by `useWindowSize()`, `useTheme()` for every colour, a `Readout` carrying
every piece of state the steps assert, and `aria-id` on each part whose
accessibility is asserted (the runtime's keys are ephemeral — plan `160`).

Layout rule for both: a **column** frame (header, content row, readout at the
bottom). The live window is `1100×720` (plan `189`) and the offscreen frame is
`1280×800`; every popup must fit in the smaller one.

### 4.1 `tier2-editing.tsx`

Root `testId="tier2-editing-frame"`. Content row, two columns, 24 px padding and
24 px gap.

Left column (`width: 460`):

1. `InlineEdit testId="ws-name" aria-id="ws-name" label="Workspace name"
   value={name} placeholder="Untitled" onCommit={…}`; a `ws-elsewhere` inert
   `div tabIndex={0}` under it for the blur path.
2. `TagInput label="Tags" value={tags} max={3} onValueChange={…}` with
   `TagInputChip testId={`chip-${tag}`}` per tag and
   `TagInputField testId="tag-field" placeholder="Add a tag"`.
3. `HotkeyRecorder testId="hotkey" label="Toggle palette" value={hotkey}
   onChange={…}` (its clear control is `hotkey-clear`, derived by the component).

Right column (`width: 460`):

4. `MentionInput testId="comment" aria-id="comment" label="Comment"
   value={comment} onValueChange={…} onMention={…}` with
   `MentionInputList` and three `MentionInputItem`s: `ana`, `anna`, `joan`, each
   with `testId="mention-<name>"` and `aria-id="mention-<name>"`.
5. `Drawer`:
   - `DrawerTrigger testId="drawer-open" aria-id="drawer-open"` labelled
     `Invite teammate`;
   - `DrawerContent testId="drawer-surface" side="right" size="md"
     label="Invite teammate"` containing `DrawerHeader`/`DrawerTitle`/
     `DrawerDescription`, a `DrawerFooter` with `DrawerClose testId="drawer-cancel"`
     and a package `Button testId="drawer-send"` that counts a send, and the
     default close control (`drawer-close`).
6. `choice-outside`-style inert `div testId="editing-outside"` — the live twin has
   no window-coordinate click, so an in-frame inert target is the reachable
   outside press.

Readout `tier2-editing-readout`:

```
name=<text> commits=<n> tags=<a,b|none> hotkey=<chord|none> mentions=<name|none> invites=<n> drawer=<open|closed>
```

### 4.2 `tier2-flow.tsx`

Root `testId="tier2-flow-frame"`. Two columns.

Left column:

1. `Stepper value={step} label="Checkout"` with three
   `StepperStep`s (`step-account` 1, `step-billing` 2, `step-review` 3), each with
   a `testId` and `aria-id`, plus `step-next` / `step-back` consumer buttons.
2. `Timeline label="Deploy history"` with three `TimelineItem`s:
   `timeline-build` (complete, `09:41`), `timeline-tests` (current, `09:44`,
   description `412 tests, 0 failures`), `timeline-deploy` (upcoming, `—`). The
   root gets `testId="timeline"`.
3. `Countdown testId="countdown" remainingMs={remaining} label="Time remaining"`
   plus `countdown-tick` (−61 s) and `countdown-expire` (0) consumer buttons.

Right column:

4. `KeyboardShortcuts label="Shortcuts"` with
   `KeyboardShortcutsGroup label="General"`, a row
   `KeyboardShortcut testId="shortcut-palette" label="Command palette"
   accelerator="mod+shift+p" platform="darwin"` and a row
   `testId="shortcut-palette-linux" label="Command palette" accelerator="mod+shift+p"
   platform="linux"`.
5. `Carousel testId="carousel" label="Screenshots" value={slide}
   onValueChange={…}` with a track of three slides
   (`slide-0` One, `slide-1` Two, `slide-2` Three) and
   `CarouselControl direction="previous" testId="slide-prev"` /
   `direction="next" testId="slide-next"`.
6. `ColorPicker testId="picker" label="Accent colour" value={color}
   onValueChange={…}` and a `picker-elsewhere` focus target for the blur path.
7. `NavigationMenu label="Product"` with a list of two items
   (`nav-platform`, `nav-pricing`), each a trigger
   (`trigger-platform`/`trigger-pricing`, authored `aria-id`s) and a panel
   (`panel-platform`/`panel-pricing`) with one or two
   `NavigationMenuLink`s (`link-overview`, `link-runtime`, `link-plans`).
8. An inert `div testId="flow-outside"` for the nav's outside press.

Readout `tier2-flow-readout`:

```
step=<1..3> remaining=<ms> slide=<0..2> color=<#rrggbb> selected=<link|none>
```

Two rows of the frame instead of two columns is acceptable if the live window
makes a column too tall; the readout stays last and every popup must open inside
the frame.

## 5. Steps for the executor

1. Read this plan, then `tier2-choice.tsx`, `tier2-forms.tsx`,
   `tier2-foundation.tsx`, `apps/playground/src/live/scenarios.tsx` (the four
   `tier2*` live twins), `apps/playground/src/ui.tsx`,
   `apps/playground/src/scenarios/probes.ts` and `apps/playground/src/a11y.ts`.
2. Write `tier2-editing.tsx` as §4.1 and `tier2-flow.tsx` as §4.2. Keep every
   popup inside the frame; the Drawer's surface is full-height by design, so it
   must be the last thing opened in its scenario.
3. Register both in `src/scenarios/index.ts`. Run the registry integrity check:

   ```sh
   nub run --filter playground test
   ```

   Expected: exit `0`; `scenarioProblems` reports no duplicate id and no
   uncovered capability.

4. Build and run only the new scenarios:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only tier2-editing
   nub apps/playground/dist/smoke/run.js --only tier2-flow
   ```

   Expected: `1/1 scenarios passed`, exit `0`, each with its check count. A click
   that misses reports bounds/readout — fix the view's layout, never widen a
   tolerance.

5. Run the full headless suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `78/78 scenarios passed`, exit `0`; the check total grows by the two
   counts.

6. Add the two live twins in `src/live/scenarios.tsx` with `view:` pointing at the
   same scenarios and `ready:` at each frame's root `testId`. Live steps settle
   (`settle`) after each input and use `waitFor`/`waitForText` where a mount lags
   the click. A live twin may not assert: painted style, `elementType`, the
   accessibility dump (the live tree has no `style` and `GpuixRenderer` has no
   a11y method — plan `197`). Run:

   ```sh
   nub run --filter playground smoke:live
   ```

   Expected: `29/29 scenarios passed`, exit `0`, two screenshots. If a live path
   cannot reach a control, record the measured limitation and narrow the live
   twin — never delete the headless check.

7. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`.

8. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan
   index with the measured counts and findings. Commit in two commits: the plan,
   then the scenarios + live twins + docs.

## 6. Test plan

The test **is** each scenario: typed checks (`expectEqual`, `expectNear`,
`expectContains`, `expectSome`) over host text, bounds, element type, painted
style and the accessibility dump. Record four mutation proofs and two reverse
proofs in §8 after implementation (temporary edit → `--only` run → revert):

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | the view's `DrawerContent side="right"` → `"left"` | "the surface is flush to the right edge" |
| M2 | the view's `TagInput max={3}` → `max={99}` | "max refuses the fourth token" |
| M3 | `packages/components/src/mention/logic.ts`'s `applyMention` temporarily drops the trailing space | "Enter inserts the highlighted name" (the readout keeps the space-sensitive value) |
| M4 | the view's `Carousel value={slide}` → `value={0}` | "Next steps the carousel" |
| M5 | the view's `Drawer initialFocus` is not used; instead `countdown-tick` wired to `+61_000` | "a consumer tick repaints a new value" |

M1, M2, M4 and M5 are view mutations (this workstream's own file). M3 is a
temporary component mutation, applied and reverted exactly like the earlier
plans' component mutations; if it cannot be made to fail for the named check, the
check is not measuring the insertion and must be rewritten.

Reverse proofs (the consumer wiring, not the component):

- `InlineEdit`'s `onCommit` wired to a no-op → "Enter commits the draft" fails.
- `ColorPicker`'s `onValueChange` wired to a no-op → "a swatch reports the
  normalised hex" fails.

A mutation that fails for an unrelated reason is not a proof; fix and repeat.
Every failing label and exit code goes in §8.

## 7. STOP conditions

- The vendor compile does not export a part named here. Stop; record the missing
  export in `TODO.md` as a components task with the compiler error.
- A component throws `assertParts` for the layout this plan describes. Stop and
  record it; do not restructure another package's contract from here.
- A check can only pass with a tolerance above 2 px, or with a screenshot. Stop:
  that is a mechanism question, not a catalogue view.
- A popup cannot fit inside the `1100×720` live window at any layout this plan
  allows. Stop and record the frame constraint rather than clipping a surface.
- A live path cannot reach a control the headless path reaches. Record the
  measured limitation and narrow the live twin; do not delete the headless check.
- Any file outside §3 must change. Stop; write the task in `TODO.md`.
- The full suites are not `78/78` headless and `29/29` live, exit `0`. Stop and
  report the failing scenario; do not mark this plan done.

## 8. Measured results

_(Filled in by the executor: check counts, suite totals, mutation proofs, and
every consumer fact the first runs produce.)_

## 9. Acceptance

- Both headless scenarios are green alone and in the full suite (`78/78`,
  exit `0`), with the check total recorded.
- Both live twins are green in a real window (`29/29`, exit `0`) with two
  screenshots.
- `tier2=verified` still holds, now backed by nine headless and nine live
  scenarios.
- The mutation and reverse proofs are recorded with exact failing labels.
- `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan index name
  the scenarios and their counts.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 10. What this plan does not prove

- It does not re-measure floating placement, dismissal identity, the native
  editor or live key routing; those have their own probes.
- It does not add docs pages (`apps/docs` is the docs-site workstream) and does
  not change the shipped examples or their registry (components workstream).
- It does not fix a defect in a shipped component; it records one.
- It does not cover Tier 2 families that do not exist yet.
