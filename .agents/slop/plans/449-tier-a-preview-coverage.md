# 449 — Tier-A preview coverage: the static component pages get a labelled rest preview

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 412, 434, 440; the delivered Tier 1–2 records.

## 1. Why

`MISSION.md` asks for a *showcase*: every component page should show the real
thing where it can be shown. Today only **four** of the 49 component pages carry
a visual: Button, Tabs, Dropdown menu and Card (plan 434). The other 45 show
only the native-coverage notice (tier V) or "not verified" (tier X), so a reader
cannot see the design system at all.

The platform-toggle acceptance has the same hole: *"a reader toggles macOS ->
Windows and every preview changes"*. Every preview that exists does change; there
are just four of them.

This plan adds **eight labelled tier-A rest previews** for components whose
resting appearance is static and whose states can be shown without pretending an
interaction works. It does not change the preview policy in
`docs/preview-strategy.md`: an approximation is still a browser approximation,
still labelled, still never a fallback for a native capture.

## 2. Scope

| Slug | What the preview shows |
| ---- | ---------------------- |
| `text-input` | rest, invalid, disabled field chrome with labels and help text |
| `checkbox` | checked, unchecked, indeterminate, disabled boxes beside labels |
| `switch` | on and off tracks with their labels |
| `slider` | three rest positions (minimum, halfway, maximum) with value labels |
| `badge` | all seven variants |
| `alert` | an info alert with a title and body |
| `progress` | a 25% and a 60% determinate bar |
| `avatar` | all four diameters plus a presence dot |

Out of scope (stay tier V/X): anything whose meaning is an interaction (menus,
dialogs, toasts, tooltips), and any component whose real paint depends on the
renderer (skeleton animation, spinner phases).

## 3. Files

**Create**

- `apps/docs/src/components/preview/preview-styles.ts` — the shared
  `PreviewProps`, type roles (`labelType`, `captionType`, `monoType`), layout
  (`row`, `column`, `keycap`) and the field/box chrome helpers. Moved out of
  `approximations.tsx` so the new files do not import the registry module.
- `apps/docs/src/components/preview/control-previews.tsx` —
  `TextInputPreview`, `CheckboxPreview`, `SwitchPreview`, `SliderPreview`.
- `apps/docs/src/components/preview/feedback-previews.tsx` —
  `BadgePreview`, `AlertPreview`, `ProgressPreview`, `AvatarPreview`.

**Change**

- `apps/docs/src/components/preview/approximations.tsx` — import the helpers
  from `preview-styles.ts`, register the eight new previews in `previewsBySlug`.
  The four existing previews stay in this file (Card still uses its local
  `Button`).
- `content/docs/components/{text-input,checkbox,switch,slider,badge,alert,progress,avatar}.mdx`
  — add `<ComponentPreview slug="…" />` directly under `<NativePreview … />`.
- `apps/docs/src/components/preview/theme-surface.test.tsx` — the colour-literal
  scan covers `approximations.tsx` only; extend it to the two new preview files.
- `apps/docs/src/components/preview/approximations.test.tsx` — add one content
  test: every preview must render the states its page documents (a table of
  slug → required phrases), so dropping a documented state fails.
- `apps/docs/README.md` — state what a tier-A preview covers and how many pages
  carry one.
- `.agents/slop/plans/README.md` — index this plan.
- `TODO.md` — add and tick the task; update the docs-site progress count.

## 4. Rules a preview must obey (already enforced where noted)

1. It paints on `PreviewSurface` and accepts the optional `theme` prop
   (`approximations.test.tsx` renders both platforms through it).
2. It uses only `var(--preview-*)` values — no colour literal, no `rgb`/`hsl`
   (`theme-surface.test.tsx`).
3. It uses `div`/`span` only: no `<input>`, `<button>`, `role`, `tabIndex` or
   handler, so a still preview can never look interactive
   (`approximations.test.tsx`).
4. It is registered for a delivered (non-`planned`) slug, and the slug's page
   renders the block — both directions (`component-preview.test.tsx`).
5. It never imports `@gpuixui/*` runtime code or `@gpuix/react`
   (`architecture.test.ts`).

## 5. Test plan

- **Existing contracts, automatically widened:** label, registry, page wiring,
  non-interaction and the platform re-render run over every entry in
  `previewsBySlug`; adding an entry puts it under all five.
- **New content contract (`approximations.test.tsx`):** render each new preview
  and assert the phrases its page documents are present. It must fail when a
  state is dropped — prove it by deleting the disabled row from the checkbox
  preview and observing the failure, then restore it.
- **New literal scan (`theme-surface.test.tsx`):** include
  `control-previews.tsx` and `feedback-previews.tsx`; prove it fails by adding a
  `#ff0000` to a preview, then remove it.
- **Browser proof:** `nub run --filter docs smoke:browser` already asserts a
  dark page paints the dark palette and a `?platform=win32` link paints
  Consolas on the preview surfaces it visits. Add one new preview page (badge)
  to its platform check so the widened coverage is hydrated in a real browser.

## 6. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass; the eight previews are under every registry test |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0; the eight pages still render |
| `nub run --filter docs smoke:browser` | exit 0; the badge and button surfaces paint the requested platform |
| `nub run check` / `nub run lint` / `nub run test` | the §7 gate in `AGENTS.md` |

## 7. STOP conditions

- A preview cannot be painted without a colour literal or a hard-coded palette:
  stop, record the missing token role as a cross-team `TODO.md` row, and leave
  that component at tier V. Do not invent a colour.
- The only honest depiction needs an interaction: leave the page at tier V/X and
  say so. Do not add a fake control.
- The preview would need to import the component package or `@gpuix/react`: stop
  — the docs site reads source, never runtime code.
- A page's registry status is `planned`: do not add a preview (the registry test
  forbids it).

## 8. Acceptance

- Eight more component pages show a labelled `Illustrative approximation`
  preview built from the active `Theme`.
- The Theming page's platform showcase re-renders twelve previews; nothing in a
  preview is interactive or hard-codes a palette.
- The content, literal and browser tests above fail without the change and pass
  with it.
- All gates green; the change is committed and pushed on `agent/docs-site`.

## 9. Progress (2026-10-17)

- `preview-styles.ts` now owns the shared `PreviewProps`, type roles and chrome;
  `control-previews.tsx` adds Text input, Checkbox, Switch and Slider;
  `feedback-previews.tsx` adds Badge, Alert, Progress and Avatar. The registry
  holds twelve entries, and eight pages gained their `<ComponentPreview>`.
- `approximations.test.tsx` pins each preview's documented states (a dropped
  disabled checkbox failed with `checkbox: Locked by policy`); the literal scan
  now covers the three preview source files (a `#ff0000` in the avatar dot
  failed). Both were restored before the final run.
- `smoke-browser.ts` visits `/docs/components/badge?platform=win32` and asserts
  the hydrated surface paints Consolas, so a new preview page joins the release
  gate.
- `nub run --filter docs test` — 39 files / 229 tests; `check-types`, `build`
  and `smoke:browser` green.
