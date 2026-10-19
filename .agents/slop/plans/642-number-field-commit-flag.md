# 642 — a draft typed after Enter is not committed on blur

**Phase:** F (interaction truth)
**Owner:** primitives workstream (`packages/primitives`, `NumberField`)
**Depends on:** 054 (the field), 339 (Enter commits), 362 (the disabled blur
guard), 591 (the tracked-blur commit)

## 0. The defect

`NumberField` commits its draft from two paths on a runtime that dispatches no
`onBlur` (plan `583`):

- the host's own `onBlur` / `onSubmit` call `handlers.onCommit()`, which sets
  `blurHandledByEvent.current = true` and commits;
- the native-focus tracker's loss calls `commitsOnTrackedBlur`, which reads
  `handledByEvent` and **skips** the tracked commit so one loss is not committed
  twice.

That de-duplication flag is written by **every** commit, including Enter. It is
only cleared when focus is next *gained*:

```tsx
onBlur={() => {
  focus.onBlur();
  if (!disabled) handlers.onCommit();
  …
}}
onSubmit={() => { handlers.onCommit(); … }}
…
onCommit: () => {
  blurHandledByEvent.current = true; // ← also set by Enter
  commitDraft();
},
```

So this sequence loses the second commit on the pinned release build:

1. type `1.5`, press Enter → the draft commits and paints `1.50`; the flag is
   now `true`;
2. type any further draft (`x`, or a valid `2.5`);
3. leave the field → the tracker sees the loss but `handledByEvent` is still
   `true`, so no tracked commit runs.

The draft is never reformatted or discarded: an invalid trailing edit
(`1.50x`) stays painted on a field that no longer has focus, and a valid one
(`2.5`) keeps its unformatted text instead of `2.50`. The page's contract is
"on blur or `Enter` the draft is reformatted to `precision`"
(`packages/primitives/docs/number-field.mdx` lines 66 and 106).

## 1. The fix

`onSubmit` and `onBlur` are different events; only the host **blur** is the
duplicate the tracker must defer to. Give the renderer two handlers instead of
one:

### 1.1 `packages/primitives/src/components/NumberField.tsx`

- `NumberFieldHandlers`: replace `onCommit: () => void` with

  ```ts
  /** Enter: commit the draft (the host reports Enter as `submit`). */
  readonly onCommit: () => void;
  /** The host's own blur: commit, and tell the tracker this loss is handled. */
  readonly onBlurCommit: () => void;
  ```

- In `renderNumberField`, the host `onBlur` calls `handlers.onBlurCommit()`
  (still only when `!disabled`); `onSubmit` keeps `handlers.onCommit()`.
- In `NumberField`, implement:

  ```ts
  onCommit: () => commitDraft(),
  onBlurCommit: () => {
    blurHandledByEvent.current = true;
    commitDraft();
  },
  ```

- Leave `focus.onBlur()`, the `wasFocused` effect and `commitsOnTrackedBlur`
  unchanged: the tracker still clears a stale seed and still commits a loss the
  host did not report. Enter no longer sets the flag.

No other file changes are required. The pure rule (`commitsOnTrackedBlur`) is
already correct; the bug is which path owns the flag.

## 2. Test plan — a case that fails before the fix

### 2.1 `packages/primitives/runtime/number-field.runtime.test.tsx`

Add one case beside the existing Enter and tracked-blur cases. Header comment
must state the bug being guarded (plan `642`).

```tsx
it("commits a draft typed after Enter when focus leaves", async () => {
  // The bug guarded (plan 642): Enter set the host-blur de-duplication flag,
  // so a draft typed in the same focus session skipped its tracked commit on
  // blur — an invalid trailing edit stayed painted on an unfocused field.
  const runtime = await mount(
    <Stack direction="row">
      <NumberField testId="nf" label="Amount" autoFocus precision={2} />
      <Button testId="after">After</Button>
    </Stack>,
  );
  const input = inputOf(runtime, "nf");
  runtime.type("1 . 5");
  runtime.renderer.nativeSimulateKeyDown(input.id, "enter");
  runtime.renderer.nativeSimulateKeyUp(input.id, "enter");
  runtime.flush();
  expect(runtime.paintedText()).toContain("1.50");
  runtime.type("x");
  expect(runtime.paintedText()).toContain("1.50x"); // the draft is painted
  runtime.focusNext();
  runtime.flush();
  await settleFocus();
  expect(runtime.paintedText()).toContain("1.50"); // the invalid draft is gone
  expect(runtime.paintedText()).not.toContain("1.50x");
});
```

Why it can fail: without the fix the last two assertions fail, because the
tracked commit is suppressed and the draft `1.50x` remains. The first
assertions prove the Enter commit itself still works.

A second valid-draft case is optional; keep one case, because it proves both
halves (Enter commits; a later blur commits too) without a second mount.

### 2.2 Both directions

| Direction | Change | Expectation |
| --------- | ------ | ----------- |
| old code | no source change, new case only | case fails with `1.50x` still painted |
| fixed code | the two-handler split | case passes |
| host-event path | `onBlur` still calls `onBlurCommit` | existing tracked-blur cases pass; no double report |
| Enter only | `onCommit` no longer sets the flag | the existing Enter case passes |

Run the new case scoped before and after, then the whole file.

## 3. Commands

```sh
cd packages/primitives
nub exec vitest run runtime/number-field.runtime.test.tsx
nub run test
nub run check-types
cd ../..
nub run check
nub run lint
nub run test
```

`runtime/number-field.runtime.test.tsx` needs the native binding from the store
(plan `140`/ADR 0003). If it reports "missing"/"unsupported-host", stop and
report; do not swap in a DOM test.

## 4. STOP conditions

Stop if:

- the new case fails **before** the source fix for a different reason than the
  expected `1.50x` (record the actual message and re-plan);
- the fix requires changing `core/number.ts`'s `commitsOnTrackedBlur` — it does
  not; the bug is the renderer's flag ownership;
- an existing test expects the host `onSubmit` and host `onBlur` to share one
  handler; they are distinct events, and a failure there means the split was
  wired to the wrong host prop;
- a runtime is unavailable on this host.

## 5. Acceptance and result

- [ ] plan indexed in `.agents/slop/plans/README.md`;
- [ ] one new runtime case fails on the old code with the painted `1.50x`;
- [ ] the case passes with the two-handler split, and the file is green;
- [ ] `TODO.md` row added and ticked; `COMPONENTS.md` NumberField row records
      the fix and plan number;
- [ ] package offline suite and `check`/`lint`/`test` green;
- [ ] commit pushed to `origin/agent/primitives`.

### Result

Measured 2026-10-19 in this worktree.

- **Before the fix:** `runtime/number-field.runtime.test.tsx` ran 25 cases with
  the new one failing:
  `AssertionError: expected [ '1.50x', 'After' ] to not include '1.50x'` —
  the tracked commit was suppressed and the invalid draft stayed painted.
- **Mutation after the fix:** re-setting `blurHandledByEvent` in `onCommit`
  reproduced exactly that failure with `-t "after Enter"` (1 failed, 24
  skipped); restoring `onCommit` made the same case pass.
- **After the fix:** the file is **25/25**; the package offline suite is
  **60 files / 856 tests**; `nub run check`, `nub run lint` and root
  `nub run test` pass (primitives 856, icons 27, components 308, tw 103,
  playground 20).
- The host-event path is untouched except for the new handler name: existing
  tracked-blur, disabled-blur and Enter cases all pass.
