# 157 — `@gpuixui/components` consumes the token helpers instead of copying them

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `016-tokens-consumable-exports.md`, `017-focus-ring-and-docs-truth.md`, `018-elevation-truth.md`, `014-status-tones-and-colour-helpers.md` |
| Status | done — 2026-10-17; both-direction proof recorded in §5 |
| Source | `TODO.md` → Interlocks: "`primitives` and `components` depend on `@gpuixui/tokens` directly and delete their structural copies of the theme and role list, their local focus-ring helpers … and their first-shadow helpers" (owner: those workstreams; plans 016–018) |

This plan is self-contained. It deletes four copies of logic that the tokens
package now owns, and keeps one adapter for the component-level tone name
(`danger`) that differs from the token-level name (`destructive`).

---

## 1. Why

After plans 014/016–018 landed, `@gpuixui/tokens` exports:

- `alpha(color, amount)` — the 0–1 alpha helper (`packages/tokens/src/color.ts`);
- `focusRing(theme)` — the zero-offset, zero-blur, spread focus shadow
  (`packages/tokens/src/styles.ts`);
- `elevationShadow(theme, level)` — the one shadow a level paints
  (`packages/tokens/src/elevation.ts`);
- `statusTone(theme, tone)` — the soft background/foreground/border roles for
  `info | success | warning | destructive` (`packages/tokens/src/styles.ts`).

`packages/components/src/internal/theme.ts` still carries its own `withAlpha`,
`focusRing`, `elevation` and a hand-mixed `tone` palette that uses `accent` for
`info` and `warningForeground` for the light warning. That is duplicated
knowledge, and the local `tone` predates the `*Soft` roles. The tokens package
also now resolves from source, so the components workstream can consume it
directly.

The public component tone is `danger`; the token role is `destructive`. That
mapping is the **only** thing the seam keeps.

## 2. Files to change

### 2.1 `packages/components/src/internal/theme.ts`

- Import and re-export `alpha`, `elevationShadow`, `focusRing` and `statusTone`
  from `@gpuixui/tokens`.
- Delete `withAlpha`, `Alpha`, `soft`, the local `focusRing`, the local
  `elevation` and the `Match` branches inside `tone`.
- Keep `Tone`, `ToneStyle`, `tone` and `toneSurface`, implemented as:

```ts
const TOKEN_TONE: Readonly<Record<Tone, StatusTone>> = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "destructive",
};

export const tone = (theme: Theme, value: Tone): ToneStyle => {
  const { background, border, foreground } = statusTone(
    theme,
    TOKEN_TONE[value],
  );
  return { bg: background, border, fg: foreground };
};

export const toneSurface = (theme: Theme, value: Tone): StyleDesc => {
  const { bg, border, fg } = tone(theme, value);
  return {
    backgroundColor: bg,
    color: fg,
    borderWidth: theme.borderWidth.thin,
    borderColor: border,
  };
};
```

- Update the file's header comment: the seam now exists so components import one
  module and agree on the `danger` → `destructive` name, not because tokens
  lacks helpers.

### 2.2 `elevation` → `elevationShadow` at the call sites

Six files import `elevation` from the seam; change the import and call:

| File | Current | New |
| ---- | ------- | --- |
| `src/card.tsx` | `boxShadow: elevation(theme, "md")` | `boxShadow: elevationShadow(theme, "md")` |
| `src/popover.tsx` | same | same with `elevationShadow` |
| `src/combobox.tsx` | same | same with `elevationShadow` |
| `src/dialog.tsx` | `elevation(theme, "lg")` | `elevationShadow(theme, "lg")` |
| `src/toast/viewport.tsx` | `elevation(theme, "md")` | `elevationShadow(theme, "md")` |
| `src/menu/surface.tsx` | `elevation(theme, "md")` | `elevationShadow(theme, "md")` |

The local `elevation` export is deleted, so a missed call site is a type error.

### 2.3 `packages/components/src/internal/button.tsx`

- Replace `withAlpha(theme.colors.primary, HOVER_ALPHA)` and
  `withAlpha(theme.colors.destructive, HOVER_ALPHA)` with
  `alpha(theme.colors.primary, 0.5)` and `alpha(theme.colors.destructive, 0.5)`.
- Delete `HOVER_ALPHA` and import `alpha` instead of `withAlpha`.
- Keep the comment that the token package has no `primaryHover` role.

### 2.4 `packages/components/src/internal/theme.test.ts`

Rewrite the file around the seam's remaining responsibility, so it can fail:

- `tone` maps each of the four component tones to the tokens `statusTone` roles
  (`infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft` and their
  foregrounds), including `danger` → `destructive`.
- `toneSurface` paints the mapped background, foreground and border and the
  theme's thin border width.
- `focusRing` and `elevationShadow` are re-exported identically from tokens
  (import the tokens functions and assert referential identity with `toBe`), so
  a future local fork fails.
- Delete the old `withAlpha` tests and the old hand-mixed tone assertions; the
  tokens package owns those.

The header comment states the bug guarded: the seam once mixed its own
`info`/`warning` tones and a local focus/shadow helper, so a token change did not
reach the components.

### 2.5 `packages/components/README.md`

Update the `internal/theme.ts` row: the seam is now the tone-name adapter over
the tokens helpers, not a copy of them.

### 2.6 `TODO.md`

Tick the two cross-team interlock lines:

- primitives/components delete their local ring and first-shadow helpers (this
  plan does the components half; leave the primitives half to its owner);
- delete the structural token copy (already absent — verify and tick the
  components item).

### 2.7 `packages/components/tsconfig.json`

The merge of `@gpuixui/tokens` from source makes this program compile
`packages/tokens/src/react.tsx`, which uses JSX. The isolated linker puts
`@gpuix/react` under `packages/components/node_modules`, not under
`packages/tokens`, so `tsc` cannot resolve `@gpuix/react/jsx-runtime` from that
file. The `paths` mapping to this package's own dependency is the contained
fix. Record in `TODO.md` that tokens should declare `@gpuix/react` as a
devDependency or mark its React file with `@jsxImportSource react`.

## 3. Commands and expected results

```sh
nub run --filter @gpuixui/components check-types   # exit 0
nub run --filter @gpuixui/components test          # all logic suites green
nub run --filter @gpuixui/components test:behaviour # 280 native tests green
nub run check                                      # exit 0
nub run lint                                       # exit 0
nub run test                                       # exit 0
```

Also verify the deletions:

```sh
grep -rn "withAlpha\|const soft\|const elevation =" packages/components/src   # no matches
grep -rn "elevation(" packages/components/src                                 # no matches
```

## 4. STOP conditions

Stop and report instead of improvising if:

- the installed tokens package does not export `alpha`, `focusRing`,
  `elevationShadow`, `statusTone` or `StatusTone` (the source merge moved);
- a component relies on a colour specific to the old hand-mixed tone (the
  behaviour suites would fail; report the exact assertion rather than editing
  the token roles);
- consuming tokens from source needs a change inside `packages/tokens` (this
  plan does not own it — record it in `TODO.md` instead).

## 5. Test plan (both directions)

1. Add the rewritten `theme.test.ts` assertions first and run them against the
   old `tone`: the `infoSoft` assertion fails because the old seam returns
   `theme.colors.accent`. Record that failure.
2. Apply §2 and run again: green.
3. Remove the `danger: "destructive"` entry temporarily and confirm the
   `danger` assertion fails; restore it.
4. Run the behaviour suites because Alert, Badge and Toast paint through `tone`.

Measured 2026-10-17:

- old seam (info returning `colors.accent`): `theme.test.ts` failed with
  `bg #EEF0FF` instead of `#DEE9FF` — the test catches the regression;
- `danger` temporarily mapped to `warning`: 2 of 6 theme tests failed;
- restored: 217 unit tests and 280 behaviour tests green; `nub run check` green.

## 6. Acceptance criteria

- `theme.ts` contains no local alpha, ring, shadow or tone-mixing logic; only the
  `ToneStyle` adapter remains.
- Every call site uses the tokens helpers directly.
- `theme.test.ts` fails when the `danger` mapping is removed and when the seam
  returns an unmapped tone.
- All gates in §3 are green; `COMPONENTS.md` rows for Alert, Badge and Toast are
  unchanged (the rendered roles moved from accent to `infoSoft`; the rows do not
  name individual colours).
- `TODO.md` records the two ticks and the tokens-side tsconfig interlock.
