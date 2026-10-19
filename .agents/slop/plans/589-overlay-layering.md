# 589 — Overlay layering is a documented convention

**Phase:** F (API conventions and search completeness)
**Workstream:** docs-site
**Depends on:** 410, 482 (Component API), 565 (accessibility surface),
587 (the shared-prop pattern), 479 (type-table rows dropped from search),
155 (the measured nested-overlay behaviour)
**Status:** implemented

## 1. The measured defect

`MISSION.md` requires a layering story for overlays, popovers and modals, and
the component API page is where the shared conventions live. It has none: the
real rule exists only in source comments and one Toast limitation
(`GPUix has no zIndex; stacking is paint order, so the viewport must be last`).

Measured on 2026-10-19 against the production search index (first result):

| Query | Before | The page that owns it |
| ----- | ------ | --------------------- |
| `layering` | **nothing** | Component API → Layering |
| `z-index` | Values API heading | Component API → Layering |
| `zindex` | Toast limitations paragraph | Component API → Layering |
| `stacking` | Stack component | Component API → Layering |
| `overlay` | Tooltip theming paragraph | Component API → Layering |
| `portal` | Drawer/Toast limitations | Component API → Layering |

The facts are already shipped and measured:

- `packages/components/src/toast/viewport.tsx` — "GPUix has no `zIndex`;
  stacking is paint order, so the viewport must be last in the app root".
- `packages/components/src/dialog.tsx` / `drawer.tsx` — the veil is an
  `<anchored position={{x: 0, y: 0}}>` at window coordinates because 0.10.0
  ships no portal.
- `packages/components/src/internal/dismiss-layer.ts` — open overlays push one
  stack; only the topmost consumes an Escape or outside press (plan 155's
  nested-popover measurement).
- `packages/components/src/internal/modal.ts` — a modal adds the focus trap and
  focus return.

## 2. What to build

### 2.1 `apps/docs/content/docs/component-api.mdx`

Add `## Layering` after `## Accessibility` and before `## State ownership`:

- GPUix has no `z-index` and no portal. A floating surface is an `<anchored>`
  layer; stacking is paint order, so the surface mounted last is on top.
- App-level surfaces (the Toast viewport) are ordinary elements rendered last
  at the app root.
- A dialog or drawer veil is anchored at window coordinates; mounted inside a
  scroll container it still paints at the window origin. This is a limitation,
  not a positioning choice.
- Open overlays push one dismiss stack; Escape or an outside press reaches only
  the topmost layer, so a popover inside a dialog closes first. A modal adds
  the Tab trap and focus return documented under Keyboard.
- Include the real `dismiss-layer.ts` (the mechanism, not a copy) and state the
  0.10.0 event rule: `EventPayload` has no `preventDefault`, so the stack
  consumes the event's identity.

### 2.2 `apps/docs/src/lib/layering-search.ts` (new)

A `GeneratedSearchEntry` (D32), because the section's prose is indexed but the
DOM words a reader types are not. It promotes the names no other page owns:

```ts
names: ["z-index", "zindex", "layering", "stacking"]
```

`z-index` and `zindex` are the DOM concept the runtime lacks; `layering` and
`stacking` name the section itself and have no competing owner (unlike `style`
or `overlay`, which stay prose). The URL is
`/docs/component-api#layering`. Add it to `generatedEntries` in
`src/lib/search.ts`.

### 2.3 Tests

- `apps/docs/src/component-api-page.test.ts` — the ordered section list gains
  `Layering`; the include list gains the real dismiss-stack source; the page
  says it has no `z-index` and no portal.
- `apps/docs/src/lib/layering-search.test.ts` — promoted names, exact ranks,
  and the integration queries: `z-index`, `zindex`, `layering` and `stacking`
  are first at `/docs/component-api#layering`; `overlay` is not promoted (the
  Tooltip page keeps its prose result).
- `apps/docs/scripts/smoke-build.ts` — one production query: `z-index` →
  `/docs/component-api`.

## 3. Files touched

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/component-api.mdx` | the `Layering` section and the real include |
| `apps/docs/src/lib/layering-search.ts` | new generated search entry |
| `apps/docs/src/lib/layering-search.test.ts` | unit and integration cases |
| `apps/docs/src/lib/search.ts` | add the entry |
| `apps/docs/src/component-api-page.test.ts` | section order and source guard |
| `apps/docs/scripts/smoke-build.ts` | one production query |
| `.agents/slop/plans/README.md`, `TODO.md` | index and result |

## 4. Commands and expected results

```sh
cd apps/docs
nub exec vitest run src/lib/layering-search.test.ts src/component-api-page.test.ts
# Expected before implementation: the module does not resolve and the section
# list fails.

nub run --filter docs test
# Expected: the full docs suite passes.

nub run --filter docs smoke:build
# Expected: exit 0; `z-index` is a page at /docs/component-api.
```

## 5. Test plan (two directions)

| Test | What it catches | Forced defect |
| ---- | --------------- | ------------- |
| section order | the layering convention silently disappears | delete `## Layering` → `component-api-page.test.ts` fails |
| include | the documented mechanism is a copy, not the shipped stack | point at a missing file → the page test fails |
| claims | the page drifts from the source | remove the "no `z-index`" sentence → fails |
| promoted names | a search entry promotes a name no section owns | add `overlay` → the no-promotion test fails |
| integration | `z-index`/`zindex`/`layering`/`stacking` reach the section | drop the entry → `z-index` returns Values API |
| production | the built index answers, not only the fixture | remove the entry → `smoke:build` fails by query |

## 6. Measured runs

(Filled by the executor.)

## 7. STOP conditions

- The source contradicts a sentence (for example a portal appears in a newer
  pinned release): stop and report the measured difference; do not keep the
  prose.
- `overlay` becomes the first result for an unrelated component query: drop the
  promotion and leave the word to prose.
- The section cannot include the real source without a path change in another
  workstream: stop; the include is part of the acceptance.

## 8. Acceptance

- Component API has a `Layering` section that states the paint-order rule, the
  no-portal veil limitation and the topmost-dismiss rule, and includes the real
  stack.
- `z-index`, `zindex`, `layering` and `stacking` reach the section first in the
  unit and production indexes; `overlay` is not promoted.
- All gates are green and the plan index / `TODO.md` describe the result.
