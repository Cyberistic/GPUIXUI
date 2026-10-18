# 381 — A `Separator` collapses to nothing when its stack does not stretch

| Field | Value |
| ----- | ----- |
| Phase | F (containment polish) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `364`, `368`, `376` |
| Status | done |

Self-contained: §0 the measured starting point, §1 the decision, §2 the rule,
§3 the files, §4 the commands, §5 the test plan and the two-direction proof,
§6 STOP conditions, §7 the outcome, §8 acceptance.

---

## 0. What is true before this plan (measured 2026-10-18)

`Separator` paints one border step through `ruleStyle` (`core/style.ts`): a
horizontal rule is `height: borderWidth.thin` with no `width`; a vertical rule is
`width: borderWidth.thin` with no `height`. The cross axis is therefore **auto**,
so its size is decided by the parent's `alignItems` — and a flex item with an
auto cross size under `start`, `center` or `end` resolves to its content size,
which for an empty `div` is **zero**.

Measured on this host with the real `TestRenderer` (`runtime/__probe`), one rule
inside a `Stack` with a 40 × 40 sibling:

| Orientation | Stack | `align` | Painted box | Result |
| ----------- | ----- | ------- | ----------- | ------ |
| horizontal | column | `start` | `w 0`, `h 1` | **invisible** |
| horizontal | column | `center` | `w 0`, `h 1` | **invisible** |
| horizontal | column | `end` | `w 0`, `h 1` | **invisible** |
| horizontal | column | `baseline` | `w 1256`, `h 1` | paints |
| horizontal | column | — (default) | `w 1256`, `h 1` | paints |
| vertical | row | `start` | `w 1`, `h 0` | **invisible** |
| vertical | row | `center` | `w 1`, `h 0` | **invisible** |
| vertical | row | `end` | `w 1`, `h 0` | **invisible** |
| vertical | row | `baseline` | `w 1`, `h 40` | paints |
| vertical | row | — (default) | `w 1`, `h 40` | paints |

So a toolbar written the obvious way —

```tsx
<Stack direction="row" align="center" gap="sm">
  <Button>Save</Button>
  <Separator orientation="vertical" />
  <Button>Cancel</Button>
</Stack>
```

— paints **no divider at all**, and a form column with `align="start"` paints no
horizontal rule. Nothing in the suite caught it: the one runtime separator case
mounts into a default-stretch `Stack`, and the element-tree case asserts the
thin axis only.

`docs/separator.mdx` states the opposite of the measurement and recommends a
workaround for the case that already worked:

> A vertical separator does not stretch to its parent automatically; give it a
> bounded parent or a `fullHeight` box around it.

The default (stretch) case already paints `h 40`; the broken cases are the ones
the docs do not mention. This is the same defect class as plans `342` (a page
denies a capability the runtime has), `376` (a page claims a layout is
impossible) and `364` (a rule is not the element the page says it is).

`alignSelf: "stretch"` on a `Box` under a centred row was measured in the same
probe: a `w 1` box with no height painted `h 40`. The runtime honours the value,
so the fix is a style property, not a new component.

## 1. The decision

**A rule fills its stack's cross axis, whatever the stack's `align` says.** The
one resolver that paints every rule gains `alignSelf: "stretch"`:

```ts
alignSelf: "stretch",
```

- `alignSelf` is the item's own cross-axis instruction; it wins over the
  parent's `alignItems`, so a horizontal rule spans a column's width and a
  vertical rule spans a row's height in `start`, `center` and `end` rows alike.
- When the cross size is **definite** the property is inert: the labelled
  composition's rules keep `height: 1` under its `alignItems: "center"` row, and
  a vertical rule in a column keeps `width: 1`. Only the auto cross size changes.
- The caller's `style` is still merged last (`renderSeparator`), so an explicit
  `alignSelf`, `width` or `height` still wins — the same contract as every
  primitive (`docs/component-api.md` §3, plan `097`).

A rule laid **along** its stack's axis is not this fix: a horizontal rule in a
**row** has an auto main size and paints no width, and a vertical rule in a
**column** has no row height to fill. Those are orientation mistakes, not a
collapsed cross axis, and they are stated in the page rather than "fixed" by
inventing a size the caller did not ask for.

## 2. Why the fix is in `ruleStyle`, not `Separator`

`ruleStyle` is the one painter for a horizontal rule, a vertical rule and the two
halves of a labelled separator. `Separator` spreads its result; a second copy in
the component would be the drift plan `099` exists to prevent. The property
belongs to the rule, not to the composition.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | `ruleStyle` adds `alignSelf: "stretch"` to both branches, with the measured reason |
| `packages/primitives/src/components/presentational.test.tsx` | the separator case also asserts `alignSelf === "stretch"` on both orientations |
| `packages/primitives/runtime/separator.runtime.test.tsx` | new suite: the four alignments × two orientations, the labelled composition, the inset, and the caller override |
| `packages/primitives/docs/separator.mdx` | the false limitation is replaced with the cross-axis rule and the two orientation notes; the theming and verification sections name the guard |
| `COMPONENTS.md` | the Separators row records the fix, the measurement and the runtime count |
| `TODO.md` | add and tick the task; primitives count `125/125` → `126/126`; the runtime total note is updated |
| `.agents/slop/plans/README.md` | index this plan after `380` |

No public API changes.

## 4. Commands and expected results

From `packages/primitives`:

```sh
nub run test                      # 46 files, 670 → 671 tests, green
nub run check-types               # no output
nub run test:runtime runtime/separator.runtime.test.tsx    # green (scoped: this is the evidence)
nub run test:runtime runtime/layout.runtime.test.tsx -t "Separator"   # green (the old case is unchanged)
```

From the repo root:

```sh
nub run check                     # green
nub run lint                      # green
nub run test                      # green
```

The full live suite needs a fresh session on this host (plan `379` §6 records the
window-accumulation degradation); the scoped runtime file above is this change's
live evidence. Re-run the full suite before merging.

## 5. Test plan and the two-direction proof

**Element tree** (`src/components/presentational.test.tsx`): `renderSeparator`
for both orientations; decode the resolved `style` and assert `alignSelf` is
`"stretch"` as well as the thin axis. Fails by missing property without the fix.

**Runtime** (`runtime/separator.runtime.test.tsx`) — one window per case, as the
fixture requires:

1. `it.each(["start", "center", "end"])` — a horizontal rule in a column:
   `width === surface content width` and `height === borderWidth.thin`.
2. `it.each(["start", "center", "end", "baseline"])` — a vertical rule in a row
   beside a 40 px box: `height === 40` and `width === borderWidth.thin`.
3. A horizontal rule in a **row** and a vertical rule in a **column** paint their
   thin axis only — the documented orientation limit, so nobody "fixes" it later
   by inventing a size.
4. The labelled composition still paints two rules at `height 1` while its row
   centres its children.
5. `inset` still subtracts from the stretched length (a `sm` inset both ends).
6. A caller `style={{ alignSelf: "center", width: 120 }}` wins over the default.

The failure directions to run before marking done:

| Mutation | Expected failure |
| -------- | ---------------- |
| `alignSelf` removed from both branches | runtime 1 and 2 report `w 0` / `h 0`; element case reports `undefined` |
| `alignSelf` added only to the vertical branch | runtime 1 fails on the three column cases |
| the labelled rules lose their `height: 1` | case 4 reports the caption's line height |

## 6. STOP conditions

- **The labelled separator's rules grow past `borderWidth.thin`.** Stretch is
  winning over a definite height; stop and scope the property to rules whose
  cross size is auto, or drop the change and report the measurement.
- **A rule inside a ScrollArea or a Grid changes a measured box.** Those parents
  already stretch or size their children; the property must be inert there. Stop
  and report the box.
- **The element-tree case passes but the runtime case still paints nothing.**
  The runtime is ignoring `alignSelf: "stretch"` on this element; stop and record
  the limitation instead of shipping a style that does nothing.

## 7. Measured results

Implemented and run on this host, 2026-10-18:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | **46 files, 671 tests**, green (670 before) |
| `nub run --filter @gpuixui/primitives check-types` | clean |
| `nub run --filter @gpuixui/primitives test:runtime runtime/separator.runtime.test.tsx` | **12 passed** (scoped) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/layout.runtime.test.tsx` | **28 passed** (the existing rule cases unchanged) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/layout.runtime.test.tsx -t "Separator"` | **2 passed**, 26 skipped |
| `nub run check` | green |
| `nub run lint` | green |
| `nub run test` | green |

The live suite collects **633 tests in 34 files** (621 in 33 before). The same
run passed **523 and failed 110 across 19 files** in its second half — the host's
window-accumulation degradation (plan `379` §6), not this change: the failing
files are the focus- and window-dependent ones (`fields`, `activation`,
`disabled`, `focus-ring`, `overlay-trigger`, …), the new `separator` file passed
12/12 inside that run, and `layout.runtime.test.tsx` — the file with the existing
rule cases — passed **28/28** in a fresh process. Re-run the full suite from a
fresh session before merging.

The measured boxes after the fix, in the same 40 × 40 sibling frame as §0:

| Orientation | Stack | `align` | Before | After |
| ----------- | ----- | ------- | ------ | ----- |
| horizontal | column | `start` / `center` / `end` | `w 0`, `h 1` | `w 1256`, `h 1` |
| vertical | row | `start` / `center` / `end` / `baseline` | `h 0` (`baseline` `h 40`) | `h 40`, `w 1` |

The labelled composition's rules are unchanged at `h 1`, and a vertical rule in a
column still paints `w 1`, `h 0` — the documented orientation limit, not a
regression.

Mutation outcomes:

| Mutation | Observed failure |
| -------- | ---------------- |
| `alignSelf` removed from both branches | `runtime/separator.runtime.test.tsx`: **7 failed** of 12 — the three column and three row cases, and `inset` (`expected +0 to be 1256`, `+0 to be 40`, `+0 to be 28`) |
| `alignSelf` kept only on the vertical branch | the same file: **3 failed** — `fills a column's width under align=start/center/end` (`expected +0 to be 1256`) |
| `alignSelf` removed from the horizontal branch | `presentational.test.tsx`: **1 failed** — `stretch a rule across the stack's cross axis` (the horizontal `alignSelf` is `None`) |

The full live suite ran once (633 tests, §above) and showed the host degradation,
so the scoped files are the evidence and the full suite is re-run from a fresh
session before merging.

## 8. Acceptance

1. A horizontal `Separator` paints across its column under `start`, `center` and
   `end`; a vertical one paints down its row under `start`, `center`, `end` and
   `baseline`.
2. The default (stretch) boxes, the labelled composition, the element-tree
   contract and the caller-style rule are unchanged.
3. A rule laid along its stack's axis is documented, not silently sized.
4. The offline and runtime guards fail when `alignSelf` is removed.
5. `docs/separator.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index record the
   change.
6. Every package and repo gate is green (the scoped live cases here; the full
   live suite before merge).
