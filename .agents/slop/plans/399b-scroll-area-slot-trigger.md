# 399b — `ScrollArea` is the one single-root control that is not a slot trigger

| Field | Value |
| ----- | ----- |
| Phase | F (integration) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `072`, `073`, `090`, `093`, `341`, `345`, `396` |
| Source | measured on this host, 2026-10-19 (probe in §0) |
| Status | done (2026-10-19) |

## 0. The bug

`Tooltip` renders GPUix's `<TooltipTrigger asChild>`, which **clones** its props
onto the child. A React component boundary drops every prop it does not declare,
so only the parts that accept the slot contract can be a tooltip trigger
(plans `341`, `345`). Plan `345` decided which Tier 1 parts qualify: **one child,
one focusable host**. Its matrix lists `Input`, `TextArea`, `NumberField`,
`Checkbox`, `Switch`, `Slider` and `Select`, and excludes the roving composites.

`ScrollArea` was missed. A **labelled** area is exactly the qualifying shape:
one root `div`, `role="region"`, `tabIndex={0}`, a name, a focus ring and a
keyboard contract (plan `072`). But `ScrollAreaProps` declares no
`TriggerHandlers`, so the injected hover/focus handlers never reach the host.
`docs/tooltip.mdx` currently says "Every single-root control does" forward the
contract — which is false for this one.

Measured on this host, 2026-10-19, real `TestRenderer` (0.10.0, locally built
binding, ADR `0003`), probe around
`<ScrollArea label="Activity" testId="target">`:

| Probe | Result |
| ----- | ------ |
| `<Tooltip content="A hint"><ScrollArea …/></Tooltip>`, hover `target` | **no tip** — `allText()` is `['one']` |
| the same probe, `focusNext()` so the region holds native focus | **no tip** (`focused()` is `target`, `allText()` is `['one']`) |

The same probe around a `Button` opens the tip in both paths
(`runtime/overlay-trigger.runtime.test.tsx`), so the first failure is the
component boundary, not the runtime.

**A second, runtime-level fact also applies, and the plan must not promise more
than it can deliver.** GPUix delivers a mouse event to the **hit-tested element**
and does not bubble it to ancestors (the same rule plan `072` measured for focus
and plan `345` for text hosts). Hovering a scroll region's centre lands on its
content, so after adding the contract the tip opens only when the pointer is
over the region itself, not over a painted child. Measured with a `div` root and
a `ScrollArea` root (identical results):

| Child under the pointer | Root's `onMouseEnter` |
| ----------------------- | --------------------- |
| a plain `Box` (no background) | **fires** |
| a `Box tone="card"` (painted) | **does not fire** |
| a painted `Box` with `pointerEvents: "none"` | **fires** |
| a plain text `div` | **fires** |

So the honest contract is: **the region is a real trigger** — it forwards the
slot's focus path and description, and hover opens the tip when the region
itself is the hit target (an empty area, a scrollbar gutter, or content that
opts out of hit-testing). A content-filled region is a keyboard-only trigger —
the same shape as a text host — and the page must say so.


## 1. Scope

**In scope:** `ScrollArea` gains the slot contract, exactly as plan `345`'s
matrix specifies for every single-root focusable part:

- `TriggerHandlers` from `src/components/internal.ts`;
- one explicit `"aria-description"?: string` prop (the injected description must
  be declared or it is dropped — the same reason plan `341` added it to the
  button family);
- passive handlers spread onto the root; focus/blur/keys **composed** with the
  region's own focus state and scroll rule.

**Out of scope (do not change):**

- the roving composites (`RangeSlider`, `OTPField`, `Rating`, `CheckboxGroup`,
  `ToggleGroup`) stay documented non-triggers — no single host;
- `Box`/`Text`/layout primitives stay non-triggers;
- the tooltip's own placement/measurement (`335`, `336`, `391`, `393`);
- the full runtime suite's artifact failures (plan `379`/`529`).

No new ADR/decision row: this **applies** D35/D36 to a part the matrix missed.

## 2. Exact changes

### 2.1 `packages/primitives/src/components/ScrollArea.tsx`

1. Import `composeHandler`, `passiveTriggerHandlers` and `type TriggerHandlers`
   from `./internal.js`.
2. Change the props interface to:

   ```ts
   export interface ScrollAreaProps
     extends ScrollSpec,
       Omit<TriggerHandlers, "onScroll"> {
     // …existing docs and members unchanged…
     /** Extra description announced after the name. A slot (a `Tooltip`) writes the tip here. */
     readonly "aria-description"?: string;
   }
   ```

   `onScroll` is excluded from the base because this component already declares
   it with its own documented meaning (wheel deltas); the value is still
   forwarded to the root by the wrapper's own handler.

3. In `renderScrollArea`, before the other root props:

   ```tsx
   <div
     {...passiveTriggerHandlers(props)}
     testId={testId}
     …
     aria-description={props["aria-description"]}
     …
     onFocus={composeHandler(handlers.onFocus, props.onFocus)}
     onBlur={composeHandler(handlers.onBlur, props.onBlur)}
     onKeyDown={composeHandler(handlers.onKeyDown, props.onKeyDown)}
     onScroll={onScroll}
   ```

   Order matters: the passive spread comes first so the component's own
   `onScroll` (which also calls `props.onScroll`) wins; the internal focus/key
   handler runs **before** the slot's, matching `Button`/`Slider`.

4. Do **not** move the wrapper's `onKeyDown` logic into the renderer: the pure
   renderer keeps taking `handlers.onKeyDown`, and composition happens in the
   renderer so the element-tree test can prove both callbacks run.

### 2.2 `packages/primitives/src/components/ScrollArea.test.tsx`

Two element-tree cases (append to the existing file):

1. **forwards the slot contract** — render with
   `onMouseEnter`/`onMouseLeave`/`onMouseDown`/`onFocus`/`onKeyDown` and
   `"aria-description": "Scroll for newer entries"`; assert the root element's
   decoded props carry the same functions and the description.
2. **composes the region's own focus and key handlers** — pass renderer
   `handlers` (`onFocus`, `onKeyDown`) *and* caller handlers; invoke the decoded
   root props; assert both ran, internal first. Assert that an `onKeyDown`-only
   caller (no internal handler) is still forwarded.

Use the existing `expectSome`/`elementProp` helpers already imported in that
file (`src/components/testing/element.ts`); do not add a new helper.

### 2.3 `packages/primitives/runtime/scroll-area-trigger.runtime.test.tsx` (new)

Header comment must state the guarded bug and the measured hit-testing limit
(plan `390`'s hygiene rule). Cases, one fresh window each:

1. **opens on hover where the region is the hit target** — a labelled
   `ScrollArea` (120 px tall) with 60 px of content, inside a `Tooltip`; the tip
   is not painted, hover the region, tip text appears. (The pre-fix direction:
   `allText()` stays `[]`.)
2. **a painted child owns the hover (measured limit)** — the same scene with
   600 px of painted content covering the viewport; hover the region's centre
   and assert the tip stays shut. This records the runtime rule from §0 rather
   than promising a hover the runtime cannot deliver.
3. **carries the tip as the Region's description** — render the filled scene
   and read the accessibility tree; the `Region` node's `aria.description` is
   the tip. The description is a render-time prop, so this needs no open tip.
4. **the region still scrolls while wrapped** — 600 px of content in a 120 px
   box, inside a `Tooltip`; `focusNext()`, `keyDown("target", "pagedown")`;
   `scrollOffset("target").y` is negative and `home` returns it to `0`. This
   guards the composition: forwarding must not replace the scroll rule.

**Do not assert "focus opens the tip" in this file.** Measured 2026-10-19: on
this host's artifact, `focusNext()` focuses the trigger but the tip does not
open even for a `Button` (`tooltip button: focused=target text=B`) or a raw
`div`; the existing `overlay-trigger.runtime.test.tsx` focus cases are among
that file's 8 artifact failures. The focus path is GPUix's `onFocus` →
`openImmediately`; the durable guard this plan adds is the element-tree
composition test (§2.2), and the runtime focus-open proof stays with the
plan-`529` published-tag run. Record this in §7 rather than re-baselining.

Use `openWindow`/`Surface` from `runtime/fixture.tsx`, `a11yNode` from
`../src/testing/index.js`.

### 2.4 Docs

- `packages/primitives/docs/scroll-area.mdx`: add a **Slot trigger** paragraph
  after Keyboard ("a labelled area accepts the `Tooltip` slot contract; an
  unlabelled area has no focus owner and stays a non-trigger") and the
  `aria-description` row in the API table (the contract test requires every
  declared prop to be documented).
- `packages/primitives/docs/tooltip.mdx`: name `ScrollArea` among the parts that
  forward the contract in the existing trigger paragraph/limitation; keep the
  roving composites and `Box` as the exceptions.
- `packages/primitives/examples/scroll-trigger.example.tsx` (new): an activity
  log inside a `Tooltip`, registered as `scrollTrigger` (registry + `SCREENS` +
  `docs/README.md`). Its log stack uses `pointerEvents: "none"` so the pointer
  reaches the region — the documented hit-testing workaround, shown in a
  mounted example.
- `COMPONENTS.md`: add a plan-`399b` sentence to the ScrollArea row (slot
  trigger; composed keyboard contract), the example link to its Docs column,
  and the trigger note to the Tooltip row.
- `.agents/slop/plans/README.md`: add this plan's row.
- `TODO.md`: add and immediately tick the task under the Primitives workstream
  (with the test counts), and keep the docs-site/live-suite rows untouched.

## 3. Commands and expected results

Run from `packages/primitives` (use `nub`, per `AGENTS.md`):

```sh
# 1. Before the fix: the hover and description cases fail; the
#    hit-testing-limit and scroll cases pass (they do not need the contract).
nub exec vitest run --config vitest.runtime.config.ts runtime/scroll-area-trigger.runtime.test.tsx
# expected: 4 tests, 2 failed (hover, description), 2 passed (limit, scroll)

# 2. Before the fix: the new element-tree cases fail.
nub run test -- src/components/ScrollArea.test.tsx

# 3. Implement §2.1, then re-run both.
nub exec vitest run --config vitest.runtime.config.ts runtime/scroll-area-trigger.runtime.test.tsx
# expected: 4/4 passed
nub run test -- src/components/ScrollArea.test.tsx
# expected: existing + 2 new cases passed

# 4. Regression: the established scroll and name contracts.
nub exec vitest run --config vitest.runtime.config.ts runtime/layout.runtime.test.tsx
nub exec vitest run --config vitest.runtime.config.ts runtime/name.runtime.test.tsx
# expected on this host: name 33/33 green; layout 24/28 — its four failures are
# the artifact's frame/focus degradation (surface padding reads 0, the region's
# ring read is absent) and the ScrollArea case fails identically on the
# pre-change tree (measured, §7). Do not re-baseline them.

# 5. Two-direction proof for the new guard: remove the passive spread (or the
#    aria-description line) and re-run step 3; the matching case must fail.
#    Restore before committing.

# 6. Gates.
nub run test            # offline: 722 + 2 new, all green
nub run check-types
cd ../.. && nub run check && nub run lint && nub run test
```

`nub run check` runs the whole-workspace gates and `check:tests`; it must exit
`0`. Never report a count that was not produced by the command above.

## 4. STOP conditions

Stop and report — do not improvise — if:

- the probe shows the tip **already opening** on hover or focus: the premise is
  wrong; record the measurement and abandon this plan rather than adding a
  contract that already exists;
- forwarding the slot's `onMouseDown`/`onClick` breaks scrolling or the region's
  focus ring in case 3; do not ship a partial contract. Narrow the passive set
  and record why (the tooltip needs hover/focus only);
- `ScrollAreaProps` cannot extend `Omit<TriggerHandlers, "onScroll">` because the
  slot's `onFocus`/`onBlur` types differ from the wrapper's; stop and report the
  compile error, do not cast;
- `nub run check`/`lint`/`test` fails for a reason outside this plan's files;
  report the exact command and failure instead of editing other workstreams;
- the full runtime suite is run and fails on the known artifact (plan `379`/
  `529`): the scoped files are the evidence, and the known failures are not
  re-baselined.

## 5. Test plan — why each case can fail

| Case | Old direction |
| ---- | ------------- |
| element: forwards the slot contract | the root has `onMouseEnter: undefined` and no `aria-description` |
| element: composes focus/keys | the caller handlers never run (the root keeps only the wrapper's) |
| runtime: hover where the region is the hit target | `allText()` stays `[]` (measured in §0) |
| runtime: painted child | passes in both directions — it records the runtime's hit-testing rule; it fails if the wrapper starts painting a tip over content it cannot receive hover on |
| runtime: description | the `Region` node has no `aria.description` (the slot's prop was dropped) |
| runtime: scroll while wrapped | if the slot's/composed key handler replaces the wrapper's, PageDown no longer moves; if the passive spread replaced `onScroll`, the offset/deltas regress |

## 6. Acceptance

- A labelled `ScrollArea` inside a `Tooltip` carries the tip as the `Region`'s
  `aria-description`, and opens on hover when the pointer is over the region
  itself; content that accepts the pointer is the measured hover limit and is
  documented, not hidden. The focus-open path is GPUix's own and is exercised by
  the existing trigger suite on a healthy binding; this host's artifact cannot
  prove it (recorded in §7 via plan `379`/`529`).
- The region still scrolls by keyboard while wrapped, and an unlabelled area
  remains inert (no tab stop, no role) — the existing cases stay green.
- The new element-tree and runtime cases fail without the fix and pass with it;
  the exact counts and both directions are recorded in §7.
- `nub run test`, `check-types`, `nub run check`, `nub run lint`, `nub run test`
  (workspace) pass.
- Docs, `COMPONENTS.md`, `TODO.md` and the plan index reflect the change.

## 7. Outcome (measured 2026-10-19)

- **Source:** `ScrollAreaProps` extends `Omit<TriggerHandlers, "onScroll">` and
  declares `"aria-description"`; `renderScrollArea` spreads
  `passiveTriggerHandlers(props)` on the root, writes the description, and
  composes the slot's focus/blur/key handlers after the region's own. The
  wrapper's `onScroll` still wins, so the position reporter is unchanged.
- **Old direction, runtime:** temporarily removing the spread, the description
  and the composition produced **2 failed / 2 passed** in
  `runtime/scroll-area-trigger.runtime.test.tsx`: hover (`allText()` had no tip)
  and the Region description (`undefined`); the hit-testing-limit and keyboard
  scroll cases passed, as they must.
- **Old direction, offline:** the same mutation produced **2 failed / 5 passed**
  in `src/components/ScrollArea.test.tsx`: the slot handlers/description were
  absent, and the composed handlers never ran (`['region-focus','region-key']`
  instead of the four-call order).
- **After:** runtime file **4/4**; `ScrollArea.test.tsx` **7/7**; the offline
  suite **51 files / 724 tests**, `check-types` green.
- **Not provable on this host:** "focus opens the tip". Measured: `focusNext()`
  focuses the trigger, but even a `Button` (`text=B`) and a raw `div` paint no
  tip on this artifact; the existing `overlay-trigger.runtime` focus cases are
  among that file's 8 failures. The durable guard is the element-tree
  composition test; the runtime focus proof belongs to plan `529`'s
  published-tag build.
- **Regression:** `runtime/name.runtime.test.tsx` **33/33** green.
  `runtime/layout.runtime.test.tsx` is **24/28** on this artifact (surface
  padding reads `0`; the focused region's ring is not reported). The
  ScrollArea case fails identically with this plan's source stashed — it is the
  same degradation plan `379`/`529` record, not this change. The full live suite
  was not used as a gate.
- **Docs/inventory:** `scroll-area.mdx` gains the API row, a Tooltip-trigger
  section and the measured hover limit; `tooltip.mdx` adds `ScrollArea` to the
  trigger table and states the hit-testing limit; `COMPONENTS.md` has both row
  notes and the example link; `TODO.md` is ticked at 140/140 and this index row
  is `done`.
- **Example:** `examples/scroll-trigger.example.tsx`, registered as
  `scrollTrigger`; the examples runtime registry-parity and mount cases pass
  (1/1 each, scoped), and the example paints its "Activity log" headline.
- **Gates, all exit `0`:** `nub run check` (check:tests, lint, fmt, all
  check-types), `nub run lint`, `nub run test` (primitives 724 + every other
  package green).
