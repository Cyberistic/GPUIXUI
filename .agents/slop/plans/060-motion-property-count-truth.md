# 060 — The runtime's animated-property count and the reserved `overlay` level

| Field | Value |
| ----- | ----- |
| Phase | F (docs truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`, the design-system section of `COMPONENTS.md`) |
| Depends on | plans `019`, `018`, `058`, `059` (all landed) |
| Status | done |

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

Two statements in this workstream's own output disagree with the pinned runtime.

**1.1 Motion says "seven" and lists eight.** `@gpuix/native@0.10.0`'s
`dist/host.d.ts` declares:

```ts
export interface MotionStyle {
  width?: number;
  height?: number;
  opacity?: number;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  borderRadius?: number;
}
```

Eight optional properties. Plan `019` enumerated all eight and called them
"seven"; every downstream document copied the count, not the list. A reader who
counts the list sees a contradiction, and a component author sizing a motion
contract gets a wrong budget.

**1.2 `elevation.overlay`'s field comment survived plan `018`.** The interface
comment says `overlay` is reserved and empty, but the per-field comment still
says "Reserved for surfaces that need an additional inset ring." The runtime has
no inset shadow (plan `018` deleted `BoxShadow.inset` precisely because of that),
so the comment promises a surface the runtime cannot paint. It is the only
remaining `inset` claim in shipped source.

Both are documentation defects in the layer that is supposed to be the single
source of truth. No value in `Theme` changes.

## 2. Decisions (do not re-litigate)

- **Say eight, keep the enumeration adjacent.** The list is the evidence; the
  count is the summary. Every occurrence states both, so a reader can verify.
- **Correct plan `019` in place.** It is the record of why the motion tokens
  exist; leaving a false source claim poisons the next executor. Add a short
  "Correction" line rather than rewriting its history.
- **No new test.** The count describes an external type
  (`@gpuix/native`'s `MotionStyle`), and `@gpuixui/tokens` deliberately has zero
  dependencies, so no test in this package can import the type it is talking
  about. A test that asserts the string `"eight"` would assert the prose back to
  itself — exactly what `scripts/check-tests.ts` rejects. The guard for the list
  that *is* ours (the motion table, the elevation levels) already exists in
  `docs.test.ts`. Record this reasoning in the commit.
- **Do not touch `apps/*`** or any other workstream's paths.

## 3. Exact files to change

| Path | Action |
| ---- | ------ |
| `packages/tokens/src/motion.ts` | header comment: "seven" → "eight" |
| `packages/tokens/src/elevation.ts` | `overlay` field comment: reserved and empty, paints nothing |
| `docs/tokens.md` | §Motion and the limitation bullet: "seven" → "eight" |
| `docs/design-system.md` | §12 non-goal: "seven" → "eight" |
| `packages/tokens/README.md` | limitation bullet: "seven" → "eight" |
| `.agents/slop/plans/019-motion-tokens.md` | add the correction line and fix its two counts |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | one ticked row |

`COMPONENTS.md` needs no edit: its motion row already lists the properties
without a count.

## 4. Exact change

### 4.1 `packages/tokens/src/motion.ts`

```diff
- * `animation` style, and `MotionStyle` reaches seven properties (`width`,
+ * `animation` style, and `MotionStyle` reaches eight properties (`width`,
```

The list after the parenthetical stays as it is.

### 4.2 `packages/tokens/src/elevation.ts`

```diff
-  /** Reserved for surfaces that need an additional inset ring. */
+  /**
+   * Reserved and empty. Nothing is designed for this level yet, so it paints
+   * no shadow until one is.
+   */
   readonly overlay: BoxShadow[];
```

### 4.3 Documentation

- `docs/tokens.md` §Motion: "`MotionStyle` reaches seven properties" → "eight".
- `docs/tokens.md` limitations: "only animate the seven `MotionStyle`
  properties" → "eight".
- `docs/design-system.md` §12: "the seven `MotionStyle` properties" → "eight".
- `packages/tokens/README.md` limitations: same substitution.
- `.agents/slop/plans/019-motion-tokens.md` §1 fact 2: "Only seven properties
  animate" → "Only eight properties animate", and §3.5 "the seven animatable
  properties" → "the eight animatable properties". Append under §1:

  > **Correction (plan 060).** The runtime's `MotionStyle` has eight optional
  > properties, not seven; the list in fact 2 was always right and the count was
  > wrong. The shipped documents were corrected together.

### 4.4 `TODO.md`

Under the tokens block, ticked:

- `Correct the runtime's animated-property count (eight, not seven) and the
  reserved overlay JSDoc; evidence in the pinned MotionStyle (plan 060)`

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test        # expected: exit 0, 308+ tests
nub run --filter @gpuixui/tokens check-types # expected: exit 0
nub run check                                # expected: exit 0
nub run lint                                 # expected: exit 0
nub run test                                 # expected: exit 0
```

Verification of the evidence (read-only):

```sh
grep -n "MotionStyle" -A 10 \
  ~/GPUIXUI/workspaces/components/node_modules/.store/@gpuix+native@0.10.0/node_modules/@gpuix/native/dist/host.d.ts
# expected: the eight optional properties quoted in §1.1
```

If that path does not exist, locate the pinned copy:

```sh
grep -rn "interface MotionStyle" --include="host.d.ts" ../../references/gpuix 2>/dev/null
```

`references/gpuix` is ahead of the published release; if the two disagree, the
**published 0.10.0** types win, because that is what the repo pins.

## 6. STOP conditions

Stop and report instead of improvising if:

- the pinned `MotionStyle` no longer has eight properties — re-read plan `019`,
  and correct every count to the number the pinned type actually declares;
- a count appears in a path outside this workstream — record it as a cross-team
  row in `TODO.md`, do not edit it;
- a docs-truth guard fails after the edit — the table is the contract; fix the
  document, not the guard.

## 7. Test plan

No new test, for the reason in §2. The existing suite must stay green:
`docs.test.ts` guards the motion and elevation tables; `elevation.test.ts`
guards the shadow shape; `motion.test.ts` guards the ms/seconds conversion.

The edit is prose and JSDoc only, so the proof is mechanical:

1. `grep -rn "seven" packages/tokens docs COMPONENTS.md` returns no hit.
2. The evidence grep in §5 prints eight fields.
3. `nub run check`, `nub run lint` and `nub run test` pass.

## 8. Acceptance criteria

- No shipped file says motion animates seven properties.
- `elevation.overlay`'s comment describes it as reserved and empty, with no
  inset claim anywhere in shipped source.
- Plan `019` carries the correction; this plan is indexed.
- `TODO.md` has the ticked row and honest counts.
- `nub run check`, `nub run lint` and `nub run test` pass.
