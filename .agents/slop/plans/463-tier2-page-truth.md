# 463 — Tier 2 page truth: the pages stop denying features the components ship

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 424 (page truth pass), 425/461 (the delivered pages), components 111–119 and the merged expansion (submenus, multi-select, type-ahead, toast actions, measured placement)

## 1. Why

The 22 original Tier 2 pages were written in plan 425 against the components as
they were then. `origin/master` has since shipped behaviour those pages still
call absent, and one page describes a glyph as "until an icon package lands"
although `packages/icons` landed long ago. The docs are factually wrong in the
direction that matters most: a reader is told a delivered feature does not exist
and does not try it.

The measured component facts this plan documents (read from
`packages/components/src` in this tree):

| Component | Shipped behaviour the page denied |
| --------- | --------------------------------- |
| Accordion | `↓`/`↑` move focus between enabled headers, `Home`/`End` jump (`src/accordion.tsx`, `AccordionTrigger`'s `handleKeyDown` → `moveFrom`/`jumpTo`) |
| List | `selectionMode="multiple"` with Shift ranges, Cmd/Ctrl toggles, select-all and type-ahead (`src/list.tsx`, `src/list/selection.ts`, `useTypeahead`) |
| Dropdown menu | `DropdownMenuSub*` trio, 500 ms prefix type-ahead (`src/internal/typeahead.ts:33`) and a root surface that flips once from measured bounds (`src/dropdown-menu.tsx` JSDoc) |
| Context menu | `ContextMenuSub*` trio, `Shift+F10`/Menu key opening at the trigger (`src/internal/key.ts:61`), same submenu and type-ahead rules |
| Command menu | Default matcher is a case-insensitive **subsequence** with group-local ranking (`src/command-menu.tsx:10`, `rankByGroup`) |
| Toast | Pause on hover and on focus inside the card with remaining time kept (`src/toast/viewport.tsx`), one action per toast whose handler travels beside the draft (`src/toast/model.ts`, `src/toast/provider.tsx`) |
| Popover, Combobox | GPUix's `anchored` snaps but does not flip; the components compensate from measured bounds (`src/popover.tsx`, `src/combobox.tsx`) |
| Dialog, Search input | The close/clear glyph is still text because the icon set's mark is not wired, not because an icon package is missing (`packages/icons` exists) |
| Capabilities | The measured `align="center"`/`fit="snap"` limits are GPUix's, and this library's overlays compensate; the page said to prefer `align="start"` without saying the components already handle it (plan 323) |

## 2. What changes (exact files)

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/components/accordion.mdx` | Keyboard section: arrow/Home/End movement with wrapping and disabled skipping; limitations drop "no arrow keys". |
| `apps/docs/content/docs/components/list.mdx` | Summary, variants table and States: `multiple` mode, its value type, Shift/Cmd/Ctrl modifiers and type-ahead; limitations drop "no multi-select". |
| `apps/docs/content/docs/components/dropdown-menu.mdx` | Parts list gains the submenu trio; new `## Submenus` section; keyboard table gains letter keys; type-ahead paragraph; limitations state the one-level, right-only, no-fuzzy facts and the measured flip. |
| `apps/docs/content/docs/components/context-menu.mdx` | Parts list gains the trio; keyboard path `Shift+F10`; submenu/type-ahead paragraph; limitations corrected. |
| `apps/docs/content/docs/components/command-menu.mdx` | Limitations state subsequence matching, ranking and `filter` semantics. |
| `apps/docs/content/docs/components/toast.mdx` | Pause-on-hover/focus behaviour, new `## Actions` section with the real `push(draft, { onAction })` shape, limitations corrected. |
| `apps/docs/content/docs/components/popover.mdx`, `combobox.mdx` | The anchored surface snaps but does not flip; the component compensates from measured bounds. |
| `apps/docs/content/docs/components/dialog.mdx`, `search-input.mdx` | The glyph sentence names the real reason (the icon set's mark is not wired). |
| `apps/docs/content/docs/capabilities.mdx` | The floating-placement row records that our overlays compensate (opposite side, measured centre) while a raw `<anchored>` keeps both limits; evidence gains plan 323. |
| `apps/docs/src/component-truth.test.ts` | A `shippedFeatures` table pairs each feature's page evidence with the denial that must not survive; two tests report `slug: no …` and `slug: still denies …`. |
| `apps/docs/scripts/preview-server.ts` | `READY_TIMEOUT_MS` 30 s → 90 s, with the measured cold-start note (§4). |

No record, page section order or source include changes: this plan corrects
prose, it does not reshape the template.

## 3. What must stay true

- Section order and the required sections are untouched, so
  `component-pages.test.ts` still passes.
- No new claim is added without the source that proves it (§1). If a sentence
  cannot be traced to the file named in the table, it is not written.
- The Toast action example is the real API shape
  (`push(draft, { onAction })`), not an invented convenience wrapper.
- The Dropdown paragraph does not claim a left-side flip or a nested submenu
  suite: the source says one level, right only, no left flip.

## 4. The readiness budget — and why it has no unit test

`apps/docs/scripts/preview-server.ts` waits for `vite preview` before crawling.
With the merged toolchain (wrangler/workerd), a cold start was measured at
**45 s** on this host with no competing preview, so the 30 s budget reported
"could not verify" for a site that was fine (two `smoke:build` runs hit it on
2026-10-18). 90 s keeps a hung start a failure while a slow one passes.

There is deliberately no test for this change: the only observable is wall-clock
behaviour, and a test asserting the constant equals a value would compare the
value with itself (`scripts/check-tests.ts` rejects exactly that). The evidence
is the measured cold start and the two failed runs; the failure path is still
covered by the existing exit-`2` behaviour of both smoke checks.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 0 failures (42 files; the page guards accept the corrected prose) |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run --filter docs smoke:build` | exit 0 — a cold preview start within 90 s, every sitemap page and link |
| `nub run check` | test quality, lint, format, types green |
| `nub run lint` | exit 0 |

## 6. STOP conditions

- A sentence in §1 cannot be traced to the source named: stop and record the
  conflict in `TODO.md`; do not write the claim.
- A correction would break a template guard (a section rename, a dropped
  block): stop; the template is plan 411's contract, not this plan's.
- The existing page says something the source contradicts in the other
  direction (the page was right and the source changed): correct the page to the
  source and note it in §8; never edit `packages/components` from here.
- `smoke:build` still exceeds 90 s on an idle host: stop and report the measured
  time instead of raising the budget again.

## 7. Test plan

`component-truth.test.ts` gains the `shippedFeatures` table: each entry names the
page, the evidence the page must now carry, and the denial that must not survive.
The two tests are the regression guard; the table is non-vacuous because every
entry is a shipped feature from §1.

Both directions, measured:

1. **Without the fix:** the guard failed with 12 `no /…/` rows and 11
   `still denies /…/` rows.
2. **With the fix:** both tests pass.
3. **Re-break:** restoring `No submenus and no type-ahead in v1.` in
   `context-menu.mdx` fails with `context-menu: still denies /no submenus/i`.
4. **Re-break:** restoring the old popover sentence fails with both
   `popover: no /does not flip/i` and
   `popover: still denies /\bGPUix[^.;\n]{0,60}\bflips\b/i`.

The template guard still runs over the corrected pages.

## 8. Acceptance

- Every corrected claim is traceable to the file in §1.
- `component-pages.test.ts`, `component-truth.test.ts` and the rest of the docs
  suite pass; `check-types`, `build` and `smoke:build` pass; `nub run check`
  and `nub run lint` pass.
- `TODO.md` ticks the row; the commit is pushed on `agent/docs-site`.

## 9. Progress (2026-10-18)

- The eight pages named in §2 carry the corrected facts; the source lines in §1
  are the evidence for each. `capabilities.mdx` records the component-level
  compensation.
- The `shippedFeatures` guard was added to `component-truth.test.ts`; both
  directions and two re-break proofs are recorded in §7.
- `READY_TIMEOUT_MS` is 90 s with the measured cold-start note; no test, with
  the reason in §4.
- Measured on this tree after the corrections: `nub run --filter docs test`
  42 files / 260 tests green; `check-types` green.
