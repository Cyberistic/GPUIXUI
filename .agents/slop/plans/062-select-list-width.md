# 062 — `Select`'s list never matches its trigger

**Owner:** primitives workstream (`packages/primitives`).
**Depends on:** 030, 041, 057 (the Select a11y contract).
**Status:** planned → execute, then update the index.

---

## 0. The bug, measured

`selectContentStyle` sets `minWidth: "100%"` with the comment "full trigger
width". In the runtime that resolves against the anchored layer, not the
trigger, so the list always hugs its labels. Measured on this host against the
locally built `@gpuix/native@0.10.0`:

| Trigger | `fullWidth` | List | Verdict |
| ------- | ----------- | ---- | ------- |
| 108 px (`"Choose a fruit"`) | no | 57 px | narrower than the field |
| 900 px (900 px column) | yes | 57 px | a full-width field opens a 57 px list |

`width: "100%"` behaves the same (still 57 px). A **numeric** `minWidth` is the
lever that works: `minWidth: 400` painted a 400 px list. So the value has to be
measured, not expressed as a percentage.

## 1. Decision

Measure the trigger's painted width once through the renderer and pass it to
`selectContentStyle` as a numeric `minWidth`.

- The measurement happens after mount and again whenever the list opens or
  `size`/`fullWidth` change, so the usual first open already has the width.
- The pure function keeps a no-measurement path (`minWidth` absent) — that is
  what the element-tree tests render, and it is the honest fallback when no
  bound is available (a component outside a real renderer).
- `Slider` already reads `renderer?.getElementBounds?.(id)` for pointer mapping,
  so this is the package's established measurement boundary, not a new one.
- The dead `minWidth: "100%"` and its false comment are deleted.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Select.tsx` | `selectContentStyle(theme, minWidth?)`; `SelectHandlers.registerTrigger`; `renderSelect` takes an optional `triggerWidth`; the component measures the trigger |
| `packages/primitives/src/components/Select.test.tsx` | `selectContentStyle(testTheme, 240)` sets `minWidth: 240`; without it, no `minWidth` |
| `packages/primitives/runtime/fields.runtime.test.tsx` | two measured tests: list ≥ hugging trigger, and a full-width trigger's list matches it |
| `packages/primitives/docs/select.mdx` | placement/width paragraph, API note, verification |
| `COMPONENTS.md` | Select row records the measured width |
| `packages/primitives/README.md` | the measured runtime count |
| `.agents/slop/plans/README.md`, `TODO.md` | index row, tick the recorded task |

## 3. Steps and exact commands

From `/Users/cyberistic/GPUIXUI/workspaces/primitives`:

1. **`Select.tsx`.**

   ```ts
   export const selectContentStyle = (
     theme: PrimitiveTheme,
     minWidth?: number,
   ): StyleDesc => ({
     ...surfaceStyle(…),
     padding: theme.spacing.xs,
     gap: theme.spacing["2xs"],
     ...(minWidth === undefined ? {} : { minWidth }),
   });
   ```

   Delete the `minWidth: "100%"` line and the "full trigger width" claim.

   `SelectHandlers` gains `readonly registerTrigger: (instance: PublicInstance | null) => void;`
   and `<SelectTrigger ref={handlers.registerTrigger}>`. `renderSelect` gains a
   sixth parameter `triggerWidth?: number` and passes
   `selectContentStyle(theme, triggerWidth)`.

   The component mirrors `Slider`'s pattern:

   ```tsx
   const { renderer } = useGpuix();
   const trigger = useRef<number | null>(null);
   const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
   useEffect(() => {
     const id = trigger.current;
     if (id === null) return;
     const bounds = renderer?.getElementBounds?.(id);
     if (bounds === null || bounds === undefined || bounds.width <= 0) return;
     setTriggerWidth(bounds.width);
   }, [renderer, open, props.size, props.fullWidth]);
   ```

   `registerTrigger` stores `instance?.id ?? null`.

2. **Element-tree test** in `Select.test.tsx`: assert
   `selectContentStyle(testTheme, 240).minWidth === 240` and that
   `selectContentStyle(testTheme).minWidth` is `undefined`.

3. **Runtime tests** in `fields.runtime.test.tsx`, near the existing Select test:

   - *`opens the Select's list at least as wide as its trigger`* — mount in a
     900 px column, a trigger with placeholder `"Choose a fruit"`; open; assert
     `list.width >= trigger.width` (within 1 px).
   - *`makes a fullWidth Select's list match the trigger`* — same tree with
     `fullWidth`; assert `Math.abs(list.width - trigger.width) <= 1`.

   Find the list as the parent of an option's option element (the SelectContent
   paints `role="option"`), or give the content a locator if one is already
   available through `testId`; do not add a public prop just for the test.

4. **Two-direction proof.** Delete the `triggerWidth` argument from the
   `selectContentStyle` call (keep everything else), re-run the runtime suite;
   both new tests must fail (expect a ~57 px list). Restore. Record the output
   in §6.

5. **Docs.** `select.mdx`: the list is at least the trigger's measured width,
   stated as a measured behaviour, plus the fallback (a Select rendered outside
   a renderer hugs its labels). Verification lists the two runtime tests.
   Refresh the Select row in `COMPONENTS.md` and the README count.

6. **Gates.**

   ```sh
   nub run check
   nub run lint
   nub run test
   nub run --filter @gpuixui/primitives test:runtime
   ```

## 4. Acceptance

- A 108 px trigger opens a list at least 108 px wide; a 900 px `fullWidth`
  trigger opens a ~900 px list — measured in the real runtime.
- No dead percentage style remains; the pure function's fallback is tested.
- Both runtime tests were shown to fail when the measurement is not passed.
- Docs, inventory and counts agree; all gates green.

## 5. STOP conditions

- `renderer.getElementBounds` is not present on the production `renderer` (it is
  optional on `NativeRenderer`) — then the measurement cannot be honest in a
  real app. Stop, keep the current behaviour, and record the limitation plus
  the type evidence; do not substitute a guessed width.
- The trigger's bounds are `0`/`null` at mount **and** on open — stop and record
  the frame; do not retry with a timeout.
- The list's width ignores a numeric `minWidth` in the wrapper's tree (it worked
  in the standalone probe) — stop and record what element the style reaches.

## 6. Outcome (executed on this host, 2026-10-17)

**Both directions proven, then restored green.** The guard removed was the
`triggerWidth` argument to `selectContentStyle`.

| Guard removed | Failing test | Measured failure |
| ------------- | ------------ | ---------------- |
| `triggerWidth` not passed | `opens the Select's list at least as wide as its trigger` | `expected 57 to be greater than or equal to 107` — the list hugged its labels under a 108 px trigger |
| same | `makes a full-width Select's list match the trigger` | `expected 843 to be less than or equal to 1` — a 57 px list under a 900 px field |

Restored: `nub run --filter @gpuixui/primitives test:runtime` → **14 files, 140
tests, all passing** (138 before). `nub run --filter @gpuixui/primitives test`
→ **306 tests** (unchanged: the existing Select element test gained the
`minWidth` assertions).

`renderer.getElementBounds` is present on the production `NativeRenderer` (it is
`Partial<Pick<…>>`, so the wrapper guards it), and `Slider` already used the same
call, so the STOP condition did not apply. The first open already has the width
because the effect runs after mount; the effect re-runs on open and on a
`size`/`fullWidth` change.
