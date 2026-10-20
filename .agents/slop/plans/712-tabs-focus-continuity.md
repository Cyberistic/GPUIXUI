# 712 — Tabs: the focus holder is sampled while it exists, so a removed tab keeps the user's focus

**Owner:** components workstream · **Phase:** F (focus continuity) ·
**Depends on:** 110, 113, 117, 200, 201, 321, 367, 388, 510, 511, 540, 564,
566, 620, 646, 708

**Numbering:** `709`–`711` are claimed by the tokens-theme worktree
(`709-primary-text-cell-washes`, `710-row-press-rejected-fill`,
`711-composition-matrix-budget`); `712` is the first number free across every
worktree on 2026-10-20. Recorded in `PLAN.md` D30.

## 1. What is measured today

The plan-708 follow-up, recorded in `TODO.md`. From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/tabs.test.tsx --disableConsoleIntercept --reporter=verbose
# × hands focus to the selected tab when the focused tab is removed
#   expected Some("tab-c"), received None
```

`focusTab(tabs, "tab-b")` uses `renderer.focusElement` — the same shape as a
`Tab` entry, which runs no React `onFocus` — and the tab is then removed from the
data. The tab stop moves to the selected tab, but the user's focus is gone.

The cause is the one plan 708 measured for `List`: the handover reads
`renderer.getFocusedElementId()` **after** the commit, by which point the removed
host is gone and the renderer reports `null`; the fallback is
`focusedTab.current`, which is only written by React `onFocus`/`focusRow` and so
was never set by a programmatic focus move.

## 2. The decision

Mirror plan 708: **remember the focused tab while its host still exists**, using
the existing `useNativeFocusId` sampler (50 ms; plans 613/659/660/672). The live
read still wins while the host is there, so the disabled-tab handover (plans
511/646) is unchanged and needs no sample.

- `focusedTab` becomes `heldTab`, written by `focusRow`/`noteFocus` as today and
  by a recorder that maps the sampled id to a tab value;
- the recorder is declared **after** the handover effect, so the handover reads
  the value from before this commit;
- a removed or disabled tab hands focus to the tab stop without selecting
  (unchanged rule), and a consumer's own focus in the same update still wins.

No selection is rewritten, no ARIA is added. Tabs has no slot controls, so there
is no member registry to add — this plan is the smaller half of 708.

## 3. Exact changes

### 3.1 `packages/components/src/tabs.tsx`

1. Import the sampler:
   ```ts
   import { useNativeFocusId } from "./internal/native-focus.js";
   ```
2. Replace the `focusedTab` ref's comment and name it `heldTab` (it now holds a
   value, not a native id):
   ```ts
   /**
    * The tab that held focus when it was last observable. A native focus change
    * runs no React `onFocus` and a removed host can no longer be read, so the
    * holder is remembered while the element still exists (plan 712).
    */
   const heldTab = useRef<Option.Option<string>>(Option.none());
   const nativeFocus = useNativeFocusId(rows.length > 0);
   ```
3. One resolver, used by the handover and the recorder:
   ```ts
   const heldOf = useCallback(
     (id: number | null): Option.Option<string> =>
       id === null
         ? Option.none()
         : Option.map(
             Arr.findFirst(rows, (row) => row.id === id),
             (row) => row.value,
           ),
     [rows],
   );
   ```
4. `focusRow` and `noteFocus` write `heldTab.current = Option.some(row.value)`.
5. Rewrite the handover effect body (keeping its comment's rule) and add the
   recorder **after** it:
   ```ts
   useLayoutEffect(() => {
     const live = Option.fromNullishOr(renderer?.getFocusedElementId?.() ?? null);
     const liveTab = Option.flatMap(live, heldOf);
     const holder = Option.orElse(liveTab, () => heldTab.current);
     const target = Option.flatMap(holder, (value) =>
       Arr.findFirst(rows, (row) => row.value === value),
     );
     const lost = Option.exists(holder, (value) =>
       Option.match(target, {
         onNone: () => true,
         onSome: (row) => row.disabled,
       }),
     );
     const claimed = Option.isSome(live) && Option.isNone(liveTab);
     if (lost && !claimed) {
       Option.match(tabbable, {
         onNone: () => undefined,
         onSome: (value) =>
           Option.match(Arr.findFirst(rows, (row) => row.value === value), {
             onNone: () => undefined,
             onSome: (row) => focusRow(row, false),
           }),
       });
     }
   }, [focusRow, heldOf, renderer, rows, tabbable]);

   useLayoutEffect(() => {
     heldTab.current = Option.orElse(
       Option.flatMap(Option.fromNullishOr(renderer?.getFocusedElementId?.() ?? null), heldOf),
       () => heldOf(nativeFocus),
     );
   }, [heldOf, nativeFocus, renderer]);
   ```
   The live read wins over the sample, exactly as in plan 708, so a stale sample
   cannot overwrite the tab the handover just focused.

### 3.2 `packages/components/src/behaviour/tabs.test.tsx`

- The existing case "hands focus to the selected tab when the focused tab is
  removed" becomes `async`, waits `FOCUS_SAMPLE_MS + 30` after `focusTab`, and
  keeps its assertions unchanged. Add the same short helper the List suite uses:
  ```ts
  /** Wait for the 50 ms focus sample to observe a native focus move (plan 708). */
  const sampleFocus = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, FOCUS_SAMPLE_MS + 30));
  ```
- Two new pins:
  1. **keeps focus on a surviving tab when another tab is removed** — focus
     `tab-a`, remove `b`, expect `Some("tab-a")` and the selection unchanged.
  2. **leaves a consumer's focus alone when the focused tab is removed** — reuse
     the suite's `claimingTabs` fixture: focus `tab-b`, rerender with `b` removed
     and the claim active, expect `Some("claim")`.
- The blocker's "runs a caller onBlur when focus leaves a trigger" stays red: it
  is the missing native blur signal (plan 540), not a handover.

### 3.3 Docs, inventory and counts

- `packages/components/docs/tabs.mdx`: the dynamic-tab bullet now says the
  holder is sampled, so a removed tab hands **focus** (not only the tab stop) to
  the selected tab; update the Verification count (`31 tests` → `33 tests`).
- `COMPONENTS.md`, Tabs row: `31 native behaviour tests` → `33`, and drop "the
  removed-host ... case" from the plan-540 list (only the `onBlur` case remains).
- `TODO.md`: tick the follow-up row added by plan 708 and record the flipped case.
- `.agents/slop/plans/README.md`: index this plan.
- `PLAN.md` D30: record `712`.

## 4. Test plan

- **Can the test fail?** The flipped case fails at `HEAD` (measured). Removing the
  recorder fails it again; removing the `claimed` guard fails the claim pin;
  dropping the live-wins clause makes the disabled-tab handover use a stale
  sample (plan 511's cases pin that).
- **Both-direction proof:** (a) delete the recorder → the flipped case fails;
  (b) revert `heldTab` to `focusedTab`'s id and the old effect → the flipped case
  fails; (c) drop the claim guard → the claim pin fails.
- **No regression:** the other 30 cases stay green, including disabled-tab
  handover (511/646), registry position (564/620), orphan panel (566), arrow
  origin (367) and vertical orientation (321).
- **Sampling bound:** a removal inside one 50 ms window still drops focus; that
  is the recorded limitation plans 613/659/708 carry.

## 5. Commands and expected results

From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/tabs.test.tsx --disableConsoleIntercept --reporter=verbose
# before: 1 failed | 30 passed (31)
# after: 33 passed (33)

nub run check-types
nub run test        # unit suite, no native binding needed
```

From the repo root:

```sh
nub run check
nub run lint
nub run --filter @gpuixui/components test:behaviour
# measured after plan 708: 872 passed / 29 failed of 901; this plan adds 2
# cases and flips one, so expect 875 passed / 28 failed of 903 — read the
# totals from the run.
```

## 6. STOP conditions

- The handover cannot read the sample before the removal (the recorder runs
  first): stop and re-check declaration order; do not add a second timer.
- The claim pin cannot be written without changing `claimingTabs`: stop and
  report; do not weaken the existing claim case.
- A disabled tab stops handing focus over: stop — the live read must win.
- Any other Tabs case changes result: stop and report which.

## 7. Acceptance

- Removing the focused tab hands focus to the tab stop (the selected tab) without
  changing the selection.
- A consumer's focus in the same update is never stolen; another tab's removal
  does not move focus.
- The recorded removed-host case flips to green, Tabs is 33/33 on this host, and
  docs, `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 agree.
