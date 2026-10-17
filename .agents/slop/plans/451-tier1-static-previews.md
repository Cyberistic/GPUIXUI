# 451 — Tier-A previews for the remaining static Tier 1 controls

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 412, 434, 449, 450.

## 1. Why

Plan 449 gave twelve component pages a tier-A rest preview. Every other Tier 1
page still shows only the native-coverage notice, so a reader comparing the
design system sees a control's API table but never its shape. The platform
toggle has the same hole: it re-renders every existing preview, and most
controls have none.

This plan adds a labelled rest preview to the **nine remaining Tier 1 controls
whose rest state is static**: text area, radio group, select, range slider,
meter, number field, OTP field, toggle and rating. It deliberately excludes
components whose meaning is an interaction (tooltip, scroll area), an animation
(skeleton, spinner) or a glyph set (icon) — those stay at tier V/X.

## 2. Rules

The tier-A contract in `docs/preview-strategy.md` and `approximations.tsx`
already states the rules; this plan adds no new ones:

- `div`/`span` only — no `<input>`, `<button>`, `role`, `tabIndex` or handler;
- only `var(--preview-*)` values — no colour, space or radius literal;
- registered for a delivered slug and rendered by that page;
- never shown in place of a real capture.

## 3. Files

**Change**

- `apps/docs/src/components/preview/control-previews.tsx` — the nine previews,
  reusing the local `Field`, field chrome, checkbox box and slider track pieces
  rather than copying them.
- `apps/docs/src/components/preview/approximations.tsx` — register nine slugs.
- `apps/docs/content/docs/components/{text-area,radio-group,select,range-slider,meter,number-field,otp-field,toggle,rating}.mdx`
  — add `<ComponentPreview slug="…" />` below `<NativePreview … />`.
- `apps/docs/src/components/preview/approximations.test.tsx` — nine
  `documentedStates` rows; the existing label, non-interaction, page-wiring and
  platform re-render tests widen automatically over the registry.
- `apps/docs/README.md` — the preview paragraph names the new coverage without a
  total.
- `.agents/slop/plans/README.md` — index this plan.
- `TODO.md` — add and tick the task.

**Create:** none.

## 4. What each preview shows

| Slug | States |
| ---- | ------ |
| `text-area` | a three-row description field, an invalid field with its message, a disabled field |
| `radio-group` | three options with one selected, a description, a disabled option |
| `select` | a trigger with a selected value, its label, and a closed list hint |
| `range-slider` | one track with both thumbs and the chosen band as text |
| `meter` | three tones (primary, success, destructive) with their measurements |
| `number-field` | a bounded value with spin affordances, an invalid field |
| `otp-field` | six cells with four digits entered, one focused cell, the label |
| `toggle` | outline pressed and unpressed, plus the default (no chrome) variant |
| `rating` | 4 of 5 with a value label, plus an empty rest state |

## 5. Tests

1. `approximations.test.tsx` — the existing five contracts run over every new
   registry entry.
2. The `documentedStates` table gains nine rows with the phrases above. It must
   fail when a state is dropped; prove it by removing the rating's value label,
   observing `rating: 4 of 5`, then restoring it.
3. `theme-surface.test.tsx` — the literal scan already covers
   `control-previews.tsx`, so the new markup is under the palette guard. Add
   **one new rule** found while writing the previews: every literal
   `var(--preview-…)` name in a preview source must be a key `previewVars`
   defines. The shipped previews used kebab-case names for camelCase roles
   (`--preview-color-primary-foreground` for `primaryForeground`), which resolves
   to nothing in CSS, so a filled button inherited the surface foreground. Fix
   those names and prove the rule by re-introducing one kebab name.
4. A browser check is already covered by `smoke:browser` on Button/Badge; no
   new route assertion is needed because every preview surface is the same
   component.

## 6. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 231 + the new contract still pass; nine new pages covered |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs build` | exit `0` |
| `nub run check` / `nub run lint` / `nub run test` | the §7 gate in `AGENTS.md` |

## 7. STOP conditions

- A state cannot be shown without an interaction, a host input or a colour
  literal: leave that page at tier V and record the reason in the page's
  limitations. Do not approximate the interaction.
- A preview needs a component package import: stop — the docs site reads source
  only (`architecture.test.ts`).
- The registry rejects the slug: the component is `planned`; do not add a
  preview.

## 8. Acceptance

- Nine more component pages render a labelled `Illustrative approximation`
  built from the active `Theme`, under the platform toggle.
- The state table fails when a documented state is dropped.
- All gates green; `apps/docs/README.md`, the plan index and `TODO.md` updated;
  committed and pushed on `agent/docs-site`.

## 9. Progress (2026-10-17)

- `control-previews.tsx` now holds `TextAreaPreview`, `RadioGroupPreview`,
  `SelectPreview`, `RangeSliderPreview`, `MeterPreview`, `NumberFieldPreview`,
  `OTPFieldPreview`, `TogglePreview` and `RatingPreview`; the nine pages render
  their block and the registry holds 21 previews.
- `documentedStates` gained nine rows. Two-direction proof: deleting the
  rating's `4 of 5` label failed with `rating: 4 of 5`; restoring it passed.
- The new variable-name guard found **29** invalid names: seven kebab-case
  colour roles across `approximations.tsx`, `preview-styles.ts`,
  `control-previews.tsx`, `feedback-previews.tsx` and `platform-previews.tsx`,
  plus incomplete names from dynamic template strings (the regex now requires a
  complete name). Re-introducing one kebab name failed with
  `./control-previews.tsx: --preview-color-primary-foreground`; fixing it
  passed. `platform-previews.tsx` joined the literal and variable scans.
- `nub run --filter docs test` — 39 files / 232 tests; type-check, build,
  `check`, `lint` and the repository test suite green.
