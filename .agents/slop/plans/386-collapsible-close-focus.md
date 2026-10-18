# Plan 386 — a close must not leave focus inside the hidden body

**Owner:** components workstream (`packages/components`).
**Phase:** F (integration and polish — focus management).
**Depends on:** `110`, `111`, `113`, `117`, `200`, `201`, `326`, `372`, `388`, `394`.
**Status:** done — 5 native cases (Collapsible 16, Accordion 22, behaviour 636);
3 fail without the restore, the 2 outside-focus cases pass. Docs,
`COMPONENTS.md` and the inventory limitations synced.

---

## 1. The defect

`Collapsible` and `Accordion` keep a closed body mounted and hide it with
`visibility: hidden` (plan `372`). When the close begins while focus is on a
control **inside** that body, the control is hidden but keeps focus. The user's
next keystroke goes to an element they cannot see, and the tab sequence resumes
from a hidden node. Both docs pages record the symptom as an unfixable
limitation:

- `packages/components/docs/collapsible.mdx` — "Closing with focus inside the
  body … leaves focus on the hidden element … A consumer that closes a section
  while its body owns focus should move focus itself."
- `packages/components/docs/accordion.mdx` — the same sentence.

### Measured evidence (this host, real `TestRenderer`, 2026-10-18)

A controlled single accordion whose body holds a `Done` button that closes the
section; focus the button natively, press it, settle the animation:

```
content-one.style.visibility  -> "hidden"
focusedTestId(root)           -> Some("done")      // a hidden element
```

The probe (`src/behaviour/probe-focus-leak.test.tsx`, deleted before commit)
fails on `expect(focusedTestId(root)).toEqual(Option.some("trigger-one"))`.
`0.10.0` also delivers no focus event when a native focus change happens, so the
component cannot learn about this with `onFocus`; and `getElement`/`parentId`
exist only on the **test** renderer, not on `NativeRenderer`.

### What is available

- `NativeRenderer.getFocusedElementId(): number | null` and
  `getElementBounds(id)` are both optional members of the production renderer
  (`@gpuix/native` `host.d.ts`, `NativeRenderer`).
- `renderer.focusElement(id)` **does** dispatch React's `onFocus` in the real
  renderer (measured: the trigger's `boxShadow` appears after a programmatic
  `focusElement`), so returning focus to a trigger also paints its ring.
- The body's bounds are still readable on the commit where `open` flips to
  `false`, because the body is only hidden after the tween completes (or, for
  `animate={false}`, after the change in step 2 below).

### The rule

> When a close starts and the focused element's centre lies inside the closing
> body, return focus to that section's trigger. Otherwise leave focus alone.

This is bounds containment, not an exact subtree test: the production renderer
exposes no parent chain. A focused control at the very edge of a clipped body
may therefore not be recognised; that is recorded as the remaining edge case.

---

## 2. The change

### 2.1 `packages/components/src/internal/reveal.tsx`

1. Add a prop to `RevealProps`:

   ```ts
   /** Called when a close starts while focus is inside the body. */
   readonly restoreFocus?: () => void;
   ```

2. Add a `wasOpen` ref (`useRef(open)`) and one `useLayoutEffect` that runs when
   `open` changes:
   - `closing = wasOpen.current && !open`; store `open` back into the ref.
   - when closing, read the body's bounds (from the existing `instance` state)
     and the focused element's bounds; if both exist and the focused box's
     centre is inside the body box, call `restoreFocus?.()`.
   - when closing with `animate === false`, call `setSettled(true)` **in the same
     effect, after the containment check**. This is what keeps the snap path
     measurable: today `hidden` is true on the close commit itself, so the body
     has already lost its bounds before any effect can look at it.

3. Change the hidden condition from
   `!open && isSome(measured) && (settled || !animate)` to
   `!open && isSome(measured) && settled`. `settled` starts as `!open`, so a
   section mounted closed still hides immediately; an open section sets it
   `false` on open, and it becomes `true` on `onMotionComplete` (tween) or in the
   layout effect above (snap).

4. Add a module-local helper `focusedInside(renderer, bodyId)` built with
   `Option` (`Option.fromNullishOr` around the two renderer reads,
   `Option.match` for the answer) — no `null` arithmetic in the component body.

`restoreFocus` is a callback, not a state setter: `Reveal` does not own focus
policy, it only detects the case.

### 2.2 `packages/components/src/collapsible.tsx`

1. Extend `CollapsibleContextValue` with
   `readonly trigger: RefObject<PublicInstance | null>`.
2. `Collapsible` creates `const trigger = useRef<PublicInstance | null>(null)`
   and puts it in the provider value.
3. `CollapsibleTrigger`:
   - destructure `ref` from props (it currently rides in `...rest`, so a caller
     ref would be discarded the moment we add our own — the plan-128 rule);
   - composes `useMergedRef(attach, ref)` where `attach` writes
     `trigger.current = next`;
   - renders `ref={setElement}`.
4. `CollapsibleContent` reads `useGpuix().renderer` + `trigger`, builds a
   `useCallback` that calls `renderer?.focusElement?.(trigger.current.id)` when
   an instance exists, and passes it as `restoreFocus`.

### 2.3 `packages/components/src/accordion.tsx`

1. Extend `AccordionItemContextValue` with
   `readonly trigger: RefObject<PublicInstance | null>`.
2. `AccordionItem` creates the ref (one per section) and includes it in the
   item context memo (stable identity).
3. `AccordionTrigger`'s existing `attach` callback also writes
   `trigger.current = next`, next to the `setInstance` it already does.
4. `AccordionContent` builds the same `restoreFocus` callback from the item's
   trigger ref and `useGpuix().renderer`, and passes it to `Reveal`.

No public prop changes; `Reveal` is internal.

---

## 3. Steps, commands, expected results

Run every command from the repository root
`/Users/cyberistic/GPUIXUI/workspaces/components`.

1. **Delete the investigation probes.**

   ```sh
   rm packages/components/src/behaviour/probe-focus-leak.test.tsx
   rm packages/components/src/behaviour/probe-focus-event.test.tsx
   ```

   Expected: both files gone; `git status` shows only tracked-file edits from
   step 2 onward.

2. **Apply §2.1–§2.3** exactly. Expected: `nub run --filter @gpuixui/components
   check-types` prints `Done` with no diagnostics.

3. **Add the behaviour tests** (see §4) to
   `src/behaviour/collapsible.test.tsx` (3) and
   `src/behaviour/accordion.test.tsx` (2).

4. **Run the behaviour suite.**

   ```sh
   nub run --filter @gpuixui/components test:behaviour
   ```

   Expected: `Test Files 49 passed (49)`, `Tests 636 passed (636)`.
   If any of the five new tests fail, go to §6 (STOP conditions).

5. **Prove both directions.** Comment out the single line
   `restoreFocus?.();` in `reveal.tsx` and re-run step 4.

   Expected: exactly the three "inside the body" tests fail, each reporting the
   hidden control's `testId` instead of the trigger; the two "outside" tests
   still pass. Restore the line and re-run step 4 → 636 green.

6. **Update the written truth** (counts are checked by
   `src/inventory.test.ts`):
   - `packages/components/src/accordion.tsx` → `accordionMeta.limitations`:
     replace the "closing a section with focus inside its body … consumer moves
     focus" sentence with the new rule and its bounds edge case.
   - `packages/components/src/collapsible.tsx` → `collapsibleMeta.limitations`:
     the same.
   - `packages/components/docs/accordion.mdx`: the limitation bullet and the
     verification line `(20 tests)` → `(22 tests)`, with the two new cases in
     the prose list.
   - `packages/components/docs/collapsible.mdx`: the limitation bullet and
     `(13 tests)` → `(16 tests)`.
   - `COMPONENTS.md` Tier 2 rows: Accordion `20` → `22`, Collapsible `13` → `16`,
     and replace each "programmatic close with focus inside the body leaves
     focus on the hidden element …" clause with the new behaviour + bounds edge
     case.
   - `TODO.md` Phase F: add and tick
     `[x] Disclosure close returns focus to the trigger — plan 386`.
   - `.agents/slop/plans/README.md`: add the plan row with status
     `done — 5 native tests (…), both-direction proof`.

7. **Run the gates.**

   ```sh
   nub run --filter @gpuixui/components test
   nub run check
   ```

   Expected: unit suite `39 passed`, `395 passed`; `check` prints the test check,
   lint, format and type-check clean.

8. **Commit and push.**

   ```sh
   git add -A
   git commit -m "fix(components): a disclosure close returns focus to its trigger"
   git push origin agent/components
   ```

---

## 4. Test plan

### `src/behaviour/collapsible.test.tsx` (+3)

Header comment gains: "…and a close that began with focus inside the body
leaving focus on the hidden control".

1. **`returns focus to the trigger when the close starts inside the body`**
   - Controlled `open` (starts `true`) whose body holds
     `<div role="button" tabIndex={0} testId="done" onClick={close}>Done</div>`.
   - `clockPause()`, settle open, `focusElement(done)`, `clickCentreOf(done)`,
     settle.
   - Assert `isHidden(content) === true` and
     `focusedTestId === Some("trigger")`, plus the trigger's `boxShadow` is
     defined (the ring follows the returned focus).
   - Fails without §2.1: reports `Some("done")`.

2. **`returns focus to the trigger on a snapping close`**
   - The same tree with `animate={false}`.
   - Same assertions.
   - Fails without the `settled`/`!animate` change: no restore is attempted
     because the body is already hidden and has no bounds.

3. **`keeps focus outside the body when another control closes the section`**
   - Body has an `<input testId="draft">`; an outside
     `<div role="button" testId="close">` calls the controlled close.
   - Focus the outside control, click it, settle.
   - Assert the body is hidden and focus is still `Some("close")`.
   - Fails if the restore is unconditional: focus would jump to the trigger.

These use the existing helpers (`clickCentreOf`, `focusedTestId`,
`isHidden`, `settle`) and the established one-root-per-test teardown.

### `src/behaviour/accordion.test.tsx` (+2)

Header comment gains the same sentence, scoped to a header.

4. **`returns focus to the header when a close starts inside its body`**
   - Controlled single accordion (`value`/`onValueChange`) whose open body
     holds a `Done` button that sets the value to `null`.
   - Focus the button, press it, settle.
   - Assert the body is hidden, focus is `Some("trigger-one")`, and the header's
     `boxShadow` is defined.
   - Fails without §2.1/§2.3: reports `Some("done")`.

5. **`leaves focus alone when a different section closes`**
   - Two sections, both open (`type="multiple"`), focus a control in body two,
     close section one from an outside control.
   - Assert focus is still on the outside control.
   - Proves the containment rule is per body, not "any close steals focus".

No pure-logic test: the rule is one bounds comparison read from the renderer;
the two outcomes are observable only in the native tree. The both-direction
mutation in step 5 is the required two-direction proof.

---

## 5. Acceptance

- [ ] The three "inside" cases restore focus to the owning trigger, with the
      ring painted, on both the tween path and the snap path.
- [ ] The two "outside" cases do not move focus.
- [ ] Removing `restoreFocus?.()` fails exactly the three "inside" cases.
- [ ] No public API change; `Reveal` stays internal.
- [ ] Docs, `COMPONENTS.md`, inventory limitations and stated test counts agree
      with the suite (the inventory test enforces this).
- [ ] `nub run --filter @gpuixui/components test`,
      `nub run --filter @gpuixui/components test:behaviour` and `nub run check`
      pass.

---

## 6. STOP conditions

Stop and report (do not improvise) if:

1. **The body has no bounds on the closing commit.** If a probe shows
   `getElementBounds(body)` is `null` once `open` turns `false` even with the
   `settled` change, the bounds rule is not measurable at close time. Record the
   measured null and stop — the remaining alternative (a caller-supplied focus
   target) is a public API decision, not this plan's.
2. **`focusElement` does not deliver `onFocus`.** If restoring focus leaves the
   trigger's `focused` state and ring false on this runtime, do not fake a ring:
   record it, keep the focus move, and reduce the acceptance to "focus is no
   longer on the hidden control" with the ring gap written into the docs.
3. **A caller `ref` on `CollapsibleTrigger` breaks.** If composing `ref` changes
   an existing behaviour (the plan-128 suite), stop; the composition is wrong,
   not the test.
4. **The five new tests cannot be made to fail without the fix.** A test that
   passes on both trees proves nothing (AGENTS §3); report it instead of
   keeping it.
5. **Any test outside the five starts failing.** Do not adjust unrelated
   expectations. Record the failure and stop; it means the shared `Reveal`
   change altered a documented behaviour.

---

## 7. Out of scope

- Exact subtree containment (no parent chain on `NativeRenderer`).
- Focus restoration when the focused control is clipped out of the body's
  visible box.
- `Tabs` panels and `Carousel` slides — they do not hide a focused subtree.
- Using `inert`/`aria-hidden`: neither exists in published `0.10.0`.
