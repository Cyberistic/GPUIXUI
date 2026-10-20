# 708 — List: the focus holder is sampled while it exists, so a removed row keeps the user's focus

**Owner:** components workstream · **Phase:** F (focus continuity) ·
**Depends on:** 110, 111, 117, 128, 130, 200, 201, 326, 339, 510, 540, 577,
578, 620, 647

**Numbering:** `707` is claimed by the playground worktree
(`707-word-wash-pixels.md`); `708` is the first number free across every
worktree on 2026-10-20. Recorded in `PLAN.md` D30.

## 1. What is measured today

From `packages/components` on this host:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/list.test.tsx --disableConsoleIntercept --reporter=verbose
# 2 failed | 59 passed (61)
# × hands focus to the tab stop when the focused row is removed
# × falls back to the surviving selection when the focused row is removed
```

Both cases focus a row with `renderer.focusElement(...)` (a `Tab` entry or a
programmatic move — neither runs React's `onFocus`), remove that row, and find
`focused = None` while the tab stop moved to `row-a`. They have been carried as
"plan-540 focus-signal failures"; they are not only that.

A temporary probe (`src/behaviour/scratch-list-control-removal.test.tsx`,
deleted by this plan) measured the sibling case — a `Button` in a row's
`trailing` slot:

```text
before removal  Some("trail-b")
after removal   None
after removing a different row  Some("trail-a")
```

So the third hole: a row that is removed while a control **inside it** holds
focus drops the user's focus entirely, although the list could hand it to the
row that now owns the tab stop. `COMPONENTS.md` and `docs/list.mdx` currently
record this as "a focusable control in a row's trailing slot is not tracked when
the row disappears".

A second probe (`scratch-unmount-focus.test.tsx`, also deleted) measured the
timing that makes all three cases fail:

```text
focused before: Some("inner")
cleanup focused: null
second cleanup focused: null
focused after: None
```

During an unmount cleanup `renderer.getFocusedElementId()` is already `null`,
and by the time the list's layout effect runs the removed host is gone. The
current handover reads the renderer **at effect time** and falls back to
`focusedRow.current`, which is only written by React `onFocus`/`focusRow` — and
`focusElement` never runs `onFocus` (plans 536/540/578). A vanished host is
therefore invisible on this binding.

## 2. The decision

**Remember which row held focus, sampled while the host still exists, so the
handover does not need to read a host that is already gone.** The binding
delivers no React `focus`/`blur` for a native move (plans 536/540), so the
existing `useNativeFocusId` sampler (50 ms, plans 613/659/660/672) is the
established way to observe it. One recorded value, read on the next rows change:

```ts
type FocusHolder = {
  readonly value: string;   // the row's value
  readonly viaRow: boolean; // the row's own host, not a control inside it
};
```

The rule for the next commit:

- the row still exists and is enabled → nothing to do;
- the row was the **host** and is gone or disabled → hand focus to the tab stop
  (this fixes the two red cases and keeps plan 510/647's disabled handover);
- the row is gone but focus was on a **control inside it** → hand focus to the
  tab stop (new);
- the row is disabled but focus was on a control inside it → **leave focus**:
  a row's `disabled` does not disable the consumer's `trailing` control, which
  still owns its keys (plan 577), so stealing focus would be wrong;
- the consumer focused another control in the same update → leave it alone.

The live read still wins when focus is still on a row (the disabled case needs no
sample at all); the record is the fallback for the removal, where the live read
is already `null`.

To know that "focus was inside row X", the row reports the native ids of its
focusable slot controls to the list. The report rides the existing **hover
group** (`internal/hover-group.ts`, plan 606): a `Button`/`IconButton` in a row
already joins it, and it is the only registry a row has for its slot content. A
custom interactive child stays unregistered, exactly as the hover tint does — a
recorded limitation, not a new one.

## 3. Exact changes

### 3.1 `packages/components/src/internal/hover-group.ts`

Add one member to the group and one argument to the hook:

```ts
export interface HoverGroup {
  readonly enter: () => void;
  readonly leave: () => void;
  /** Register a focusable member's host id; returns its unregister. */
  readonly register: (id: number) => () => void;
}

export const useHoverGroupMember = (
  instance: number | undefined,
  onMouseEnter?: (event: EventPayload) => void,
  onMouseLeave?: (event: EventPayload) => void,
): HoverGroupHandlers => {
```

and, beside the existing unmount cleanup:

```ts
useLayoutEffect(() => {
  if (group === null || instance === undefined) return;
  return group.register(instance);
}, [group, instance]);
```

Outside a group the hook stays inert and still passes the caller's handlers
through. Update the module comment: the group is "a surface whose interactive
descendants report their own pointer crossings and register their hosts".

### 3.2 `packages/components/src/internal/button.tsx`

Both `Button` and `IconButton`:

1. destructure the caller's `ref` out of the props (it is part of `Props`);
2. hold the host instance in state via a stable ref callback, merged with the
   caller's ref by `useMergedRef` (plans 128/696 — the caller's ref must still
   reach the host):
   ```ts
   const [instance, setInstance] = useState<PublicInstance | undefined>(undefined);
   const attach = useCallback((next: PublicInstance | null) => {
     setInstance(next ?? undefined);
   }, []);
   const setElement = useMergedRef<PublicInstance | null>(attach, ref);
   ```
3. pass `instance?.id` as the hook's first argument;
4. put `ref={setElement}` on the host `div`.

No visual or activation change.

### 3.3 `packages/components/src/list.tsx`

1. Add the row's focus-holder type near `Row`:
   ```ts
   interface FocusHolder {
     readonly value: string;
     readonly viaRow: boolean;
   }
   ```
2. The root keeps the member registry (a ref, not state — nothing renders it):
   ```ts
   const members = useRef(new Map<string, ReadonlyArray<number>>());
   const noteMembers = useCallback((value: string, ids: ReadonlyArray<number>) => {
     if (ids.length === 0) members.current.delete(value);
     else members.current.set(value, ids);
   }, []);
   ```
   `register`'s cleanup deletes the row's entry; add `noteMembers` to
   `ListContextValue`, `ListActions`, `handlers` and `actions` (the existing
   stable-context pattern).
3. Replace `focusedRow` (a `number` nativeId written by `focusRow`/`noteFocus`)
   with `heldFocus`:
   ```ts
   const heldFocus = useRef<Option.Option<FocusHolder>>(Option.none());
   ```
   `focusRow` writes `{ value: row.value, viaRow: true }`; `noteFocus` the same.
4. Add the resolver and the sampler (the latter is the existing
   `internal/native-focus.ts` helper, enabled while the list has rows):
   ```ts
   const focusHolderOf = useCallback(
     (id: number | null): Option.Option<FocusHolder> => /* rows, then slot members */,
     [rows],
   );
   const nativeFocus = useNativeFocusId(rows.length > 0);
   ```
5. Rewrite the handover effect (replacing the body at the `plans 510/647`
   comment) and add the recorder **after** it:
   ```ts
   useLayoutEffect(() => {
     const live = Option.fromNullishOr(renderer?.getFocusedElementId?.() ?? null);
     const holder = Option.orElse(Option.flatMap(live, focusHolderOf), () => heldFocus.current);
     const target = /* the row with holder.value in `rows` */;
     const lost = /* holder is Some and (target is None, or holder.viaRow and target.disabled) */;
     const claimed = Option.isSome(live) && Option.isNone(Option.flatMap(live, focusHolderOf));
     if (lost && !claimed) /* focus the tab stop row */;
   }, [focusHolderOf, focusRow, renderer, rows, tabbable]);

   useLayoutEffect(() => {
     heldFocus.current = focusHolderOf(nativeFocus);
   }, [focusHolderOf, nativeFocus]);
   ```
   The recorder is declared second so the handover reads the value from before
   this commit. The live read wins while the host still exists, so a disabled row
   needs no sample; the sample covers the removal.
6. `Row` and `upsert` are unchanged: members live in the root's map, keyed by the
   row value, so registration order and the per-row paint mask are untouched.
7. `listMeta.limitations`: replace the "focus tracking follows the rows the list
   focused…" entry with the surviving limitation:
   `"a focusable control in a leading/trailing slot keeps focus when its row is removed only if it is a Button/IconButton (the hover-group members); a custom interactive child is not tracked"`.

### 3.4 `packages/components/src/behaviour/list.test.tsx`

Add a `FocusHolderRows` fixture beside the existing dynamic-row fixtures:

```tsx
const trailingRows = (values: ReadonlyArray<string>, disabled: ReadonlyArray<string> = []) => (
  <List testId="list" selectionMode="single">
    {Arr.map(values, (value) => (
      <ListItem
        key={value}
        testId={`row-${value}`}
        value={value}
        disabled={Arr.contains(value)(disabled)}
        trailing={<Button size="sm" testId={`trail-${value}`}>Open</Button>}
      >
        <ListItemTitle>{value.toUpperCase()}</ListItemTitle>
      </ListItem>
    ))}
  </List>
);
```

Four cases (header comment names the bug):

1. **hands focus to the tab stop when a row with a focused trailing control is
   removed** — focus `trail-b`, rerender `["a", "c"]`; expect
   `focused = Some("row-a")` and `row-a` ringed. **Fails at HEAD (`None`).**
2. **keeps a control's focus when its row only turns disabled** — focus
   `trail-b`, rerender with `b` disabled; expect `focused = Some("trail-b")`.
   (Pins the `viaRow` distinction; the row keeps its tab-stop handover, which
   the existing disabled case already covers.)
3. **keeps a trailing control's focus when another row is removed** — focus
   `trail-a`, rerender `["a", "c"]`; expect `Some("trail-a")`.
4. **leaves a consumer's focus alone when the removed row held none** — focus
   `claim`, rerender removing `b` while an outside `Button testId="claim"`
   receives `autoFocus`; expect `Some("claim")` and the tab stop on `row-a`.

The two red cases from §1 must flip to green with no assertion change.

### 3.5 Docs, inventory and counts

- `packages/components/docs/list.mdx`, `## Dynamic rows`:
  replace the third bullet ("a row **removed in the same update** has no host
  left to report…") and the closing paragraph ("A focusable control placed in a
  row's `trailing` slot … is not tracked") with the shipped rule: the focus
  holder is recorded at every commit, so removing the focused row **or a
  `Button`/`IconButton` inside it** hands focus to the tab stop; a row that only
  turns disabled leaves focus on a control inside it, because that control is
  still enabled and owns its keys; a custom interactive child is not tracked.
  Update the Verification count `(61 tests)` → `(65 tests)` and the sentence that
  lists what is proven.
- `COMPONENTS.md`, Lists row: the same rule replaces "A focusable control in a
  row's `trailing` slot is not tracked when the row disappears"; the count
  becomes `65 native behaviour tests, all passing on this host` (the two
  removed-host cases are no longer plan-540 failures).
- `TODO.md`: tick one Tier 2 hardening entry naming the two flipped cases and the
  three new ones; add a pending follow-up row for **Tabs'** removed-host case
  (the same recording rule, its own plan) with the List measurement as evidence.
- `.agents/slop/plans/README.md`: index this plan.
- `PLAN.md` D30: record `708`.
- `docs/performance.md` / plan 339: no change — no row state or subscription is
  added.

## 4. Test plan

- **Can the tests fail?** Case 1 fails at `HEAD` with `focused = None`
  (measured), and so do the two recorded removed-row cases. Cases 2–4 are pins
  for the new branch rules and were proven by mutation: dropping the member
  branch fails case 1 only; dropping the recorder fails the two removed-row cases
  and case 1; dropping `viaRow` from the disabled rule fails case 2 only.
- **Sampling:** the three removal cases wait `FOCUS_SAMPLE_MS + 30` after the
  native focus move, because the holder is read on the 50 ms sampler — the same
  measured limitation plans 613/659 carry. A removal inside one sample window is
  still a lost focus; that is the bound and it is documented.
- **Both-direction proof:** run the three mutations above and record the exact
  failing case names.
- **No regression:** the other 59 cases in the file stay green, especially the
  disabled-row handover, "never steals focus a consumer claimed", the emptied
  list, the registry-position case, type-ahead, activation and the paint-count
  contract (`repaints only the rows whose state changed` — the member map is a
  ref, so no row state was added).
- **Button:** `src/behaviour/button.test.tsx` stays green; the ref composition is
  proven by the member case reaching the host by id.

## 5. Commands and expected results

From `packages/components`:

```sh
# baseline, before any change
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/list.test.tsx --disableConsoleIntercept --reporter=verbose
# 2 failed | 59 passed (61) — the two removed-host cases

# after the change
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/list.test.tsx --disableConsoleIntercept --reporter=verbose
# 65 passed (65)

nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/button.test.tsx --disableConsoleIntercept
# 15 passed

nub run check-types
nub run check        # docs verification count (65), inventory rows, API tables
nub run lint
nub run test         # unit suite, no native binding needed
```

Then the end-of-task native run:

```sh
nub run --filter @gpuixui/components test:behaviour
# measured after this change: 872 passed / 29 failed of 901 — the two List
# removed-host cases flipped to green, four cases added, and the remaining
# failures are the recorded plan-540 binding defects (position, focus/blur, the
# command-menu scroll) plus Tabs' removed-host case (§3.5).
```

Read the totals from the run, never copy them. Record the two flipped cases and
the new ones in `TODO.md` with the measured numbers.

## 6. STOP conditions

- A tooltip/`aria` claim needs a host feature 0.10.0 lacks: stop and report; this
  plan adds no ARIA.
- `focusHolder` cannot see a member's host id at commit time (the registry is
  empty): stop and record what `getFocusedElementId()` returned; do not add a
  timer-based sampler.
- Handing focus to the tab stop removes focus from a control that is still
  enabled (case 2): stop; the `viaRow` rule is wrong, do not weaken the test.
- The paint-count contract changes (a focus move repaints more than the two
  affected rows): stop; the member map must stay a ref, never state.
- A caller's `ref` on `Button`/`IconButton` stops reaching the host: stop; the
  composition must use `useMergedRef`.
- An existing List case other than the two named fails: stop and report which.

## 7. Acceptance

- Removing the row that holds focus — by its own host or by a
  `Button`/`IconButton` in its `leading`/`trailing` slot — hands focus to the row
  that now owns the tab stop.
- A row that only turns disabled still hands the stop over, but leaves focus on
  a control inside it that is still enabled.
- A consumer's focus in the same update is never stolen.
- The two recorded removed-host failures flip to green; List is 65/65 on this
  host; docs, `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 agree
  with the code and the count.
