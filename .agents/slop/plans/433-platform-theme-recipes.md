# Plan 433: Platform theme recipes — a reshaped Windows (XP / Aero) and a live Omarchy-following theme

## Why

The platform style variants (macOS · Linux · Windows) are a **base, not a ceiling**. Two
things prove the "editable, ownable" promise in practice:

1. **Reshaping a platform style** — take the Windows variant and turn it into Windows XP
   (Luna) or Windows 7 (Aero). If a consumer can do that from the documented tokens, the
   variant is genuinely theirs; if they cannot, it was a skin.
2. **Following the system theme** — on a Linux desktop (Omarchy), the app should adopt the
   user's current theme **live**, the way a native app does, instead of asking them to
   re-pick colours.

Both ship as **documented recipes with working examples**, not prose.

## Recipe A — Windows XP (Luna) and Windows 7 (Aero)

Start from the **default Windows 11** variant and override tokens; keep the component code
untouched.

| Token group | XP (Luna) | Windows 7 (Aero) |
|---|---|---|
| Surface / background | `#ECE9D8` (classic), `#245EDB` (blue title bar) | `#F0F0F0`, glass blue `#A0C8F0` |
| Border / bevel | 1px `#003C74` + 1px `#FFFFFF` (light/dark pair) | 1px `#8E9BAE`, soft outer |
| Radii | 3px controls, 8px window | 4–6px, soft |
| Type | Tahoma 8.25pt | Segoe UI 9pt |
| Chrome | pill Start button, 3D button faces | thin title bar, glass sheen |

**Honest limits (from the capability map, `203`):** GPUix/GPUI has **no backdrop blur, no
inset shadows, no radial/conic gradients, no clip-path**. So Aero's glass is an
**approximation** — layered translucent surfaces and a two-stop band where a gradient would
be — and it must be labelled as such on the page. XP's 3D bevel is reproduced with a
light/dark border pair, not an inset shadow.

**Deliverable:** a docs page with a live switch **XP ↔ Aero ↔ default Windows**, the full
copyable theme file for each, and a short "what we could not reproduce" list.

## Recipe B — follow Omarchy's active theme

Omarchy (the Hyprland/Arch setup) applies a theme globally; its palette is on disk and
changes when the user runs `omarchy-theme-set <name>`.

**Verify the exact contract on a real machine before coding** — do not guess:
- the active-theme location (likely `~/.config/omarchy/current/theme/`, a symlink, and/or
  `~/.config/omarchy/themes/<name>/`),
- the palette file name and keys (Omarchy themes commonly ship a `colors.toml`),
- whether a reload writes the file, swaps a symlink, or signals a process.

**The adapter:**
1. Read the active palette.
2. Map it to our semantic tokens (`background`, `foreground`, `muted`, `accent`,
   `border`, `primary`, `destructive`, focus) — a **pure function**, `paletteToTokens`.
3. Watch for change and re-apply **live**, without a restart: a file watcher where the
   runtime has one, otherwise a documented poll interval.
4. Fall back to the default theme when the file is missing or a key is absent.

**References** (read for behaviour; record licences before adapting anything):
- `https://github.com/tahayvr/omarchist`
- `https://github.com/scottjones/omarchy-webapp-theme`

**Scope:** Linux-only for the live watcher; the mapper and the docs page are
platform-neutral. macOS/Windows system-theme following is explicitly out of scope.

**Deliverable:** a docs page + a runnable example (the playground on Linux) showing the
app's colours change when `omarchy-theme-set` runs, and the raw palette → tokens mapping
printed beside it so the reader can see the translation.

## Shared work

- `paletteToTokens` — pure, tested: complete palette maps every token; a missing key falls
  back to the platform default; unknown keys are ignored; an empty palette yields the
  default theme unchanged.
- A `watchSystemTheme` seam with an injected reader (so tests need no filesystem) and a
  documented watcher-vs-poll decision.

## Test plan

- **Unit (no native runtime):** the mapper's four cases above; the watcher's debounce
  (N change events → one re-apply); re-apply does not remount the tree.
- **Both directions:** delete a required key from the fixture → the fallback test fails;
  remove the debounce → the "one re-apply" test fails.
- **Native (playground):** run `omarchy-theme-set` while the app is open; the palette
  changes live. Screenshot both states.

## Acceptance

- [x] XP and Aero theme files exist, copyable, with the limits documented —
      `retroStyles` (`packages/tokens/src/retro.ts`), `docs/tokens.md` §Authored
      looks, `retro.test.ts`.
- [x] The Omarchy adapter follows a theme change live on Linux. **The tokens half
      is landed**: `paletteToTokens` / `paletteMode` / `watchSystemTheme` in
      `packages/tokens/src/system-theme.ts`, held by `system-theme.test.ts` (22
      cases), and the file's own reader — `decodeOmarchyPalette` in
      `packages/tokens/src/omarchy.ts` — which decodes the flat TOML
      `omarchy-theme-set` stages at
      `~/.local/state/omarchy/current/theme/colors.toml` (verified against
      Omarchy's `docs/theming.md` and the `themes/*/colors.toml` fixtures on
      `quattro`): `red`/`color1` → `danger`, `muted`/`color8` → `muted` **and**
      `border`, `accent`/`color4` → `accent`, `background`/`bg`,
      `foreground`/`fg`, `selection` and `mode`, with unreadable lines named in
      `problems` rather than guessed (`omarchy.test.ts`, 16 cases).
      `SystemPalette` carries the stated `mode`, and `watchSystemTheme` takes
      `baseFor` so a desktop's light/dark switch moves the base with the palette.
      Documented on `docs/tokens.md` §Omarchy's `colors.toml` and in the package
      README. Measured limit the pages now teach: a palette names the roles it
      owns, and the roles it does not name stay the base theme's, so the gate
      reports the mix (the example night palette's one red carries its chosen ink
      at 4.39:1 and a mark on the base wash at 2.93:1). **Open:** the docs page
      and the playground probe that runs `omarchy-theme-set` while a window is
      open. Do not claim a live follow until that probe is recorded.
- [x] `paletteToTokens` is unit-tested in both directions — the ink choice fails
      by name when it returns the palette's first ink; removing the watcher's
      change key fails the three re-apply cases.
- [ ] Both docs pages show the real result (native capture or clearly labelled
      approximation), and credit Omarchy and the two references with their licences.
- [x] No component code was forked to achieve either recipe — tokens only.

## STOP conditions

- The runtime cannot watch files → poll at a documented interval; do not pretend it is instant.
- Omarchy's palette has no analogue for a token (e.g. blur) → document the nearest
  approximation; do not invent a token.
- A reference repo's licence does not permit adaptation → use it as behaviour reference only,
  credit it, and write the mapping from the on-disk format instead.
