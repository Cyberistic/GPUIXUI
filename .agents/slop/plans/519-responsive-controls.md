# 519 — The mode and platform controls stay reachable at every width

**Status:** implemented · **Phase:** F (showcase) / G (release gate) ·
**Owner:** docs-site
**Depends on:** `410`, `416`, `420`, `509`, `511`, `502`, `496`
**Owns:** `apps/docs` (files below), `TODO.md`, this plan and the plan index.
`docs/preview-strategy.md` and the component-page template are untouched.
**Number:** `519` — the next free number after `518`.

## 1. The gap this plan closes

Two controls the acceptance sentences name become unusable on a phone:

- **The landing page has no theme switch below 1024 px.** Fumadocs'
  `HomeLayout` puts its `[data-theme-toggle]` inside a `max-lg:hidden`
  container. Measured on the production build at 390 px:
  `{ width: 0, height: 0, ancestor display: "none" }`, while the docs layout
  keeps the switch reachable in the mobile sidebar. A reader who lands on `/`
  from a phone (or a 900 px window) cannot change the mode at all.
- **The platform radio group takes the whole mobile header.** At 390 px it
  occupies 239 px (`x 85 → 318`); search starts at 320 and the menu at 354.
  There is no room for a theme switch even if one were rendered, and the four
  labels are cramped.

The existing gates cannot see either: `smoke:theme` runs in Chrome's default
640×720 window, where the docs switch is `visibility: hidden` until the sidebar
opens, and it presses it through `element.click()` — which works on a hidden
node. `smoke:platform` does the same with the radio group at 640 px. So both
gates prove the wiring while the control a reader needs may be invisible.

**One sentence for the plan's result:** below `lg`, the header carries one
visible compact theme switch on the landing page and a native platform
`<select>`; the theme and platform gates operate a control that is actually on
screen at their viewport and add a phone-width step for each.

## 2. Files to change

All paths relative to `apps/docs/`.

### 2.1 New: `src/components/theme-toggle.tsx`

A compact switch for the home layout only. Fumadocs' own switch stays the
desktop control (it is visible at `lg+`); this one is `lg:hidden`, exactly
complementing it.

```tsx
import { useTheme } from "fumadocs-ui/provider/base";

/** The mode a press should produce: anything but dark becomes dark. */
export const nextTheme = (resolved: string | undefined): "light" | "dark" =>
  resolved === "dark" ? "light" : "dark";

export function CompactThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      aria-label="Toggle Theme"
      data-compact-theme-toggle=""
      onClick={() => setTheme(nextTheme(resolvedTheme))}
      className="lg:hidden inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-fd-border text-fd-muted-foreground transition-colors hover:text-fd-foreground"
    >
      {/* The glyph follows the `dark` class through CSS, so server and client
          render the same markup and hydration cannot disagree. */}
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 dark:hidden">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hidden size-4 dark:block">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
```

It reads the same next-themes store `RootProvider` configures (attribute
`class`, system default), so the two switches cannot disagree.

### 2.2 `src/routes/index.tsx`

Prepend the compact switch to the home layout's nav children, keeping the
existing platform control:

```tsx
const shared = baseOptions();
<HomeLayout
  {...shared}
  nav={{
    ...shared.nav,
    children: (
      <>
        <CompactThemeToggle />
        {shared.nav?.children}
      </>
    ),
  }}
>
```

Only the home route changes; the docs layout keeps its single Fumadocs control
(the sidebar provides it below `md`), so `smoke:theme`'s one-toggle invariant on
docs pages is untouched.

### 2.3 `src/platform/platform-toggle.tsx`

The radio group (APG: one tab stop, arrows move and apply) stays the desktop
control and becomes `hidden … sm:flex`. Below `sm` it renders a native
`<select>` — the same four options in the same order, native keyboard and
screen-reader semantics, and no second state machine:

```tsx
<>
  <select
    aria-label="Platform style"
    data-platform-select=""
    value={platform}
    onChange={(event) => {
      const value = event.target.value;
      if (isPlatformName(value)) setPlatform(value);
    }}
    className="h-8 max-w-36 shrink-0 … sm:hidden"
  >
    {platformNames.map((name) => (
      <option key={name} value={name}>{platformTypes[name].label}</option>
    ))}
  </select>
  <div role="radiogroup" … className="hidden w-fit shrink-0 … sm:flex">
    …
  </div>
</>
```

`isPlatformName` is the existing boundary guard; no cast is added.

**Measured while implementing.** The breakpoint is `sm`, not `lg`: at 640 px the
four labels (239 px) fit beside the logo, search and the menu, and Fumadocs
renders a *second* copy of `nav.children` in the docs sidebar from `md` up (two
`[data-platform-toggle]` nodes, one 0 px wide). Keeping the radio group visible
at 640 lets `smoke:platform` operate the single header copy; `lg` would have
pushed it into the duplicated sidebar copy. The group also needs `w-fit` — as
the only visible nav child it stretched to 480 px, which a `flex` parent had
silently allowed.

### 2.4 `src/components/theme-toggle.test.tsx` (new)

Header comment states the bug the file guards: an unguarded compact switch that
drifts from next-themes' resolved value. Asserts:

- `nextTheme("dark")` is `"light"`;
- `nextTheme("light")` is `"dark"`;
- `nextTheme("system")` and `nextTheme(undefined)` are `"dark"` (a press on an
  unresolved store must produce a visible change, not remain light).

### 2.5 `scripts/smoke-theme.ts`

- Set `await session.setViewport(1280, 800)` after `startSession`, so the
  Fumadocs docs switch the existing steps press is visible (the control was
  `visibility: hidden` at the default 640 px window).
- Add **step 6 (phone)**: `setViewport(390, 844)`, scheme forced light, open
  `/`. Assert `[data-compact-theme-toggle]` has a non-zero box and is
  `visible`/not `display: none`, and that the desktop `[data-theme-toggle]` is
  not usable (it is zero-sized inside the `max-lg:hidden` container). Press it;
  wait for the `dark` class, `stored === "dark"` and the dark body colour; press
  again and assert light, leaving the profile as the earlier steps did.
- The step prints through the same `step N checked` loop (1–6).

### 2.6 `scripts/smoke-platform.ts`

- Set `await session.setViewport(640, 720)` after `startSession`; the radio
  group's steps now operate a visible control (at the default 640 px window the
  group is displayed once, in the header).
- Step 1 also measures the radio group: non-zero box, visible, inside 640 px.
- Add **step 9 (phone)**: `setViewport(390, 844)`, open `BUTTON`, assert the
  radio group is not displayed and `[data-platform-select]` is visible with a
  non-zero box inside the viewport. Choose `win32` through the real select
  (native value setter + `change` event), wait for `data-platform`, then assert
  the URL, the stored choice and every preview surface with the existing
  `urlProblems` / `surfacesShow` helpers. Choose `default` again and assert the
  parameter is gone.
- The step loop prints 1–9.

### 2.7 `scripts/smoke-responsive.ts`

At 390 px, add:

- On `/`: `[data-compact-theme-toggle]` and `[data-platform-select]` are
  visible, have a non-zero box, and end inside the 390 px viewport (no horizontal
  overflow).
- After the mobile sidebar opens on the docs page: `[data-theme-toggle]` is
  visible (the docs path keeps its switch reachable in the sidebar).

These are assertions on the same session the script already drives, so no new
browser is launched.

### 2.8 `README.md` and `content/docs/contributing.mdx`

- `README.md`: the theme-gate paragraph names the 1280 px desktop viewport and
  the phone step; the platform paragraph names the compact select; the
  responsive paragraph names the control checks.
- `content/docs/contributing.mdx`: the `smoke:theme`, `smoke:platform` and
  `smoke:responsive` rows say what the new steps prove. The existing
  `docs-checks.test.ts` guard reads script names and exit codes; no new script
  is added.

## 3. Commands

```sh
cd apps/docs
nub run test                       # 70 files / 491 tests (the new unit test)
nub run check-types
nub run build
nub scripts/smoke-theme.ts --no-build
nub scripts/smoke-platform.ts --no-build
nub scripts/smoke-responsive.ts --no-build
nub scripts/smoke-a11y.ts --no-build
cd ../.. && nub run check && nub run lint
```

Expected: every command exits `0`; `smoke:theme` prints steps 1–6,
`smoke:platform` 1–9, `smoke:responsive` reports 92 pages clean and the control
checks, and `smoke:a11y` reports `92 pages × 2 schemes, 0 violations` (the new
button is labelled and only one of the two theme controls is displayed per
width).

## 4. Two-direction proofs

Each is run against the built site (or the gate's own selector for proof 4); a
check that cannot fail is not a check.

1. **Remove the compact switch from the home route**: `smoke:theme` step 6 fails
   with "the compact switch is not visible at 390 px (null)" and "not in the
   page"; `smoke:responsive` fails with "the compact theme switch is missing at
   390px". Restored, both pass. — measured.
2. **Remove the select element** from `PlatformToggle`: `smoke:platform` step 9
   fails with "the platform select is not visible inside 390 px (null)" and
   "not in the page". Restored, it passes. — measured.
3. **Remove the select's `onChange` handler**: step 9 fails with "did not settle
   on Windows (data-platform \"default\")", the URL missing `platform=win32` and
   the preview painting Menlo instead of Consolas. Restored, it passes. —
   measured.
4. **Rename the sidebar control's selector** in `smoke:responsive` to one the
   page does not render: the check fails with "the docs theme switch is missing
   in the mobile sidebar", proving the assertion is live. Restored, it passes. —
   measured.

Two planned proofs were dropped after measurement: the radio group forced
visible at 390 px does **not** trigger the "both controls displayed" message
(Fumadocs renders a zero-width header copy from `sm` up, so the message names the
real control's absence instead), and axe-core accepts two controls named "Toggle
Theme" when only one is displayed, so the a11y sweep is not a duplicate-name
guard. The displayed/zero-size checks in `smoke:theme` and `smoke:responsive` are
the actual guards.

## 5. STOP conditions

- Stop if `fumadocs-ui/provider/base` no longer exports `useTheme` at the pinned
  version; report the exact export surface instead of importing `next-themes`
  directly (it is not a declared dependency).
- Stop if a compact control makes the header overflow at 390 px; report the
  measured boxes from `smoke:responsive` instead of shrinking text below the
  docs' type scale.
- Stop if the home layout ignores `nav.children` at this Fumadocs version;
  report the rendered header instead of patching Fumadocs internals.
- Stop if the docs theme gate's one-toggle invariant cannot be kept on docs
  pages; do not add a second `[data-theme-toggle]` there.

## 6. Acceptance

- At 390 px the landing page paints a visible, operable theme switch, and the
  platform control is a native select that fits beside search and the menu.
- The theme gate presses a control that is visible at its viewport and proves
  the phone switch in both directions.
- The platform gate operates the radio group at desktop width and the select at
  phone width, each proving URL, storage and preview repaint.
- The responsive gate fails when either phone control is hidden or clipped.
- All gates in §3 run and pass; no literal colour or font is introduced.
