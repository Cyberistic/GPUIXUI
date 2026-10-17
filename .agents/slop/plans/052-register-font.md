# 052 — `registerFont`: custom typefaces in the native runtime

> **Provenance.** Rescued from the abandoned `agent/fonts` branch (commit `6fc7641`),
> where it was plan `018`. That workstream has no worktree and no live session;
> `typography` is this workstream's path, so the plan moves here. Two numbers were
> already spent on `018` (elevation) and `020` (primitives), so it takes `052`.

## Why

`packages/tokens/src/typography.ts` names font families (`sans: systemUiFont`, and a
per-platform `mono` from `platforms.ts`). Those names only resolve if the **native
runtime** knows the family. GPUix's `registerFont` (once released) makes a font file
available under a family name. Without it:

- the library can only ever use the operating system's own fonts, so the shipped identity
  cannot travel with an application;
- the **platform styles** (macOS / Linux / Windows) can only name families the OS already
  has, so a brand cannot bring its own face;
- a consumer cannot bring their own typeface, which breaks the "editable, ownable" rule the
  rest of the system follows.

## Decision (2026-10-17): blocked upstream — the pinned release has no `registerFont`

Step 1 was first answered from `references/gpuix` **main**, which is ahead of the
published release. Re-checked against the version this repo actually pins, the API
is **absent**:

| Evidence | What it shows |
| -------- | ------------- |
| `workspaces/playground/node_modules/.store/@gpuix+native@0.10.0/node_modules/@gpuix/native/index.d.ts` | `GpuixRenderer` (line 36) has `setImagePixels`, `setImage`, `getAutomationTree`, … and **no `registerFont`**; no `registerFont` appears in any `.d.ts` in that package. |
| `…/@gpuix+react@0.10.0_react@19.2.4/…/@gpuix/react/dist/index.d.ts:3` | `useGpuixRequired` is re-exported from the React package, and that package re-exports `GpuixRenderer` from `@gpuix/native` — so the handle a component receives has no such method either. |
| `references/gpuix/.changeset/register-font.md` (HEAD `515df19`, 2026-10-16) | The feature exists **only** as an unreleased changeset: a **minor** bump for `@gpuix/native`, `@gpuix/react` and `@gpuix/solid`. Its own text describes `registerFont(bytes)`. |
| `references/gpuix/packages/native/index.d.ts:178` | The method exists on the clone's main, which is the version that misled step 1. |

This is the same published-vs-main divergence `COMPONENTS.md` records for `Dialog`
and `createPortal`. The plan's step 1 **STOP condition fires**: the pinned version
cannot register a font, so a shim would present a capability that does not exist.

An implementation (structural `FontRegistrar`, idempotent registry, 7 unit tests,
theme integration) was written against the clone's API and then **removed** from
`packages/tokens`. The design is preserved in step 4 so the release that ships the
API can land it without rediscovery.

**Status: `blocked (upstream 0.10.0 lacks registerFont)`.** B1 (no GPUix window on
this host) is a second, independent blocker for the native check.

## Current state

- `packages/tokens/src/platforms.ts` — `systemUiFont` (GPUI's `.SystemUIFont`
  sentinel), `platformTypes` per platform, `currentPlatform` and `systemMonoFamily`
  (plan 051).
- `packages/tokens/src/typography.ts` — `FontWeight`, `TextStyle`, `Typography` (`sans`,
  `mono`, plus the roles) and the default `typography`.
- `packages/tokens/src/index.ts` — the package's public exports; there is **no**
  font-registration export.
- GPUix is pinned exact: `@gpuix/react` / `@gpuix/native` **0.10.0** (pre-1.0).
- **No font files are bundled** and `LICENSES/` has no font entry.

## Steps

### 1. Verify the API against the pinned release — **done; it is absent**

The check that must be repeated before any implementation:

```sh
grep -rn "registerFont" \
  workspaces/playground/node_modules/.store/@gpuix+native@0.10.0/node_modules/@gpuix/native \
  --include="*.d.ts"
```

Expected today: no output. Expected when unblocked: the method appears on
`GpuixRenderer` in `index.d.ts`.

**STOP** while the command prints nothing. Do not add a feature-detecting shim, a
`@ts-ignore`, or an API that silently does nothing on the pinned runtime.

| Question | Answer (from the clone's unreleased API; re-check on release) |
| -------- | -------- |
| Name and receiver | `renderer.registerFont(data)`; the React handle is `useGpuixRequired()`. Absent from the browser renderer too. |
| Argument | The font file's **bytes** (`Buffer \| Uint8Array`) — not a path and not a family name. |
| Family name | Taken from the font's own name table, so an alias cannot be chosen. The file must have family, full and PostScript names and a glyph for `"m"`; otherwise `registerFont` **throws**. WOFF/WOFF2 are unsupported. |
| Sync or async | Sync, returns `void`. |
| Before the first render? | Not required — text that already named the family picks the font up on the next frame (the changeset's wording). |
| Twice for one family? | Allowed; the runtime clears its resolved-family error cache. **Idempotence is ours to provide.** |

### 2. Choose fonts we are licensed to ship — **not started**

Intended delivery is **consumer-only** (no bundled file), which is the acceptance
alternative: the consumer supplies a face whose licence permits redistribution and
ships its licence with the app. If the library ever ships faces, pick one UI and one
monospace family under SIL OFL, read each font's own licence file, place the files
under `packages/tokens/fonts/`, and add a `LICENSES/` entry per family with version,
licence and copyright line.

**Do not vendor `adabraka-ui`'s assets.** That repository ships Inter and JetBrains
Mono TTFs plus 3,274 Lucide-geometry icons and a sample MP3 with **no licence file
under `assets/`**; they are not ours to copy.

**STOP** if a candidate's licence does not permit redistribution — choose another.
Never vendor a font whose licence you have not read.

### 3. Platform family resolution — **already done (plan 051)**

`platforms.ts` owns the per-platform table (`platformTypes`, `currentPlatform`,
`systemUiFont`, `systemMonoFamily`) and `platformTheme(base, platform)` turns a row
into a real theme. Do **not** add a second table here.

### 4. A registration API on `@gpuixui/tokens` — **design only; do not implement yet**

Add `registerFonts()` as an export from the package root (no new entry point). The
runtime takes **bytes** and names the family from the file, so the API cannot take a
path and must not promise a family it did not see:

- declare the runtime surface structurally, so the package keeps zero dependencies:
  `interface FontRegistrar { registerFont(data: Uint8Array): void }` — the renderer
  satisfies it, and a test can pass a fake;
- `interface Typeface { readonly family: string; readonly files: ReadonlyArray<Uint8Array> }`
  and `interface Typefaces { readonly sans?: Typeface; readonly mono?: Typeface }`;
- is **idempotent per registrar and per file**: a
  `WeakMap<FontRegistrar, WeakSet<Uint8Array>>`; record a file **after** the runtime
  accepts it, so a rejected file is retried rather than cached as registered;
- returns `{ sans?: string; mono?: string }`, shaped to spread into
  `extendTheme(base, { typography })`, so a caller cannot name a family it did not
  declare;
- accepts a consumer's own typeface, so a brand can register theirs;
- is documented in `packages/tokens/README.md` with a copyable example.

State the one thing the API cannot check: the runtime derives the family from the
file's name table, so the docs must tell a consumer to name the family the font
declares, and that a mismatch falls back silently.

### 5. Wire the application entry — **blocked with the API**

When unblocked: the playground calls `registerFonts()` once it has a renderer, and
the docs site keeps using the OS family because the browser renderer has no method.
Record the call site in the implementing commit.

### 6. Tie the platform styles to real families — **route decided: theme-level**

A registered family is used through the theme, not through the runtime:
`extendTheme(base, { typography: registerFonts(renderer, …) })`. `platformTypes`
gains nothing, because a consumer's face is not every app's platform default and the
runtime cannot rename a family anyway. Today, without the runtime API, the only
honest route is an **installed** family named through `extendTheme`, which the OS
resolves just like the platform table's mono families.

## Commands

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| Prove the API is still absent | `grep -rn "registerFont" workspaces/playground/node_modules/.store/@gpuix+native@0.10.0/node_modules/@gpuix/native --include="*.d.ts"` | no output (blocked), the method on `GpuixRenderer` (unblocked) |
| Install | `nub install` | exit 0 |
| Types + lint + fmt | `nub run check` | exit 0 |
| Tests | `nub run test` | all pass |

## Test plan

**Nothing is written while the API is absent.** A test that passes against a fake
registrar while the pinned renderer has no method would describe a capability the
library cannot deliver — the exact "decorative placeholder" the mission forbids.

When unblocked, unit tests (no native runtime required):

- `registerFonts()` is **idempotent per registrar**: called twice with the same
  bytes, the registrar sees one call. *Must fail without the guard* — remove it and
  the test fails (it failed for 3 of 7 tests while the removed implementation existed).
- Two renderers each get the font.
- A file the registrar rejects leaves the registry usable — the failure is not cached.
- The returned families spread into `extendTheme`, and a role left out keeps the
  platform family.
- A consumer's face wins over the platform default once the theme names it.

Native (requires B1 and a release with the API):

- A smoke test that text renders in the **registered** family, not a fallback. Prove
  it both ways: a deliberately wrong family falls back, the right one paints.

## Acceptance

- [ ] `registerFonts()` is exported, documented, idempotent per registrar and accepts a
      consumer's own typeface.
- [ ] Bundled font files are licensed, committed, and recorded in `LICENSES/` with the
      copyright line — **only if this plan ships our own faces**; a consumer-only
      delivery skips this and says so in the docs.
- [x] `nub run check`, `nub run lint` and `nub run test` exit 0.
- [ ] **Native smoke test passes — needs B1 and a GPUix release that exposes the API.**

## STOP conditions

- `registerFont` is not in the pinned `@gpuix/native` → **this is the current state**;
  document the gap, do not shim, do not land dead code.
- A candidate font's licence does not permit redistribution → pick another; never
  vendor it.
- The native smoke test cannot run → the plan stays blocked; do not mark it done.
- The registration API needs a change outside `packages/tokens` → record it as a task
  in `TODO.md` rather than editing another workstream's paths.

## Maintenance notes

- Re-run step 1's `grep` after every GPUix upgrade. The changeset is a **minor** bump,
  so the next minor release should expose it; when it does, the rest of this plan is
  ready.
- If GPUix changes `registerFont`'s signature, step 1 is the only place that needs
  re-reading; the API in step 4 is deliberately thin so it survives that.
- If a consumer reports "my font does not apply": check the pinned GPUix version first
  (0.10.0 has no `registerFont`), then that registration happened, then that the family
  matches the name table.
- Deferred out of this plan: variable-font axes, per-weight registration beyond the
  four `FontWeight` values, and font subsetting.
