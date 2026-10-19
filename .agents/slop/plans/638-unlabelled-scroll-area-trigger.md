# 638 — an unlabelled `ScrollArea` is not a tooltip trigger

**Phase:** F (Tier 1 consistency / accessibility)
**Owner:** primitives workstream (`packages/primitives`)
**Depends on:** 072 (ScrollArea keyboard), 341/345 (slot triggers), 396 (blank
labels), 399b (ScrollArea slot trigger), 573 (blank tips), 605 (tooltip
dismissal), 610 (ScrollArea tooltip focus)

## 0. The defect

`ScrollArea` accepts the slot contract (`TriggerHandlers`) so a **labelled**
region — one focusable root with a role and a name — can be wrapped in a
`Tooltip`. `renderScrollArea` spreads `passiveTriggerHandlers(props)`
**unconditionally**, while every other trigger affordance is gated on `named`:

```tsx
const named = name !== undefined;
// role, aria-label, tabIndex and the keyboard handler all check `named` …
{...passiveTriggerHandlers(props)}   // … but the hover handlers do not
aria-description={ariaName(props["aria-description"])}
```

`TooltipTrigger asChild` clones `onMouseEnter`/`onMouseLeave` onto the child, so
an **unlabelled** area wrapped in a `Tooltip` paints a tip on hover. It can never
open by keyboard (no tab stop) and has no accessible node or description — the
hover-only, accessibility-invisible trigger shape plans `073`/`573` treat as a
bug.

Both docs already state the intended contract, and are therefore currently
false:

- `docs/scroll-area.mdx` §Accessibility: "An **unlabelled** area has no role and
  no tab stop, so it is not a trigger either — label it first."
- `docs/tooltip.mdx` trigger table: only "`ScrollArea` (labelled)" is a trigger.

Measured on the current tree (see §6): a `Tooltip` around an unlabelled
`ScrollArea` paints its tip after `runtime.hover("target")`.

## 1. Files to change

### 1.1 `packages/primitives/src/components/ScrollArea.tsx`

In `renderScrollArea`, gate the slot contract on the same `named` value that
gates the role, name and tab stop:

```tsx
{...(named ? passiveTriggerHandlers(props) : {})}
```

and publish the description only when there is a node to carry it:

```tsx
aria-description={named ? ariaName(props["aria-description"]) : undefined}
```

Add a sentence to the renderer doc comment: an unlabelled area is intentionally
inert, so the slot's passive handlers do not reach it (plan `638`). The
region's own focus/blur/key composition is unchanged — those props are not
slot-only and an unlabelled area is not focusable anyway.

### 1.2 Tests

`packages/primitives/src/components/ScrollArea.test.tsx`
- new case `"drops the slot contract when the area is unlabelled"`:
  call `renderScrollArea({ axis: "vertical", "aria-description": …, onMouseEnter,
  onMouseLeave, onMouseDown }, testTheme)` **without** a label and assert:
  - `hostProp(area, "aria-description")` is `Option.none()`;
  - `hostHandler(area, "onMouseEnter")`, `onMouseLeave` and `onMouseDown` are
    all `Option.none()`.
  The existing labelled case stays untouched and proves the positive direction.

`packages/primitives/runtime/scroll-area-trigger.runtime.test.tsx`
- new case `"does not make an unlabelled area a hover trigger"`: render a
  `Tooltip` around `<ScrollArea testId="target" style={{ height: 120 }}>` (no
  `label`, sparse content so the root is the hit-tested element), `hover`
  `"target"`, and assert the tip text was never painted. This is the measured
  user-visible defect; it fails against the current unconditional spread.
- Update the file's header comment: it currently says the area "must accept the
  slot contract"; qualify that as the **labelled** area, and name this case.

### 1.3 Docs

- `docs/scroll-area.mdx`: the existing "not a trigger either" sentence is now
  true; add the measured consequence — "an unlabelled area wrapped in a
  `Tooltip` paints no tip, because the wrapper drops the slot's handlers."
- `COMPONENTS.md` ScrollArea row: append "**Unlabelled trigger (638):** the slot
  contract is gated with the role/name/tab stop, so an unlabelled area wrapped
  in a `Tooltip` paints nothing (it used to open on hover only)."

### 1.4 Records

- `.agents/slop/plans/README.md`: index this plan.
- `TODO.md` primitives section: ticked row with the measured counts.
- `PLAN.md` §4: `D49` — "A root that is only a trigger when named drops the slot
  contract when unnamed." Rationale: the hover edge alone is not an accessible
  trigger; the docs say so, and a hover-only tip is the defect class of `073`.

## 2. Commands and expected results

```sh
# Red (old code): the two new cases fail.
nub run --filter @gpuixui/primitives test src/components/ScrollArea.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/scroll-area-trigger.runtime.test.tsx
# expected before: the unlabelled case paints the tip / the handlers are present.
# expected after: both files green; the labelled cases unchanged.

# Gates.
nub run check
nub run lint
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
```

## 3. STOP conditions

Stop and report if:

- gating the spread drops a **labelled** area's trigger behaviour (the existing
  `scroll-area-trigger` cases and the labelled element case must stay green);
- a caller's direct `onMouseEnter` on an unlabelled area is used somewhere in the
  repo (grep first). That would be a deliberate use of an undocumented
  affordance; record it and stop rather than silently break it;
- the runtime `hover` cannot hit the unlabelled root (a full-viewport child):
  use the sparse fixture the existing hover case uses, never weaken the
  assertion.

## 4. Test plan — why each test can fail

| Test | Guards | Fails without the fix because |
| ---- | ------ | ----------------------------- |
| element: unlabelled drops the slot contract | the render gate | the current spread copies `onMouseEnter`/`onMouseLeave`/`onMouseDown` onto the div and writes `aria-description` |
| runtime: unlabelled hover paints no tip | the user-visible symptom | the cloned `onMouseEnter` opens the runtime tooltip |
| existing labelled cases | no regression | they were green before and must stay green |

Both directions: run the new cases before the change and after; do not
re-baseline the labelled ones.

## 5. Acceptance

- [x] New element + runtime cases fail on the old code and pass on the new code.
- [x] Labelled-trigger cases stay green; `nub run check`, `nub run lint`,
      `nub run test` and the primitives runtime suite are green.
- [x] Docs + inventory state the measured rule; plan indexed, TODO ticked, D49.
- [x] Commit on `agent/primitives` and push.

## 6. Result

- **Red run (old code), 2026-10-19:** `src/components/ScrollArea.test.tsx` was
  **7 passed / 1 failed** — `drops the slot contract when the area is
  unlabelled` failed with `expected { _tag: 'Some' } to strictly equal { _tag:
  'None' }`; `runtime/scroll-area-trigger.runtime.test.tsx` was **5 passed / 1
  failed** — `does not make an unlabelled area a hover trigger` failed with
  `expected true to be false` (the tip was painted after a hover).
- **Green run (new code), 2026-10-19:** the element file is **8/8**, the runtime
  file is **6/6**; the labelled hover/focus/description/keyboard cases are
  unchanged. Package gates: offline 60 files / **844** tests, full runtime 57
  files / **799** tests, `nub run check` and `nub run lint` green.
