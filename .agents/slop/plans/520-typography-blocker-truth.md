# 520 — Typography tells the truth about custom fonts and the resolved B1

## Why

`/docs/typography` ends with a limitation that is now wrong twice over:

1. It says the `registerFont` native proof is **"blocked by the binding-install
   blocker (B1)"**. B1 was resolved on 2026-10-17 — `@gpuix/native@0.10.0` was
   built from source with `gpui_macos/runtime_shaders`, the native smoke suite
   runs on this host, and the provenance is ADR 0003 / plan 140. The page cites
   an obstacle the repository no longer has.
2. It says the library **"can only use the system UI font and the platform
   monospace families"**. That is false: `typography.sans` and `typography.mono`
   are family-name strings, and `extendTheme(base, { typography: { sans } })`
   replaces them (`packages/tokens/src/theme.ts` lines 61–62 and 121–122). Any
   family *installed on the machine* can be named today. The real limitation is
   narrower and worth stating precisely: the application cannot **ship and
   register** a font file with the pinned runtime.

A reader deciding whether they can use their brand face is currently told "no"
for the wrong reason. The docs site is the honesty surface for this library;
a stale blocker claim is the same class of bug as a fake preview.

This plan corrects the page, documents the installed-family route with a real
`extendTheme` snippet, and adds a guard that reads the **installed**
`@gpuix/native` typings so the page cannot outlive the runtime again.

## Current state (measured before writing this plan)

| Fact | Evidence |
| ---- | -------- |
| The installed `@gpuix/native@0.10.0` exposes no `registerFont` | `grep -rn 'registerFont' node_modules/.store/@gpuix+native@0.10.0/node_modules/@gpuix/native/ --include='*.d.ts'` → no match; `dist/host.d.ts` has only the `fontFamily?: string` style prop |
| `registerFont` exists on GPUix `main` / the reference clone | `~/GPUIXUI/references/gpuix/packages/native/js/testing.ts`, `host.ts` |
| Family names are theme data and are replaceable | `packages/tokens/src/theme.ts` `TypographyOverrides.sans/mono`, `mergeTypography`, `extendTheme` |
| B1 is resolved | `PLAN.md` D23, `.agents/adr/0003-darwin-x64-source-build.md`, plan 140, `TODO.md` "Blockers" |
| The page is the only site prose that names B1 | `grep -rn 'B1\\|binding-install' apps/docs/content apps/docs/src` → `typography.mdx` only |

The plan-number block: `400–499` is full, `520` is the first free number after
the docs set (`500–519`, `560`) in `.agents/slop/plans/README.md`.

## Files to change

1. `.agents/slop/plans/520-typography-blocker-truth.md` — this plan.
2. `apps/docs/content/docs/typography.mdx` — replace the **Custom fonts on the
   pinned runtime** section.
3. `apps/docs/src/typography-truth.test.ts` — new guard (the test is below).
4. `.agents/slop/plans/README.md` — add the `520` row to the docs table.
5. `TODO.md` — tick the new docs task; add one cross-team row for plan 052's
   own premise (below).

Do **not** edit `packages/tokens`, `docs/tokens.md`, or plan `052`. The
registration API is the tokens workstream's; this plan only stops the site from
misdescribing it. Record the plan-052 premise as a TODO row under
"Cross-team tasks raised by the docs-site workstream":

> **Tokens-theme: plan 052's premise needs re-checking.** Its §1 table says the
> published 0.10.0 exposes `renderer.registerFont`; the installed package's
> declarations expose no `registerFont` at all (`dist/host.d.ts` has only
> `fontFamily?: string`). Either the API is not in the pinned release (then 052
> is blocked by the runtime version, not B1) or the plan cites the reference
> clone. Verify and correct the plan before implementing it. Owner: tokens-theme.

## The page

Replace the whole `## Custom fonts on the pinned runtime` section (currently
lines 24–35) with:

```mdx
## Custom fonts on the pinned runtime

The repository pins `@gpuix/react` and `@gpuix/native` to **0.10.0**. That
release exposes no `registerFont` API, so an application cannot ship a font file
and register it with the runtime. The registration API is tracked by plan
[`052-register-font.md`](https://github.com/Cyberistic/GPUIXUI/blob/master/.agents/slop/plans/052-register-font.md);
the blocker is the pinned runtime, not the build host — the repository's native
smoke suite runs on this host ([Native testing](/docs/native-testing)).

A face that is already installed on the machine is a different question.
`typography.sans` and `typography.mono` are family names, and `extendTheme`
replaces them, so a brand can point the library at an installed family today:

```tsx
import { extendTheme, lightTheme } from "@gpuixui/tokens";

const brand = extendTheme(lightTheme, {
  typography: { sans: "Helvetica Neue", mono: "SF Mono" },
});
```

What is missing is **distribution**: the file cannot travel with the
application. GPUI resolves a family by name at paint time, so a name the machine
does not have falls back silently; `.SystemUIFont` remains the safe default.
Until `registerFont` ships in the pinned runtime, treat a *bundled* custom face
as unsupported rather than documented-but-missing.
```

Keep the existing `## Families` section, `TypeScale` and `PlatformTypes`
blocks unchanged. The example is a real import from the shipped package root
(`extendTheme` and `lightTheme` are both exported by `@gpuixui/tokens`); do not
invent a helper.

## Commands

Run from the repository root.

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| Prove the guard fails first | `nub run --filter docs test` | **fails** on the shipped page: B1 claim, system-only claim, and the missing `extendTheme` route |
| This package's tests | `nub run --filter docs test` | all pass (73 files / 500+ tests) |
| Types + lint + format + test quality | `nub run check` | exit 0 |
| Content guards that already read the page | `nub run --filter docs test -- content.test prose-truth` | pass; no unrelated page asserts the old wording |
| Lint + format | `nub run lint && nub run fmt` | exit 0 |

Do not run `smoke:build` for this change: it takes a full SSR build and this
plan touches prose, a test and the plan index only. If the executor changes a
route or a component, STOP and write a separate plan instead.

## Test plan

Create `apps/docs/src/typography-truth.test.ts` with:

1. **A pure rule, exported for the two-direction proofs.**

   ```ts
   export const typographyTruthViolations = (input: {
     readonly page: string;
     readonly exposesRegisterFont: boolean;
   }): ReadonlyArray<string> => ...
   ```

   Rules:
   - when `exposesRegisterFont` is `false`, the page must contain
     "exposes no `registerFont` API";
   - when `exposesRegisterFont` is `true`, the page must not say it is absent;
   - the page must not claim the library "can only use the system UI font";
   - the page must not name `B1` or a "binding-install blocker";
   - the page must document the installed-family route: an `extendTheme` import
     and `typography` override;
   - the page must link `052-register-font.md`.

2. **The runtime detector, exported and tested with fixtures.**

   ```ts
   export const exposesRegisterFont = (declarations: ReadonlyArray<string>): boolean =>
     declarations.some((text) => /\bregisterFont\b/.test(text));
   ```

   Fixtures: a declaration block with `registerFont(bytes: Uint8Array): void`
   → `true`; the real `fontFamily?: string` block → `false`.

3. **The real page against the real installed package.** Resolve
   `@gpuix/native` with `createRequire(import.meta.url).resolve(...)`, walk its
   `.d.ts` files (skipping `node_modules`), and assert
   `typographyTruthViolations({ page, exposesRegisterFont: detector(files) })`
   is `[]`. This is the part that fails again when GPUix publishes
   `registerFont`: the page will then say the API is absent while the
   declarations prove it exists.

4. **Two-direction proofs** (record the measured runs in this plan's §7):
   - the shipped page before the edit fails on the three retracted claims;
   - removing `extendTheme` from the new page fails rule 5;
   - restoring "B1" fails rule 4;
   - feeding the detector a `registerFont` declaration makes the real-page test
     fail with the "denies an available API" message.

The test file's header comment states the bug it guards: *"The Typography page
told readers custom fonts were blocked by B1 (fixed on 2026-10-17 by the
source-built binding) and that only system/monospace families were possible,
although `extendTheme` accepts any installed family. One claim named an obstacle
that no longer exists; the other denied a capability the package ships."*

Use `node:fs` deliberately, as the other content guards in `apps/docs` do; the
docs app has no Effect runtime and must not bundle `effect`.

## STOP conditions

- **STOP** if the installed `@gpuix/native` declarations now contain
  `registerFont`: the page must then document registration instead of absence.
  Say so and stop; do not ship the "no API" wording.
- **STOP** if `extendTheme` no longer accepts `typography.sans`/`mono` or the
  names are no longer exported from `@gpuixui/tokens`: the installed-family
  route is then not real. Report with the source line and do not invent a
  helper.
- **STOP** if a second page already documents the installed-family route in a
  conflicting way. Point at it and reconcile in a follow-up instead of shipping
  two recipes.
- Do not edit `packages/tokens` or plan `052`; record the plan-052 premise in
  `TODO.md` as above.

## Acceptance

- [x] The Typography page states the real blocker (the pinned runtime has no
      `registerFont`), does not mention B1, and documents the installed-family
      route with a copyable `extendTheme` snippet.
- [x] `apps/docs/src/typography-truth.test.ts` fails on the pre-fix page and
      passes on the fixed one; each rule has a two-direction proof.
- [x] `nub run --filter docs test`, `nub run --filter docs check-types`,
      `nub run check` and `nub run lint` exit 0.
- [x] The plan index, `TODO.md` and this plan's §7 record the measured result.

## 7. Measured result

Run 2026-10-19 in `workspaces/docs-site` on `agent/docs-site`.

| Direction | Command | Result |
| --------- | ------- | ------ |
| Pre-fix page | `nub run --filter docs test` | **1 failed / 504 passed**; the real-page test reported four violations: `registerFont is available` (a draft rule removed — the shipped page's "exists on `main`" wording was accurate and only the *pinned runtime* absence matters), the system-only claim, the B1 claim, and the missing recipe |
| Post-fix page | `nub run --filter docs test` | **73 files / 505 tests passed** |
| Re-break the recipe | remove the `extendTheme` import and override from the page | **1 failed / 504 passed** with `the page omits the installed-family extendTheme recipe` |
| Re-break the blocker | append "blocked by the binding-install blocker (B1)" | **1 failed / 504 passed** with `the page names the resolved B1 binding blocker` |
| Runtime flips | `typographyTruthViolations({ page, exposesRegisterFont: true })` | the unit test fails with `the page denies a registerFont API the installed typings expose` |
| Installed declarations | walk the resolved `@gpuix/native` `.d.ts` files | no `registerFont`; `dist/host.d.ts` carries only `fontFamily?: string` |

The re-break runs restored the page byte-for-byte from a temporary copy; the
final `git diff` contains only the intended section rewrite.
