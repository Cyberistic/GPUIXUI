# 715 — Tabs: a measured shared indicator (`TabsIndicator`)

**Workstream:** components (Tier 2 composition and feedback).
**Phase:** C/F (closing a Tier 2 contract gap).
**Depends on:** 110, 113, 117, 200, 304, 305, 323, 366, 511, 564, 646, 712.
**Status:** done — 6 pure + 9 native cases, four mutation proofs; full native suite 884 passed / 28 failed of 912 (the same plan-540 binding defects).

---

## 1. Why this exists

Two gaps in one place:

1. **The API contract is not closed.** `docs/component-api.md` §8 names
   `TabsRoot`/`List`/`Tab`/`Panel`/**`Indicator`** as the reference shape for
   Tabs; our Source column lists four parts and no indicator. §9's claim that
   every landed component exports the parts its §8 row names is therefore
   wrong for Tabs today. `base-gpui` and GPUI Kit both ship this part.
2. **The rail's emphasis is per trigger, so it cannot move.** The selected tab
   paints its own `card` fill; nothing is shared, so a selection change is a
   repaint of two triggers rather than one element travelling between them. The
   docs preview of Tabs (an underline rail) and the native component (a filled
   pill) also show two different selected states, which is exactly the
   docs-versus-library drift MISSION warns about.

The fix is one measured, shared part: `TabsIndicator`. It paints a 2px bar on
the rail's inner edge, spanning the selected trigger's extent, and animates that
box between tabs. While it is mounted it owns the rail's emphasis, so the
selected trigger stops painting its own fill and the visual becomes the
underline rail the docs show.

GPUI Kit's `TabBar` is the reference implementation (Apache-2.0, behaviour
reference only — no source copied): a wrapper over the selected tab's bounds with
an `Underline` variant painting a 2px `primary` bar, spring-animated left and
width (`crates/component/src/tab/tab_bar.rs`, `render_indicator`).

---

## 2. Measurements this plan is built on (done before writing it)

Probe: a `div` (padding 6) wrapping a 400×40 flex row (padding 4, border 1,
`gap` 4) with two 60/100×32 children, five absolute children
(`left:0/top:0`, `left:10`, `top:10`, `right:0`, `bottom:0`) and one
`MotionSurface`. Rendered with `renderComponent`, read with
`renderer.getElementBounds`.

| What | Result |
| ---- | ------ |
| list bounds | `{ x: 11, y: 11, width: 398, height: 38 }` — **content-box origin** (border 1 + padding 4 = 5 inside the wrapper at 6), **padding-box size** |
| trigger bounds | `{ x: 11, y: 11, width: 60, height: 32 }` — border-box origin, no border |
| second trigger | `x: 75` = 11 + 60 + gap 4 |
| absolute `left:0/top:0` | `{ x: 7, y: 7 }` = the list's **padding-box** origin (content origin − padding; the border stays outside) |
| absolute `left:10` | `x: 17` |
| absolute `right:0` (4 wide) | `x: 401` = 7 + 398 − 4 |
| absolute `bottom:0` (4 tall) | `y: 41` = 7 + 38 − 4 |
| `MotionSurface initial={false} animate={{left,top,width,height}}` | paints at the target on the first commit; after a target change and `flush()` it reads `x: 11.5` (mid-flight from 11 → 51) and `width: 60.5` (from 60 → 120); after `finishMotion(root, 200)` it reads the target |

Consequences:

- The list's own bounds are the **content-box origin** and the **padding-box
  size**, so the padding-box origin is `list.x - padding` / `list.y - padding`
  and the padding box's bottom edge is `list.y - padding + list.height`.
- Absolute children are positioned against that padding box and reported in
  window space, so `left`/`top` can be computed in window space and subtracted.
- `width` and `height` animate, not only `left`/`top`, so one motion element can
  carry the whole sliding box.
- The plan-540 box-convention defect (three conventions in one build) does not
  apply here: only the listed element is read, and the probe above is exactly
  the shape the component uses.

---

## 3. The rule

Pure geometry lives in `src/tabs/logic.ts` next to `selectsOnFocus`, so the
arithmetic is testable without a window:

```ts
export type TabsOrientation = "horizontal" | "vertical";

export interface MeasuredBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface IndicatorBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface IndicatorInput {
  readonly list: MeasuredBox;
  readonly trigger: MeasuredBox;
  readonly padding: number;
  readonly orientation: TabsOrientation;
  readonly thickness: number;
}

export const indicatorThickness = (thickness?: number): number =>
  // default 2, finite values truncate, never below 1, never a NaN box
  ...

export const indicatorBox = (input: IndicatorInput): IndicatorBox =>
  // horizontal: the bar hugs the rail's inner bottom edge
  // vertical:   the bar hugs the rail's inner left edge
```

- horizontal → `left = trigger.x - (list.x - padding)`,
  `width = trigger.width`, `top = list.height - thickness`, `height = thickness`
- vertical → `left = 0`, `top = trigger.y - (list.y - padding)`,
  `height = trigger.height`, `width = thickness`
- `indicatorThickness`: a missing or non-finite value is the 2px default; a
  finite one truncates and floors at 1 (the plan-651/661 rule: a malformed
  number must not hide the part).

`TabsOrientation` moves into `tabs/logic.ts` and `tabs.tsx` re-exports it, so
the type has one definition and no import cycle.

---

## 4. API

```tsx
<Tabs defaultValue="profile">
  <TabsList label="Account settings">
    <TabsIndicator />
    <TabsTrigger value="profile">Profile</TabsTrigger>
    <TabsTrigger value="billing">Billing</TabsTrigger>
  </TabsList>
  <TabsContent value="profile">…</TabsContent>
  <TabsContent value="billing">…</TabsContent>
</Tabs>
```

| Part | Renders | Props |
| ---- | ------- | ----- |
| `TabsIndicator` | one absolute `div` inside `TabsList` (no role) | `thickness?: number` (default 2), `animate?: boolean` (default `true`), `testId?: string` (default `tabs-indicator`; the list's own `testId` names it `<testId>-indicator` when the caller sets the indicator's), `style?: StyleDesc` merged last |

Contract:

- Mounted inside `TabsList` only; putting it anywhere else throws through the
  same `assertParts` family check (`TabsIndicator cannot be used inside Tabs.`).
- It measures the list and the selected trigger after commit and again whenever
  the selection, the registered rows, the orientation, the theme or the window
  size changes. Until a box is available it renders nothing (never a 0×0 box at
  the origin).
- While it is mounted the selected trigger does **not** paint its own `card`
  fill: the indicator is the rail's emphasis, so the pair never doubles up. A
  consumer who wants today's filled pill simply does not mount the indicator
  (pinned by test).
- Decorative: no role, no tab stop, `pointerEvents: "none"`.
- Motion: `left`/`top`/`width`/`height` animate over 150 ms `easeOut`;
  `animate={false}` snaps (the Collapsible `animate` precedent). The runtime has
  no `prefers-reduced-motion`, so the app chooses.

---

## 5. Exact edits

### 5.1 `packages/components/src/tabs/logic.ts`

Add `TabsOrientation`, `MeasuredBox`, `IndicatorBox`, `IndicatorInput`,
`indicatorThickness`, `indicatorBox` with JSDoc; keep `selectsOnFocus`.

### 5.2 `packages/components/src/tabs/logic.test.ts`

Add cases (see §6). Keep the existing two.

### 5.3 `packages/components/src/tabs.tsx`

1. Import `useWindowSize` from `@gpuix/react`; import the new rules; delete the
   local `TabsOrientation` declaration and re-export the logic one.
2. `TabsContextValue` gains:
   - `readonly listId: Option.Option<number>`
   - `readonly setListId: (id: Option.Option<number>) => void`
   - `readonly indicator: boolean`
   - `readonly registerIndicator: () => () => void`
3. `Tabs` owns `const [listId, setListId] = useState<Option.Option<number>>(Option.none())`
   and `const [indicator, setIndicator] = useState(false)`; `registerIndicator`
   is `useCallback(() => { setIndicator(true); return () => setIndicator(false); }, [])`.
   Both go into the context object and its dependency list.
4. `TabsList` destructures `ref` and `testId`, merges the caller's ref with
   `useMergedRef` (plan 128), keeps `instance` state, and in a layout effect
   sets `listId` to `instance.id` and clears it on unmount. Spread order: the
   caller's `testId` keeps winning.
5. `TabsTrigger` reads `indicator` from the context: when it is mounted the
   selected trigger's `backgroundColor` is `undefined` and its `hover` has no
   fill (only the foreground colour); without it the `card` fill is unchanged.
6. New `TabsIndicator` part:
   - `registerIndicator` in a layout effect.
   - `const [box, setBox] = useState<Option.Option<IndicatorBox>>(Option.none())`.
   - A layout effect keyed on `[listId, selected, rows, orientation, theme, window.width, window.height]`
     measures `renderer.getElementBounds(listId)` and the selected row's id,
     maps them through `indicatorBox`, and sets the box (or `none` when either
     bound or the selected row is missing).
   - Renders `Option.match(box, { onNone: () => null, onSome: (value) => <MotionSurface …/> })`
     with `initial={false}` when animating, `animate={{ left, top, width, height }}`,
     `transition={{ duration: 0.15, ease: "easeOut" }}`, `position: "absolute"`,
     `pointerEvents: "none"`, `backgroundColor: theme.colors.primary`,
     `borderRadius: theme.radius.sm`, `testId` as in §4, `style` merged last.
   - Export `TabsIndicatorProps`.
7. `tabsParts` gains `TabsIndicator`; `tabsList.accepts` gains it and the hint
   mentions it.
8. `tabsMeta.limitations` gains the measured indicator line; `testFile` stays.

### 5.4 `packages/components/src/index.ts`

`export * from "./tabs.js"` already covers the new part; no edit unless the
export check reports otherwise.

### 5.5 `packages/components/examples/tabs.example.tsx`

Add `<TabsIndicator />` as the first child of both lists (horizontal and
vertical), so the registry-mounted example proves both axes.

### 5.6 `packages/components/docs/tabs.mdx`

- Anatomy table: add `TabsIndicator` (the measured bar on the rail's inner edge).
- New `## Indicator` section: opt-in, what it replaces, measurement, motion,
  `thickness`, the vertical axis, and the no-indicator fallback.
- API table: add the row from §4.
- Theming: the bar paints `colors.primary` with `radius.sm`; the selected
  trigger drops `colors.card` while the indicator is mounted.
- Verification: state the real count and name the new cases.
- Limitations: measured once per selection/rows/theme/window change; horizontal
  bar on the rail's bottom edge, vertical on its left; no `transform`, so the
  slide animates `left`/`top`/`width`/`height`; no reduced-motion signal in
  0.10.0; no RTL.

### 5.7 `docs/component-api.md`

§8 Tabs Source column becomes
`\`Tabs\`, \`TabsList\`, \`TabsTrigger\`, \`TabsContent\`, \`TabsIndicator\``
(the contract check in `inventory.test.ts` holds the docs page to it).

### 5.8 `COMPONENTS.md`

Tabs row: add the indicator to Notes, the real native test count, and the
measured limitation.

### 5.9 Index and ledger

- `.agents/slop/plans/README.md`: a `715` row under the components table.
- `PLAN.md` D30: append the numbering note (`713`/`714` were taken by the
  playground and tokens worktrees).
- `TODO.md`: tick the Tabs indicator item under Tier 2 hardening, add it if
  missing.

---

## 6. Test plan

Every new behaviour case must fail at `HEAD` (the part does not exist) or fail
when its own wiring is removed; the pins are listed with the mutation that
breaks them.

### 6.1 Pure (`src/tabs/logic.test.ts`, current 2)

1. horizontal: a padded list at `(11,11,398,38)` and a trigger at
   `(75,11,100,32)` with `padding: 4` → `{ left: 68, top: 36, width: 100, height: 2 }`.
2. vertical: the same pair → `{ left: 0, top: 4, width: 2, height: 32 }`.
3. `indicatorThickness()` → 2; `indicatorThickness(3.7)` → 3;
   `indicatorThickness(0)` → 1; `indicatorThickness(Number.NaN)` → 2;
   `indicatorThickness(Number.POSITIVE_INFINITY)` → 2.
   Mutation: returning the raw value fails the floor and the NaN case.

### 6.2 Behaviour (`src/behaviour/tabs.test.tsx`, current 33)

1. **sits under the selected tab** — indicator x/width equal the selected
   trigger's x/width; height is `thickness`; its bottom equals the list's
   padding-box bottom.
2. **moves to the next tab** — click `tab-danger`; after `finishMotion`, x/width
   equal the new trigger's; the old tab's x is different (so the assertion is
   not trivially true). Fails at `HEAD` (no element) and fails if the box does
   not re-measure.
3. **slides** — after a selection change and a single `flush()`, x is strictly
   between the two triggers' x. Mutation: replacing `MotionSurface` with a plain
   `div` paints the target immediately and fails this case.
4. **vertical rail** — a vertical set puts the bar at the rail's inner left
   edge (x equal for both selections), with the trigger's height and
   `thickness` width.
5. **the trigger's fill moves to the indicator** — with the indicator mounted
   the selected trigger reports no `backgroundColor`; the pin renders the same
   tree without `TabsIndicator` and asserts the `card` fill. Both directions.
6. **no selection, no bar** — `<Tabs defaultValue="">` renders no indicator.
7. **the selected tab is removed** — the bar disappears instead of staying at a
   stale box (dynamic fixture from plan 511).
8. **light theme** — the bar paints the light `primary` role (the Tabs suite
   already proves both themes for the rail; this pins the bar's role).

Expected totals after the change: Tabs 41 native cases, `tabs/logic` 5.

### 6.3 Verification commands

```sh
# scoped, while iterating
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/tabs.test.tsx
nub exec vitest run src/tabs/logic.test.ts
# then the package gates
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
# end-of-task gates (repo root)
nub run check
nub run lint
nub run test
```

`nub apps/playground/dist/smoke/run.js --list` has **no Tabs scenario** in this
worktree (`apps/playground/src/scenarios/` covers GPUix primitives only — there
are no `tier2` scenario ids here), so no `--only <id>` run applies. The native
evidence is the package behaviour suite, which renders the real `TestRenderer`
on this host: `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/tabs.test.tsx`
is 42 tests with the one recorded plan-540 `onBlur` failure, and the full suite is
884 passed / 28 failed of 912 — the same 28 recorded binding defects.

---

## 7. STOP conditions

Stop and report, do not improvise, if:

- `getElementBounds` on the list and a trigger does not match §2 (a different
  build may have swapped a box convention). Re-probe and correct §3 before
  writing the component; do not tune the test to the observed number.
- `MotionSurface`'s `animate` refuses `width`/`height` or `position: absolute`
  on this binding; fall back to a plain `div` (no slide), delete the slide case,
  and record the limitation on the docs page and in `COMPONENTS.md`.
- The indicator cannot be measured within one commit (it paints at 0,0 or
  covers the label). Take the bar out of the flex flow (`position: absolute` on
  the padding box) and re-measure; if it still overlaps, stop — the layout
  assumption in §2 is wrong.
- Any existing Tabs case fails for a reason other than the plan-540 binding
  defects (the recorded 28-failure list). A new red case is a regression.

---

## 8. Acceptance

- `TabsIndicator` exists, is exported, documented, in the example, and in the
  §8 parts row; the contract check passes.
- Pure rule + behaviour cases from §6 pass, and each new case is proven to fail
  without its wiring (mutation recorded in the plan index status).
- The scoped suites pass; `check`, `lint` and `test` exit 0; the full native
  suite is re-run once at the end and its count recorded in `TODO.md`.
- Docs, `COMPONENTS.md`, `docs/component-api.md`, the plan index, `PLAN.md` D30
  and `TODO.md` are all synced in the same commit series.
