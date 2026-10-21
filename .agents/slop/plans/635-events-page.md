# 635 — Events and input: the payload every handler receives

**Phase:** F (documentation completeness; a measured documentation gap)
**Depends on:** 410, 411, 412, 419, 431, 561, 566, 568, 587, 598, 601, 606, 621, 624, 626, 628, 629, 630
**Status:** implemented — see §9
**Owner:** docs-site workstream (`apps/docs`, `docs/preview-strategy.md`, the component-page template)

---

## 1. The gap this plan closes

Every component page shows `onClick`, `onKeyDown`, `onScroll`, `onFileDrop` and
friends in its generated host-props table, and the runtime sends the same
`EventPayload` object to all of them. **No page says what is in that object.**
The site documents the props (Component API's shared host props, plan 587), the
keyboard decisions (Component API `## Keyboard`, plan 601), pointer/touch
absences (Accessibility, plan 621) and the renderer's selection API (Selection,
plan 627) — but a reader writing `onClick={(event) => …}` cannot find
`event.elementId`, `event.clickCount`, `event.keyChar`, `event.deltaY`,
`event.paths` or `event.modifiers` anywhere.

Measured on 2026-10-21 in this worktree against the real `/api/search` merge
(a scratch vitest calling `search()`; deleted afterwards). First result before
this plan:

| Query | First result before | Correct owner |
| ----- | ------------------- | ------------- |
| `event` | `/docs/components/separator#accessibility-and-limitations` (text) | this page |
| `events` | `/docs/components/button#keyboard-and-focus` (text) | this page |
| `event payload` | `/docs/components/separator#accessibility-and-limitations` (text) | this page |
| `event object` | `/docs/components/separator#accessibility-and-limitations` (text) | this page |
| `event target` | `/docs/components/separator#accessibility-and-limitations` (text) | this page |
| `event.type` | **nothing** | this page |
| `event handler` | `/docs/testing#render-a-component` (text) | this page |
| `onClick` | `/docs/component-api#shared-host-props` (page) | Component API keeps the prop row; the page links here |
| `modifiers` | `/docs/components/button#sizes` (text) | this page |
| `double click` | `/docs/components/list#keyboard-and-focus` (text) | this page |
| `click count` | `/docs/components/countdown` (page) | this page |
| `mouse button` | `/docs/components/button` (page) | this page |
| `file drop` | `/docs/component-api#shared-host-props` (page) | this page |
| `drag and drop files` | `/docs/components/dropdown-menu` (page) | this page |
| `drop files` | `/docs/components/dropdown-menu` (page) | this page |
| `scroll delta` | `/docs/components/scroll-area` (page) | this page |
| `scroll event` | `/docs/components/scroll-area` (page) | this page |
| `deltaY` | `/docs/updates` (page) | this page |
| `e.key` | **nothing** | this page |
| `key event` | `/docs/components/keycap` (page) | this page |
| `key repeat` | `/docs/components/keycap` (page) | this page |
| `key held` | `/docs/components/keycap` (page) | this page |
| `middle click` | `/docs/components/otp-field#accessibility-and-limitations` (text) | this page |
| `stopPropagation` | **nothing** | this page |
| `onWindowKeyDown` | **nothing** | this page |
| `startIndex` | **nothing** | this page |
| `event bubbling` | `/docs/components/separator#accessibility-and-limitations` (text) | this page |

Queries that must **not** move (their owners are correct):

- `right click` → `/docs/components/context-menu`
- `pointer event`, `mouse event`, `touch` → `/docs/accessibility`
- `hotkey`, `global shortcut` → `/docs/components/keycap` (`hotkey` also Hotkey input)
- `cursor` → `/docs/styling`
- `keyboard`, `enter key`, `arrow keys`, `tab order` → `/docs/component-api`
- `onClick`, `onKeyDown`, `onFileDrop`, `onMouseDownOutside` → `/docs/component-api#shared-host-props`
  (the prop row; this plan does not steal the prop names)
- `testId` → `/docs/component-api#shared-host-props`

Two facts make the page necessary rather than nice:

1. **`@gpuix/native@0.10.0` declares a 25-field payload and 23 handlers.** A
   consumer can see the handlers but not a single field; the only place the type
   name `EventPayload` appears in content is one sentence on the Buttons page.
2. **The payload is the library's real interaction model.** Components are
   written on top of `event.value`, `event.key`, `event.deltaY` and
   `event.paths`; `packages/primitives/src/components/Input.tsx` reads
   `event.value`, `packages/primitives/src/core/keyboard.ts` reads `event.key`,
   and the dismiss stack consumes event identity (plan 589). MISSION asks for
   the input/interaction model to be documented, and this is it.

**Evidence boundary.** The page is derived from the installed declarations
(`index.d.ts`, `dist/host.d.ts`, `dist/mutations.d.ts`) and the installed
dispatcher (`dist/renderer-state.js`). It states that no probe measures a
DOM-style capture/bubble phase; the payload and the registry expose none, so a
handler must not depend on one. It must not claim event propagation behaviour
that was not measured.

---

## 2. What the page says (and where each claim comes from)

Page: `/docs/events`, title **Events**, sidebar after `component-api`.

Sections, in order:

1. **`## Every handler gets the same payload`** — one object, `EventPayload`,
   for all 23 host handlers; the handler prop chooses *which* events arrive,
   not the object's shape. Include a compiled `tsx` fence: a drop target that
   reads `event.paths`, clears on Escape through `event.key`, and renders the
   paths. One table: `<EventHandlerTable />` — 23 rows of handler prop, runtime
   event-type string, where it fires (every host element / `<diff>` /
   `<markdown>` / `<virtual-list>` / a `highlight` element / a `motion` track),
   and the extra fields it carries.
2. **`## The payload`** — `<EventPayloadTables />`, five groups, every one of the
   25 declared fields exactly once:
   - every event: `elementId`, `eventType`;
   - pointer: `x`, `y`, `button`, `clickCount`, `isRightClick`,
     `pressedButton`, `hovered`;
   - keyboard: `key`, `keyChar`, `isHeld`, `modifiers`;
   - scroll: `deltaX`, `deltaY`, `precise`, `touchPhase`;
   - element-defined: `value`, `oldLine`, `newLine`, `startIndex`, `endIndex`,
     `matchCount`, `motionGeneration`, `paths`.
   `elementId` is the runtime's numeric element id (not a locator; use `testId`
   for automation — link Automation); `eventType` matches the runtime key, not
   the React prop name (`onClick` → `click`).
3. **`## Modifiers`** — `EventModifiers`' four booleans (`shift`, `ctrl`, `alt`,
   `cmd`), rendered from the declaration. A shift-click or cmd-click is
   `event.modifiers.shift` / `.cmd`; the test renderer spells them
   `"cmd-shift"` (link Automation), which is a different string from the payload.
4. **`## Mouse input`** — `onClick` is primary-button only and `onAuxClick` is
   the non-primary click (both comments from `HostProps`); `button` is `0` left,
   `1` middle, `2` right; `clickCount` is the double/triple-click evidence (no
   `onDoubleClick`); `isRightClick` is the convenience flag; `pressedButton` is
   the held button during a `mouseMove`; `x`/`y` are window coordinates, so pair
   them with `getElementBounds` (link Automation) rather than assuming
   element-local coordinates. `onMouseDownOutside` is the outside-press signal
   the dismiss stack uses (link Component API `Layering`).
5. **`## Keyboard input`** — `key` is the GPUI key name (`"enter"`, `"escape"`,
   `"a"`, `"f1"`), `keyChar` is the produced character, `isHeld` marks a repeat;
   Enter and Space decisions stay with Component API's `## Keyboard`; focus
   arrives through `onFocus`/`onBlur`, and `autoFocus` sets native focus without
   dispatching `onFocus` (quote Accessibility's measured fact and link it).
6. **`## Scroll input`** — there is no `onWheel`; wheel and trackpad input arrive
   as `onScroll` on a scroll container with `deltaX`/`deltaY`, `precise`
   (`true` = pixel-precise trackpad, `false` = line-based wheel) and
   `touchPhase` (`started`/`moved`/`ended`). The sign is GPUI's: negative
   `deltaY` scrolls down, the opposite of the DOM (the renderer's
   `simulateScrollWheel` doc says so; link Scrollable containers for the
   component and Automation for the driver).
7. **`## Element-defined values`** — a table of the fields whose meaning depends
   on the emitting element: `value` (diff file path / hidden line count / line
   text / markdown link URL / joined selected text), `oldLine`/`newLine`
   (`<diff>` line click), `startIndex`/`endIndex` (`<virtual-list>`
   `visibleRange`), `matchCount` (`highlight`, every retained match, counted once
   per match), `motionGeneration` (`motionComplete`), `paths` (OS file drop).
   Link Native elements (the elements), Selection (`highlight` and
   `selectionChange`) and Data display (virtualized rows).
8. **`## Window-level events`** — the three handlers that are **not props**:
   `render(node, { onKeyDown, onKeyUp, onSelectionChange, onEvent })`
   (`RenderOptions extends WindowKeyEventHandlers`). Their signature is
   `(event, renderer) => void`; the dispatcher rewrites window key events to
   `elementId: 0` and `eventType: "keyDown"`/`"keyUp"`, and a key action can
   consume the event before the window handler runs (the declaration says so).
   `selectionChange` carries the joined selected text in `value` (or leaves it
   absent when empty); Selection owns the selection API. `onEvent` is the
   every-event tap for instrumentation. `<WindowEventTable />` renders the three
   handlers and their one-line contract.
9. **`## What is not in the payload`** — `<EventAbsences />`, each row with the
   substitute or the owning page:
   - no `target` / `currentTarget` — one numeric `elementId`; no DOM node;
   - no `preventDefault` / `defaultPrevented` — Component API's rule, and the
     payload has no cancel channel;
   - no `stopPropagation` and no capture/bubble phase in the payload or the JS
     registry — the registry dispatches by element id and event type; keep an
     interaction on one element and lift data through state;
   - no event timestamp;
   - no `onDoubleClick` — use `clickCount`;
   - no `onContextMenu` — use `onAuxClick` + `isRightClick` (Context menu owns
     the component);
   - no `onWheel` — `onScroll` deltas;
   - no touch/pointer/stylus events — Accessibility owns the absence;
   - no drag-and-drop events (`onDragStart`/`onDragOver`/`onDrop`) — only
     `onFileDrop` with `paths`;
   - no clipboard events — Selection records the clipboard absence;
   - no window resize/move/close/focus event — Window owns the size/inset
     observers.
10. **`## Evidence on this site`** — derived from the installed declarations and
    the installed dispatcher; no probe measures capture/bubble; the live scenes
    prove individual interactions (Previews owns the list), not the event stream.
11. **`## Related`** — Component API (keyboard, host props, layering),
    Accessibility (pointer/touch, focus ring), Native elements (which element
    emits which value), Selection and find, Automation (the same events driven
    programmatically), Testing (the `simulate*` methods), Window (geometry).

Cross-links added by this plan:

- `component-api.mdx`: one sentence in `## Keyboard` (or above the shared host
  props) linking [Events](/docs/events) for the payload object.
- `accessibility.mdx`: the pointer section links Events for the payload fields
  it names.

---

## 3. Files to create

All paths relative to `apps/docs/`.

### 3.1 `src/lib/events.ts` (new)

Authored data plus a pure guard, mirroring `updater.ts` / `native-text.ts`.
Exports:

```ts
export interface EventHandlerRow {
  readonly name: string;      // "onClick"
  readonly eventType: string; // "click"
  readonly firesOn: string;   // "Every host element"
  readonly carries: string;   // "x, y, button, clickCount, isRightClick"
  readonly summary: string;
}
export const eventHandlers: ReadonlyArray<EventHandlerRow>;

export interface EventFieldRow { readonly name: string; readonly type: string; readonly populatedFor: string; readonly summary: string }
export interface EventFieldGroup { readonly id: string; readonly title: string; readonly note: string; readonly rows: ReadonlyArray<EventFieldRow> }
export const eventPayloadGroups: ReadonlyArray<EventFieldGroup>;

export interface EventModifierRow { readonly name: string; readonly summary: string }
export const eventModifiers: ReadonlyArray<EventModifierRow>;

export interface WindowEventRow { readonly name: string; readonly signature: string; readonly summary: string }
export const windowEventHandlers: ReadonlyArray<WindowEventRow>;

export interface EventAbsence { readonly subject: string; readonly statement: string }
export const eventAbsences: ReadonlyArray<EventAbsence>;

export const eventPayloadFieldNames: ReadonlyArray<string>;

export interface EventSurfaceInput {
  readonly declarations: string;     // installed index.d.ts
  readonly hostDeclarations: string; // installed dist/host.d.ts
  readonly mutationDeclarations: string; // installed dist/mutations.d.ts
  readonly dispatcher: string;      // installed dist/renderer-state.js
}
export const eventSurfaceViolations: (input: EventSurfaceInput) => ReadonlyArray<string>;
```

`eventSurfaceViolations` rules (each returns a message naming the member):

1. Every `EventPayload` field declared in `declarations` is in
   `eventPayloadFieldNames`, and every row names a declared field.
2. `EventPayload` declares no field the page's absence list forbids
   (`target`, `currentTarget`, `preventDefault`, `defaultPrevented`,
   `stopPropagation`, `timestamp`).
3. `EventModifiers` declares exactly `shift`, `ctrl`, `alt`, `cmd`, and the
   module's rows match.
4. Every `on*?: (event: EventPayload) => void` in `interface HostProps` is a
   handler row, and every row names a declared handler.
5. The set of `[prop, eventType]` tuples in `EVENT_PROPS` equals the table's
   `(name, eventType)` pairs.
6. `HostProps` declares none of `onTouch*`, `onPointer*`, `onDrag*`, `onWheel`,
   `onDoubleClick`, `onContextMenu`, `onCopy`, `onPaste`, `onResize`.
7. `WindowKeyEventHandlers` declares `onKeyDown`, `onKeyUp`, `onSelectionChange`,
   all three are rows, and no fourth is declared.
8. The dispatcher source contains the window rewrite (`eventType: "keyDown"`,
   `eventType: "keyUp"`, `elementId: 0`) and the `selectionChange` branch.

The authored summaries state meaning only; the names and types come from the
declarations at test time.

### 3.2 `src/lib/events-search.ts` (new)

One `GeneratedSearchEntry` (`eventsSearchEntry`):

- `names`: the distinctive payload names — `eventPayloadFieldNames` filtered by
  `isDistinctiveName` (`elementId`, `eventType`, `clickCount`, `isRightClick`,
  `pressedButton`, `keyChar`, `isHeld`, `deltaX`, `deltaY`, `touchPhase`,
  `oldLine`, `newLine`, `startIndex`, `endIndex`, `matchCount`,
  `motionGeneration`) plus `EventPayload`, `EventModifiers`, `windowKeyDown`,
  `windowKeyUp`, `selectionChange`. **Not** `value`, `paths`, `modifiers`,
  `button`, `key`, `x`, `y`, `precise` (plain words owned elsewhere), and not
  any `on*` host prop (Component API's host-props entry owns those).
- `index`: title `Events`, url `/docs/events`, description and content built
  from the groups/handlers/absences, keywords `event payload event object
  modifiers click count file drop scroll delta window key`.

### 3.3 `src/components/event-tables.tsx` (new)

Three server components, following `updater-tables.tsx` exactly (accessible
scroll region, `data-event-*` attributes for tests):

- `<EventHandlerTable />` — handler, runtime event type, fires on, carries.
- `<EventPayloadTables />` — one section per group + the modifiers table.
- `<WindowEventTable />` and `<EventAbsences />`.

No colour or spacing literal: reuse the same `border-fd-border` /
`text-fd-muted-foreground` classes the other generated tables use, so the docs
theme owns the palette.

### 3.4 `content/docs/events.mdx` (new)

Frontmatter:

```yaml
---
title: Events
description: The event payload every handler receives — pointer, keyboard, scroll, file-drop and element-defined fields, modifiers, window-level keys, and what is not in the object.
---
```

The sections in §2, with `<EventHandlerTable />`, `<EventPayloadTables />`,
`<WindowEventTable />` and `<EventAbsences />` in place. One compiled `tsx`
fence (the drop target) with a real import of `react`'s `useState`; a `ts` fence
is not enough for the example contract.

### 3.5 `src/events.test.ts` (new)

Header comment states the bug guarded (measured 2026-10-21: 25 declared payload
fields and 23 handlers, no page; `event payload`, `click count`, `deltaY`,
`e.stopPropagation` and `onWindowKeyDown` reached prose or nothing).

Suites:

- **surface** — `eventSurfaceViolations` returns `[]` for the real input;
  each of the eight rules fails by name when its fact is changed in a copy:
  add a field, drop a row, add a handler, change a tuple's event type, add
  `preventDefault`, add `onPointerDown`, add a fourth window handler, remove the
  dispatcher's rewrite.
- **page** — `events.mdx` contains every section heading, every table tag, the
  compiled fence, no placeholder prose, and the sidebar/meta and MDX registry
  include it.
- **search** — `generatedSearchEntries` contains the entry; `event payload`,
  `event object`, `click count`, `file drop`, `scroll delta`, `deltaY`,
  `key repeat`, `stopPropagation` and `onWindowKeyDown` land on `/docs/events`;
  `onClick`, `onKeyDown` and `testId` stay on `/docs/component-api#shared-host-props`;
  `right click` stays Context menu; `pointer event` stays Accessibility;
  `keycap` stays Keycap.
- **byte lanes** — `search-docs.ts`'s `indexedSurfaces` gains the Events row.

### 3.6 `TODO.md` + plan index

- `.agents/slop/plans/README.md`: one row for 635 in the docs block.
- `TODO.md`: the docs workstream progress becomes 202/202; add the plan-635
  paragraph at the top of the docs section describing the measured gap and the
  delivered page (the same shape as plans 632–634).
- `PLAN.md`: one decision row (D71) recording that the event payload has one
  documented owner, Component API keeps the prop rows, and the evidence boundary
  is the declarations plus the dispatcher.

---

## 4. Files to change

| File | Change |
| ---- | ------ |
| `src/components/mdx.tsx` | import and register `EventHandlerTable`, `EventPayloadTables`, `WindowEventTable`, `EventAbsences` |
| `content/docs/meta.json` | add `"events"` after `"component-api"` |
| `src/lib/search.ts` | import `eventsSearchEntry`; add it to `generatedSearchEntries` |
| `src/lib/search-docs.ts` | add the Events `indexedSurfaces` row |
| `src/lib/page-aliases.ts` | new `/docs/events` block + the plan-635 paragraph in the header comment |
| `src/lib/page-aliases.test.ts` | `owned` rows for every new term; `regressions` rows pinning `right click`, `pointer event`, `keyboard`, `onClick`, `keycap`, `scrollbar`, `cursor` |
| `content/docs/component-api.mdx` | one link from the shared host props / keyboard section to Events |
| `content/docs/accessibility.mdx` | one link from the pointer/touch section to Events |
| `scripts/smoke-build.ts` | two production queries: `event payload` → `/docs/events`, `click count` → `/docs/events` |
| `src/example-snippets.test.ts` | add `"events"` to `extraPages` so the fence compiles |

**Aliases to add** (exact whole-query only; each must be answered by a section
or table on the page):

`event`, `events`, `event payload`, `event object`, `event type`, `event
handler`, `event handlers`, `event handling`, `event stream`, `click event`,
`key event`, `keyboard event` (moves from Keycap), `key events`, `key held`,
`key repeat`, `keyboard repeat`, `modifier keys`, `shift click`, `cmd click`,
`command click`, `double click`, `triple click`, `click count`, `middle click`,
`aux click`, `mouse button`, `mouse buttons`, `file drop`, `drop files`, `drop
a file`, `drag and drop files`, `scroll delta`, `scroll event`, `delta y`,
`e.key`, `event target`, `event bubbling`, `stop propagation`, `window key`,
`window keys`, `window key events`.

Deliberately absent (with the regression that proves it): `right click`
(Context menu), `pointer event` / `mouse event` / `touch` (Accessibility),
`keyboard` / `enter key` / `arrow keys` (Component API), `cursor` (Styling),
`hotkey` (Keycap), `onClick` / `onKeyDown` (Component API's prop table),
`prevent default` (Component API's keyboard rule), `scrollbar` (Scrollable
containers).

---

## 5. Commands and expected results

Run from the worktree root unless stated.

1. `cd apps/docs && nub exec vitest run src/events.test.ts src/lib/page-aliases.test.ts src/lib/search-docs.test.ts src/example-snippets.test.ts`
   Expected: all files pass. **STOP** if `example-snippets` cannot compile the
   fence: fix the fence, do not remove it.
2. `nub run --filter docs check-types`
   Expected: exit 0 (both the app and `preview/tsconfig.json`).
3. `nub run lint` and `nub run fmt`
   Expected: exit 0, no files reformatted.
4. `nub run --filter docs smoke:build`
   Expected: exit 0, `116 pages`, every internal link and fragment resolves,
   the anchor total grows, and both new search queries answer `/docs/events`.
   **STOP** on exit `2` (build/server) — report, do not retry unchanged.
5. `nub run --filter docs smoke:a11y` with `--only` if the script supports it;
   otherwise run it once (the page adds tables, so the axe sweep must see
   `<th>`/scope and keyboard-reachable scroll regions).
6. `nub run check` and `nub run test`
   Expected: exit 0. `check:tests` must accept every new assertion (no
   `check-tests-ok` escape).

Scoped scenario runs: this change touches no playground scenario, so no
`--only` native run is required. Record that explicitly in the commit body.

---

## 6. STOP conditions

Stop and report with evidence if any of these is true:

1. A declared `EventPayload` field has no truthful one-line meaning that can be
   derived from its doc comment — do not invent one.
2. The installed dispatcher does not contain the window rewrite this plan
   quotes, or its key names differ — correct the plan before implementing.
3. Adding the page requires editing another workstream's plan or package source.
4. `smoke:build` reports a fragment or link failure caused by another page
   (not this change) — record it in the workstream's cross-team tasks in
   `TODO.md` instead of editing that owner's page beyond a link fix inside
   `apps/docs`.
5. The `on*` handler set and `EVENT_PROPS` disagree — record the runtime defect
   in `TODO.md` under interlock, and document the disagreement rather than
   silently picking one.

---

## 7. Test plan (what must be able to fail)

| Guard | Fails when | Two-direction proof |
| ----- | ---------- | ------------------- |
| payload fields | a runtime upgrade adds/renames a field, or the page invents one | add a field to a declaration copy → violation names it; delete a row → violation names it |
| handler table | a handler is added/removed/renamed, or an event type changes | remove `onFileDrop` from `HostProps` copy → violation; change `["onScroll","scroll"]` → violation |
| absences | a forbidden field/prop appears, or the page claims an absence the runtime contradicts | add `preventDefault` to `EventPayload` copy → violation; add `onPointerDown` to `HostProps` copy → violation |
| window events | a fourth window handler appears or the dispatcher loses the rewrite | add `onWindowFocus` → violation; strip `eventType: "keyDown"` → violation |
| page | a section, table or the compiled fence is removed | delete `<EventPayloadTables />` → page test fails by name |
| search | an alias/promoted name is dropped, or a neighbour is stolen | delete the alias → owned query fails; add `onClick` to the promoted names → the regression query fails by moving off Component API |
| production | the built index loses the page | `smoke:build`'s two queries fail; reverting the `generatedSearchEntries` wiring reproduces it |

The regression queries are the second direction for the ranking rules: they
prove the new page did not take `right click`, `pointer event`, `keyboard`,
`keycap` or `onClick` from their owners.

---

## 8. Acceptance

- `/docs/events` exists in the sidebar, sitemap, `llms.txt` and page Markdown.
- Every one of the 25 declared payload fields and 23 handlers is rendered from a
  module whose names a test re-derives from the installed declarations, in both
  directions.
- The page has a compiled example, a search document, exact aliases, two
  production queries, cross-links from Component API and Accessibility, and no
  preview claim (it is a payload contract, not a painted surface).
- The measured queries in §1 reach `/docs/events`; the five regression queries do
  not move.
- `check`, `lint`, `fmt`, docs tests, `check-types`, `smoke:build` and the axe
  sweep are green; the scenario ids this change ran are recorded in the commit
  (none — no playground scenario is touched).

---

## 9. Measured results

Implemented on 2026-10-21 in `workspaces/docs-site`.

- **Surface.** 25 declared `EventPayload` fields and 23 `HostProps` handlers
  rendered from `src/lib/events.ts`; `EVENT_PROPS` supplies every runtime event
  type; the four `EventModifiers` booleans; three window handlers plus
  `onEvent`; twelve absences. The guard reads `index.d.ts`, `dist/host.d.ts`,
  `dist/mutations.d.ts` and `dist/renderer-state.js` in both directions.
- **Page.** `/docs/events` in the sidebar after Accessibility (the Accessibility
  guard pins it directly after Component API), the MDX registry, the sitemap,
  `llms.txt` and per-page Markdown; two compiled examples; cross-links from
  Component API's shared host props and Accessibility's pointer section.
- **Search.** 40 exact aliases, one generated document with promoted payload
  names only, listed in Site search's generated-document index, and two
  production queries in `smoke:build`.
- **Measured runs.**
  - `nub run --filter docs test` → 153 files / 1 857 tests, exit `0`.
  - `nub run --filter docs check-types`, `nub run lint`, `nub run fmt` → exit
    `0`.
  - `nub run --filter docs smoke:build` → 116 pages / 253 links / 1 499 anchors,
    exit `0`, both new queries answered.
  - `nub scripts/smoke-a11y.ts --only /docs/events --no-build` → 1 page × 2
    schemes, 0 violations, exit `0`.
  - No playground scenario is touched, so no `--only` native run was required.
- **Forced directions.**
  - Removed `<EventPayloadTables />` from the page → the registry/section guard
    failed by tag name; restored, passed.
  - Removed `eventsSearchEntry` from `generatedSearchEntries` → the generated
    document test failed; restored, passed.
  - Made the example read `event.modifiers.shift` (required) instead of
    `event.modifiers?.shift` → `example-snippets.test.ts` failed; restored,
    passed (46 tests across the two files).
  - The page test also renders all four tables to static markup and counts
    one `data-event-*` row per declared handler, payload field, window handler
    and absence, so a registered-but-empty table fails.
  - The suite's own mutated-copy cases cover a new payload field, a removed
    field, a forbidden field, a forbidden handler, a changed `EVENT_PROPS`
    tuple, a fourth window handler and a stripped dispatcher rewrite.
- **Ranking regressions kept.** `onClick`/`onKeyDown`/`testId` →
  `/docs/component-api#shared-host-props`; `right click` → Context menu;
  `pointer event` → Accessibility; `keycap` → Keycap; `keyboard` → Component
  API; `scrollbar` → Scrollable containers; `cursor` →
  `/docs/styling#the-supported-surface`.
- **Corrections.** The sidebar first placed Events directly after Component API,
  which `accessibility-page.test.ts` rejects (Accessibility is pinned there);
  Events moved after Accessibility. `cursor`'s recorded owner was the Styling
  page's `#the-supported-surface` section, not the bare page.
