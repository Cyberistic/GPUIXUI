# Plan 150 — native theme gallery: the token layer in the real runtime

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B. **Depends on:** plan `140` (the `darwin-x64` binding so the suite
can run here) and plan `011` (`@gpuixui/tokens`).
**Closes:** the `tokens-theme` ledger item *"Cross-team: native theme gallery in
`apps/playground` (owner: `playground`; blocked by B1)"* — B1 is fixed, so it is
unblocked. It also unblocks the two plan claims that were marked "native proof
pending": `017` (the focus ring is a `boxShadow`) and `051` (a platform theme's
font family reaches the runtime), and it is the native evidence source for the
docs site's Theming page.

## 1. Why this plan exists

`@gpuixui/tokens` ships 47 semantic colour roles, 10 type roles, three built-in
themes (light, dark, high-contrast light, high-contrast dark) and a
`ThemeProvider`. Every one of those is verified by unit tests that run on a
plain host — but **the tests never touch GPUix**. MISSION's rule is that an
interaction (here: "the token layer paints") is not complete until it is tested
in the actual native runtime, and `COMPONENTS.md` currently says exactly that:
the design-system rows are `wip` with "native visual proof pending the
playground gallery".

Two further facts make this cheap and worth doing now:

- The runtime **reports the style it applied** (`TestElement.style`): a probe
  with the 0.10.0 binding on this host shows `backgroundColor`, `color`,
  `fontSize`, `fontFamily`, `fontWeight`, `lineHeight` and `boxShadow` all come
  back exactly as authored, including 8-digit `#RRGGBBAA` values such as
  `selection`/`overlay`/`shadow`. So a token value can be asserted to have
  reached the runtime **without** screenshot pixel-diffing.
- The playground still paints an app-local fake palette (`src/theme.ts`, a
  hand-written Catppuccin-ish object with a `// TODO: replace with
  @gpuixui/tokens`). That file is now stale twice over: the library has real
  tokens, and the playground is supposed to be the native showcase of them.

The result: the gallery is the app's theme switch exercised natively, the
tokens' native proof, and the docs' honest preview source.

## 2. What is built

1. **`packages/testing` grows a `theme` capability and a `paintedStyle` host
   method.** `SmokeHost` is the only door to the runtime; a scenario may not
   import a GPUix type. `paintedStyle(testId)` returns the runtime's own style
   report, decoded at the native boundary into a typed snapshot.
2. **Two scenarios in `apps/playground`:**
   - `theme-color-roles` (capability `theme`) — every role in `colorRoles` as a
     labelled swatch; a control row switches the theme (dark → light → high
     contrast); the steps assert **every** swatch paints the current theme's
     exact value, that the switch really re-painted, and that the three colour
     sets differ.
   - `theme-type-and-shadow` (capability `theme`) — every type role from
     `typography` rendered through `textStyle(theme, role)`, plus
     `focusRing(theme)` and `elevationShadow(theme, "md")`; the steps assert the
     painted `fontSize`/`fontFamily` and `boxShadow` match the tokens.
3. **The playground is wired to the library.** `src/theme.ts` is deleted; the
   shell, the shared `ui.tsx` helpers and every scenario's view read the theme
   from `@gpuixui/tokens/react`'s `useTheme()`, and the shell wraps the app in
   `ThemeProvider` with a mode switch of its own. The smoke runner wraps each
   mounted view in `ThemeProvider theme={darkTheme}` so a smoke run is
   deterministic and the provider is on every scenario's path.

## 3. Exact files

### 3.1 `packages/testing/src/smoke.ts` (change)

- Add `"theme"` to `CAPABILITIES` (one word, alphabetically after `"table"`).
- Add, before `SmokeHost`:

  ```ts
  /** A shadow the runtime reported, as `StyleDesc.boxShadow`. */
  export class BoxShadowSnapshot extends Schema.Class<BoxShadowSnapshot>(
    "BoxShadowSnapshot",
  )({ offsetX: Schema.Number, offsetY: Schema.Number, blurRadius: Schema.Number,
      spreadRadius: Schema.Number, color: Schema.String }) {}
  ```

  and a `StyleSnapshot` class with `OptionFromNullishOr` fields for
  `backgroundColor`, `color`, `fontFamily` (strings), `fontSize` (number) and
  `boxShadow` (`BoxShadowSnapshot`). Every field is optional because the
  runtime reports only what the style set.
- Add to `SmokeHost`, with JSDoc that says what `null` means:

  ```ts
  /** The runtime's own report of the style it applied to `testId`, decoded;
   *  `null` when the id is not painted. */
  readonly paintedStyle: (testId: string) => StyleSnapshot | null;
  ```

### 3.2 `packages/testing/src/smoke.test.ts` (change)

Test that a style payload **decodes and reports** what the runtime sent, and
that a payload with an unknown or wrong-typed field decodes to the fields it
does understand. The bug guarded: a schema that silently drops `boxShadow`
(a nested class) would make the gallery's shadow check vacuously pass.

### 3.3 `apps/playground/src/smoke/host.ts` (change)

Implement `paintedStyle` on `createNativeHost`: find the element by `testId`,
decode `element.style` with `Schema.decodeUnknownOption(StyleSnapshot)`, and
return `Option.getOrNull`. Keep it synchronous like the rest of the adapter and
document why that decode is at the boundary.

### 3.4 `apps/playground/src/scenarios/theme.tsx` (new)

The two scenarios and their probes. Constraints that are easy to get wrong:

- The swatch grid must not rely on unverified layout: **explicit flex rows**
  (`Arr.chunksOf(colorRoles, 5)`), not `flexWrap`.
- Every swatch is `testId={`swatch-${role}`}` and its style carries
  `backgroundColor: theme.colors[role]`.
- The role list comes from `colorRoles`, never a hand-written copy: a new token
  must not be able to go untested.
- Type rows are `testId={`type-${role}`}` with `textStyle(theme, role)` spread.
- The ring/elevation surfaces assert `boxShadow`, and the scenario's header
  notes that this is a **style** proof, not a focus-behaviour proof (that is
  `focus-traversal`).

### 3.5 `apps/playground/src/scenarios/index.ts` (change)

Register both scenarios; add `"theme"` to the required-coverage list so a
missing theme scenario is an integrity error rather than a silently unverified
capability.

### 3.6 `apps/playground/src/` (change, mechanical)

- `app.tsx`: `useState<{mode, contrast}>` + `getTheme`, `<ThemeProvider>`, a
  small control row (`theme-mode-dark|light|high`), and the roles instead of
  `theme.surface`/`theme.panel`/….
- `ui.tsx`, `scenarios/*.tsx`: read `useTheme()`; role mapping is
  `surface→background`, `panel→card`, `panelAlt→muted`, `border→border`,
  `text→foreground`, `muted→mutedForeground`, `faint→placeholder`,
  `accent→primary`, `accentText→primaryForeground`, `danger→destructive`,
  `success→success`.
- `smoke/run.ts`: the mount wraps the view in `ThemeProvider theme={darkTheme}`.
- `src/theme.ts`: **deleted**.
- `apps/playground/package.json`: add `"@gpuixui/tokens": "workspace:*"`, then
  `nub install`.

### 3.7 Docs and ledgers (change)

- `apps/playground/README.md`: the gallery, how to run it, what it proves, and
  the two new scenario ids.
- `COMPONENTS.md`: the `theme` capability row moves from `planned` to
  `verified`; the design-system rows that say "native visual proof pending"
  point at the scenario instead.
- `TODO.md`: tick the gallery item and the "wire the playground to
  `@gpuixui/tokens`" item; update the Phase B progress bar.
- `PLAN.md`: one decision row (the two-column evidence vocabulary and the
  gallery's role as the docs' native evidence source).
- `.agents/slop/plans/README.md`: this plan's status.

## 4. Commands, and what each must produce

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/playground`).

| Command | Expected result |
| ------- | --------------- |
| `nub install` | links `@gpuixui/tokens` into `apps/playground/node_modules`; no error |
| `nub run --filter playground build` | `tsc` emits `dist/`; no type error |
| `nub apps/playground/dist/smoke/run.js` | `14/14 scenarios passed`, `theme=verified`, exit `0` |
| `nub apps/playground/dist/smoke/run.js --only theme-color-roles --json` | the report contains the scenario's checks; every check `passed` |
| `nub run check` | `check:tests`, lint, fmt and type-check all clean |
| `nub run test` | every package's vitest suite green, including the two new tests |

Two-direction proof (AGENTS §3 — the test must be able to fail):

1. **Gallery check.** Temporarily point one swatch at the wrong role (for
   example `swatch-background` at `theme.colors.card`), rebuild, run
   `nub apps/playground/dist/smoke/run.js --only theme-color-roles`; it must
   print a `failed` check naming `swatch-background` and exit `1`. Revert.
2. **Schema check.** In `smoke.test.ts`, assert the decoded `boxShadow` of a
   payload that has one is `Some` with the payload's numbers; delete
   `boxShadow` from `StyleSnapshot` and the test must fail to compile, and
   point the field at `Schema.Number` instead and the test must fail at run
   time. Revert.

## 5. STOP conditions

Stop and report with evidence rather than improvising if:

- **`@gpuixui/tokens/react` cannot be loaded at runtime.** The package exports
  its **source** (`src/react.tsx`, which contains JSX). The suite runs through
  `nub`, which transpiles TS/JSX; a plain `node dist/...` cannot. If a nub run
  fails to load it, do **not** copy the provider into the app and do not
  hand-roll a parallel context: record the limitation in `TODO.md` as a task
  for the `tokens` workstream (its exports need a runtime-loadable `react`
  entry) and implement the gallery with the theme passed explicitly to each
  probe, marking in the README that `ThemeProvider` itself is not yet
  native-verified.
- **The runtime rejects a token value.** If a swatch's reported
  `backgroundColor` differs from the token (for example an 8-digit
  `#RRGGBBAA` is rejected), do not normalise the token to make the check pass:
  record the exact role, the authored value and the reported value in plan
  `140` §4 (the measured-facts section) and create a `TODO.md` task for the
  tokens workstream, then stop.
- **`style` is not reported at all** for a painted element (the probe in §1
  says it is, but this is the runtime's behaviour, not ours): stop, record it,
  and fall back to a screenshot-based check only if a real decoder is available
  — never to a check that cannot fail.
- **A tap of the `theme` capability needs a change outside this workstream**
  (for example an export in `packages/tokens`): record it as a `TODO.md` task
  instead of editing that package.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `packages/testing/src/smoke.test.ts` — style decode | unit | a snapshot schema that drops or mistypes a field |
| `packages/testing/src/smoke.test.ts` — `theme` in `CAPABILITIES` | unit | a capability the report cannot name |
| `theme-color-roles` steps | native smoke | a swatch wired to the wrong role; a theme switch that does not re-paint; a runtime that mangles a token value |
| `theme-type-and-shadow` steps | native smoke | a type role whose size or family never reaches the runtime; a `boxShadow` the runtime ignores |
| `scenarioProblems` integrity | unit (already exists) | a coverage gap: the `theme` capability with no scenario |

Vitest cannot run the native scenarios (they need the binding), so the native
half is proved by the CLI run in §4 — that is the run the `done` row cites.

## 7. Acceptance criteria

- `paintedStyle` is on `SmokeHost`, documented, and decoded with a schema at the
  boundary; `theme` is a reported capability.
- Both scenarios exist, are registered, and are covered by the integrity check.
- The suite is **14/14 green on this host**, exit `0`, `theme=verified`, and the
  report and screenshots are written to `.artifacts/`.
- `src/theme.ts` is gone and no scenario file contains a colour literal.
- The two-direction proof in §4 was executed and its output recorded in the
  commit message.
- `nub run check`, `nub run lint`, `nub run test` pass.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md`, the app README and this index are
  updated to match what actually ran.
