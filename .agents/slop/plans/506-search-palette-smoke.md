# 506 — The search palette is keyboard-usable end to end (and stays so)

**Status:** planned → implemented
**Phase:** F (integration and polish) / G (release gate)
**Depends on:** 410 (site shell), 419/431/442/454/500 (search index and
ranking), 446/470/495 (the browser-smoke pattern), 496 (keyboard contract)
**Owns:** `apps/docs`, `docs/preview-strategy.md` is untouched, the
component-page template is untouched
**Number:** `506` — the `400–499` block is full; `500–505` are used, so the next
free number is `506` (`README.md` records the same rule for 500–505).

## 1. The two measured facts

1. **The palette has no UI gate.** `smoke:build` calls `/api/search` and proves
   the *index* answers; no check opens the dialog, types, selects a result or
   dismisses it. A Fumadocs upgrade, a `RootProvider` change or a broken
   hydration path could leave ⌘K dead and still pass every gate.
2. **Dismissing the palette loses keyboard focus.** Measured on the production
   build in headless Chrome, 2026-10-18:

   ```text
   open ⌘K  -> dialog[role=dialog] = 1, activeElement = INPUT[aria-label="Search"]
   Escape   -> dialog = 0, activeElement = BODY
   choose   -> pathname = /docs/installation, activeElement = BODY
   ```

   Root cause: Fumadocs renders a **controlled** Radix `Dialog` (no
   `DialogTrigger`). Radix restores focus to its trigger only when it owns one,
   so a `⌘K` open — and a pointer open — closes onto `<body>`. A keyboard user
   loses their place: on Escape they are back at the document start, and on a
   chosen result they are nowhere near the page they asked for.

This plan fixes (2) and adds the gate that would have caught both.

## 2. What to build

### 2.1 Pure rules — `apps/docs/src/search/focus.ts`

Export two total functions with JSDoc:

```ts
/** True for the palette shortcut: ⌘K on macOS, Ctrl+K elsewhere. */
export const isSearchShortcut: (input: {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
}) => boolean;

/** True only when a closer is an Escape dismissal of an open palette. */
export const shouldReturnFocus: (state: {
  readonly wasOpen: boolean;
  readonly open: boolean;
  readonly dismissedByEscape: boolean;
  readonly returnTargetConnected: boolean;
}) => boolean;
```

Rules: shortcut is `key.toLowerCase() === "k"` plus meta **or** ctrl; focus is
returned only when the palette *was* open, is now closed, the close was an
Escape, and the remembered target is still in the document. A close caused by
choosing a result must **not** pull focus back — the reader navigated.

No DOM types in this module, so the node-environment unit suite can test it.

### 2.2 The client behaviour — `apps/docs/src/search/search-focus.tsx`

A component that renders nothing and mounts an effect:

- remember `document.activeElement` on a capture-phase `keydown` that
  `isSearchShortcut` matches **and** the palette is not already open;
- remember the trigger element on a capture-phase `click` whose target is
  inside `button[data-search]` or `button[data-search-full]` (the two Fumadocs
  triggers);
- set `dismissedByEscape` on a capture-phase `Escape` while the palette is open;
- observe `document.body` with a `MutationObserver` (`childList`, `subtree`) and
  track the palette by `[role="dialog"] input[role="combobox"]`, the shape the
  installed Fumadocs renders;
- on close, call `shouldReturnFocus`; when it holds, focus the remembered
  target if it is an `HTMLElement` and still connected, else the first visible
  `data-search-full`/`data-search` trigger. Restore asynchronously
  (`queueMicrotask`) so Radix has finished its own close work.
- when the close was **not** an Escape and the pathname changed, focus the
  destination's `#nd-page` (the skip-link target both docs layouts already
  expose, `#main-content` as the fallback). The route may render a frame after
  the dialog leaves, so poll for up to 750 ms. A result on the same page (an
  anchor) does not move focus.
- return a cleanup that removes both listeners, disconnects the observer and
  clears any pending destination timer.

Mount it once in `src/routes/__root.tsx`, inside `RootProvider`, before
`PlatformProvider`.

### 2.3 The gate — `apps/docs/scripts/smoke-search.ts`

Follow `smoke-keyboard.ts` exactly: parse `--base-url`, `--chrome`,
`--no-build`; `startDocsPreview`; `startSession`; `SetupError` → exit `2`;
`problems` → exit `1`; print `smoke: ok` on `0`.

Checks, on `/docs/components/button` (a page whose own content is not the
result):

1. **Shortcut opens and focuses.** `pressShortcut("k")`, then wait for
   `[role="dialog"] input[role="combobox"]`; assert `document.activeElement` is
   that input.
2. **A query lists a real page.** `type("installation")`; wait until the dialog
   contains an option whose text includes `Installation`; assert at least one
   `[role="option"]`.
3. **Enter navigates, and focus follows.** Press `Enter` (the first option is
   already selected); assert `location.pathname === "/docs/installation"`, the
   dialog closed, and `document.activeElement.id === "nd-page"` — the new page's
   start, not `<body>` and not the old trigger.
4. **An unknown query shows the empty state.** Reopen with ⌘K, type
   `"zzzzzz"`; assert `[role="option"]` count is `0` and the dialog text
   contains `No results found`.
5. **Escape returns focus.** Press `Escape`; assert the dialog is gone and
   `document.activeElement` is the visible `data-search-full` (or
   `data-search`) trigger — not `body`.

Every failure names the step. Timing: wait up to 15 s for the palette (the
dialog is a lazy client chunk) and up to 5 s for results.

### 2.4 Wire-up

- `apps/docs/package.json`: `"smoke:search": "nub scripts/smoke-search.ts"`.
- `apps/docs/README.md`: a `## Search smoke` section beside the keyboard one,
  with the command, what it proves, and the exit contract.
- `content/docs/contributing.mdx`: one row in the Docs site table.
  `docs-checks.test.ts` fails until this row exists.
- `chrome-session.ts` already gained `pressShortcut`, `type` and the
  `Escape`/`ArrowDown`/`ArrowUp` keys for this plan.

## 3. Commands and expected results

```sh
cd apps/docs
nub run test               # 402+ tests; the new focus unit suite passes
nub run check-types        # app and preview document type-check
nub run smoke:search       # exit 0, one line per check, "smoke: ok"
nub run lint               # no findings
cd ../.. && nub run check  # test-quality gate, lint, format, types
```

## 4. Test plan and two-direction proof

Unit (`src/search/focus.test.ts`):
- `isSearchShortcut`: meta+k, ctrl+k and `"K"` are true; `k` alone, meta+other
  and ctrl+other are false. **Can fail:** changing the predicate to `key === "k"`
  makes the first assertion fail.
- `shouldReturnFocus`: true only for the full Escape state; false when the
  palette is still open, when it was never open, and when it closed by
  selection. **Can fail:** returning `true` unconditionally fails the three
  negative cases.
- `shouldFocusDestination`: true only for a chosen result that changed the
  pathname; false for an Escape dismissal, a same-page result and a palette that
  was never open. **Can fail:** dropping the `pathChanged` term fails the third
  case.

Browser:
- **Fix direction:** with `<SearchFocusRestore />` mounted, checks 3 and 5 pass.
- **Regression direction (Escape):** remove the component from `__root.tsx`,
  rebuild, run `smoke:search` → exit `1`, naming Escape focus (`activeElement`
  is `body`).
- **Regression direction (selection):** keep the component but drop the
  `focusDestination` call, rebuild, run → exit `1` at check 3 ("left focus on
  body, expected the destination page").
- **Non-vacuity direction:** change the palette selector in the smoke to
  `[role="dialog"] input[type="search"]` (absent) and run → exit `1` at "the
  palette did not open". Record it.

## 5. STOP conditions

- Stop if the installed Fumadocs renders the palette with neither
  `[role="dialog"]` nor a combobox input; record the real DOM and do not guess
  a selector.
- Stop if Escape closes onto `<body>` even with the component mounted — that
  means the observer never saw the close; capture the DOM mutation timeline and
  report instead of adding a global `focus()` on every close.
- Stop if `smoke:search` needs the network: it must run against the built
  worker only.

## 6. Acceptance

- `nub run smoke:search` exits `0` on the production build, and `1` when the
  focus restore is removed.
- The palette opens by ⌘K, lists the real Installation page, navigates with
  Enter and focuses the destination page, shows "No results found" for an
  unknown query, and returns focus to the search trigger on Escape.
- `nub run test`, `check-types`, `lint`, `nub run check` green.
- `README.md`, `contributing.mdx`, the plan index and `TODO.md` updated; the
  two-direction outputs recorded in §7.

## 7. Results

**Implemented 2026-10-18.**

Files: `src/search/focus.ts`, `src/search/focus.test.ts`,
`src/search/search-focus.tsx`, `src/routes/__root.tsx` (mount),
`scripts/smoke-search.ts`, `scripts/chrome-session.ts` (`pressShortcut`, `type`,
`Escape`/`ArrowDown`/`ArrowUp`), `package.json` (`smoke:search`),
`content/docs/contributing.mdx`, `apps/docs/README.md`.

Measured on the production build in headless Chrome:

| Run | Result |
| --- | --- |
| `nub scripts/smoke-search.ts` (fix in place) | `smoke: search palette checked` / `smoke: ok`, exit `0` |
| `<SearchFocusRestore />` removed from `__root.tsx`, rebuilt | `FAIL /docs/components/button: Escape left focus on body, expected the search trigger`, exit `1` |
| `focusDestination` call dropped, rebuilt | `FAIL /docs/components/button: choosing a result left focus on body, expected the destination page`, exit `1` |
| palette selector changed to `input[type="search"]` (absent), `--no-build` | `FAIL /docs/components/button: the ⌘K shortcut did not open the search palette`, exit `1` |

The fix direction and all three regression directions were measured, not
reasoned. Unit: `src/search/focus.test.ts` (12 assertions) is part of
`nub run --filter docs test` — 60 files / 412 tests, all pass. `check-types`
passes. One caveat recorded while measuring: choosing a result closes the
palette on the frame after the route changes, so the smoke waits for the close
rather than reading it once; that is navigation, not a defect.

