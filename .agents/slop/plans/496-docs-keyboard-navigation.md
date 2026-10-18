# 496 — Skip navigation and the docs focus ring

**Workstream:** docs-site. **Phase:** F/G (quality gate).
**Depends on:** 410 (the docs shell), 416 (the docs identity), 446/495 (the
browser smoke machinery). **Blocks:** nothing.

## 1. Goal

Give the documentation site the keyboard contract every page should have, and
put it behind a check that can fail:

- a **skip link** is the first tab stop on every page, hidden until focused, and
  moves focus into the page content (not just the scroll position);
- the site's own links, buttons and the platform `<select>` get a **visible
  focus ring drawn from the library's `ring` token** in both docs themes,
  instead of relying on whatever outline the browser happens to draw;
- `nub run --filter docs smoke:keyboard` proves both in a real browser, with the
  same `0` pass / `1` wrong / `2` unverified contract as the other smokes.

## 2. The gap, measured

On this branch, 2026-10-18:

```sh
grep -rn 'skip' apps/docs/src --include='*.tsx'     # nothing
grep -rn 'focus-visible' apps/docs/src --include='*.tsx' --include='*.css'
# only component-index.tsx's filter input
```

- `DocsLayout` renders `<main>` → `<article id="nd-page">`; `HomeLayout` renders
  `<main id="nd-home-layout">`. Neither Fumadocs layout ships a skip link.
- The landing CTAs, the component-index cards, the API/values/parts index rows
  and the theme's own links carry `hover:*` but no focus treatment. A keyboard
  reader gets the browser default outline, which does not use
  `--color-fd-ring` and is not part of the documented identity.
- The platform `<select>` and the buttons (`Clear filter`, `Load live preview`)
  have no focus rule either. `component-index.tsx`'s filter input is the one
  exception.
- No test can fail on any of this: `smoke:browser` reads preview palettes,
  `smoke:build` reads server HTML, and the unit suite never runs a browser.

## 3. Scope and boundaries

Owned files only:

- `apps/docs/src/components/skip-link.tsx` (new)
- `apps/docs/src/components/skip-link.test.tsx` (new)
- `apps/docs/src/components/landing.tsx` (the skip target on the body)
- `apps/docs/src/components/not-found.tsx` (the same target on a 404)
- `apps/docs/src/routes/index.tsx`, `apps/docs/src/routes/$.tsx` (render the link
  and make the target focusable)
- `apps/docs/src/styles/app.css` (the global focus-visible rule)
- `apps/docs/src/styles/theme.test.ts` (pin the rule to the ring token)
- `apps/docs/scripts/chrome-session.ts` (a real key press)
- `apps/docs/scripts/smoke-keyboard.ts` (new)
- `apps/docs/package.json` (`smoke:keyboard`)
- `apps/docs/content/docs/contributing.mdx` (the command table)
- `apps/docs/README.md` (what the check proves)
- `.agents/slop/plans/README.md`, `TODO.md`

Do **not** change the Fumadocs layouts, the preview system, any component
package, or the existing smokes' assertions. Do not add a dependency.

## 4. Files and exact changes

### 4.1 `apps/docs/src/components/skip-link.tsx` (new)

```tsx
/**
 * The first tab stop on every page: hidden until focused, then fixed to the
 * top-left over the chrome. `href` is the id of a `tabIndex={-1}` target, so
 * Enter moves focus into the page rather than only changing the hash (plan 496).
 */
export interface SkipLinkProps {
  /** The id of the focusable element the link jumps to, including `#`. */
  readonly href: string;
}

export function SkipLink({ href }: SkipLinkProps) {
  return (
    <a
      href={href}
      data-skip-link=""
      className="sr-only rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm font-medium text-fd-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Skip to content
    </a>
  );
}
```

`data-skip-link` is the handle the browser smoke reads; it also documents the
element's job in the DOM.

### 4.2 The targets

- `apps/docs/src/routes/$.tsx`: render `<SkipLink href="#nd-page" />` before
  `<DocsLayout>`, and pass `tabIndex={-1}` to `<DocsPage>` (its props spread
  onto `<article id="nd-page">`).
- `apps/docs/src/components/landing.tsx`: the root `<div>` gains
  `id="main-content"` and `tabIndex={-1}`.
- `apps/docs/src/components/not-found.tsx`: `NotFoundBody`'s root `<div>` gains
  the same two attributes; `NotFound` renders `<SkipLink href="#main-content" />`
  before `<HomeLayout>`.
- `apps/docs/src/routes/index.tsx`: render `<SkipLink href="#main-content" />`
  before `<HomeLayout>`.

Keep each skip link the **first** element of its route's tree so it is the first
tab stop.

### 4.3 `apps/docs/src/styles/app.css`

Append one rule after the platform block:

```css
/*
 * The site's own interactive elements focus with the library's ring token in
 * both themes (plan 496). `:where` keeps specificity at zero, so Fumadocs'
 * component styles still win where it styles focus itself.
 */
:where(a, button, select, summary, [tabindex]):focus-visible {
  outline: 2px solid var(--color-fd-ring);
  outline-offset: 2px;
}
```

### 4.4 `apps/docs/src/styles/theme.test.ts`

One test: the rule exists and names the ring token —

```ts
it("draws keyboard focus with the ring token", () => {
  const rule = css.match(
    /:where\(([^)]*)\):focus-visible\s*\{([^}]*)\}/,
  );
  expect(rule?.[1]).toContain("a");
  expect(rule?.[1]).toContain("button");
  expect(rule?.[2]).toContain("outline: 2px solid var(--color-fd-ring)");
});
```

This fails if the rule is deleted or its colour is retyped as a literal. The
browser smoke proves the computed result; this test names the token.

### 4.5 `apps/docs/scripts/chrome-session.ts`

Add a real key press to the session:

```ts
export type SessionKey = "Tab" | "Enter";

const KEY_CODES: Readonly<Record<SessionKey, number>> = {
  Tab: 9,
  Enter: 13,
};

// on Session:
readonly press: (key: SessionKey) => Promise<void>;
```

Implementation sends `Input.dispatchKeyEvent` twice: `keyDown` with
`{ key, code: key, windowsVirtualKeyCode: KEY_CODES[key], nativeVirtualKeyCode:
KEY_CODES[key] }` (plus `text: "\r"` for Enter), then `keyUp`. If Tab does not
move focus with `keyDown`, send `rawKeyDown` instead and record the measurement
in §7 — do not fall back to `element.focus()`.

### 4.6 `apps/docs/scripts/smoke-keyboard.ts` (new)

Same shape as `smoke-browser.ts`: `--base-url`, `--chrome`, `--no-build`, exit
`0/1/2`, `SetupError` → `2` with `smoke: not verified — …`.

Three targets:

| Path | Jump target | Scheme |
| ---- | ----------- | ------ |
| `/docs/components/button` | `#nd-page` | dark |
| `/` | `#main-content` | light |
| `/docs/does-not-exist` (the 404) | `#main-content` | dark |

Per target:

1. `setColorScheme`, `navigate`, wait for the address, then wait for
   `document.documentElement.dataset.platform !== undefined` (hydrated).
2. Read `a[data-skip-link]`: must exist; its rect is at most 1×1 wide before
   focus (`sr-only`), so the check proves the link adds no chrome.
3. `press("Tab")`: `document.activeElement` must be that link
   (`dataset.skipLink !== undefined`), and while focused its rect must be wider
   than 40 px and at least 16 px tall (`focus:not-sr-only`).
4. Read the focused link's `outlineWidth` (≥ 2) and `outlineColor`; compare it
   with the resolved `--color-fd-ring` (append a probe span whose `color` is the
   variable, read its computed colour, remove it). This is the assertion that
   fails when the CSS rule is removed: the browser default outline is not the
   token.
5. `press("Enter")`: wait for `location.hash` to equal the target; then
   `document.activeElement.id` must equal the target id. This fails when the
   target loses `tabIndex={-1}` (the hash changes but focus stays on the link).

Every failure names the page and the step, e.g.
`FAIL /docs/components/button: Tab did not focus the skip link`. Print
`smoke: <path> keyboard checked` on success and `smoke: ok` at the end.

### 4.7 `apps/docs/src/components/skip-link.test.tsx` (new)

`renderToStaticMarkup(<SkipLink href="#nd-page" />)`:

- renders `href="#nd-page"` and the visible text `Skip to content`;
- carries `data-skip-link` and `focus:not-sr-only` (the class that makes it
  visible when focused);
- starts `sr-only` (so it does not cover the chrome).

The test's job is to keep the component's three obligations named; the browser
smoke proves them.

### 4.8 `apps/docs/package.json`

```json
"smoke:keyboard": "nub scripts/smoke-keyboard.ts"
```

### 4.9 `apps/docs/content/docs/contributing.mdx`

Add one row to the Docs site table:

| `nub run --filter docs smoke:keyboard` | the skip link is the first tab stop, Enter moves focus into the page, and the focus ring is the theme's ring token | `1` wrong, `2` could not verify |

`docs-checks.test.ts` already fails when a `smoke:` script is not named on this
page, so the row is enforced.

### 4.10 `apps/docs/README.md`

A short `## Keyboard and focus` section: what the skip link targets on docs and
home pages, why the target carries `tabIndex={-1}`, that the ring is
`--color-fd-ring`, the command, and the `0/1/2` meaning.

## 5. Test plan

**The check must be able to fail.** Every proof is run, recorded in §7, and
reverted.

1. Delete `<SkipLink>` from `routes/$.tsx` → `smoke:keyboard` exits `1` with
   `Tab did not focus the skip link` for the docs target. Restore.
2. Remove `focus:not-sr-only` from `skip-link.tsx` → the focused rect stays
   1×1; the smoke fails `the skip link stayed hidden while focused`. Restore.
3. Delete the `:where(...):focus-visible` rule from `app.css` →
   `theme.test.ts` fails by name, and (after the unit test is made green by
   restoring it) removing only the declaration colour changes the smoke's
   `outlineColor`; record which assertion caught it. Restore.
4. Remove `tabIndex={-1}` from `<DocsPage>` → Enter sets `#nd-page` but
   `activeElement.id` is not `nd-page`; the smoke fails the focus assertion.
   Restore.
5. `skip-link.test.tsx` shipped with the `focus:not-sr-only` token removed from
   the component → the unit test fails. Restore.

## 6. Commands and expected results

```sh
nub run --filter docs test          # unit suites, incl. the two new files
nub run --filter docs check-types
nub run --filter docs build
nub run --filter docs smoke:keyboard          # builds; one Chrome, two pages
nub run --filter docs smoke:build
nub run --filter docs smoke:browser --no-build
nub run check
nub run lint
nub run test
```

Expected: the new smoke prints two `keyboard checked` lines and `smoke: ok`,
exit `0`; the existing smokes are unchanged; every gate green.

## 7. Measured results

Run on this host, 2026-10-18.

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | **54 files / 353 tests** pass (two new files: the skip-link render suite and the ring-token rule) |
| `nub run --filter docs check-types` | pass |
| `nub run --filter docs smoke:keyboard` | exit `0`; `/docs/components/button`, `/` and `/docs/does-not-exist` all `keyboard checked`; **90 s** including the production build |
| `nub apps/docs/scripts/smoke-keyboard.ts --no-build` | exit `0`; three pages, **~5 s** |
| `nub apps/docs/scripts/smoke-build.ts --no-build` | exit `0`; 90 sitemap pages, 109 links, search, 404 and robots checked |
| `nub apps/docs/scripts/smoke:browser.ts --no-build` | exit `0`; 101 hydrated-preview checks |
| `nub run check` | pass (test-quality gate, lint, format, every workspace type-check) |
| `nub run lint` | exit `0` |
| `nub run test` | exit `0` — tokens 197, testing 19, icons 19, playground 11, components 308, primitives 282, docs 353 |

Two measured facts shaped the implementation:

1. `sr-only` alone was not enough once tested in a built document: with the
   visual classes unprefixed, the resting link measured 26×18 (padding survived
   the hiding utility) and the smoke correctly failed. Every visual class now
   carries `focus:`, so the resting state is 1×1 and the focused state is
   126×38 with `padding: 8px 12px`.
2. Chrome's default focus ring is not the token: with the `app.css` rule
   removed, the focused link painted `rgb(153, 200, 255)` in dark and
   `rgb(0, 95, 204)` at 1 px in light. The rule paints `rgb(167, 169, 255)`
   (dark ring) and `rgb(117, 103, 242)` (light ring), matching
   `--color-fd-ring`.

Two-direction proofs:

1. **No skip link**: removed `<SkipLink>` from `routes/docs/$.tsx` →
   `smoke:keyboard` exited `1` with
   `FAIL /docs/components/button: no skip link in the document`. Restored →
   exit `0`. (The first version waited for the link before reporting and said
   "did not hydrate" / exit `2`; the readiness check now waits only for the
   target and the hydrated document, so a missing link is a site failure.)
2. **Never revealed**: removed `focus:not-sr-only` → exit `1` with
   `the skip link stayed hidden while focused (26x18)` on both pages. Restored →
   exit `0`. The unit test failed on the same removal
   (`expect(html).toContain("focus:not-sr-only")`).
3. **No ring token**: deleted the `:where(...):focus-visible` rule →
   `theme.test.ts` failed at `expect(rule?.[1]).toContain("a")`, and
   `smoke:keyboard` reported `focus outline is rgb(153, 200, 255), expected the
   ring token rgb(167, 169, 255)` (dark), plus the 1 px light ring. Restored →
   both green.
4. **Target not focusable**: removed `tabIndex={-1}` from `<DocsPage>` → the
   hash reached `#nd-page` but the smoke exited `1` with
   `focus stayed on "body", expected the "nd-page" target`. Restored → exit `0`.
5. **Component regression**: removed `focus:not-sr-only` from `skip-link.tsx`
   → `skip-link.test.tsx` exited `1` on the class assertion. Restored → green.

## 8. STOP conditions

- CDP `Input.dispatchKeyEvent` does not move focus on Tab: try `rawKeyDown` and
  record it. If neither works, **stop and report** — do not simulate the tab
  with `element.focus()`, which would prove nothing.
- Enter does not activate the anchor: report the measurement and use the
  focused link's `.click()` **only** if the run also proves Tab reachability and
  the target's focus move; record that Enter activation is browser-native.
- The skip link overlaps the Fumadocs header or the mobile sidebar trigger at
  either scheme: fix the position and re-run both smokes; do not hide it.
- A Fumadocs component needs the global rule narrowed: use the site's own class
  or a `:where` exception, never `!important`.

## 9. Acceptance checklist

- [ ] the skip link is the first tab stop on a docs page, the landing page and a
      404, and Enter moves focus to its target
- [ ] the link is hidden until focused and uses the ring token when focused
- [ ] every site link/button the rule covers draws the ring in both themes
- [ ] `smoke:keyboard` exits `0`, names each page, and exits `1` on each forced
      defect in §5
- [ ] `theme.test.ts` pins the rule to `--color-fd-ring` and fails when it is
      retyped as a literal
- [ ] Contributing and `apps/docs/README.md` document the command and its exits
- [ ] plan index and `TODO.md` updated; committed and pushed on
      `agent/docs-site`
