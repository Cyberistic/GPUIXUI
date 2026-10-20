# 601 — Keyboard and input conventions have one home

**Phase:** F (documentation platform, search)
**Workstream:** docs-site
**Depends on:** 410, 419, 431, 565, 566, 568, 574, 585, 598, 599, 600
**Status:** implemented — §6 records the commands, the 79-test suite and the six two-direction proofs

## 1. The measured defect

Plans 599 and 600 fixed the words for pages and for motion. A sweep of the
**keyboard and input-convention** vocabulary finds the same ranker limit on
eleven queries: the convention is stated once on Component API (or on
Accessibility, or in Theming's motion section), but the query lands on whichever
component happens to repeat the word. Measured 2026-10-20 at `31ec3907`:

| Query | First result today | Owning page |
| ----- | ------------------ | ----------- |
| `keyboard` | `/docs/components/keycap` | Component API (`## Keyboard`) |
| `keyboard shortcuts` | `/docs/components/keycap` | Component API |
| `keyboard support` | `/docs/components/keycap` | Component API |
| `enter key` | `/docs/components/keycap` | Component API |
| `space key` | `/docs/components/spacer` | Component API |
| `arrow keys` | `/docs/components/list#keyboard-and-focus` | Component API |
| `tab order` | `/docs/components/tabs` | Component API |
| `keyboard focus` | `/docs/components/keycap` | Accessibility |
| `reduced motion` | `/docs/components/skeleton#accessibility-and-limitations` | Theming (`#motion`) |
| `prefers reduced motion` | `/docs/components/skeleton#…` | Theming (`#motion`) |

Why each is structural:

- **A keycap is a picture of a key.** Keycap's page shows keycaps, so it wins
  `keyboard`, `enter key` and `keyboard shortcuts`; the contract that says what
  Enter, Space and Escape *do* is on Component API and never outranks it.
- **A word split into two components.** `space key` matches Spacer's title
  token and `tab order` matches Tabs'; neither is about the word the reader
  typed.
- **A summary that cannot win.** Plan 585 made Accessibility name keyboard
  focus, but a summary ranks below a component's text chunk.
- **A new section, one pass later.** `reduced motion` is answered by Theming's
  `## Motion` (plan 600), which states the runtime has no such query; Skeleton's
  limitation outranks the page that owns the statement.

This is the same class plans 598 and 599 answered, and the same narrow
mechanism: an editorial alias for a page, matched only as the whole query.

## 2. What to build

### 2.1 Extend the page-alias table

`apps/docs/src/lib/page-aliases.ts`:

```ts
[
  "/docs/component-api",
  ["escape", "escape key", "disabled", "disabled state", "keyboard", "keyboard shortcuts", "keyboard support", "enter key", "space key", "arrow keys", "tab order"],
],
["/docs/accessibility", ["keyboard focus"]],
["/docs/theming", ["motion", "animation", "easing", "reduced motion", "prefers reduced motion"]],
```

The header comment's pass count becomes three.

### 2.2 The guards

Extend `apps/docs/src/lib/page-aliases.test.ts`:

- `owned` gains the nine queries above (plus the two motion-section words);
- `regressions` gains `keycap`, `kbd`, `keybinding`, `hotkey input`, `spacer`,
  `tabs`, `list`, `skeleton`, `accessibility` — the pages these terms could
  steal. (`keybinding` and `kbd` are Keycap's component aliases; the page table
  must not take them.)

No new guard: the eight plan-598 table guards already reject a shared term, a
term equal to a component alias, and a component-page key.

### 2.3 The production check

`apps/docs/scripts/smoke-build.ts` gains `keyboard` → `/docs/component-api`
(`first: true`). It returns Keycap today, so the check is decisive.

### 2.4 The maintainer note

`apps/docs/README.md`: the page-alias paragraph's third pass sentence names the
keyboard vocabulary and the one production query. No new paragraph.

## 3. Order of work and commands

Run from `apps/docs`.

1. `src/lib/page-aliases.ts`: the three keys and the header sentence.
2. `src/lib/page-aliases.test.ts`: the tables.
3. `nub run --filter docs test src/lib/page-aliases.test.ts`.
4. The two-direction proofs in §5.
5. `scripts/smoke-build.ts` one query; README sentence.
6. `nub run --filter docs check-types` → exit `0`.
7. `nub run --filter docs test` → exit `0`; record the reported counts.
8. `nub run --filter docs smoke:build` → exit `0`, 99 pages, search checked.
9. Root gates: `nub run check`, `nub run lint`, `nub run test` → exit `0`.

## 4. STOP conditions

- `keyboard navigation` is a measured **non-fix**: the roadmap promotes a
  target of that exact name at rank `0`, the same tie plan 599 recorded for
  `row selection`, and overriding a named target is not this plan's call.
- `hotkey input` was a component-vocabulary gap, not a page one: the record's
  title is `Hotkey-recorder input`, so the query landed on Text inputs. The
  component table gains `hotkey input` and `hotkey recorder` (plan 566's
  table), and the regression pins Hotkey-recorder.
- Stop if a term equals a component alias (`kbd`, `keybinding`, `keybindings`,
  `key binding`, `key bindings`, `shortcut recorder`), a component title or a
  page title; choose a different word or drop it.
- Stop if a regression changes owner; report both results instead of adding a
  ranker tier.
- Do not add `shortcut` or `keybinding` to the page table: those are Keycap's
  and Hotkey input's own names and the component table owns them.
- Stop if `smoke:build` cannot run (exit `2`); report it as unverified.

## 5. Test plan

Each direction run and reverted:

1. Remove `"keyboard"` from Component API → the `keyboard` case fails by name.
2. Remove `"keyboard focus"` from Accessibility → that case fails with Keycap.
3. Remove `"reduced motion"` from Theming → the case fails with Skeleton.
4. Add `"kbd"` to Component API → the component-alias shadow guard fails.
5. Add `"tabs"` to Component API → the component-title shadow guard fails.
6. Remove the wiring and run `smoke:build` → exit `1` on
   `/api/search?query=keyboard`.

Regressions checked by hand and recorded in §6: `keycap` → Keycap, `kbd` →
Keycap, `keybinding` → Keycap, `hotkey input` → Hotkey input, `spacer` →
Spacer, `tabs` → Tabs, `list` → List, `skeleton` → Skeleton, `accessibility`
→ Accessibility, `escape key` → Component API, `motion` → Theming.

## 6. Measured results

Filled by the runs in §3.

### 6.1 What shipped

- `apps/docs/src/lib/page-aliases.ts` — nine keyboard terms on Component API,
  `keyboard focus` on Accessibility, `reduced motion`/`prefers reduced motion`
  on Theming.
- `apps/docs/src/lib/component-aliases.ts` — `hotkey input` and
  `hotkey recorder` on `hotkey-input`, the component-vocabulary half of the same
  sweep.
- `apps/docs/src/lib/page-aliases.test.ts` — 79 tests (was 60).
- `apps/docs/scripts/smoke-build.ts` — `keyboard` → `/docs/component-api`.
- `apps/docs/README.md` — the third-pass sentence and the two new production
  queries.

Two measured non-fixes: `keyboard navigation` stays on the Roadmap (it promotes
a target of that exact name, the `row selection` class plan 599 recorded), and
`shortcut`/`keybinding` stay on Hotkey input and Keycap (their own names).

### 6.2 Commands run

From `apps/docs`:

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test src/lib/page-aliases.test.ts` | 1 file / **79 tests** pass |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs test` | **113 files / 898 tests** pass |
| `nub run --filter docs smoke:build` | 99 pages, search checked, **exit `0`** |

From the repository root: `nub run check`, `nub run lint`, `nub run test` — all
exit `0`; the docs package reports 113 files / 898 tests.

### 6.3 Two-direction proofs (each run, then reverted)

| # | Forced defect | Measured failure |
| - | ------------- | ---------------- |
| 1 | remove `"keyboard"` | `keyboard → /docs/component-api` fails: `expected '/docs/components/keycap' to be '/docs/component-api'` |
| 2 | remove the Accessibility key | `keyboard focus` fails: `expected '/docs/components/keycap' to be '/docs/accessibility'` |
| 3 | remove `"reduced motion"` | fails: `expected '/docs/components/skeleton#accessibility-and-limitations' to be '/docs/theming'` |
| 4 | add `"kbd"` to Component API | the component-alias shadow guard fails with `[ 'kbd' ]`, and the `kbd keeps Keycap` regression fails with Text input… (Keycap) |
| 5 | add `"tabs"` to Component API | the page-title and component-name shadow guards both fail with `[ 'tabs' ]` |
| 6 | remove `"keyboard"` and run `smoke:build` | **exit `1`**: `FAIL /api/search?query=keyboard: the first result is not under /docs/component-api …`; restored → `smoke: search checked`, `smoke: ok` |

Regressions measured green in the same suite: `keycap` → Keycap, `kbd` →
Keycap, `keybinding` → Keycap, `hotkey input` → Hotkey-recorder (the new alias),
`spacer` → Spacer, `tabs` → Tabs, `list` → List, `skeleton` → Skeleton,
`accessibility` → Accessibility, `escape key` → Component API, `motion` →
Theming.
