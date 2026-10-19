# 693 — A keyboard clear must not swallow the recorder's next click

**Owner:** components workstream · **Phase:** F (interaction consistency) ·
**Depends on:** 110, 200, 316, 332, 334, 514, 522, 680

**Numbering:** `692` is the tokens workstream's `platform-variant-owner` plan and
`690`/`691` are claimed (see D30), so `693` is the first free number across the
worktrees. Recorded in `PLAN.md` D30.

## 1. What is measured today

`HotkeyRecorder` has two ways to clear a binding, and both call the same
`clear()`:

```tsx
const clear = (): void => {
  skipStart.current = true;
  onChange(null);
};
```

`skipStart` exists because a press on the clear control's own click **bubbles to
the recorder root**, whose `onClick` would otherwise start a recording in the
same gesture. The root consumes it once:

```tsx
onClick={(event) => {
  onClick?.(event);
  if (skipStart.current) {
    skipStart.current = false;
    return;
  }
  ...
}}
```

The keyboard path reaches `clear()` through `activationHandlers`, which claims
the key event before it bubbles (`claimEvent`), so the root's `onKeyUp` already
ignores it. The keyboard path nevertheless sets `skipStart.current = true`, and
**nothing consumes it**, because a keyboard clear produces no click.

Measured on this host in the real `TestRenderer` (scratch suite, deleted before
this plan was written):

| Step | Observed text |
| ---- | ------------- |
| bound recorder (`ctrl+k`) | `Ctrl`, `K` |
| `nativeSimulateKeyDown/Up("space")` on `recorder-clear` | `Click to record` (clear works) |
| `clickCentreOf("recorder")` | **`Click to record`** |

The third step should read `Press keys…`. `skipStart` was still `true`, so the
first click on the recorder after a keyboard clear was discarded; the user needs
two clicks. The same flag also survives a keyboard clear performed with `Enter`
(the clear control uses `activationHandlers`, which handles Enter and Space).

The docs and `COMPONENTS.md` promise "a keyboard-cleared value never starts a
recording", and the existing keyboard-clear test asserts only that the key-up
does not enter recording. It never clicks afterwards, so the stale flag is
untested.

## 2. The decision

The skip flag describes **one pointer gesture**, not "a clear happened":

- a pointer clear sets it, because its click bubbles to the root;
- a keyboard clear does not, because its event is claimed before the root reads
  it and there is no click to consume.

`clear` takes the flag explicitly (`clear(skipStart: boolean)`), and each call
site states which gesture it is wiring. This keeps the guard local to the one
component and removes the hidden coupling between a keyboard event and a later
pointer event.

No public API changes. No timer, no focus sample, no new state.

## 3. Exact changes

### 3.1 `packages/components/src/hotkey-recorder.tsx`

Replace `clear` with an explicit skip argument:

```tsx
/**
 * Drop the binding. `skip` marks the clear control's own click, which bubbles
 * to the root and must not start a recording; a keyboard clear claims its key
 * instead, so it leaves the flag alone (plan 693).
 */
const clear = (skip: boolean): void => {
  skipStart.current = skip;
  onChange(null);
};
```

Update the two call sites:

```tsx
// pointer: the click bubbles to the root after this handler
onClick={() => clear(true)}

// keyboard: activationHandlers already claims the key
{...activationHandlers((event) => {
  claimEvent(event);
  clear(false);
})}
```

`skipStart.current = skip` (rather than only assigning on `true`) also makes the
flag explicit on the keyboard path: any stale value from an un-consumed pointer
gesture is cleared.

### 3.2 `packages/components/src/behaviour/hotkey-recorder.test.tsx`

Add one case after "clears from the keyboard without starting a recording":

```tsx
it("starts recording on the next click after a keyboard clear", () => {
  // The clear control's key-up claims the event, so it must not leave the
  // pointer guard armed: the next click is a new gesture (plan 693).
  const onChange = vi.fn();
  const recorder = renderComponent(
    <Harness initial="ctrl+k" onChange={onChange} />,
  );
  const clear = recorder.renderer.findByTestId("recorder-clear");
  expect(clear).toBeDefined();
  if (clear === undefined) return;

  recorder.renderer.nativeSimulateKeyDown(clear.id, "space");
  recorder.renderer.nativeSimulateKeyUp(clear.id, "space");
  expect(onChange).toHaveBeenCalledWith(null);
  expect(recorder.renderer.getAllText()).toContain("Click to record");

  clickCentreOf(recorder, "recorder");
  expect(recorder.renderer.getAllText()).toContain("Press keys…");

  recorder.unmount();
});
```

Extend the existing pointer case ("clears through the clear control without
starting a recording") with the same closing assertion, so the contrast is
pinned: a pointer clear still swallows **its own** click, then the next click
starts recording.

```tsx
clickCentreOf(recorder, "recorder");
expect(recorder.renderer.getAllText()).toContain("Press keys…");
```

*At `HEAD` the new keyboard case fails on the final assertion (the text stays
`Click to record`); the extended pointer case passes before and after, so the
fix cannot pass by deleting the bubble guard.*

### 3.3 `packages/components/docs/hotkey-recorder.mdx`

- Keyboard/limitations prose: a pointer clear consumes its own click, while a
  keyboard clear leaves the recorder ready — "the next click starts a
  recording".
- Verification line: `(15 tests)` → `(16 tests)`; add the next-click-after-a-
  keyboard-clear case to the prose list.

### 3.4 Inventory and records

- `COMPONENTS.md`, Hotkey-recorder input row: `15 native behaviour tests` → `16`;
  append that a keyboard clear does not arm the pointer guard (plan 693).
- `TODO.md`, Tier 2 hardening list: add a ticked entry for plan 693 with the
  measured defect, the test counts and the files synced.
- `.agents/slop/plans/README.md`: index this plan.
- `PLAN.md` D30: append `692` (tokens) and `693` to the claimed-number sentence.
- `src/inventory.ts` needs no change: `hotkeyRecorderMeta` keeps its name, docs,
  example and test file.

## 4. Test plan

- **Can the new test fail?** Yes. The scratch measurement above fails at `HEAD`
  with `[ 'Click to record' ]` after the click. The fix makes `clear(false)`
  leave the flag `false`.
- **Both-direction proof:** record the new case failing with the old `clear()`;
  apply §3.1 and re-run the file; then set the keyboard path back to
  `clear(true)` and confirm the same case fails; restore.
- **Contrast pin:** the extended pointer case proves the bubble guard still
  works — if the pointer path stops setting the flag, that case starts
  recording during the clear click.
- **No regression:** the other Hotkey recorder cases (Escape claim, Tab/outside
  cancel, captured Space, disabled) must stay green; `check-types`, `check`,
  `lint` and the unit suite must pass. The full behaviour suite has the recorded
  plan-540 binding failures; report them separately, never as green.

## 5. Commands and expected results

Run from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/hotkey-recorder.test.tsx
# before §3.1: the new case fails; after: 16/16 pass

nub run check-types
# exit 0

nub run test
# exit 0; the inventory check now expects the docs/COMPONENTS count of 16
```

From the worktree root:

```sh
nub run check
# exit 0
nub run lint
# exit 0
nub run test
# exit 0
```

Run the full behaviour suite before the merge gate if time allows; record its
count and the plan-540 failures as the other plans do.

## 6. STOP conditions

- The keyboard clear does **not** claim its key on this host (a dialog around
  the recorder closes too): stop and report; that would be a separate defect in
  `activationHandlers`, not this plan.
- `activationHandlers` cannot take the event in its callback (the current
  signature no longer matches): stop and report the type error rather than
  casting.
- The pointer clear no longer suppresses its own click (the extended pointer
  case starts recording): stop; the bubble guard must remain for the pointer
  path.
- The text after a click is still `Click to record` with the fix: stop and
  report the measured tree instead of adding a second mechanism.

## 7. Acceptance

- A keyboard clear (Space or Enter on the clear control) leaves the value
  `null`, paints `Click to record`, and the **next click** on the recorder
  paints `Press keys…`.
- A pointer clear still consumes its own bubbled click and does not start
  recording; the click after it does.
- No public prop changes; the Escape claim, `Tab`/outside cancellation, captured
  Space and disabled behaviour are unchanged.
- Docs, `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 agree with
  the code and the new count (16).
