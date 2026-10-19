# 611 — Pagination normalises the page it exposes, and its edges stay inert

**Phase:** F (behaviour truth) · **Owner:** components workstream
(`packages/components`) · **Depends on:** 110, 113, 117, 139, 300, 333, 335,
513.

**Status when written:** open. The root promises a clamped page and the
Previous/Next controls promise they leave the tab order at the first and last
page, but three inputs reach `onPageChange` with a value that is not a page:

- a caller `disabled={false}` on Previous/Next replaces the component's own
  `disabled` (the prop spread follows it), so the edge control stays enabled;
- a fractional `page` is clamped but not truncated, so the window shows page 1
  while `current` is `1.5`, no item is painted as current, and Previous reports
  `0.5`;
- a fractional `pageCount` is compared whole only inside `pageWindow`, so
  `page={5}` of `pageCount={5.9}` renders five pages and still reports `6` from
  Next.

## 1. Measured bug (this host, 2026-10-19)

A throwaway `TestRenderer` probe under `vitest.behaviour.config.ts` captured the
current behaviour before any change. Four cases, all observed exactly:

| Fixture | Action | Observed |
| ------- | ------ | -------- |
| `page={1} pageCount={10}`, `<PaginationPrevious disabled={false}>` | press Previous | `onPageChange(0)` |
| `page={10} pageCount={10}`, `<PaginationNext disabled={false}>` | press Next | `onPageChange(11)` |
| `page={1.5} pageCount={5.9}` | render | pages `1…5`; **no** current item; Previous tabbable; press reports `0.5` |
| `page={5} pageCount={5.9}` | render / press Next | pages `1…5`; Next tabbable; reports `6` |

The probe was deleted after the measurement. The probe's assertions are the
ones written into the real suite in §5 (as the fixed expectations).

## 2. Decision

Normalise once in the root and make each edge control's guard authoritative:

1. **Whole, non-negative page count.** `pageCountOf(raw)` returns `0` for any
   non-finite value, otherwise `max(0, trunc(raw))`.
2. **Whole, in-range current page.** `currentPageOf(raw, pageCount)` returns
   `clamp(1, pageCount)(trunc(raw))`; `NaN` clamps to `1` (`effect/Number`'s
   documented order).
3. **Edges are OR-ed, never overridden.** Previous is disabled when
   `disabled === true || current <= 1`; Next when
   `disabled === true || current >= pageCount`. The handler also returns before
   reporting when the move would leave the range, so even a future prop-order
   mistake cannot report an impossible page. A caller `onClick` still runs first
   whenever the control is pressable (composition contract, plan 331).
4. `pageWindow` reuses the two helpers so the pure rule and the component cannot
   drift.

No part is renamed. `PaginationPrevious` and `PaginationNext` now **declare** the
`disabled` prop they already honoured at runtime through the host spread; it
only ever adds to the edge rule. A consumer that passes a valid integer sees
exactly the same output.

## 3. Files to create or change

| Action | Path | What |
| ------ | ---- | ---- |
| change | `packages/components/src/pagination/logic.ts` | `pageCountOf`, `currentPageOf`; `pageWindow` uses them |
| change | `packages/components/src/pagination/logic.test.ts` | fractional / non-finite cases (§5) |
| change | `packages/components/src/pagination.tsx` | root exposes the normalised count and page; Previous/Next OR the caller's `disabled` and guard the handler |
| change | `packages/components/src/behaviour/pagination.test.tsx` | four native cases (§5) |
| change | `packages/components/docs/pagination.mdx` | whole-number contract, edge inertness, verification count `13` → `17` |
| change | `COMPONENTS.md` | Pagination row: count `13` → `17`, record the normalisation |
| change | `TODO.md` | tick the task under Tier 2 hardening |
| change | `.agents/slop/plans/README.md` | index this plan |
| change | `PLAN.md` | D30 records `611` as the claimed components number |

No new component, export or dependency.

## 4. Implementation

`pagination/logic.ts` (top-level, above `pageWindow`):

```ts
import * as Num from "effect/Number";

/** A whole page count: non-negative, and a non-finite input is zero. */
export const pageCountOf = (raw: number): number =>
  Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;

/** The current page: whole, at least 1, at most the count. */
export const currentPageOf = (raw: number, pageCount: number): number =>
  Num.clamp({ minimum: 1, maximum: pageCount })(Math.trunc(raw));
```

`pageWindow` becomes:

```ts
const pageCount = pageCountOf(rawPageCount);
if (pageCount === 0) return [];
const current = currentPageOf(rawPage, pageCount);
```

`pagination.tsx` root:

```ts
const pageCount = pageCountOf(rawPageCount);
const current = currentPageOf(page, pageCount);
```

(rename the destructured props to `page: rawPage`, `pageCount: rawPageCount`),
keep the `pageCount === 0` early return, and pass `pageCount` (not the raw one)
to the context. `PaginationItem` continues to read the normalised count.

`PaginationPrevious` / `PaginationNext` declare `disabled?: boolean` (the `Props`
host type has no disabled) and apply it with the edge rule:

```ts
export interface PaginationPreviousProps extends Props {
  /** Disables the control in addition to the first-page rule. */
  readonly disabled?: boolean;
}
...
<Button
  ...
  {...rest}
  disabled={disabled === true || current <= 1}
  onClick={(event) => {
    onClick?.(event);
    if (current > 1) onPageChange(current - 1);
  }}
/>
```

Next uses `current >= pageCount` and `current + 1`. `disabled` is destructured so
it is not duplicated into `rest`.

## 5. Test plan

Pure (`src/pagination/logic.test.ts`), new cases:

1. a fractional `page` truncates before clamping (`1.9` of `10` is page `1`);
2. a fractional `pageCount` is whole (`5.9` is `5`; the list has no page `6`);
3. `NaN` `page` clamps to `1`; `0`/negative pages clamp to `1`;
4. non-finite `pageCount` (`NaN`, `Infinity`) yields `[]`, never a giant range.

Native (`src/behaviour/pagination.test.tsx`), four cases:

1. **"keeps Previous inert on page one even when the caller passes
   `disabled={false}`"** — press it, expect `onPageChange` uncalled. Fails
   before: reports `0`.
2. **"keeps Next inert on the last page even when the caller passes
   `disabled={false}`"** — press it, expect `onPageChange` uncalled. Fails
   before: reports `11`.
3. **"normalises a fractional page and count"** — `page={1.5} pageCount={5.9}`:
   no `"6"` text, page `1` carries `aria-selected`, Previous tabbable is `-1`,
   pressing Next reports `2`. Fails before: no current item, Previous `0`, and a
   Prev press reports `0.5`.
4. **"stops Next at the whole page count"** — `page={5} pageCount={5.9}`: pages
   `1…5`, Next `tabIndex -1`, press reports nothing. Fails before: reports `6`.

Both-direction proof: run the four native cases and the four pure cases on the
old source (they fail as recorded in §1), then after the change (all pass).
Reverting only the normalisation fails cases 3/4; reverting only the OR-ed
`disabled` fails cases 1/2.

## 6. Commands and expected results

From `packages/components`:

```sh
nub exec vitest run src/pagination/logic.test.ts
```

Expected: all window cases pass, including the four new ones (19 total).

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/pagination.test.tsx
```

Expected: `17` tests, all passing on this host (Pagination has no plan-540
binding failure). **STOP** if any pre-existing case fails beyond the four new
ones, or if the file count is not 17.

Then the package and repository gates:

```sh
nub run --filter @gpuixui/components test
nub run check-types
nub run lint
nub run fmt
cd ../.. && nub run check && nub run lint && nub run test
```

Expected: unit `449` passed (445 + 4 pure), behaviour `17` Pagination tests
green (the full suite keeps its known 35 plan-540 failures), types/lint/format
clean.

## 7. STOP conditions

- Any change to a valid-integer fixture's rendered output or call count.
- A pre-existing Pagination test failing after the change (other than when the
  suite is run against the old source for the both-direction proof).
- A need for a second clamping rule; stop and report — `pageCountOf` /
  `currentPageOf` are the one rule.
- `nub run check`/`lint`/`test` not all exit `0` (the behaviour suite keeps only
  its recorded 35 binding failures).

## 8. Acceptance

- `Pagination` exposes a whole page in `[1, pageCount]` and a whole
  non-negative `pageCount` to every part.
- Previous/Next never report a page outside that range, even when a caller
  supplies `disabled={false}`.
- The four pure and four native cases fail on the old source and pass on the new
  one; every other Pagination case and the docs count are unchanged except the
  documented `13 → 17`.
- Docs, `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 agree.
