# 444 — Preview surfaces follow the docs' dark mode

**Phase:** F (truth) · **Owner:** docs-site · **Status:** planned
**Depends on:** 412 (preview tiers), 434 (token-driven previews), 416 (docs identity)

## 1. The defect

On a **dark** page every labelled tier-A preview paints the **light** palette.
Measured 2026-10-17 against the dev server with headless Chrome:

```
<html class="dark" style="color-scheme: dark; --platform-mono: Menlo;" …>
<div data-preview-surface style="--preview-color-background:#F6F8FA; …">
```

`#F6F8FA` is `lightTheme.colors.background`; the dark role is `#11141A`. The
surrounding page, the sidebar and the code blocks are dark, so the preview is a
white rectangle in a dark page. It also means `MISSION.md`'s "light/dark docs
themes" is only half true: the chrome switches, the previews do not.

**Root cause (measured, not guessed).** `usePreviewTheme()
(src/components/preview/theme-surface.tsx)` reads
`next-themes`' `resolvedTheme`, which is `undefined` until the client mounts.
The MDX body is rendered behind
`use(page.load())` + `<Suspense>` (`src/routes/docs/$.tsx`); that subtree takes
its first client render while the provider still reports the server value and
**never re-renders when the provider settles**. Instrumenting the surface
showed `resolvedTheme: undefined` at paint, while a sibling that happened to own
a `useState`/`useEffect` re-rendered with `dark` — i.e. the value is available
one render later, but nothing schedules that render for a component that only
calls `useContext`.

This is the documented `next-themes` hydration boundary, not a token bug: the
tokens, `platformTheme` and the `PreviewSurface` mapping are all correct.

## 2. Decision

`usePreviewTheme` becomes **hydration-aware** with one explicit, tested rule:
the server and the hydration render use the light palette (the same HTML the
server sent), and one client render later the surface uses the docs' resolved
mode.

```ts
/** The preview mode: the server renders light; after hydration, the docs mode. */
export const previewMode = (
  mounted: boolean,
  resolved: string | undefined,
): ThemeMode => (mounted && resolved === "dark" ? "dark" : "light");
```

`mounted` comes from `useSyncExternalStore` with a no-op subscription
(`() => () => {}`, `() => true`, `() => false`) — React's designed
server/client-snapshot primitive, which guarantees the post-hydration render
instead of relying on an effect. `docsMode` is replaced by `previewMode` so the
old `resolved === "dark"` shortcut cannot creep back.

The dark palette is still **only** the library's `themes.dark` run through
`platformTheme`; nothing in `apps/docs` gains a colour.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `apps/docs/src/components/preview/theme-surface.tsx` | export `previewMode`; `usePreviewTheme` gates `resolvedTheme` on `useSyncExternalStore`; delete `docsMode` |
| `apps/docs/src/components/preview/theme-surface.test.tsx` | the three mode cases + the surface still maps a whole theme |
| `.agents/slop/plans/README.md`, `TODO.md` | index and tick this row |

## 4. Tests

`theme-surface.test.tsx` gains a `previewMode` suite:

- `previewMode(false, "dark")` → `"light"` — the server/hydration render must
  match the HTML the server sent, or React reports a mismatch;
- `previewMode(true, "dark")` → `"dark"` — the fix;
- `previewMode(true, undefined)` → `"light"` and `previewMode(true, "light")` →
  `"light"` — the fallback is the shipped default, never a guess.

Plus a rendered assertion that `PreviewSurface` paints
`--preview-color-background` from the theme it is given (existing coverage kept).

### Two-direction proof (AGENTS §3)

1. Write the `previewMode` tests with the ungated rule — the `mounted: true,
   resolved: "dark"` case must fail. Then apply the gate: green.
2. Browser proof in both directions (headless Chrome, dev server, OS dark
   preference):
   - with the fix, `/docs/components/button` in dark mode has
     `--preview-color-background:#11141A` (the dark role) and the same page in
     light mode has `#F6F8FA`;
   - reverting the gate restores `#F6F8FA` on the dark page.

The browser check is recorded here as measured evidence, not asserted by the
Node suite: the suite has no DOM, and a fake `resolvedTheme` cannot reproduce
the hydration ordering. `smoke:build` crawls SSR HTML only, so it cannot see
this either — automating the browser assertion is recorded as a `TODO.md` row
for the release gate rather than pretended here.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass; the new mode suite included |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs build` | exit `0` |
| `nub run --filter docs dev`, then headless Chrome on `/docs/components/button` (OS dark) | the surface's `--preview-color-background` is the dark role |
| `nub run --filter docs dev`, same URL with the light preference | the light role |
| `nub run check` / `nub run lint` / `nub run test` | green |

## 6. STOP conditions

- `useSyncExternalStore` does not schedule the post-hydration render in this
  TanStack Start tree: stop and record the measurement; do not paper over it
  with a `setTimeout` or a DOM class read that would hydrate mismatched HTML.
- The fix would require a docs colour literal: stop — the mode must select
  `themes[mode]` from `@gpuixui/tokens`.
- The light render after the fix is still wrong in **light** mode: stop and
  re-measure, because the fallback is supposed to be the light palette.

## 7. Acceptance

- A dark docs page paints dark previews, and a light page paints light ones,
  from the same library palette; the mode is chosen by one tested function.
- The server and hydration render stay light, so no hydration mismatch is
  introduced.
- All docs suites, type-check, build and the repository gate pass; the plan
  index and `TODO.md` are current; the change is pushed on `agent/docs-site`.

## 8. Progress (2026-10-17)

- **Measured first.** On a dark page the document had `class="dark"` while every
  `data-preview-surface` carried `--preview-color-background:#F6F8FA` (the light
  role). Instrumenting the surface showed `useTheme().resolvedTheme` was
  `undefined` there, and a sibling that owned a state update re-rendered with
  `dark` one pass later — the value existed, nothing scheduled the render.
- **Fix.** `usePreviewTheme` now gates the resolved mode on
  `useSyncExternalStore`'s server/client snapshot (`previewMode(false, …)` =
  light, `previewMode(true, "dark")` = dark). `docsMode` is gone.
- **Both directions proven.**
  - Unit: reverting `previewMode` to the old `resolved === "dark"` rule fails
    "stays light before hydration so the client render matches the HTML";
    restoring it passes.
  - Browser, headless Chrome against the dev server, OS dark preference:
    `/docs/components/button` now has `--preview-color-background:#11141A`
    (dark role); with the light preference `#F6F8FA` (light role);
    `/docs/theming` paints all five preview surfaces `#11141A`.
- **Not asserted in Node:** the hydration ordering, for the reason in §4. A
  `TODO.md` row records adding this to the release browser gate.
- **Superseded in part by 445:** the mount gate fixed the mode but not the
  platform; both now come from the document state the providers publish, with
  one parser and one subscription.
- **Verified:** docs suite (37 files, 211 tests), `check-types`, docs build,
  `smoke:build` (66 pages) and the repository gate green.

