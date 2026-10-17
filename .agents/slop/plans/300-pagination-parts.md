# 300 — Pagination becomes a compound part

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200-adopt-compound-part-api.md`, `201-adopt-runtime-state-model.md` (the convention; a rewrite is not a prerequisite) |
| Status | planned |
| Source | `docs/component-api.md` §9 row "Pagination"; `TODO.md` → "Split the remaining landed deviations … into parts" |

This plan is self-contained. It migrates only Pagination. The other three
deviations (CommandMenu, Combobox, date/time pickers) are plans `301`–`303` and
must not be touched here.

---

## 1. Why

`Pagination` today builds Previous, the page window and Next internally. A caller
cannot put a page-size control between them, cannot replace the Previous/Next
labels with icons or localized words, and cannot add a "jump to page" button.
The contract (`docs/component-api.md` §1) says every region is a part.

The page **arithmetic** must stay in the root: the window is derived from
`page`/`pageCount`/`siblingCount`/`showEdges`, and pushing that mapping into every
consumer would duplicate the stable-width rule. So the split is: the root owns the
state, `PaginationList` renders the derived window, and the other parts are the
regions a caller composes around it.

## 2. The target API

```tsx
<Pagination page={page} pageCount={9} onPageChange={setPage}>
  <PaginationPrevious />
  <PaginationList />
  <PaginationNext />
</Pagination>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `Pagination` | `role="navigation"`, the name, the row layout, the clamping and the derival context | `page`, `pageCount`, `onPageChange`, `siblingCount?`, `showEdges?` |
| `PaginationPrevious` | the "‹ Prev" control; disabled on the first page | host props |
| `PaginationList` | maps the window to page buttons and ellipses; the only place `pageWindow` is called | host props |
| `PaginationItem` | one page number; current page is non-pressable and carries `aria-selected` | `page` (required) |
| `PaginationNext` | the "Next ›" control; disabled on the last page | host props |
| `PaginationEllipsis` | the non-focusable `…` for a gap | `side?: "start" \| "end"` (informs the accessible name only) |

Rules:

- `Pagination` still renders `null` when `pageCount <= 0`, and still clamps
  `page` into `[1, pageCount]` once; parts read the clamped value from context.
- A part outside `Pagination` throws `"Pagination parts must be used inside
  Pagination"`, the same shape every other compound uses.
- `onPageChange` is called only with a reachable page and never with the current
  page. That rule lives in the root/parts, once.
- `PaginationPrevious`/`PaginationNext` keep their visible labels and
  `aria-label`s exactly (`"‹ Prev"` / `"Previous page"`, `"Next ›"` / `"Next
  page"`), so the existing docs and screenshots stay true.
- The caller's `style` and host props on every part merge last and win.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/pagination.tsx` | rewrite as six parts over a context; keep the two existing limitations in `paginationMeta` |
| `packages/components/src/behaviour/pagination.test.tsx` | compose the parts in the helper; 8 existing tests stay, add 2 |
| `packages/components/examples/pagination.example.tsx` | compose the parts explicitly |
| `packages/components/docs/pagination.mdx` | anatomy table by part, composed snippet, updated test count |
| `COMPONENTS.md` | Pagination row: parts + new test count |
| `docs/component-api.md` | §8 Pagination row lists the six parts; delete the Pagination row from §9 |
| `TODO.md` | tick the Pagination slice of the deviation task |

No other module imports `Pagination` (`rg -n "<Pagination" packages apps examples`
before editing; expect only the example and the behaviour suite).

## 4. Commands and expected results

Run from the worktree root:

```sh
nub run --filter @gpuixui/components test:behaviour   # exit 0, Pagination 10 tests, total +2
nub run --filter @gpuixui/components test             # exit 0, logic + inventory suites
nub run check                                         # exit 0
nub run lint                                          # exit 0
```

STOP and report if a command fails for a reason this plan does not name.

## 5. STOP conditions

Stop and report if:

- the window arithmetic would have to move out of `pagination/logic.ts` or into a
  consumer to make the parts work — that is a design error, not a code error;
- a part needs a `page`/`pageCount`/`onPageChange` prop of its own (the context is
  the answer; the only per-part data is `PaginationItem.page`);
- `PaginationList` cannot read the context without a render-time cycle (the root
  must not render the list itself);
- the existing behaviour suite cannot express a test because the old API is gone
  (rewrite the helper; do not keep a compatibility prop).

## 6. Test plan

`src/behaviour/pagination.test.tsx`, real GPUix renderer. Keep all eight existing
assertions (disabled edges, page number reported not index, current-page no-op,
Previous/Next stepping, ellipsis out of the tab order, Enter activation,
`pageCount: 0`, both-theme primary fill). Add:

1. **caller order is preserved** — compose `Previous`, a caller-supplied
   `PaginationItem page={7}`, `PaginationList`, `Next`; assert the rendered text
   order is `‹ Prev`, `7`, the window, `Next ›`. This is the regression guard for
   a root that ignores its children and renders the default sequence itself.
2. **a page item outside the list reads the root** — with `page={5}`, the extra
   `PaginationItem page={5}` carries the primary fill and does not call
   `onPageChange`; `PaginationItem page={6}` is ghost and does.

**Both directions.** Temporarily make `PaginationItem` paint `variant="primary"`
unconditionally: test 2 fails (page 6 is painted) and the both-theme fill test
fails. Restore. Test 1 fails if `Pagination` renders the parts itself instead of
`children`.

## 7. Acceptance criteria

- Six exported parts, each with JSDoc; no compatibility props on `Pagination`.
- `paginationMeta` unchanged except the limitations list if a new one is real.
- 10 native behaviour tests; docs page, example, `COMPONENTS.md` and the contract
  agree; Pagination removed from §9.
- All gates in §4 green.

## 8. Result

To be filled by the executor with the landed commit, the measured test counts and
the both-direction evidence.
