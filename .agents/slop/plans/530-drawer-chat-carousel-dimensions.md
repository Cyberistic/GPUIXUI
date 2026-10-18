# 530 — The fixed surface metrics plan 353 left in consumers

**Phase:** B (working foundation) · **Workstream:** `tokens-theme` ·
**Depends on:** plans 353, 358, 368, 384, 389, 396 ·
**Number block:** 500–599 (`tokens-theme` overflow).

## 1. The gap

Plan 353 gave `theme.dimensions` the fixed surface metrics a component needs at
any density, but its audit stopped at the surfaces `components` had reached by
then. Three surfaces still hold their own literals, so a consumer cannot change
them through a theme, a copied `PlatformStyle` cannot own them, and
`themeMetricFailures` cannot report a broken one.

Evidence, read on 2026-10-18 from the `components` worktree
(`/Users/cyberistic/GPUIXUI/workspaces/components`):

| Surface | Literal | Location | Why it matters |
| ------- | ------- | -------- | -------------- |
| Drawer width | `320 / 400 / 560` | `packages/components/src/drawer.tsx:57-61` (`WIDTH`) | A brand cannot narrow or widen an edge panel; every `DrawerSize` is unthemeable. |
| Drawer height | `240 / 320 / 420` | `packages/components/src/drawer.tsx:63-67` (`HEIGHT`) | The bottom drawer's height is the same kind of fixed surface metric as the width. |
| Chat viewport | `160` | `packages/components/src/chat.tsx:168` (`minHeight`) | The shortest message viewport is a surface floor; a dense chat cannot lower it. |
| Carousel indicator | `18 / 8` | `packages/components/src/carousel.tsx:399-400` | The idle dot and the elongate active mark are brandable marks, not spacing decisions. |

The recorded next-unit audit (`.agents/slop/rd/2026-10-18-tokens-next.md`) names
the first, second and fourth of these; its "chat composer min height" is
`ChatMessages`' viewport, not the composer — this plan uses the honest name
`chatViewportMinHeight`.

No palette is wrong. Every shipped theme, platform variant and recipe is valid;
the defect is that four shipped surfaces are outside the extension mechanism
`docs/tokens.md` teaches.

## 2. Decisions

1. **Flat fields, not a size-keyed record.** `Dimensions` merges field by field
   and the catalogue guard enumerates `Object.entries(dimensions)`. A
   `drawerWidth: Record<ControlSize, number>` would need a new
   `DimensionsOverrides` type, a deep merge and a rewrite of the docs guard for
   two fields. The drawer's `DrawerSize` axis belongs to the component; the
   token group names each fixed metric the way it already names
   `controlHeight.sm` in `Density` — but here the group is flat, so the names
   are `drawerWidthSm`, `drawerWidthMd`, `drawerWidthLg` and the height trio.
2. **The values do not move.** They are the literals the shipped drawer, chat
   and carousel already paint: 320/400/560, 240/320/420, 160, 8 and 18. A
   consumer that reads them gets today's pixels. No colour, pair, floor, type
   or other metric moves.
3. **Two ladders and two floors.** The drawer trios are `increasing` ladders; a
   carousel's active indicator is `at-least` its idle dot (an active mark may
   elongate but never shrink); the chat viewport is `at-least` one
   `density.rowHeight` (a viewport shorter than a row clips every message, the
   same reasoning plan 365 applies to `overlayMaxHeight`).
4. **The example owns the new merge surface.** A runnable
   `dimensions.example.ts` extends one drawer width and the chat viewport so the
   field-by-field merge of the new members is executed, not sketched. It is
   linked from the reference and the package README, and imported by
   `dimensions.test.ts`, so `examples.test.ts` and the total check both hold it.
5. **Consumers migrate cross-team.** `packages/components` is another
   workstream's tree. The plan records one `TODO.md` row for the drawer, one for
   the chat viewport and one for the carousel; it does not edit that tree.

## 3. Exact edits

All paths are relative to the worktree root
`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

### 3.1 `packages/tokens/src/scale.ts`

In `Dimensions`, after `keycapSize`, add:

```ts
  /** 320px — a small drawer's width. */
  readonly drawerWidthSm: number;
  /** 400px — the default drawer width. */
  readonly drawerWidthMd: number;
  /** 560px — a large drawer's width. */
  readonly drawerWidthLg: number;
  /** 240px — a small bottom drawer's height. */
  readonly drawerHeightSm: number;
  /** 320px — the default bottom drawer's height. */
  readonly drawerHeightMd: number;
  /** 420px — a large bottom drawer's height. */
  readonly drawerHeightLg: number;
  /** 160px — the shortest message viewport. */
  readonly chatViewportMinHeight: number;
  /** 8px — an inactive carousel indicator. */
  readonly carouselIndicatorSize: number;
  /** 18px — the active carousel indicator's width. */
  readonly carouselIndicatorActiveWidth: number;
```

In the `dimensions` object, after `keycapSize: 20`, add the same nine values in
the same order: `drawerWidthSm: 320`, `drawerWidthMd: 400`, `drawerWidthLg: 560`,
`drawerHeightSm: 240`, `drawerHeightMd: 320`, `drawerHeightLg: 420`,
`chatViewportMinHeight: 160`, `carouselIndicatorSize: 8`,
`carouselIndicatorActiveWidth: 18`.

Update the interface's leading doc sentence from "these do not change with the
control size" to "these do not change with density" — the drawer trio is a size
axis, and the group's point is that density does not move it.

### 3.2 `packages/tokens/src/metrics.ts`

In the `dimensions` group of `themeMetricFailures`:

1. Add every new member to `finiteMembers("dimensions", [...])`.
2. Add a `positive` call for every new member.
3. Add two ladders, after the two existing ones:

```ts
    ...ladder(
      "dimensions",
      [
        ["drawerWidthSm", dimensions.drawerWidthSm],
        ["drawerWidthMd", dimensions.drawerWidthMd],
        ["drawerWidthLg", dimensions.drawerWidthLg],
      ],
      "increasing",
    ),
    ...ladder(
      "dimensions",
      [
        ["drawerHeightSm", dimensions.drawerHeightSm],
        ["drawerHeightMd", dimensions.drawerHeightMd],
        ["drawerHeightLg", dimensions.drawerHeightLg],
      ],
      "increasing",
    ),
```

4. Add, beside the existing `overlayMaxHeight` / `fieldMinWidth` floors:

```ts
    // A message viewport shorter than one row clips every message it holds.
    ...atLeast(
      "dimensions",
      "chatViewportMinHeight",
      dimensions.chatViewportMinHeight,
      density.rowHeight,
    ),
    // The active carousel mark may elongate; it may not shrink below the idle dot.
    ...atLeast(
      "dimensions",
      "carouselIndicatorActiveWidth",
      dimensions.carouselIndicatorActiveWidth,
      dimensions.carouselIndicatorSize,
    ),
```

5. Extend the `dimensions` bullet of the `themeMetricFailures` JSDoc with the
   two ladders, the carousel floor and the chat viewport floor. Keep the
   existing sentences; do not retype a count.

### 3.3 `packages/tokens/src/dimensions.example.ts` (new)

```ts
/**
 * Copy-and-own component dimensions: a drawer, the shortest message viewport
 * and the carousel marks are fixed surfaces, so they merge field by field and
 * the rest of the group inherits. This file is type-checked and asserted in
 * `dimensions.test.ts`.
 */
import { extendTheme, lightTheme } from "./index.js";

/** A theme with a narrower default drawer and a taller message viewport. */
export const narrowDrawerTheme = extendTheme(lightTheme, {
  dimensions: {
    drawerWidthMd: 360,
    chatViewportMinHeight: 200,
  },
});

/** The base the example extends, for consumers that need it. */
export const dimensionsBaseTheme = lightTheme;
```

### 3.4 `packages/tokens/src/dimensions.test.ts`

Import the example and `themeFailures`:

```ts
import { narrowDrawerTheme, dimensionsBaseTheme } from "./dimensions.example.js";
import { themeFailures } from "./theme-check.js";
```

Add cases:

```ts
  it("keeps the drawer ladders and the carousel mark coherent", () => {
    expect(dimensions.drawerWidthSm).toBeLessThan(dimensions.drawerWidthMd);
    expect(dimensions.drawerWidthMd).toBeLessThan(dimensions.drawerWidthLg);
    expect(dimensions.drawerHeightSm).toBeLessThan(dimensions.drawerHeightMd);
    expect(dimensions.drawerHeightMd).toBeLessThan(dimensions.drawerHeightLg);
    expect(dimensions.carouselIndicatorActiveWidth).toBeGreaterThanOrEqual(
      dimensions.carouselIndicatorSize,
    );
    expect(dimensions.chatViewportMinHeight).toBeGreaterThanOrEqual(
      lightTheme.density.rowHeight,
    );
  });

  it("merges one drawer width and the chat viewport without losing the rest", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { drawerWidthMd: 360, chatViewportMinHeight: 200 },
    });
    expect(themed.dimensions).toEqual({
      ...dimensions,
      drawerWidthMd: 360,
      chatViewportMinHeight: 200,
    });
  });

  it("runs the copy-and-own example through the total check", () => {
    expect(narrowDrawerTheme.dimensions.drawerWidthMd).toBe(360);
    expect(narrowDrawerTheme.dimensions.chatViewportMinHeight).toBe(200);
    expect(dimensionsBaseTheme.dimensions).toEqual(dimensions);
    expect(themeFailures(narrowDrawerTheme)).toEqual([]);
  });
```

Extend the existing undefined case so a new member is covered too:
`dimensions: { drawerWidthSm: undefined, overlayWidth: 240 }` and assert
`themed.dimensions.drawerWidthSm === dimensions.drawerWidthSm`.

The existing "positive whole-pixel metric" case keeps working because all nine
new members are numbers.

### 3.5 `packages/tokens/src/metrics.test.ts`

After the existing "reports a zero width and an inverted preview range" case,
add:

```ts
  it("reports an inverted drawer ladder and a collapsed carousel mark", () => {
    expect(failuresOf({ dimensions: { drawerWidthLg: 380 } })).toEqual([
      {
        group: "dimensions",
        member: "drawerWidthLg",
        rule: "increasing",
        actual: 380,
        bound: 400,
      },
    ]);
    expect(
      failuresOf({ dimensions: { carouselIndicatorActiveWidth: 6 } }),
    ).toEqual([
      {
        group: "dimensions",
        member: "carouselIndicatorActiveWidth",
        rule: "at-least",
        actual: 6,
        bound: 8,
      },
    ]);
  });

  it("reports a message viewport shorter than a row", () => {
    expect(
      failuresOf({ dimensions: { chatViewportMinHeight: 20 } }),
    ).toEqual([
      {
        group: "dimensions",
        member: "chatViewportMinHeight",
        rule: "at-least",
        actual: 20,
        bound: lightTheme.density.rowHeight,
      },
    ]);
  });
```

`lightTheme` is already imported there; check the import line before relying on
it, and use `dimensions` for the carousel bound if that reads cleaner.

### 3.6 `packages/tokens/src/finite-metrics.test.ts`

Extend the "non-finite surface dimension" case with a new member, so the finite
pass is proven to cover the additions:

```ts
  it("reports a non-finite drawer width", () => {
    expect(failuresOf({ dimensions: { drawerWidthSm: Infinity } })).toEqual([
      infinite("dimensions", "drawerWidthSm"),
    ]);
  });
```

### 3.7 `packages/tokens/src/docs.test.ts`

The existing "lists every component dimension" case reads
`Object.entries(dimensions)`; the new members are flat numbers, so it covers
them with no edit. Add a design-system case after "states the fixed component
dimensions":

```ts
  it("states the drawer, chat and carousel dimensions", () => {
    const sentence = `A drawer opens ${dimensions.drawerWidthSm}/${dimensions.drawerWidthMd}/${dimensions.drawerWidthLg}px wide, or ${dimensions.drawerHeightSm}/${dimensions.drawerHeightMd}/${dimensions.drawerHeightLg}px tall from the bottom; a message viewport never shrinks below ${dimensions.chatViewportMinHeight}px, and a carousel's active dot is ${dimensions.carouselIndicatorActiveWidth}px beside an idle ${dimensions.carouselIndicatorSize}px one.`;
    expect(designSystem.includes(sentence), sentence).toBe(true);
  });
```

### 3.8 `docs/tokens.md`

1. Extend the component-dimensions table, after the `keycapSize` row:

```md
| `dimensions.drawerWidthSm` | 320 | narrowest drawer |
| `dimensions.drawerWidthMd` | 400 | default drawer width |
| `dimensions.drawerWidthLg` | 560 | widest drawer |
| `dimensions.drawerHeightSm` | 240 | shortest bottom drawer |
| `dimensions.drawerHeightMd` | 320 | default bottom drawer height |
| `dimensions.drawerHeightLg` | 420 | tallest bottom drawer |
| `dimensions.chatViewportMinHeight` | 160 | shortest message viewport; held to one `density.rowHeight` |
| `dimensions.carouselIndicatorSize` | 8 | inactive carousel indicator |
| `dimensions.carouselIndicatorActiveWidth` | 18 | active carousel indicator's width; at least the idle dot |
```

2. After the keycap paragraph, add:

> A drawer's width and height are ladders: `sm` → `md` → `lg` grows in both
> axes, so a theme cannot make "large" narrower than "medium". A carousel's
> active mark may elongate but never shrink below its idle dot, and a message
> viewport holds at least one row.

3. After the merge snippet, add the runnable example link:

> A runnable example lives in
> [`src/dimensions.example.ts`](../packages/tokens/src/dimensions.example.ts).

4. Update the `Dimensions` row in the `## Types` index from "Fixed surface
   metrics: overlay, field, toast and preview-card sizes." to "Fixed surface
   metrics: overlay, field, toast, preview-card, drawer, chat and carousel
   sizes." Keep the table alphabetical; no new type is added.

### 3.9 `docs/design-system.md`

After the existing fixed-dimensions sentence ("...the metric contract reports a
theme whose caption leading outgrows it."), add exactly:

> A drawer opens 320/400/560px wide, or 240/320/420px tall from the bottom; a
> message viewport never shrinks below 160px, and a carousel's active dot is
> 18px beside an idle 8px one.

### 3.10 `packages/tokens/README.md`

After the "Typography merges field by field..." sentence in *Extending a theme*,
add:

> Component dimensions include the drawer ladders, the shortest message
> viewport and the carousel marks; they merge field by field with the rest of
> the group. A runnable example lives in
> [`src/dimensions.example.ts`](./src/dimensions.example.ts).

### 3.11 `TODO.md`

Bump the section bar `194/256` → `195/257`. Add one ticked row before the
cross-team block and three cross-team rows:

```
`[x]` Ship the fixed surface metrics plan 353 left in consumers — the drawer's
320/400/560 width and 240/320/420 height triples, the 160px message viewport and
the carousel's 18/8 mark were still literals in `packages/components`, so no
theme or copied `PlatformStyle` could own them and the numeric contract could
not report a broken one; `theme.dimensions` gains the nine fields with two
increasing drawer ladders, a viewport floor of one `density.rowHeight`, a
carousel floor of its idle dot and a runnable copy-and-own example, with no
colour, pair, floor or existing metric moving (plan 530)
`[ ]` Cross-team: `components` reads `theme.dimensions.drawerWidthSm/Md/Lg` and
`drawerHeightSm/Md/Lg` for `Drawer`'s local `WIDTH`/`HEIGHT` maps instead of
320/400/560 and 240/320/420 (owner: `components`; plan 530)
`[ ]` Cross-team: `components` reads `theme.dimensions.chatViewportMinHeight`
for `ChatMessages`' 160px viewport minimum (owner: `components`; plan 530)
`[ ]` Cross-team: `components` reads `theme.dimensions.carouselIndicatorSize`
and `carouselIndicatorActiveWidth` for the carousel's 8px/18px marks
(owner: `components`; plan 530)
```

### 3.12 `COMPONENTS.md`

Append one clause to the **Design tokens** row's dimensions sentence: the group
now also owns "the drawer width and height ladders, the shortest message
viewport and the carousel's idle/active marks". Do not change any count; the
row's role count is guarded by `inventory.test.ts`.

### 3.13 `.agents/slop/plans/README.md`

Add to the table after the 529 row:

```
| [530](./530-drawer-chat-carousel-dimensions.md) | The fixed surface metrics plan 353 left in consumers | B | 353, 358, 368, 384, 389, 396 | done |
```

Append a plan-530 paragraph after the plan-529 paragraph.

## 4. Commands and expected results

Run in `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

1. `nub run --filter @gpuixui/tokens check-types` → clean. Before §3.1 the new
   test references fail; after it the package compiles.
2. `nub run --filter @gpuixui/tokens test -- dimensions` → the new merge,
   ladder, example and undefined cases pass; the existing six still pass.
3. `nub run --filter @gpuixui/tokens test -- metrics` → the three new failure
   cases pass and the existing group cases still pass.
4. `nub run --filter @gpuixui/tokens test -- finite-metrics` → the new
   non-finite drawer case passes.
5. `nub run --filter @gpuixui/tokens test -- docs` → every new table row is
   found from `Object.entries(dimensions)` and the new design-system sentence
   is found.
6. `nub run --filter @gpuixui/tokens test -- examples` → the new example is
   imported by a suite.
7. `nub run --filter @gpuixui/tokens test -- public-types` → no public type
   changed; the index still matches the entry-module walk.
8. `nub run --filter @gpuixui/tokens test` → record the file/test counts the
   run prints; do not quote a number the run did not print.
9. `nub run check` → `check:tests`, lint, format and `check-types` pass.
10. `nub run lint` and `nub run test` → both pass.

## 5. STOP conditions

Stop and report instead of improvising if:

- Adding the nine fields forces an edit outside this workstream's paths (a
  consumer's fixture, a components test). Record the cross-team row and stop
  that thread; do not edit another tree.
- A shipped theme, platform variant or recipe stops returning `[]` from
  `themeFailures` (or `themeMetricFailures`). No value should move; a failure
  means the new floor is wrong for a shipped set — report the set and the
  value, do not weaken the floor silently.
- The catalogue guard cannot enumerate the new rows through
  `Object.entries(dimensions)`. A nested record is the cause; do not add a
  special case to the guard — keep the group flat as decided in §2.
- A new example is not imported by any suite or is not linked from the
  reference and README. Fix the link/import, not the guard.
- `nub` is unavailable or a gate fails for a reason unrelated to this plan.
  Report the exact command and output; do not retry unchanged.

## 6. Test plan

| What can break | The case that catches it |
| --- | --- |
| A drawer ladder is inverted or a step is zero | `dimensions.test.ts` coherence case + `metrics.test.ts` inverted ladder case |
| The active carousel mark shrinks below its dot | `metrics.test.ts` collapsed-mark case |
| A message viewport falls below one row | `metrics.test.ts` viewport case |
| A new member is non-finite and the finite pass omits it | `finite-metrics.test.ts` drawer case |
| A field-by-field merge drops a sibling metric | `dimensions.test.ts` merge case |
| An explicit `undefined` erases a new member | `dimensions.test.ts` undefined case |
| The example drifts from the extension mechanism | `dimensions.test.ts` total-check case + `examples.test.ts` |
| The docs table drifts from the implementation | `docs.test.ts` "lists every component dimension" |
| The design-system sentence drifts | `docs.test.ts` derived-sentence case |
| A public type or value ships unnamed | `public-types.test.ts`, `docs.test.ts` |
| A shipped set changes | `theme-check.test.ts`, `metrics.test.ts`, every "shipped set" suite |

To prove the cases can fail, keep the source change as a patch and run the new
suite twice:

```bash
git diff packages/tokens/src/scale.ts packages/tokens/src/metrics.ts > /tmp/plan-530.patch
git apply -R /tmp/plan-530.patch
nub run --filter @gpuixui/tokens test -- dimensions metrics finite-metrics  # must fail
git apply /tmp/plan-530.patch
nub run --filter @gpuixui/tokens test -- dimensions metrics finite-metrics  # must pass
```

Record both outputs in the commit message. (`scripts/verify-two-directions.sh`
is the repo convention; its `jj`-based root lookup does not resolve in this
worktree, so the manual pairing above is the honest equivalent.)

## 7. Acceptance criteria

- [ ] `theme.dimensions` carries the nine new fields with today's pixels, and
      the `Dimensions` doc says density, not control size, is what stays fixed.
- [ ] `themeMetricFailures` holds the two drawer ladders, the carousel mark and
      the chat viewport to the rules in §3.2; every shipped set still returns
      `[]`.
- [ ] `dimensions.example.ts` runs in a suite, passes `themeFailures`, and is
      linked from `docs/tokens.md` and the package README.
- [ ] `docs/tokens.md` lists every new token at its real value (guarded), and
      `docs/design-system.md` states the drawer, chat and carousel figures
      (guarded).
- [ ] `COMPONENTS.md` and `TODO.md` record the work; the three consumer
      migrations are cross-team rows, not edits in another tree.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass, and the commit
      message records the two-direction proof.
