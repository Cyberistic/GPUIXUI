# 083 — `Select`'s trigger takes focus but paints no focus ring

| Field | Value |
| ----- | ----- |
| Phase | F (Tier 1 correctness) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `057`, `079`, `081` |
| Status | **done** |

Self-contained: §1 the measurement, §2 the rule, §3 the files, §4 the test plan,
§5 STOP conditions, §6 the outcome.

---

## 1. The gap, measured

`Select`'s header says the trigger "wears the same field chrome as `Input`", and
the docs promise a focused field paints a ring. Measured on this host in a fresh
1280×800 `TestRenderer` window (`testTheme`, 2026-10-18), a column of
`Input` → `Select` → `Button`, pressing Tab three times:

| Step | Native focus | Painted `boxShadow` on the focused control |
| ---- | ------------ | ------------------------------------------ |
| 1 | `Input` (element 1) | `{offsetX 0, offsetY 0, blurRadius 0, spreadRadius 2, color #000018}` |
| 2 | **`Select` trigger (element 4)** | **`undefined`** |
| 3 | `Button` (element 7) | the same ring |

The trigger is genuinely focusable and in the tab order: its host props are
`{tabIndex: 0, role: "combobox", aria-label, aria-expanded, aria-valuetext}`,
`renderer.getFocusedElementId()` reports element 4, and the keyboard lifecycle
already works end to end — Enter opens the list (focus moves to the list
content), Escape closes it and returns focus to the trigger, and Down + Enter
commits an option and returns focus. The **paint** is the only thing missing.

So `Select` is the one focusable control in the library that shows no focus
indicator (WCAG 2.4.7), and the docs' "same field chrome as `Input`" claim is
false while focused. It went unnoticed because the wrapper has no focus state at
all — `SelectState` is `{open, disabled, invalid}` and the trigger state is
GPUix's `{open, disabled, placeholder}` — and because the trigger carries **no
`testId`**, so `runtime.focused()` (which reports an element's `testId`) returns
`None` for it and a runtime test could not name the control that held focus.

GPUix's `SelectTrigger` (published 0.10.0, `dist/components/select.js`) sets
`tabIndex: 0`, `onClick` and `onKeyDown` on the trigger div, but no `onFocus`,
no focus state and no ring. The wrapper supplies the whole field chrome, so the
ring is the wrapper's to paint — exactly like `Input`, `TextArea`,
`NumberField`, `Checkbox`, `RadioGroup`, `Slider` and `Button`.

## 2. The rule

**The trigger paints the focus ring whenever it holds focus or its list is
open.**

- `Select` tracks focus with the existing `useFocus()` hook (`components/
  internal.ts`) and passes the resulting `FocusState` into `renderSelect`.
- The trigger's style resolver merges `controlFocusStyle(spec, theme)` **after**
  the field chrome and **before** the caller's `triggerStyle`, so a caller can
  still override it. `disabled` never rings.
- The ring also paints while `open`: opening moves native focus into the list
  (measured), and a select whose popover is open but whose trigger shows no
  active state looks like two unrelated controls. The open list is the focus
  target; the ring marks which control it belongs to.
- `SelectTriggerState` widens by one field — `focused` — so a `triggerStyle`
  callback can react to it. The component always resolves it; it is not
  optional. The type stays package-exported (the GPUix type is its base).
- The trigger gains `testId={`${testId}-trigger`}`, matching the per-item
  convention (`-star-N`, `-thumb-end`, `otp-cell-N`). This is what lets a
  runtime test name the element that holds focus instead of fishing it out of
  `element.children[0]`.

No colour, spacing or geometry token is introduced: the ring is the one
`focusRing(theme)` already shipped through `controlFocusStyle`.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/Select.tsx` | import `useFocus`/`FocusState`; local `SelectTriggerState` with `focused`; ring in `selectTriggerStyle` for `focused \|\| open`; `renderSelect` takes `focus`; trigger gets `onFocus`/`onBlur` and `${testId}-trigger`; `Select` passes the hook |
| `packages/primitives/src/components/Select.test.tsx` | trigger-state unit cases (ring on focus, ring while open, no ring disabled, caller override wins) and the trigger's `testId`/handlers in the tree; update the six `renderSelect` call sites |
| `packages/primitives/src/components/state-style.test.tsx` | update its `renderSelect` call site if the signature change reaches it |
| `packages/primitives/runtime/fields.runtime.test.tsx` | **new** runtime cases: Tab lands on `sel-trigger` and paints the ring; leaving clears it; opening keeps it; Escape/commit return focus with the ring; a disabled select is skipped and unringed |
| `packages/primitives/docs/select.mdx` | a trigger-states note (`focused` in `SelectTriggerState`), the ring in Keyboard/Accessibility, the testId suffix, Verification |
| `docs/gpuix-capabilities.md` | the focus law: a headless part paints no ring — a themed wrapper tracks focus and rings while open |
| `COMPONENTS.md` | the `Selects` row — measured focus ring and `focused` state |
| `TODO.md` | add and tick the task |
| `PLAN.md` | D30 |
| `.agents/slop/plans/README.md` | index this plan as **done** |

## 4. Test plan and commands

Offline (`packages/primitives`):

1. `selectTriggerStyle(spec, theme)` rings when `focused: true`, rings when
   `open: true`, does not ring at rest, and never rings when `disabled: true`
   even if `focused`/`open` are set.
2. The merge order (the caller's `triggerStyle` wins over the ring) stays the
   contract `state-style.test.tsx` already pins; its `Select` case now expects
   `focused` in the state it records.
3. The element tree names the trigger `${testId}-trigger` and wires
   `onFocus`/`onBlur`.

Runtime (`runtime/fields.runtime.test.tsx`, a fresh window per case):

6. Tab from an `Input` lands on `sel-trigger`; its painted `boxShadow` equals
   the theme's ring (`spreadRadius = borderWidth.strong`, `color = ring`). This
   fails today with `undefined`.
7. Tab again moves to the next control and the trigger's ring is gone.
8. Enter opens the list (focus moves into it) and the trigger keeps the ring;
   Escape closes, focus returns to `sel-trigger`, the ring is still painted.
9. Committing an option with the keyboard returns focus to `sel-trigger` with
   the ring painted.
10. A disabled select is skipped by `focusNext` and paints no ring.

Commands:

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run check
nub run lint
```

Expected: the offline suite green with the new cases; the runtime suite green
with five new cases (199 → 204); `check` and `lint` exit `0`. Record the exact
counts in §6.

**Two-direction proof:** remove the `controlFocusStyle` merge from
`selectTriggerStyle` (keep everything else), then run case 6 — it must fail with
`undefined` against the ring — and restore. Record the output in §6.

## 5. STOP conditions

- Stop if `SelectTrigger` does not forward `onFocus`/`onBlur` to its div (its
  implementation spreads `...props`, but prove it in the runtime). If it does
  not, the wrapper needs a focus source that is not React handlers: record the
  finding and report instead of guessing.
- Stop if the ring changes the trigger's measured box or the list width: a
  `boxShadow` must not affect layout, and `Select`'s width measurement feeds the
  list. If it does, the ring helper is wrong for this surface.
- Stop if adding `${testId}-trigger` breaks a test that finds the trigger as
  `children[0]` in a way that hides a regression — update the helper to the new
  name, never keep two names for one element.
- Stop if the ring is painted on a **disabled** trigger or on a blurred one:
  those are the two directions the test exists for.
- Never widen the assertion to "some boxShadow" — the ring is
  `focusRing(theme)`'s exact value, the same one the other controls assert.

## 6. Outcome

Executed on this host, 2026-10-18.

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test` | 35 files, **411 tests green** (was 409; +2) |
| `nub run --filter @gpuixui/primitives test:runtime` | 18 files, **204 tests green** (was 199; +5) |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| Tab onto `sel-trigger` | `boxShadow {offsetX 0, offsetY 0, blurRadius 0, spreadRadius 2, color #000018}` — before: `undefined` |
| Tab past it | ring `undefined` |
| Enter (list open) | focus in the list; trigger keeps the ring |
| Escape / commit | focus back on `sel-trigger`; ring painted |
| disabled select | skipped by Tab, ring `undefined` |
| `runtime.focused()` on the trigger | `"sel-trigger"` (before: `None`, no `testId`) |

**Two-direction proof.** Replaced the `focused || open` condition with `false`
(the ring merge stays in the code but never fires) and ran
`nub exec vitest run --config vitest.runtime.config.ts
runtime/fields.runtime.test.tsx`:

```
× rings the Select trigger when Tab reaches it
× keeps the Select trigger ringed while its list is open
× returns focus to a ringed Select trigger after Escape
× returns focus to a ringed Select trigger after committing an option
AssertionError: expected undefined to strictly equal { offsetX: +0, offsetY: +0, …(4) }
```

`4 failed | 37 passed`. The fifth new case — a **disabled** select paints no
ring — passes in both directions by design: it guards the other side of the
rule. Restored the condition → `41 passed (41)`.

**Measured non-findings.** The trigger was already in the tab order and its
keyboard lifecycle already worked: `focusNext` reaches it, Enter opens, the list
takes focus, Escape closes and returns focus, and a committed option returns
focus. Plan `057`'s combobox/listbox/option contract is untouched. The defect
was paint (and testability) only.
