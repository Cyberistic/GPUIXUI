# 357 — The icon has no caller-style seam, and its page's facts are unguarded

**Phase:** F (Tier 1 truth pass) · **Owner:** primitives (icons) · **Depends on:**
`024`, `031`, `043`, `047`, `097`, `333` · **Status:** done

## 1. The defect

`packages/icons/src/Icon.tsx` is the one renderer in the library that cannot take
a caller's `style`:

```ts
export interface IconProps {
  readonly name: IconName;
  readonly color: string;
  readonly size?: IconSize | number;
  readonly label?: string;
  readonly testId?: string;
}
```

Every other primitive takes `style` and merges it **last** — that is the
documented package contract (`docs/component-api.md` §3, `COMPONENTS.md`'s Box
row) and it is guarded by `src/components/style-order.test.tsx` (plan `097`).
`Icon` sits outside that guard because it lives in a second package, so nothing
noticed that its surface is different.

Consequences a consumer hits immediately:

- an icon beside a line of text cannot be nudged onto the optical baseline
  (`marginTop` / `marginLeft` are unavailable), so the only workaround is to
  wrap every icon in a `Box` — and the library's own feedback example does
  exactly that kind of wrapper;
- an icon cannot be given a caller-owned paint or opacity when the caller is
  deliberately overriding the theme — a `StyleDesc` override is the one escape
  hatch every other primitive offers;
- a consumer porting a design that offsets an icon in a row reads the icon page,
  finds no `style` row, and concludes the library cannot do it.

The page also carries two facts that nothing checks (`packages/icons/docs/icon.mdx`):

1. its frontmatter says **"Forty-seven monochrome icons"**, while `ICON_NAMES`
   has **48** entries (measured 2026-10-18: `grep -c '"' packages/icons/src/names.ts`
   counts 48 names, and `registry.test.ts` asserts the registry matches it);
2. its `## Sizes` table repeats the `ICON_SIZES` numbers (`xs 12 · sm 14 ·
   md 16 · lg 20 · xl 24`), which come from `@gpuixui/tokens`' `iconSize`
   (plan `024`) — if tokens changes a step, the page silently lies.

That is the same bug class as plan `333` (a documented token path that did not
resolve) and plan `342` (a page that denied a capability): a public page states
something the source no longer says, and no test reads it.

## 2. The fix

### 2.1 `style` on `Icon`

Add one optional prop and merge it last, exactly as `mergeStyle` does elsewhere:

```ts
export interface IconProps {
  // …existing fields
  /** Extra paint or layout, merged last — the same contract as every primitive. */
  readonly style?: StyleDesc;
}
```

The renderer builds its defaults (size, tint, `flexShrink`, `pointerEvents:
"none"`) and then spreads the caller's style over them. The defaults remain the
honest behaviour with no `style` prop; a caller that overrides `width` alone
stretches the mark, which the page states.

The existing accessibility rule does not change: `role` and `aria-label` are set
from `label`, never from `style`.

### 2.2 The page's facts

- Drop the number from the frontmatter description instead of correcting it to
  "Forty-eight": a count that duplicates `ICON_NAMES.length` will drift again.
  The new description names what the page covers.
- Add the `style` row to the page's API table and to the README's export line.
- Add a guard that reads the page and compares its two tables to the source
  (see §4).

## 3. Files to change

1. **`packages/icons/src/Icon.tsx`**
   - import `StyleDesc`;
   - add the `style` prop with a TSDoc summary (the package's `tsdoc` guard is
     in `packages/primitives`, but the summary is required by AGENTS §4);
   - merge it last over the geometry style;
   - extend the docstring: the caller's style wins, the a11y rule is prop-driven.
2. **`packages/icons/src/Icon.test.ts`**
   - two new cases (§4).
3. **`packages/icons/src/docs.test.ts`** (new)
   - the doc/source guard (§4).
4. **`packages/icons/docs/icon.mdx`**
   - frontmatter description without a count;
   - `style` row in the API table;
   - a short "Positioning" note under Usage: offset an icon with `style`, which
     is merged last, and changing only `width` stretches the mark;
   - the verification list names the new guard.
5. **`packages/icons/README.md`**
   - the API export line gains `style?`;
   - the two accessibility rules gain one sentence: layout/paint overrides go
     through `style`, which does not touch the role or the name.
6. **`packages/primitives/runtime/icons.runtime.test.tsx`**
   - one native case: a caller `marginLeft` moves the painted mark (§4).
7. **`COMPONENTS.md`**
   - Icons row: record the caller-style seam and the guarded page;
   - the runtime count sentence gains `… at plan 357`.
8. **`TODO.md`**
   - one ticked primitives row for plan `357`; the section header becomes
     `102/102`.
9. **`.agents/slop/plans/README.md`**
   - add the `357` row to the primitives table.

## 4. Test plan

### 4.1 Offline — `src/Icon.test.ts`

- *merges a caller's style last without losing the defaults*: render
  `{ name: "check", color: "#123456", style: { marginTop: 2 } }`; expect
  `props.style.marginTop === 2`, `props.style.color === "#123456"`,
  `props.style.width === ICON_SIZES.md`, `props.style.pointerEvents === "none"`.
- *lets a caller's paint win*: render with
  `style: { width: 32, color: "#abcdef" }`; expect `width === 32` and
  `color === "#abcdef"`, while `height` is still `ICON_SIZES.md` (the caller
  chose a stretched mark; the default axis is unchanged).

Failure directions: delete the spread → the first case fails on `marginTop`;
spread the caller **first** → both cases fail on their overridden value.

### 4.2 Offline — `src/docs.test.ts` (new)

Read `docs/icon.mdx` and `src/Icon.tsx` with `node:fs` (the package's tests are
vitest, and this is the same technique as `docs-theme-paths.test.ts`):

- *the API table lists exactly the props the component accepts*: extract the
  `IconProps` interface body from `Icon.tsx`, collect each `readonly <name>?:`
  declaration; extract the first cell of every row in the page's `## API`
  table, strip backticks, and compare the two sorted sets. This fails if a prop
  is added without a page row (the `style` case in this plan) or a row is left
  behind after a prop is removed.
- *the size table matches the token scale*: extract the rows of `## Sizes`
  (`` | `xs` | 12 | ``) and compare the step → pixel map to `ICON_SIZES` from
  `src/sizes.ts`.

Failure directions: delete the `style` row from the page → the API case fails
naming `style`; change `xs` to `13` → the size case fails naming `xs`.

The parser must be narrow: only rows of the form `` | `<word>` | <number> | ``
inside the `## Sizes` section, and only the first cell of `## API` rows. If the
page cannot be parsed that way, the executor **stops** (see §5) rather than
weakening the test to something that always passes.

### 4.3 Native — `runtime/icons.runtime.test.tsx`

Mount `<Icon name="check" color="#123456" size="lg" testId="icon" />`, read
`runtime.bounds("icon").x`; remount the same icon with `style={{ marginLeft: 12 }}`
and read it again. Expect the second `x` to be exactly 12 greater. This proves
the caller's style reaches the renderer, not just the element tree.

Failure direction: drop the caller style from the renderer → both x values are
equal and the case fails by the measured delta.

### 4.4 Commands

```sh
nub run --filter @gpuixui/icons test
nub run --filter @gpuixui/primitives test:runtime
nub run check
nub run lint
nub run test
```

Expected: icons tests `18 → 20` (2 new element cases) plus the new
`docs.test.ts` (2 cases); primitives runtime `535 → 536`; every gate green.
Record the actual counts in §6 when done.

## 5. STOP conditions

Stop and report rather than improvise if:

- the caller's `style` changes the icon's accessibility role or name — the
  `role`/`aria-label` rule is prop-driven and must stay that way;
- the runtime bounds do not move with `marginLeft` — do not claim the seam
  reaches the paint; record the measured result and treat the runtime case as a
  documented limitation instead of deleting it;
- the docs guard cannot parse the page as specified without a fragile
  whole-prose heuristic — report the parsed shapes and ask for a narrower page
  format rather than testing something that cannot fail;
- any existing gate test fails for a reason other than the expected counts;
- `StyleDesc` cannot be imported from `@gpuix/react` in `packages/icons` (it can:
  `Icon.tsx` already imports `SvgProps`, whose `style` is `StyleDesc`).

## 6. Acceptance

- `<Icon … style={…} />` compiles and paints the caller's style last, without
  changing the icon's role, name, default size or pointer rule.
- The page and README document the seam and no longer state a stale icon count.
- `src/docs.test.ts` fails if the API table and the interface disagree, or if
  the size table and `ICON_SIZES` disagree; both failure directions measured.
- A native case proves a caller `marginLeft` moves the painted mark.
- `nub run check`, `nub run lint`, `nub run test` and the runtime suite are
  green; `COMPONENTS.md`, `TODO.md` and the plan index record the counts.

## 7. Result (2026-10-18)

Landed on `agent/primitives`.

- **Before:** `IconProps` had `name`, `color`, `size`, `label`, `testId`; there
  was no `style` seam, so `<Icon style={…} />` did not compile. `docs/icon.mdx`
  said "Forty-seven monochrome icons" while `ICON_NAMES` had 48, and its `##
  Sizes` table was unguarded.
- **After:** `Icon` takes `style?: StyleDesc` and spreads it last over the
  default geometry/tint/pointer rule; role and name still come from `label`.
  The page's description no longer states a count, the API table has the `style`
  row, and `src/docs.test.ts` compares the page's API table to `IconProps` and
  its size table to `ICON_SIZES`.
- Offline: icons **19 → 23 tests** (4 files; 2 new `Icon` cases + 2 new docs
  cases). Runtime: **536 tests** (27 files, +1).
- Native: a caller `marginLeft: 12` moved the painted mark from `x` to `x + 12`
  with `y` unchanged; `536/536` green.
- Both directions measured:
  - deleting the `style` spread → `Icon > merges a caller's style last without
    losing the defaults` and `… lets a caller's paint over the default size and
    tint` fail by name, and `runtime/icons.runtime.test.tsx > paints a caller's
    style last` fails (delta `0`, not `12`);
  - deleting the page's `style` row → `the icon page > documents every prop Icon
    accepts…` fails naming `"style"`;
  - changing the page's `xs` to `13` → `the icon page > states the size scale
    the component resolves` fails naming `xs: 13`.
- Every file restored after the proofs; the icons page's `md` row keeps its
  "(default)" note and the guard tolerates exactly one parenthesised annotation
  in the step cell.
