# 052 — `registerFont`: the library's own typefaces in the native runtime

> **Provenance.** Rescued from the abandoned `agent/fonts` branch (commit `6fc7641`),
> where it was plan `018`. That workstream has no worktree and no live session;
> `typography` is this workstream's path, so the plan moves here. Two numbers were
> already spent on `018` (elevation) and `020` (primitives), so it takes `052`, and
> step 1 below is answered with the evidence this workstream has since gathered.

## Why

`packages/tokens/src/typography.ts` names font families (`sans: systemUiFont`, and a
per-platform `mono` from `platforms.ts`). Those names only resolve if the **native
runtime** knows the family. GPUix exposes `registerFont` to make a font file available
under a family name. Without it:

- the library can only ever use the operating system's own fonts, so the shipped identity
  cannot travel with an application;
- the **platform styles** (macOS / Linux / Windows) can only name families the OS already
  has, so a brand cannot bring its own face;
- a consumer cannot bring their own typeface, which breaks the "editable, ownable" rule the
  rest of the system follows.

This plan makes a registered typeface **real on GPUix**, and keeps it ownable: a consumer
can register their own family instead of ours.

**Verification is blocked by B1.** There is no GPUix window on this host yet (the native
binding install fails), so the native smoke test in the test plan cannot pass. The code may
land; the plan's status stays `blocked (B1)` until B1 is fixed. Do not mark it `done` on the
strength of the unit tests alone.

## Current state

- `packages/tokens/src/platforms.ts` — `systemUiFont` (GPUI's `.SystemUIFont`
  sentinel), `platformTypes` per platform, `currentPlatform` and `systemMonoFamily`
  (plan 051). **The platform family table already exists**; this plan no longer adds one.
- `packages/tokens/src/typography.ts` — `FontWeight`, `TextStyle`, `Typography` (`sans`,
  `mono`, plus the roles) and the default `typography`.
- `packages/tokens/src/index.ts` — the package's public exports.
- `packages/tokens/src/*.test.ts` — the existing test convention (vitest, co-located).
- GPUix is pinned exact: `@gpuix/react` / `@gpuix/native` **0.10.0** (pre-1.0).
- **No `registerFont` call exists anywhere**, there are no font files in the repository, and
  `LICENSES/` has no font entry.
- GPUix is pinned exact: `@gpuix/react` / `@gpuix/native` **0.10.0** (pre-1.0).

## Steps

### 1. Verify the API before designing around it — **answered 2026-10-17**

Evidence: `references/gpuix` (read-only clone, HEAD `515df19`) — `README.md`
"Custom fonts", `packages/native/index.d.ts:178`, `packages/native/js/hosting.ts`,
`packages/native/src/renderer.rs:2339` (`register_font`), and
`packages/react/src/__tests__/fonts.test.tsx`. The published 0.10.0
`@gpuix/native/dist/host.d.ts` gives `fontFamily?: string` (one family).

| Question | Answer |
| -------- | ------ |
| Name and receiver | `renderer.registerFont(data)`; the React handle is `useGpuixRequired()`. It is **absent from the browser renderer**, so callers must treat it as optional. |
| Argument | The font file's **bytes** (`Buffer \| Uint8Array`) — not a path and not a family name. |
| Family name | Taken from the font's own name table, so an alias cannot be chosen. The file must have family, full and PostScript names and a glyph for `"m"`; otherwise `registerFont` **throws** (GPUI aborts the process without them). WOFF/WOFF2 are unsupported. |
| Sync or async | Sync, returns `void`. |
| Before the first render? | **Not required** — "text that already named the family repaints with the font once it is registered". |
| Twice for one family? | Allowed; GPUI's own test registers the same file twice and keeps working (`add_fonts` re-adds and clears the resolved-family error cache). **Idempotence is therefore ours to provide, not the runtime's.** |

**STOP** if `registerFont` is not exported by the pinned version, or if the pinned
version's signature cannot express a family name we can then reference from
`typography.sans`. Report it as an evidenced gap — do not invent a shim or a
`@ts-ignore`.

### 2. Choose fonts we are licensed to ship

Pick one UI family and one monospace family whose licences permit **redistribution** (SIL OFL
is ideal). Verify each font's own licence file — do not assume.

**Do not vendor `adabraka-ui`'s assets.** That repository ships Inter and JetBrains Mono TTFs
plus 3,274 Lucide-geometry icons and a sample MP3 with **no licence file under `assets/`**;
they are not ours to copy.

Place the files under `packages/tokens/fonts/` and add one `LICENSES/` entry per family: the
family, its version, the licence, and the copyright line. Include the licence text itself.

**STOP** if a candidate's licence does not permit redistribution — choose another. Never vendor
a font whose licence you have not read.

### 3. Platform family resolution — **already done (plan 051)**

`platforms.ts` owns the per-platform table (`platformTypes`, `currentPlatform`,
`systemUiFont`, `systemMonoFamily`) and `platformTheme(base, platform)` turns a row
into a real theme. Do **not** add a second table here. The only work left for this
step is to let a registered family win over the system default: a consumer registers
their face, then derives the theme with `extendTheme(base, { typography: { sans:
"Inter" } })` or a new `platformTypes` row — document whichever route the plan ends
up taking, and keep density and type sizes untouched (the existing rule).

### 4. A registration API on `@gpuixui/tokens`

Add `registerFonts()` (a `./fonts` entry point, or an export from the package root).
The runtime takes **bytes** and names the family from the file, so the API cannot take
a path and must not promise a family it did not see:

- declare the runtime surface structurally, so the package keeps zero dependencies:
  `interface FontRegistrar { registerFont(data: Uint8Array): void }` — `@gpuix/react`'s
  renderer satisfies it, and a test can pass a fake;
- is **idempotent per registrar and per font**: keep a
  `WeakMap<FontRegistrar, WeakSet<Uint8Array>>` so the same bytes are registered once;
- returns the family names the components should reference, so a caller cannot name a
  family that was not registered;
- accepts a consumer's own typeface, so a brand can register theirs and have the
  components use it;
- is documented in `packages/tokens/README.md` with a copyable example.

State the one thing the API cannot check: the runtime derives the family from the
file's name table, so the docs must tell a consumer to name the family the font
declares, and that a mismatch falls back silently. Verifying the rendered face is the
native smoke test below — **blocked by B1**.

### 5. Wire the application entry

The playground (and the docs site, where it renders anything native) calls `registerFonts()`
once it has a renderer. Rendering before registration is fine: GPUix re-shapes text that
already named the family. Record the call site in the plan's PR description.

### 6. Tie the platform styles to real families

A registered family is used through the theme, not through the runtime: derive it with
`extendTheme(base, { typography: { sans: "Inter" } })`, or add it to `platforms.ts` if it
should be a platform default. Either way the docs platform toggle then previews type the
native runtime can produce.

## Commands

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| Install | `nub install` | exit 0 |
| Types + lint + fmt | `nub run check` | exit 0 |
| This package's tests | `nub run --filter @gpuixui/tokens test` | all pass |
| Prove a test fails without the fix | `scripts/verify-two-directions.sh` (or the two-direction run described below) | both directions hold |

## Test plan

**Unit (no native runtime required — these must pass now):**

- `registerFonts()` is **idempotent per registrar**: called twice with the same bytes, the
  registrar sees one call, and does not throw. *Must fail without the guard* — remove it and
  the test fails.
- Two renderers each get the font: a second registrar must still register it.
- Registered bytes that a registrar rejects (the runtime throws on a file it cannot use) leave
  the registry usable — the failure is not cached.
- The platform table resolves the expected family for each of `darwin` / `win32` / `linux`
  (already covered by `platforms.test.ts`, plan 051).
- A consumer's face wins over the platform default once the theme names it.

**Native (requires B1):**

- A smoke test that text renders in the **registered** family, not a fallback. Prove it both
  ways: register a deliberately wrong family and observe the fallback, then the right one and
  observe the intended face.

## Acceptance

- [ ] `registerFonts()` is exported, documented, idempotent per registrar and accepts a
      consumer's own typeface.
- [ ] Bundled font files (step 2) are licensed, committed, and recorded in `LICENSES/`
      with the copyright line — **only if this plan ships our own faces**; a
      consumer-only delivery skips step 2 and says so in the docs.
- [ ] `nub run check`, `nub run lint` and `nub run test` exit 0.
- [ ] **Native smoke test passes — blocked by B1 until the playground can run.**

## STOP conditions

- `registerFont` is not in the pinned `@gpuix/native`, or cannot name a family we can reference
  → report with the evidence; do not shim.
- A candidate font's licence does not permit redistribution → pick another; never vendor it.
- The native smoke test cannot run → the plan stays `blocked (B1)`; do not mark it done.
- The registration API needs a change outside `packages/tokens` → record it as a task in
  `TODO.md` rather than editing another workstream's paths.

## Maintenance notes

- If GPUix changes `registerFont`'s signature in a later release, step 1 is the only place that
  needs re-reading; the API in step 4 is deliberately thin so it survives that.
- If a consumer reports "my font does not apply", check in order: `registerFonts()` was called
  before the first render, the family name matches, and the platform table did not resolve to
  the system family.
- Deferred out of this plan: variable-font axes, per-weight registration beyond the four
  `FontWeight` values, and font subsetting. Add them only when a real use needs them.
