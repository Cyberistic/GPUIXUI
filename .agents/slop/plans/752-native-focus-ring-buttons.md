# 752 — A button-shaped part's focus ring follows native focus

**Phase:** F (integration and polish, Tier 2 hardening)
**Owner:** `components` workstream (`packages/components`)
**Depends on:** 110, 117, 200, 201, 388, 394, 522, 536, 540, 680, 748
**Number:** `752` is the first free number across every worktree — `749` and
`750` are tokens-theme plans, `751` is the playground's, and the components
workstream's highest is `748` (`PLAN.md` D30).

**Status: done** (2026-10-20) — see §8 for the measured result.

---

## 1. The defect

Every button-shaped control paints its focus ring from React `onFocus` / `onBlur`
alone:

```tsx
const [focused, setFocused] = useFocusState(autoFocus, disabled);
// …onFocus={() => setFocused(true)}  onBlur={() => setFocused(false)}
```

`@gpuix/native@0.10.0` delivers **no React `focus`/`blur` for a native focus
change** (plans 536/540; measured again by 613, 659, 660, 672 and 748). So the
five parts that own a ring this way paint **no ring** when focus arrives by the
two paths a user actually uses:

- `Tab` / `renderer.focusNext()` / `renderer.focusElement()`;
- a real pointer press, which focuses the host natively in the same task.

The shared `Button`/`IconButton` is the largest surface in the package
(Pagination, Breadcrumb, Alert dismiss, Toast action/dismiss, Chat, Dialog and
Confirmation actions, Notification Centre header actions), and the tab,
accordion and collapsible triggers are the same shape. `FieldInput` (748),
`SearchInput` (659/660) and `ComboboxTrigger` (672) were already fixed by
sampling the renderer's focused host; these five were left behind.

Measured on this host (2026-10-20) with a throwaway
`src/behaviour/probe.test.tsx` (deleted before this plan lands), against the real
`TestRenderer`, dark theme:

| part | step | observation | verdict |
| ---- | ---- | ----------- | ------- |
| `Button` | `focusElement(button)` | focused host `button`, `boxShadow: undefined` | **defect** |
| `Button` | real click at its centre | focused host `button`, `boxShadow: undefined` | **defect** |
| `IconButton` | `focusElement(icon)` | focused host `icon`, `boxShadow: undefined` | **defect** |
| `TabsTrigger` | `focusElement(tab-b)` | focused host `tab-b`, `boxShadow: undefined` | **defect** |
| `AccordionTrigger` | `focusElement(header)` | focused host `header`, `boxShadow: undefined` | **defect** |
| `CollapsibleTrigger` | `focusElement(trigger)` | focused host `trigger`, `boxShadow: undefined` | **defect** |

The probe ran `6 passed` because each case asserted the *current* absence; each
assertion flips to "a ring is painted" after the fix.

## 2. The rule and the fix

**Rule.** A ring-owning part that knows its own host id samples
`renderer.getFocusedElementId()` while it is enabled (`internal/native-focus.ts`,
50 ms, one interval per mounted consumer) and paints the ring only while **its
own host** is the focused host. The `autoFocus` seed stands only until the
sample reports a host, because the runtime applies `autoFocus` after React's
effects (plan 388). The React `focused` flag remains the fallback for a part with
no host id and for the window between mount and the first sample. A disabled
part neither samples nor paints (plan 680). The public state that a part exposes
(`TabsTriggerState.focused`) is derived from the same value, so a caller's state
function cannot disagree with the paint.

This is exactly the `FieldInput` rule (plan 748 §2), moved into the shared hook
so five parts follow one implementation instead of five copies.

### 2.1 `packages/components/src/internal/focus.ts`

Add the host id and the sample; keep the exported `FocusState` tuple shape so
every existing caller is unchanged.

```ts
import { useNativeFocusId } from "./native-focus.js";

/** Focus state: native focus when the part names its host, else React's events. */
export const useFocusState = (
  autoFocus: boolean,
  disabled: boolean,
  hostId?: number | null,
): FocusState => {
  const [focused, setFocused] = useState(autoFocus && !disabled);
  const sampleEnabled = !disabled && hostId !== undefined && hostId !== null;
  const focusedId = useNativeFocusId(sampleEnabled);
  useLayoutEffect(() => {
    if (disabled) setFocused(false);
  }, [disabled]);

  const shown =
    !sampleEnabled
      ? focused
      : focusedId === null
        ? focused || autoFocus
        : focusedId === hostId;
  return [shown && !disabled, setFocused] as const;
};
```

`focusedId === null` means "the sample has not named a host yet" (nothing is
focused, or the first tick has not run): fall back to React's flag and the
`autoFocus` seed, which is what the parts do today. Once the sample names a
host, the sample is the truth — that is what clears a stale ring when focus
moves on.

### 2.2 Adoption (five call sites, one line each)

Pass the host id each part already holds:

| File | Line | Change |
| ---- | ---- | ------ |
| `src/internal/button.tsx` | `Button` | `useFocusState(autoFocus, disabled, instance?.id)` |
| `src/internal/button.tsx` | `IconButton` | `useFocusState(autoFocus, disabled, instance?.id)` |
| `src/tabs.tsx` | `TabsTrigger` | `useFocusState(autoFocus, disabled, instance?.id)` |
| `src/accordion.tsx` | `AccordionTrigger` | `useFocusState(autoFocus, disabled, instance?.id)` |
| `src/collapsible.tsx` | `CollapsibleTrigger` | `useFocusState(autoFocus, disabled, instance?.id)` |

`instance` is assigned by the part's existing ref callback (a `useState`), so the
first render passes `undefined` and sampling starts on the render that has the
host. No ref, registration or handler changes.

### 2.3 What must not change

- The ring colour/geometry (`focusRing(theme)`), the variant/active/hover styles,
  the disabled dimming, `tabIndex={-1}` and `stateDescription(disabled, …)`.
- Caller `onFocus`/`onBlur` still compose and still fire exactly when the runtime
  delivers them; the sampler never synthesises a caller handler.
- `autoFocus` still focuses natively and still seeds the ring before the first
  tick (plan 388).
- Tabs' click path (`noteFocus` + `setFocused(true)`) still selects immediately;
  the sample only adds the ring it already claimed.
- A disabled part keeps no ring even if it holds native focus (plans 394/680).

## 3. Test plan

One new case per family in its existing native suite. Every case must be able to
fail at `HEAD` for the measured reason.

1. `src/behaviour/button.test.tsx` — **new** `paints the ring when native focus
   arrives and gives it up when focus leaves`:
   - render two `Button`s (`first`, `second`);
   - `focusElement(first)`; `await until(() => first.style.boxShadow !== undefined)`;
   - assert `focusedTestId` is `Some("first")` and the ring equals
     `focusRing(darkTheme).boxShadow`;
   - `focusElement(second)`; `await until(() => first.style.boxShadow === undefined)`;
   - assert `second` now paints the ring.
   - **At `HEAD`**: the first `until` never holds (measured).
2. `src/behaviour/button.test.tsx` — **new pin** `paints no ring on a disabled
   button that holds native focus`: `<Button disabled>`, `focusElement`, one
   sample tick (`await until(() => focusedTestId(...) === Some("b"))`), ring
   `undefined`. Passes at `HEAD`; fails if the `!disabled` guard is dropped.
3. `src/behaviour/tabs.test.tsx` — **new** `paints the trigger's ring from native
   focus`: focus `tab-b` by code, await the ring, focus `tab-a`, await `tab-b`'s
   ring gone. Fails at `HEAD`.
4. `src/behaviour/accordion.test.tsx` — **new** `paints the header's ring from
   native focus`: the same two-step shape over two headers. Fails at `HEAD`.
5. `src/behaviour/collapsible.test.tsx` — **new** `paints the trigger's ring from
   native focus`: the same shape over two collapsibles. Fails at `HEAD`.

Use `until` from `../internal/interaction.js` (the sample is a 50 ms timer; a
synchronous assertion is a race). Keep every existing case in the five suites;
`autoFocus` ring cases must stay green (the seed still paints before the first
tick).

### Both-direction proof (run and record)

- new cases + `HEAD` sources → the four "native focus" cases fail (plus the
  Button click probe if kept), the disabled pin passes;
- new cases + the fix → all green;
- replace `shown` with `focused` (drop the sample) → the four native-focus cases
  fail again;
- drop `&& !disabled` from the return → the disabled pin fails.

## 4. Documentation and inventory sync (all required before "done")

1. `docs/component-api.md` §5 — the focus paragraph currently names
   `SearchInput`, `ComboboxTrigger` and `FieldInput`; add "the shared `Button`
   and the tab, accordion and collapsible triggers read the same sample, so their
   ring follows native focus".
2. `COMPONENTS.md` — the cross-cutting focus sentence and the Tabs, Accordions
   and Collapsible rows: state that the ring follows the renderer's focused host
   (50 ms) and update the native-test counts for Tabs, Accordion, Collapsible and
   the shared-button rows that state a count.
3. `docs/tabs.mdx`, `docs/accordion.mdx`, `docs/collapsible.mdx` — the
   accessibility/limitations bullet gains the native-focus rule; the stated
   native-test counts move by one each.
4. `TODO.md` — one ticked row under *Tier 2 hardening after the inventory
   closed* with the measurement, counts and gates.
5. `.agents/slop/plans/README.md` — the 752 row with its status.
6. `PLAN.md` D30 — record `752` and that the next components overflow number is
   `753`.

The inventory check (`src/inventory.test.ts`) holds docs counts to the real
suite, so the counts above must be the measured ones, not estimates.

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`.

| Command | Expected |
| ------- | -------- |
| `cd packages/components && nub run test:behaviour button` | before: the new case fails; after: 17 passed (15 existing + 2) |
| `cd packages/components && nub run test:behaviour tabs` | before: the new case fails; after: 44 passed, 43 if the plan-540 `onBlur` case still fails (record the real number) |
| `cd packages/components && nub run test:behaviour accordion` | after: 26 passed |
| `cd packages/components && nub run test:behaviour collapsible` | after: 17 passed |
| `cd packages/components && nub run test:behaviour pagination breadcrumb alert toast dialog confirm-dialog chat notification-centre` | unchanged — every consumer of the shared button keeps its behaviour |
| `nub run check` | exit 0, including the inventory doc-count check |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

The full native suite is the end-of-task check for this cross-cutting change:
record passed/failed/total and compare the failing files with the 28 recorded
plan-540 classes. A new failing file is a regression.

## 6. STOP conditions

Stop and report with evidence if any of these happen:

- `getFocusedElementId()` reports no host after `focusElement` (nothing to
  compare against) — do not fake the ring; report the binding.
- A host id changes on every render, so the comparison never holds — the sample
  approach is wrong for that part; report it rather than moving the ring to a
  wrapper.
- The new sample makes an existing `autoFocus` ring case flake (the seed must
  paint before the first tick) — fix the fallback, not the test.
- A consumer suite (Pagination, Breadcrumb, Alert, Toast, Dialog, Chat,
  Notification Centre) changes behaviour — the shared button is the contract.
- The five new cases cannot be made to fail at `HEAD` (a test that cannot fail is
  not a test).

## 7. Acceptance

- A `Button`, `IconButton`, tab, accordion header or collapsible trigger reached
  by `Tab`, a programmatic focus move or a pointer press paints the token ring;
  the ring clears when native focus leaves, and a disabled part never paints it.
- Both-direction proof recorded (§3), with the real numbers.
- Docs, `COMPONENTS.md`, `API` notes, `TODO.md`, the plan index and `PLAN.md`
  D30 are synced; every stated count is the suite's real count.
- `nub run check`, `nub run lint` and `nub run test` exit `0`.
- The change is committed on `agent/components` and pushed (never to `master`).

## 8. Result (filled when done)

Done 2026-10-20.

- **The fix.** `useFocusState(autoFocus, disabled, hostId?)` samples the
  renderer's focused host (50 ms, `internal/native-focus.ts`) when a part passes
  its host id; the `autoFocus` seed and React's flag stand only until the sample
  names a host, and the sample is the truth after that. `Button`, `IconButton`,
  `TabsTrigger`, `AccordionTrigger` and `CollapsibleTrigger` pass their host id
  (`CollapsibleTrigger` gained one state field, because it previously kept the
  instance only in a ref).
- **Both directions.** With the five sources reverted (`git stash push`), the
  four new native-focus cases fail and the disabled pin passes; with the fix all
  five pass. Dropping the sample from `shown` fails the four cases; dropping
  `&& !disabled` fails the pin.
- **Counts.** Button 15 → 17, Tabs 43 → 44, Accordion 25 → 26, Collapsible
  16 → 17. Two previously red cases now pass for the same reason:
  `accordion > returns focus to the header when a close starts inside its body`
  and `collapsible > returns focus to the trigger when a close starts inside the
  body` — both assert the ring after focus is restored to the trigger and were
  in the recorded plan-540 class. The full native suite is **938 passed / 26
  failed of 964** (the same 26 plan-540 binding classes; no new failing file,
  and the two close-focus cases left the list).
- **Gates.** `nub run check`, `nub run lint` and `nub run test` exit `0`.
- **Left for a follow-up plan (recorded in `TODO.md`).** The ad-hoc ring owners
  that do not go through `useFocusState` still assert a ring under
  `focusElement` and stay red: `Carousel` (group and dots), `ColorPicker`
  (swatch), `HotkeyRecorder` (clear), `TagInput` (chip removal),
  `MentionInput` (row) and `TimePicker` (clear). They need the same sample with
  their own host ids.
