# 420 — the docs platform toggle (macOS · Linux · Windows · Default)

- **Workstream:** docs-site
- **Phase:** B → F (showcase quality; MISSION "Platform styles" requirement)
- **Owns:** `apps/docs/src/platform/**`, `apps/docs/src/components/platform-values.tsx`,
  `apps/docs/src/lib/layout.shared.tsx`, `apps/docs/src/routes/__root.tsx`,
  `apps/docs/src/styles/app.css`, `apps/docs/content/docs/theming.mdx`,
  `apps/docs/src/components/mdx.tsx`, `docs/preview-strategy.md`, this plan,
  the plan index row, the matching `TODO.md` / `COMPONENTS.md` notes.
- **Depends on:** 051 (`platformTypes`, `platformTheme`), 410 (site), 416 (theme from tokens).
- **Depended on by:** every future component preview (they must read the platform theme).

## 1. Why

`MISSION.md` now makes platform styles a first-class requirement: the site gets a
**macOS · Linux · Windows · Default** toggle, the choice lives in the page URL
(shareable) and is remembered across navigation, and previews switch with it.
`TODO.md` already assigns the docs half to this workstream: *"the docs platform
toggle (macOS / Linux / Windows / Default) built on `platformTypes` +
`platformTheme`"*. Nothing in `apps/docs` reads either export today.

## 2. Decisions

1. **The real theme, not docs CSS.** `platformTypes` supplies labels and the mono
   family; `platformTheme(theme, platform)` is what a preview will consume. The
   site never hard-codes a family per platform.
2. **URL is the source of truth; storage is the memory.** `?platform=win32`
   (values are `PlatformName`s). `default` is omitted from the URL — the default
   is the absence of a choice, so canonical URLs stay clean. `localStorage`
   (`gpuixui:platform`) remembers the choice when a navigation drops the query
   string, and the provider re-adds it with `history.replaceState` so every page
   remains shareable.
3. **URL beats storage** when both disagree: a shared link must win.
4. **Client-only application, no hydration mismatch.** The provider starts at
   `default` and resolves from URL/storage in an effect. The server render is the
   default; the reader never sees a flash of a different layout because only the
   mono family and the values card change.
5. **Honest surface.** `sans` is GPUI's `.SystemUIFont` sentinel, which a browser
   cannot resolve. The docs apply the **mono** family (code, kbd, the resolver
   snippet) and document that the UI face is native-only — the browser preview
   stays an approximation, never a claim.
6. **No new dependency.** URLSearchParams + React context are enough.

## 3. Files and exact changes

| File | Change |
| ---- | ------ |
| `apps/docs/src/platform/platform.ts` | **new** — `PLATFORM_PARAM`, `PLATFORM_STORAGE_KEY`, `platformNames`, `isPlatformName`, `platformFromParams`, `storedPlatform`, `resolvePlatform`, `applyPlatformToSearch` |
| `apps/docs/src/platform/platform.test.ts` | **new** — precedence, URL round-trip, unknown values, all four rows present |
| `apps/docs/src/platform/platform-provider.tsx` | **new** — context `{ platform, setPlatform }`, effect that applies `data-platform` + `--platform-mono`, URL/storage sync on every route change |
| `apps/docs/src/platform/platform-toggle.tsx` | **new** — `role="group"` of four `aria-pressed` buttons in `nav.children` |
| `apps/docs/src/components/platform-values.tsx` | **new** — MDX component: active platform label, `platformTheme` name and resolved `code` family (from the package, not a literal) |
| `apps/docs/src/components/platform-values.test.ts` | **new** — server render shows the default row and the package's family |
| `apps/docs/src/lib/layout.shared.tsx` | `nav.children: <PlatformToggle />` so both layouts carry it |
| `apps/docs/src/routes/__root.tsx` | wrap `<Outlet />` in `<PlatformProvider>` inside `RootProvider` |
| `apps/docs/src/styles/app.css` | `--platform-mono` consumer: code/pre/kbd use it; default value from the tokens default |
| `apps/docs/src/components/mdx.tsx` | register `<PlatformValues />` |
| `apps/docs/content/docs/theming.mdx` | new **Platform styles** section: the toggle, the URL/storage contract, what changes today and what waits on the component previews |
| `docs/preview-strategy.md` | previews must render with the active platform theme; the browser stays labelled |
| `TODO.md` / `COMPONENTS.md` | tick the docs half; record the tokens gap (platform themes differ only in families today, so "every preview changes" waits on richer platform values) |

### 3.1 `platform.ts`

```ts
import type { PlatformName } from "@gpuixui/tokens";

export const PLATFORM_PARAM = "platform";
export const PLATFORM_STORAGE_KEY = "gpuixui:platform";
export const platformNames = ["default", "darwin", "linux", "win32"] as const satisfies ReadonlyArray<PlatformName>;

export const isPlatformName = (value: string | null): value is PlatformName =>
  value !== null && (platformNames as ReadonlyArray<string>).includes(value);

export const platformFromParams = (params: URLSearchParams): PlatformName | undefined => {
  const value = params.get(PLATFORM_PARAM);
  return isPlatformName(value) ? value : undefined;
};

export const storedPlatform = (value: string | null): PlatformName | undefined =>
  isPlatformName(value) ? value : undefined;

export const resolvePlatform = (
  fromUrl: PlatformName | undefined,
  fromStorage: PlatformName | undefined,
): PlatformName => fromUrl ?? fromStorage ?? "default";

/** `default` removes the parameter; everything else sets it. Other params survive. */
export const applyPlatformToSearch = (search: string, platform: PlatformName): string => {
  const params = new URLSearchParams(search);
  if (platform === "default") params.delete(PLATFORM_PARAM);
  else params.set(PLATFORM_PARAM, platform);
  const next = params.toString();
  return next === "" ? "" : `?${next}`;
};
```

### 3.2 `platform-provider.tsx`

- `useRouterState({ select: (state) => state.location.href })` to react to every
  navigation (TanStack Start is already the router).
- Effect: read `new URL(window.location.href).searchParams`; resolve; set state;
  write storage; if the URL had no valid parameter and the resolved value is not
  `default`, `history.replaceState` the current path + `applyPlatformToSearch`
  + hash. Storage reads/writes are best-effort (private mode): a throw degrades to
  URL-only state, never a broken page.
- Second effect: `document.documentElement.dataset.platform = platform` and
  `style.setProperty("--platform-mono", platformTypes[platform].mono)`.
- `setPlatform` updates state, storage and the URL.
- Context default `{ platform: "default", setPlatform: () => {} }` so the
  toggle renders standalone in a test.

### 3.3 `platform-toggle.tsx`

```tsx
<div role="group" aria-label="Platform style" data-platform-toggle className="…">
  {platformNames.map((name) => (
    <button key={name} type="button" aria-pressed={platform === name} onClick={() => setPlatform(name)}>
      {platformTypes[name].label}
    </button>
  ))}
</div>
```

Selected style uses `bg-fd-primary text-fd-primary-foreground`; the rest
`text-fd-muted-foreground hover:text-fd-foreground`. No literal colours.

### 3.4 `platform-values.tsx`

Reads the context, calls `platformTheme(lightTheme, platform)` (and dark) and
`textStyle(..., "code")` for the resolved family, and renders a small table plus
a `<pre>`/`<code>` sample. The values come from `@gpuixui/tokens`; the component
invents none. This is what makes the toggle visibly real before component
previews exist.

### 3.5 Theming copy

State plainly:

- the four choices and where the control is;
- `?platform=` is shareable, `default` is omitted, `localStorage` remembers it
  across navigation;
- today the platform themes differ in the mono family and theme name — the
  richer per-platform control metrics are the tokens workstream's work
  (`TODO.md`), so the docs never imply more than the package ships;
- the UI face is `.SystemUIFont`, resolved only in the native runtime; the
  browser cannot and does not fake it.

## 4. Test plan

`platform.test.ts` (all pure, node environment):

| Test | Catches |
| ---- | ------- |
| every `PlatformName` has a row in `platformNames` and in `platformTypes` | a new platform added to the package but unreachable in the toggle |
| `platformFromParams(win32)` → `win32`; `?platform=bogus` → `undefined`; absent → `undefined` | an invalid value leaking into a theme lookup |
| `applyPlatformToSearch("?platform=linux", "default")` → `""` | a default choice polluting every canonical URL |
| `applyPlatformToSearch("?foo=1", "win32")` → `?foo=1&platform=win32` | dropping unrelated query state |
| `resolvePlatform(url?, storage?)` precedence: URL, then storage, then default | a shared link losing to stale storage |
| `storedPlatform("nope")` → `undefined` | corrupt storage crashing the provider |

`platform-values.test.tsx`: server render contains the active label and the
`platformTheme` code family (`Menlo` by default), and the values come from the
package (no literal in the component source — the theme test style is enough;
this test guards the wiring).

Two-direction proofs: remove the URL branch from `resolvePlatform` → the
precedence test fails; stop deleting the parameter for `default` → the canonical
test fails.

Browser proof (headless Chrome via CDP, as in plan 419): click Windows →
`html[data-platform="win32"]`, URL gains `?platform=win32`; navigate to another
docs page → the parameter is still there and Windows stays pressed; reload →
still Windows; click Default → the parameter disappears.

## 5. Commands and expected results

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | all suites pass, including the new ones |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run check` / `nub run lint` / `nub run test` | pass |
| dev server + CDP: the browser proof above | every step observed |

## 6. STOP conditions

- `@gpuixui/tokens` is not resolvable from `apps/docs` — STOP and report; do not
  re-implement the platform table in the docs app.
- TanStack Router fights `history.replaceState` (navigation reverts the query
  string on every click in a way the effect cannot repair) — STOP, report the
  observed behaviour; do not fork the router.
- A platform family is not installed on this box and the docs render falls back
  silently — report it; the values card must show the package's value, not a
  substituted font.

## 7. Acceptance criteria

- [x] The toggle offers macOS, Linux, Windows and Default, and is reachable from
      both the home and docs layouts.
- [x] A choice is applied to `<html data-platform>` and `--platform-mono`,
      written to the URL (except `default`), remembered across navigation and
      after reload, and a shared URL wins over stale storage.
- [x] The Theming page documents the contract and renders live package values.
- [x] Tests, both directions, the browser proof and all gates pass; committed and
      pushed on `agent/docs-site`.

## 8. Verification record

- `nub run --filter docs test`: 18 files, 93 tests pass.
- Two directions: removing the URL branch of `resolvePlatform` fails the
  precedence test; not deleting the parameter for `default` fails the canonical
  URL test.
- Headless Chrome (CDP), `/docs/theming` → Windows: `data-platform=win32`,
  `?platform=win32`, `<pre>` computed family `Consolas, …`; navigate to
  `/docs/installation` → the parameter and Windows stay; reload → still Windows;
  Default → the parameter disappears and Menlo returns.
- Shared URL beats storage: with `gpuixui:platform=win32` stored, opening
  `?platform=linux` renders Linux, `DejaVu Sans Mono`, and stores `linux`.
- The values panel on Theming renders `Light · Linux / Dark · Linux`,
  `.SystemUIFont`, `DejaVu Sans Mono` — all from `@gpuixui/tokens`.
