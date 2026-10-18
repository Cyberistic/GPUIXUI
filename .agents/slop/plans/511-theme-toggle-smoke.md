# 511 — The docs theme switch is operated, and the whole page follows it

**Status:** implemented (2026-10-18) · **Phase:** F (showcase) / G (release gate) ·
**Owner:** docs-site
**Depends on:** `410`, `416`, `434`, `444`, `445`, `446`, `495`, `496`, `510`
**Owns:** `apps/docs` (edits below), `TODO.md`, `PLAN.md`, this plan and the
plan index. `docs/preview-strategy.md` and the component-page template are
untouched.
**Number:** `511` — the next free number after `510`.

## 1. The gap this plan closes

`MISSION.md` requires "light/dark docs themes" and gives the platform toggle an
acceptance sentence that plan `509` turned into a gate. The **theme** control has
no such gate:

- `smoke:browser` and `smoke:preview` force the colour scheme through CDP
  (`Emulation.setEmulatedMedia`), so they prove that the site *renders* both
  modes; they never press the control a reader presses.
- `smoke:keyboard` visits a dark and a light page, also by forcing the scheme.
- `smoke:platform` operates the platform radio group, not the theme button.

So a regression that leaves the theme button inert — a `RootProvider` that
ignores its callback, a `forcedTheme` left in the tree, a preview surface that
stops reading the published mode — passes every check. Measured on the
production build today (a throwaway CDP probe, `data-theme-toggle`):

```text
light page   html="light" stored=null   body #F6F8FA  preview #F6F8FA
click        html="dark"  stored="dark" body #11141A  preview #11141A
navigate     html="dark"  stored="dark" body #11141A  preview #11141A
second click html="light" stored="light" body #F6F8FA  preview #F6F8FA
```

The behaviour is correct **today**; the plan is a gate. It also pins the two
facts a check must respect: the control is Fumadocs' `[data-theme-toggle]`
(one element, `aria-label="Toggle Theme"`), and the stored choice is
`localStorage["theme"]` = `"dark"` / `"light"`.

**One sentence for the plan's result:** `smoke:theme` presses the real theme
switch and proves the document class, the stored choice, the page background and
every preview surface move together, that the choice survives a navigation and a
reload, and that a second press returns to light — failing by name when any of
them stops.

## 2. Files to change

All paths relative to `apps/docs/`. Nothing outside `apps/docs`, `TODO.md`,
`PLAN.md` and `.agents/slop/plans/` is edited.

### 2.1 New: `scripts/smoke-theme.ts`

Mirrors `scripts/smoke-platform.ts`'s shape (options, `startDocsPreview`,
`findChrome`/`startSession`, `0`/`1`/`2` exits) and derives every colour from
`@gpuixui/tokens` (`lightTheme.colors.background`,
`darkTheme.colors.background`) converted to the `rgb(r, g, b)` form
`getComputedStyle` returns.

Constants measured, not typed from prose:

```ts
const TOGGLE = "[data-theme-toggle]";
const SURFACE = "[data-preview-surface]";
const BUTTON = "/docs/components/button";
const BADGE = "/docs/components/badge";
```

`readTheme(session)` returns one settled snapshot:

```ts
interface ThemeState {
  readonly dark: boolean;          // documentElement.classList.contains("dark")
  readonly scheme: string;         // computed color-scheme on <html>
  readonly stored: string | null;  // localStorage["theme"]
  readonly body: string;           // computed body background
  readonly surfaces: ReadonlyArray<string>; // computed background of each preview
  readonly toggles: number;        // count of [data-theme-toggle]
}
```

Steps, each reported by number and field:

1. **Light start.** `setColorScheme("light")`, open `BUTTON`, wait for
   `toggles === 1` and `surfaces.length > 0`. Assert: not dark, `scheme` is
   `light`, body and every surface are `rgb(light background)`, `stored` is
   `null` (a fresh profile has no choice yet).
2. **The press turns the page dark.** Click the toggle through
   `session.evaluate` (`element.click()`), then `waitFor` the dark class **and**
   every surface at `rgb(dark background)`. Assert: dark, `scheme` `dark`,
   `stored` `"dark"`, body and every surface are the dark background.
3. **A client navigation keeps it.** Navigate to `BADGE`; wait for the path and
   the same settled dark surface. Assert: still dark, body/surfaces dark,
   `stored` `"dark"`.
4. **A fresh document with no parameters remembers it.** Navigate back to
   `BUTTON` with no query string (a full load); still `setColorScheme("light")`,
   so only storage can explain dark. Assert: dark and `stored` `"dark"`.
5. **A second press returns to light.** Click again, wait for the light
   background, assert not dark, `stored` `"light"`, body and surfaces light.

A missing toggle is one named problem (`"the theme toggle is not in the page"`),
not a thrown error. Every wait has a timeout and reports the state it last read.

**Measured while implementing — the mount-effect race.** A press that lands at
the first painted frame is written over: next-themes resolves its stored/system
choice in a mount effect, so `element.click()` at `data-platform` time left the
document light and stored nothing, while the same click one second later
toggled. `press` therefore waits 1.5 s for the mode, then presses **once** more
only if the page did not move; a permanently dead control fails both presses and
is reported with the state it read. The retry cannot mask success: it runs only
when the first press changed nothing, so a working press is never applied
twice.

### 2.2 `package.json`

Add `"smoke:theme": "nub scripts/smoke-theme.ts"` beside the other smokes.

### 2.3 `content/docs/contributing.mdx`

One row (the `docs-checks.test.ts` guard fails until every `smoke:*` script is
named):

| command | proves | exit |
| ------- | ------ | ---- |
| `nub run --filter docs smoke:theme` | pressing the theme switch turns the document, the browser chrome and every preview surface dark; the choice survives a navigation and a reload; a second press returns to light | `1` wrong, `2` could not verify |

### 2.4 `README.md`

Add the command to the list and a short **Theme toggle smoke** section: what it
presses, what it asserts, why the scheme is **not** forced (storage must be the
only explanation), and the exit contract.

### 2.5 Ledgers

- `TODO.md`: one completed row in the docs-site list; `112/112`.
- `PLAN.md` §4: `D38` — the theme control is operated by a browser gate, not
  implied by forcing the colour scheme.
- `.agents/slop/plans/README.md`: the `511` row.

## 3. Commands, in order

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter docs check-types` | exit `0` |
| 2 | `nub run --filter docs test` | exit `0`; the Contributing guard fails before §2.3, passes after |
| 3 | `nub run --filter docs smoke:theme` | exit `0`, five steps reported, `smoke: ok` |
| 4 | `nub run check` | exit `0` |
| 5 | `nub run lint` | exit `0` |
| 6 | `nub run test` | exit `0` |

## 4. Test plan and the two directions

| # | Break | Expected failure | Restore |
| - | ----- | ---------------- | ------- |
| 1 | `<RootProvider theme={{ forcedTheme: "light" }}>` in `src/routes/__root.tsx` | step 2 fails: clicking leaves the document light even though the press stored `dark` (`the page did not turn dark`, naming class/background/surfaces) | remove the prop |
| 2 | `src/components/preview/theme-surface.tsx` paints the light palette regardless of the published mode | step 2 fails on the surface: the document is dark while a preview stays `rgb(246, 248, 250)` | restore |
| 3 | delete `smoke:theme` from `contributing.mdx` | `docs-checks.test.ts` fails: `smoke:theme` is not documented | restore |

Both browser breaks are rebuilt (`smoke:theme` builds by default) and run; the
observed messages go into §6.

### 4.1 What was measured

| # | Observed |
| - | -------- |
| 1 | `FAIL step 2: the page did not turn dark (dark false, stored dark, body rgb(246, 248, 250), previews rgb(246, 248, 250))`, `FAIL step 2: the document is light, expected dark`, 15 problems |
| 2 | `FAIL step 2: the page did not turn dark (dark true, stored dark, body rgb(17, 20, 26), previews rgb(246, 248, 250))` — the page moved, the preview did not; `FAIL step 2: a preview surface paints rgb(246, 248, 250), expected rgb(17, 20, 26)` |
| 3 | `AssertionError: expected [ 'smoke:theme' ] to deeply equal []` |

Restored tree: five steps checked, `smoke: ok`. The first, un-retried version of
the script failed step 2 because of the mount-effect race recorded in §2.1 —
measured, not guessed.

## 5. STOP conditions

Stop and report, do not improvise, when:

- `[data-theme-toggle]` no longer exists in the rendered header (a Fumadocs
  upgrade renamed it). Record the new attribute and stop; do not click by
  position or by a text label that i18n can change.
- the mode cannot be observed without forcing the scheme — a stored-only
  explanation is the point of step 4; a gate that forces dark cannot prove
  persistence.
- a step needs an edit outside `apps/docs`, `TODO.md`, `PLAN.md` or
  `.agents/slop/plans/`.

## 6. Acceptance criteria

- `smoke:theme` exits `0` on the production build and fails by name for each
  break in §4.
- The Contributing page names the script, and the guard proves it.
- `nub run check`, `nub run lint`, `nub run test` exit `0`.
- The scheme is forced only in step 1 and only to **light**, so a dark result
  after navigation can only come from the stored choice.
- No component page, preview strategy or search document changes behaviour.
