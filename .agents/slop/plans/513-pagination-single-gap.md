# 513 — Pagination: an ellipsis never hides a single page

**Phase:** C/F (Tier 2 hardening) · **Owner:** components · **Depends on:** 113,
117, 139, 300, 333, 335, 383 · **Status:** done — 15/15 window tests,
13/13 Pagination native cases, behaviour 648, three mutation proofs, all gates
green

## 1. The defect

`packages/components/docs/pagination.mdx` promises:

> An ellipsis replaces a gap of two or more, while a gap of one renders the page
> itself.

`pageWindow` does not keep that promise. Two separate paths hide exactly one page:

1. **The fit threshold is one sibling short.** The function renders every page
   only when `siblingCount + 5 >= pageCount`, but the widest window it can draw
   is `2 * siblingCount + 5` entries (first, last, current, two ellipses and
   `siblingCount` on each side). With the defaults, a 7-page list is therefore
   windowed even though all 7 numbers fit.
2. **The gap is not inspected.** When a window is drawn, an ellipsis is emitted
   whenever an edge is omitted — even when the omitted run is one page. A single
   hidden page is a wasted click: the user must page through an ellipsis to reach
   an immediate neighbour.

Measured on the current code (this host, 2026-10-18):

```
pageWindow({ page: 4, pageCount: 7 })
  -> 1 … 3 4 5 6 7          (hides only page 2; 7 entries fit in full)

pageWindow({ page: 4, pageCount: 8 })
  -> 1 … 3 4 5 … 8          (the start gap is one page, page 2)

pageWindow({ page: 3, pageCount: 6, siblingCount: 0 })
  -> 1 … 3 … 6              (both gaps are one page, 2 and 4)

pageWindow({ page: 1, pageCount: 10, siblingCount: 4 })
  -> 1 2 3 4 5 6 7 8 … 10   (the end gap is one page, 9)
```

The same arithmetic is used by both the docs table and the rendered control, so
this is a real interaction defect, not just a wording mismatch. It is reachable
on any result set with 6–8 pages, a common size.

## 2. The rule

> An ellipsis always stands for at least two pages. If a gap would hide exactly
> one page, render that page instead. A list whose pages all fit the maximum
> window width (`2 * siblingCount + 5`) is rendered in full.

The window stays stable: promoting a one-page gap replaces the ellipsis with the
page it stood for, so the entry count does not grow; the threshold change only
affects lists that already fit the maximum width.

## 3. Files and exact changes

### 3.1 `packages/components/src/pagination/logic.ts`

Replace the block from `if (!showEdges) ...` to the end of the function with:

```ts
  if (!showEdges) return pages(left, right);
  if (2 * siblings + 5 >= pageCount) return pages(1, pageCount);

  const showStart = left > 2;
  const showEnd = right < pageCount - 2;

  if (showStart && showEnd) {
    return [
      page(1),
      // A gap that stands for one page is not worth an ellipsis: render the
      // page so the user need not page through a marker to reach a neighbour.
      left === 3 ? page(2) : ellipsis("start"),
      ...pages(left, right),
      ellipsis("end"),
      page(pageCount),
    ];
  }
  if (showStart) {
    return [
      page(1),
      ellipsis("start"),
      ...pages(Math.max(pageCount - (2 + 2 * siblings), 2), pageCount),
    ];
  }
  return [
    ...pages(1, Math.min(3 + 2 * siblings, pageCount - 2)),
    ellipsis("end"),
    page(pageCount),
  ];
```

Why only the both-sides branch can draw a one-page gap:

- It draws the start gap pages `2..left-1`, so `left === 3` means exactly page 2;
  promote it. Its end gap is `right+1..pageCount-1`; `showEnd` means
  `right < pageCount - 2`, so that run is always at least two pages.
- `showStart` only: the end of the list is complete, so there is no end gap.
  The start gap is `2..tail-1`; the new threshold guarantees `tail >= 4` when
  this branch runs, so it is at least two pages.
- The final branch: the start of the list is complete, so there is no start
  gap. The end gap is `head+1..pageCount-1`; the threshold guarantees
  `head <= pageCount - 3`, so it is at least two pages.

Do not change `pageWindow`'s exported signature or its clamp/truncation rules.

### 3.2 `packages/components/src/pagination/logic.test.ts`

**a.** Update the header comment: name the bug guarded — an ellipsis standing
for a single page, and a 7-page list being windowed although all 7 numbers fit.

**b.** Update `"widens the window with siblingCount"` to the promoted start gap:

```ts
expect(pageWindow({ page: 5, pageCount: 20, siblingCount: 2 })).toEqual([
  ...pages(1, 2, 3, 4, 5, 6, 7),
  gap("end"),
  ...pages(20),
]);
```

**c.** Replace `"keeps the head inside range when siblingCount is large"` with
two cases:

```ts
it("renders the whole list when siblingCount covers every page", () => {
  expect(pageWindow({ page: 1, pageCount: 10, siblingCount: 4 })).toEqual(
    pages(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
  );
  // A wide window near the end must not leave an ellipsis with no page behind
  // it (the old threshold drew one between pages 1 and 2).
  expect(pageWindow({ page: 9, pageCount: 10, siblingCount: 4 })).toEqual(
    pages(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
  );
});

it("keeps a wide sibling window inside range", () => {
  expect(pageWindow({ page: 5, pageCount: 14, siblingCount: 4 })).toEqual([
    ...pages(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
    gap("end"),
    ...pages(14),
  ]);
});
```

**d.** Add a table test for single-page promotion:

```ts
it("renders a page instead of an ellipsis when only one is hidden", () => {
  expect(pageWindow({ page: 4, pageCount: 7 })).toEqual(
    pages(1, 2, 3, 4, 5, 6, 7),
  );
  expect(pageWindow({ page: 4, pageCount: 8 })).toEqual([
    ...pages(1, 2, 3, 4, 5),
    gap("end"),
    ...pages(8),
  ]);
  expect(pageWindow({ page: 3, pageCount: 6, siblingCount: 0 })).toEqual([
    ...pages(1, 2, 3),
    gap("end"),
    ...pages(6),
  ]);
  expect(pageWindow({ page: 4, pageCount: 6, siblingCount: 0 })).toEqual([
    ...pages(1),
    gap("start"),
    ...pages(4, 5, 6),
  ]);
});
```

**e.** Add the invariant that generalises the fix. Reconstruct the run each
ellipsis stands for from its neighbours and require every run to be at least two
pages (a zero-page run — the old wide-sibling edge — fails too):

```ts
it("never hides exactly one page behind an ellipsis", () => {
  /** The sizes of the runs each ellipsis stands for, in render order. */
  const hiddenRuns = (
    entries: ReadonlyArray<PageItem>,
  ): ReadonlyArray<number> =>
    Arr.flatMap(entries, (entry, index) => {
      if (entry.kind !== "ellipsis") return [];
      const previous = Arr.findLast(
        Arr.take(entries, index),
        (candidate): candidate is { kind: "page"; page: number } =>
          candidate.kind === "page",
      );
      const next = Arr.findFirst(
        Arr.drop(entries, index + 1),
        (candidate): candidate is { kind: "page"; page: number } =>
          candidate.kind === "page",
      );
      return pipe(
        previous,
        Option.match({
          onNone: () => [],
          onSome: (before) =>
            pipe(
              next,
              Option.match({
                onNone: () => [],
                onSome: (after) => [after.page - before.page - 1],
              }),
            ),
        }),
      );
    });

  const cases = Arr.flatMap(Arr.range(1, 40), (pageCount) =>
    Arr.flatMap(Arr.range(0, 3), (siblingCount) =>
      Arr.map(Arr.range(1, pageCount), (page) =>
        pageWindow({ page, pageCount, siblingCount }),
      ),
    ),
  );

  expect(
    Arr.every(cases, (entries) =>
      Arr.every(hiddenRuns(entries), (size) => size >= 2),
    ),
  ).toBe(true);
  // Without this, a window that never drew an ellipsis would also pass.
  expect(
    Arr.some(cases, (entries) =>
      Arr.some(entries, (entry) => entry.kind === "ellipsis"),
    ),
  ).toBe(true);
});
```

The second assertion matters: without it the test would also pass if the window
never drew an ellipsis at all. Keep it.

### 3.3 `packages/components/src/behaviour/pagination.test.tsx`

Add one native case (12 → 13). Header comment: name the bug guarded — a single
hidden page reached through an ellipsis.

```tsx
it("renders a single hidden page instead of an ellipsis", () => {
  const seven = renderComponent(
    <Pager page={4} pageCount={7} onPageChange={vi.fn()} />,
  );

  expect(seven.renderer.findByText("…")).toBeUndefined();
  expect(seven.renderer.findByText("2")).toBeDefined();
  expect(seven.renderer.getAllText()).toContain("7");

  seven.unmount();

  const eight = renderComponent(
    <Pager page={4} pageCount={8} onPageChange={vi.fn()} />,
  );

  // The start gap is one page (2), so it is drawn; the end gap hides two.
  expect(eight.renderer.findByText("2")).toBeDefined();
  expect(
    eight.renderer.getAllText().filter((text) => text === "…"),
  ).toHaveLength(1);
  expect(eight.renderer.getAllText()).toContain("8");

  eight.unmount();
});
```

Check the renderer API before writing: `getAllText` is already used by this
suite and `findByText` returns `undefined` for a missing label. If `…` appears
inside a host wrapper, assert on `getAllText()` instead.

### 3.4 `packages/components/docs/pagination.mdx`

- Window rule table: change the fit row to
  ``a list that fits the maximum window (`2 * siblingCount + 5` or fewer pages)``
  and add ``page 4 of 8`` → `1 2 3 4 5 … 8` as a gap-of-one example.
- Keep the existing sentence "An ellipsis replaces a gap of two or more, while a
  gap of one renders the page itself." The implementation now matches it.
- Verification: 12 → 13 native tests and name the new case; extend the logic
  sentence to mention the single-gap invariant.

### 3.5 Records

- `COMPONENTS.md` Pagination row: `12 native behaviour tests + 9 window tests` →
  the measured counts after the run (`13` native and `15` window; the old `9`
  was already stale — the file had 12 cases).
- `src/pagination.tsx` → `paginationMeta`: no limitation is removed (none was
  recorded for this), but re-read the note to be sure it does not claim a
  behaviour the fix changes.
- `TODO.md`: add and tick under "Tier 2 hardening after the inventory closed":
  `Pagination never hides a single page behind an ellipsis — plan 513; 3 logic +
  1 native cases, both-direction proof; docs, COMPONENTS.md and inventory
  synced`.
- `.agents/slop/plans/README.md`: index this plan and mark it done after the run.

## 4. Commands and expected results

From `packages/components`:

```sh
nub exec vitest run src/pagination/logic.test.ts
```

Expected after the fix: all logic cases pass (the file's count rises from 12 to
15; measured on this host and used in the records).

```sh
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/components test:behaviour
```

Expected: `tsc` exit 0; the unit suite green; the behaviour suite `13` Pagination
cases green and the whole suite at 648 (647 + 1).

Both-direction proof (measured 2026-10-18 on this host):

| Mutation | Failures |
| -------- | -------- |
| restore the pre-fix `logic.ts` | 4 of 15 logic cases (`widens the window`, `renders the whole list`, `renders a page instead`, `never hides exactly one page`) and the one native case |
| revert only `2 * siblings + 5` to `siblings + 5` | 3 of 15 (`renders the whole list` — the zero-page ellipsis, `renders a page instead`, the invariant) |
| revert only the `left === 3` promotion | 3 of 15 (`widens the window`, `renders a page instead`, the invariant) |

The native failure on the old code is `findByText("…")` returning the ellipsis
element for `page={4} pageCount={7}`. Record any further failures before
restoring the fixed file.

Then, from the repo root: `nub run check`, `nub run lint`, `nub run test` — all
exit 0.

## 5. STOP conditions

- If any existing Pagination case (12 native, 12 logic) changes for a reason
  other than the two documented gaps, stop and report it. In particular the
  page-1 and page-10 rows in the docs table must not change.
- If the invariant test cannot find a single-gap case on the old code, the
  defect is not what §1 measured: stop and re-measure before changing the
  component.
- If `2 * siblingCount + 5` renders a list wider than the current maximum in a
  way that breaks a layout assertion, stop: the threshold is not the only rule
  and the plan must be re-opened.
- Do not add a `gap` prop, a new part or an animation; this is an arithmetic
  correction.

## 6. Acceptance

- The logic invariant passes for every `pageCount` 1–40, `siblingCount` 0–3 and
  every page, and it fails on the pre-fix code.
- The native case proves both directions: a 7-page list has no ellipsis and an
  8-page list promotes page 2 while keeping one ellipsis.
- Docs, `COMPONENTS.md`, the inventory counts and `TODO.md` agree with the
  measured test numbers.
- All three gates pass.
