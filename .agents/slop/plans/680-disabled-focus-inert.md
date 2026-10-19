# 680 — A control disabled while focused is inert

**Owner:** components workstream · **Phase:** F (hardening) · **Depends on:**
110, 111, 113, 117, 200, 201, 305, 388, 394, 516, 522, 660, 677

## 1. The defect

A focusable part seeds `focused` from `autoFocus` and follows React
`focus`/`blur`. GPUix 0.10.0 delivers no React `blur` for a native focus change
(plans 536/540), and setting `tabIndex={-1}` does not move native focus. So when
an app disables a part that already holds focus, `focused` stays `true` and the
part keeps painting `focusRing(theme)` while it is disabled. Measured on this
host, 2026-10-19, with a scratch suite:

| Part | Sequence | Observed |
| ---- | -------- | -------- |
| `Button` | `autoFocus`, then `disabled` | `boxShadow` still painted |
| `TabsTrigger` | click, then the tab turned `disabled` | disabled tab still paints the ring, although plan 511 hands focus to a live tab |
| `HotkeyRecorder` | click to record, then `disabled` | ring still painted **and** the field still reads `Press keys…` |

`InlineEdit`, `AccordionTrigger`, `CollapsibleTrigger` and the `ColorPicker`
swatches have the same wiring (state seeded once, ring painted unconditionally),
so they fail the same way. This contradicts the package's own contract —
"Disabled means inert: no hover, no press, no ring, no tab stop" (plan 394) — and
the rule plan 660 established for `SearchInput`.

## 2. The fix

One shared hook owns the painted focus state, so the rule exists once:

`packages/components/src/internal/focus.ts` (new)

```ts
/** The focus state a part paints: seeded by `autoFocus`, dropped when disabled. */
export const useFocusState = (autoFocus: boolean, disabled: boolean) =>
  // useState(autoFocus && !disabled), useLayoutEffect(() => disabled && setFocused(false)), [disabled]
  // returns [focused && !disabled, setFocused] as const
```

The effect clears the remembered state when the part becomes disabled; the
returned value is also guarded by `!disabled`, so the very first disabled paint
cannot show the ring before the effect runs. Re-enabling never fabricates a
focus that cannot be observed: the ring returns on the next real focus signal.

Apply it in:

| File | Change |
| ---- | ------ |
| `src/internal/button.tsx` | `Button` and `IconButton` use the hook instead of `useState`. |
| `src/tabs.tsx` | `TabsTrigger` uses the hook. |
| `src/accordion.tsx` | `AccordionTrigger` uses the hook. |
| `src/collapsible.tsx` | `CollapsibleTrigger` uses the hook. |
| `src/inline-edit.tsx` | The shared `focused` state uses the hook (both the display and the editing input read it). |
| `src/hotkey-recorder.tsx` | The hook for `focused`, plus one `useLayoutEffect` that drops `recording` when `disabled` becomes true. |
| `src/color-picker.tsx` | The hook for the HEX field's `focused`; the swatch index is cleared by a small `useLayoutEffect` on `disabled`, and its ring is guarded by `!disabled`. |

Do not add a timer, poll, or a second focus signal. The shared tracker remains
the primitives interlock recorded in `TODO.md`.

## 3. Test plan

**New file:** `packages/components/src/behaviour/disabled-inert.test.tsx`
(a cross-cutting suite in the shape of `disabled-description.test.tsx`).

Its header comment states the bug above. Cases — each renders enabled, proves
the ring is painted, then rerenders the same tree with the part disabled and
asserts the part is inert:

1. `Button` and `IconButton` (sequentially, one root at a time; the native
   renderer paints one window): ring gone, `tabIndex -1`.
2. `TabsTrigger`: click `tab-b` (a real click is the path that sets React's
   `focused`), then disable it; `boxShadow` undefined; focus has moved to a live
   tab (the plan-511 handover still holds).
3. `AccordionTrigger`: click the header, then disable its section; ring gone.
4. `CollapsibleTrigger`: `autoFocus`, then disabled; ring gone.
5. `InlineEdit` display: `autoFocus`, then disabled; ring gone.
6. `HotkeyRecorder`: `autoFocus` + click to record, then disabled; ring gone and
   `Press keys…` is no longer painted.
7. `ColorPicker`: click a swatch, then disable the picker; the swatch's
   `boxShadow` is undefined and its `tabIndex` is `-1`.

Command:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/disabled-inert.test.tsx
```

Expected: 7 passed on this host (`~2 s`, native import dominates).

**Both directions.** Run the suite at `HEAD` before the fix: all cases that touch
a ring must fail; the enabled-ring assertions are the pins and pass in both
trees. After the fix, the full suite passes. If a case passes at `HEAD`, it is
not guarding this bug and must be strengthened or removed.

**Regression scope.** Run the whole native suite at the end of the task:

```sh
nub run --filter @gpuixui/components test:behaviour
```

Expected: the same 31 recorded plan-540 binding failures, no new failures.

## 4. Docs and inventory

- `COMPONENTS.md`: no test count changes (the new suite is cross-cutting, not a
  component record). The affected rows already claim disabled inertness; do not
  add implementation detail. If a row's wording implies the ring follows a
  disabled part, correct it to the measured contract.
- `docs/component-api.md` §5: append one sentence to the focus-signal section:
  a part that becomes disabled drops its painted focus because no `blur`
  arrives; re-enabling waits for a real focus signal.
- `docs/hotkey-recorder.mdx` (limitations): recording is cancelled by disabling,
  not only by `Escape`, `Tab` or a press outside.
- `TODO.md`: tick the hardening task and record the plan number.
- `.agents/slop/plans/README.md`: add the row and status.

## 5. STOP conditions

Stop and report instead of improvising if:

- the scratch measurement does **not** reproduce at `HEAD` (the premise is
  wrong; do not write the hook);
- a component's public `StateStyle` state is asserted by an existing suite to
  stay `focused: true` while disabled (that would be a deliberate contract and
  needs a decision, not a silent change);
- the fix requires touching a file outside `packages/components` (record it as
  an interlock in `TODO.md`);
- the native suite grows a failure that is not one of the 31 plan-540
  binding failures.

## 6. Acceptance criteria

- `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/disabled-inert.test.tsx`
  — 7/7.
- The same suite fails on the pre-fix tree for every ring case.
- `nub run --filter @gpuixui/components test` — 476 passed.
- `nub run --filter @gpuixui/components check-types` — exit 0.
- `nub run check` and `nub run lint` — exit 0.
- The full native suite has no new failure beyond the recorded plan-540 set.
- Docs, `COMPONENTS.md`, `TODO.md` and the plan index are synced; committed and
  pushed on `agent/components`.
