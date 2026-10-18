# 480 — State ownership on the interactive compound pages

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 411 (page template), 427 (compound contract), 462 (the first two stateful records), 479 (real parts)

## 1. Why this plan exists

`MISSION.md` asks every component page to state which state belongs to the
component, which to the composite and which to the app. The page template has a
`## State and ownership` section for exactly that (`sectionsFor("stateful")`),
but only **Tabs** and **Toasts** carry it. The other interactive compound pages
describe their states inside `## States`, which answers *what the states are* and
not *who owns them*: a reader cannot tell whether `Dialog` will close itself,
whether `Combobox` keeps the query, or whether `Pagination` owns the page.

Plan 479 gave every compound record real parts. This plan marks the records
whose parts own interaction state as `stateful` and writes the ownership
section from the real source. Presentational compounds (Card, Alert, Breadcrumb,
Field, Fieldset, Keyboard shortcuts) and display-only records (Stepper,
Timeline) stay `static`: they own no state to hand over.

## 2. The records (19)

`accordion`, `carousel`, `collapsible`, `combobox`, `command-menu`,
`context-menu`, `date-picker`, `dialog`, `drawer`, `dropdown-menu`, `list`,
`mention-input`, `message-scroller`, `navigation-menu`, `pagination`, `popover`,
`preview-card`, `tag-input`, `time-picker` — plus the already-stateful `tabs`
and `toast`. The page for each gains `## State and ownership` **directly after
`## Composition`**, and the record gains `pattern: "stateful"`.

The claimed split, checked against the source before writing:

| Record | The component owns | The consumer owns |
| ------ | ------------------ | ----------------- |
| accordion | uncontrolled open set, trigger registry, arrow/Home/End focus, `collapsible` policy | controlled `value`, section content |
| carousel | uncontrolled index, slide-count registry, clamp/wrap | controlled `value`, slides |
| collapsible | uncontrolled open flag | controlled `open`, content; closed content unmounts |
| combobox | open, query, highlight | selection (controlled or `defaultValue`), options, meaning |
| command-menu | query, ranked rows, highlight | `open`/`onOpenChange` (required), action list, `perform` effects |
| context-menu | open, pointer point, dismiss layer, one submenu level | controlled `open`, rows and their actions |
| date-picker | popup open, visible month | controlled/uncontrolled day, `min`/`max`, `today`, meaning |
| dialog | uncontrolled open, dismiss layer, focus entry/return, Tab trap | controlled `open`, content, close decision |
| drawer | the same modal state through `internal/modal.ts` | controlled `open`, content, close decision |
| dropdown-menu | open, highlight, dismiss, focus return, one submenu level | controlled `open`, rows and actions |
| list | roving tab stop, multi-select anchor, uncontrolled selection | controlled selection, rows, `textValue`, `onActivate` |
| mention-input | text when uncontrolled, list open, query/ranking, highlight | candidates, insertion meaning, controlled text |
| message-scroller | pinned flag, unread count, re-anchor on append | message rows and their content |
| navigation-menu | one open panel (`value` controllable), dismiss layer | triggers, panels, links, meaning of a value |
| pagination | **nothing** — derives the clamped page and window | `page`, `pageCount`, `onPageChange` |
| popover | uncontrolled open, dismiss layer, Escape focus return | controlled `open`, trigger and content |
| preview-card | two delay timers, uncontrolled open | controlled `open`/delays, trigger and content |
| tag-input | draft text and field focus only | the token array (**controlled-only**) and removals |
| time-picker | segment drafts, canonical `HH:mm` emission | controlled/uncontrolled value, meaning |

## 3. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/src/component-meta/entries.ts` | `pattern: "stateful"` on the 19 records. |
| `apps/docs/content/docs/components/<slug>.mdx` | `## State and ownership` after `## Composition` (19 pages). |
| `apps/docs/src/component-meta/registry.test.ts` | The opt-in list grows to 29: the 19 plus Tabs/Toast plus the 8 static compounds from plan 479 that have parts only. |
| `apps/docs/README.md` | The template note names the shared ownership question and both worked examples. |
| `.agents/slop/plans/README.md` | This plan in the docs table. |
| `TODO.md` | A docs-site row, ticked; progress bar kept current. |

No `packages/*` change. The prose is derived from the shipped state, and if a
sentence cannot be supported by the source, the prose changes — never the
component.

## 4. Test plan

`component-pages.test.ts` already applies `sectionsFor(record.pattern)`, so a
`stateful` record without the section fails. The new work is to make that guard
run on 21 real records. Two-direction proof:

1. Temporarily change `dialog` back to `pattern: "static"` **and** delete its
   section → the opt-in list test fails with the missing slug; restore.
2. Leave `dialog` stateful and delete only the section →
   `component-pages.test.ts` fails with
   `dialog: missing section "State and ownership"`; restore.
3. Add `pattern: "stateful"` to a static record (`badge`) without a section →
   fails naming `badge`; restore.

The prose itself is not machine-checked for meaning. It is checked for claims
that contradict the shipped features by `component-truth.test.ts` and
`prose-truth.test.ts`; re-read the source of every record before writing its
paragraph, and do not copy a sentence from another component.

## 5. Commands

```sh
nub run --filter docs test          # exit 0
nub run --filter docs check-types   # exit 0
nub run --filter docs build         # exit 0
nub run check                       # exit 0
nub run lint                        # exit 0
nub run test                        # exit 0
```

## 6. STOP conditions

- A page's section would restate `## States` word for word: stop and name the
  owned/consumer split instead; the section is about ownership, not a second
  state catalogue.
- The source does not show who owns a value (no prop, no `useControllableState`,
  no `useState`): stop and report the record; do not guess.
- A record turns out to be presentational: leave it `static` and remove it from
  the list here rather than inventing state.
- A change to a component is needed to make a sentence true: stop; record it in
  `TODO.md` as a cross-team ask.

## 7. Acceptance

- 21 records are `stateful`; every page carries a truthful `## State and
  ownership` in the template position, naming both sides.
- The opt-in guard lists the real set; the three two-direction proofs are
  recorded.
- Every gate passes; the plan index, README and `TODO.md` are updated; the work
  is committed and pushed on `agent/docs-site`.

## 8. Progress (2026-10-18)

- **Landed.** 19 records are `pattern: "stateful"` (21 with Tabs and Toasts);
  each page carries `## State and ownership` directly after `## Composition`,
  written from its own source. Presentational compounds and display-only records
  stay `static`.
- **Two claims were corrected against the source before shipping**:
  `Popover` does not close on Tab (the content comment says it does, the dismiss
  path does not — the section now speaks only about Escape and outside presses),
  and `NavigationMenu`'s outside press closes without returning focus (only
  Escape does).
- **Two-direction proofs**, run and reverted:
  - deleting `dialog`'s section → `component-pages.test.ts` failed with
    `dialog: missing section "State and ownership"`;
  - adding `pattern: "stateful"` to `badge` (no section) → `component-pages`
    failed with `badge: missing section "State and ownership"` and
    `registry.test.ts`'s opt-in list failed too.
- `nub run --filter docs test`: 44 files / 276 tests green; `check-types`,
  `build`, `smoke:build --no-build` (85 pages / 104 links), `nub run check`,
  `nub run lint` and `nub run test` verified before the commit.
