# 731 — The launch quality pass

| Field | Value |
| ----- | ----- |
| Owner | `native-mac` |
| Depends on | `721`–`730` |
| Status | in progress |

## Why

The owner is preparing a launch and asked for "the best possible design"
(2026-10-31). The 721–730 pass left known weaknesses; this plan is the list,
each item landing as its own commit with a test that can fail.

## Items

| # | Item | Done when |
| - | ---- | --------- |
| 1 | The account menu's eight failing behaviour cases | components behaviour is green — **done**: test drift from PR #1's handled-rows rule, not a product bug (`0d2c2d0eb`) |
| 2 | Press routing: no painted or positioned part swallows its control's press | `examples/blocks/src/press-routing.test.tsx` lists nothing across every block and example — **done**: 46 → 0 (`1dae8866b`) |
| 3 | `Select` as AppKit's pop-up button | **done**: the trigger had no chevron at all; it now ends in shadcn's chevron, and on darwin is a raised face with AppKit's up/down accent capsule (`select-popup.test.tsx`) |
| 4 | Deepen the Mac blocks | **done**: the agent's reply streams word by word with Stop; the viewer's photos are composed scenes (sky, sun, hills) instead of flat swatches; calendar events carry their time and clamp to two lines; the notes editor fills its pane; captures re-taken. **Kept**: the launcher keeps its own ranked list rather than `CommandMenu` (the ranking is its point and is tested) |
| 5 | A Hunter License block | **done**: `examples/blocks/src/license/` — the Association's registry as a Mac window: source list by rank and specialty, the licence card with the Gon mark, rank stars and number, privileges as switches; logic and renderer tests, docs page, capture, landing tile |
| 6 | By-eye pass in real windows | every Mac block opened natively and captured; needs the macOS privacy prompt answered |

## STOP

- Stop if a design change needs a runtime capability 0.11.0 lacks; record it.
- Stop before merging into `master` while the shared checkout carries another
  workstream's uncommitted edits.
