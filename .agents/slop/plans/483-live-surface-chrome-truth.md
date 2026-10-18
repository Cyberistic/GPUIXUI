# 483 — The site chrome stops denying the live surface, and the guard reads rendered chrome

**Phase:** F (truth) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 439, 455–460 (`prose-truth.test.ts`, `landing.test.tsx`)

## 1. The bug

`apps/docs/src/components/landing.tsx` quick-start paragraph said:

> This site never renders GPUix, so it links to the playground instead of
> imitating it.

That is false: every page with a `liveScene` embeds GPUix's published
WebAssembly renderer in an isolated document (plans 455–458). The same page, one
section earlier, correctly says "a page with a live scene runs them on GPUix's
WebAssembly renderer". So `/` contradicted itself and denied the headline
feature it ships.

Two guards should have caught it and did not:

- `src/prose-truth.test.ts` scans **MDX pages only**; the landing page is React
  chrome (`landing.tsx`), so its prose is outside that guard.
- `src/components/landing.test.tsx` does render the chrome, but asserted only
  `not.toContain("cannot render GPUix")` — one phrasing of the denial. "never
  renders GPUix" slipped through.

This is the plan-460 failure class (a page denying the live surface) in the one
reader-facing surface plan 460 did not read. The fix is the sentence plus a
guard that covers the **wording class** in the rendered output, not one string.

## 2. Why this is a docs-site task

- The landing page and its test are `apps/docs` — this workstream's path.
- No other workstream is involved; the live scenes, the wasm renderer and
  `docs/preview-strategy.md` already exist.
- It is a truth defect in the showcase, which `MISSION.md` ranks above polish:
  "do not render a fake web version and imply it is native" cuts both ways —
  neither may the site deny the real surface it does render.

## 3. Exact changes

### 3.1 Shared denial predicate — `apps/docs/src/lib/live-surface-truth.ts` (new)

```ts
/**
 * Phrases that deny the live GPUix surface this site ships (plans 460, 483).
 *
 * A denial is about **this site**, not the runtime: "GPUix 0.10.0 cannot render
 * <capability>" is a legitimate limitation, and so is "the site does not run
 * this configuration" about a generator. The denial must name the surface, so
 * those sentences stay allowed. Read by the MDX guard and the landing guard so
 * one phrasing cannot be covered in one place only.
 */
const DENIALS = [
  /\bdoes not render (?:it|GPUix)\b/i,
  /\bcannot be shown running in a browser\b/i,
  /\b(?:this|the) site (?:never|does not|doesn't|cannot|can't) (?:render|run|show)(?:s|ed)? (?:GPUix|it|the (?:component|library))\b/i,
] as const;

/** True when reader-facing prose denies the live surface the site ships. */
export const deniesLiveSurface = (prose: string): boolean =>
  DENIALS.some((pattern) => pattern.test(prose));
```

No new dependency; no `any`; a pure function with JSDoc (AGENTS §5/EF-11).

### 3.2 `apps/docs/src/prose-truth.test.ts`

- Delete the two inline regexes in `it("does not deny the live surface it ships")`
  and call `deniesLiveSurface(body)` instead.
- Import it from `./lib/live-surface-truth`.
- Keep the `LIVE_SCENES.length === 0` gate exactly as is: removing the live
  surface must not leave a stale rule behind.

### 3.3 `apps/docs/src/components/landing.test.tsx`

- Replace `expect(html).not.toContain("cannot render GPUix")` with
  `expect(deniesLiveSurface(html)).toBe(false)`, so the rendered chrome is held
  to the same wording class as the MDX pages.
- Keep the existing six-tier assertions; add nothing else.

### 3.4 `apps/docs/src/components/landing.tsx`

- Quick start: replace the false sentence with the shipped truth, e.g.
  "Previews on this site are live GPUix WebAssembly surfaces or labelled native
  evidence; the playground is where the desktop window runs." Keep it to one or
  two sentences and keep the surrounding Bun / `check-types` truth unchanged.
- Fix the stale doc comment above `PREVIEW_TIERS`: it says "five honest preview
  tiers" while the list has six and the test asserts six. Say six.
- Do not touch the palette, counts or links.

### 3.5 Index and TODO

- `.agents/slop/plans/README.md`: add this plan's row at the end of the docs
  table.
- `TODO.md`: add one row under **Docs site workstream** and tick it:
  "The landing page stops denying the live surface (plan 483) — rendered chrome
  now shares the MDX denial guard".

## 4. Commands and expected results

Run from the workstream root unless stated.

1. **Write the failing test first.** Apply §3.1–§3.3 only (shared predicate +
   both guards), leave §3.4's sentence in place, then:

   ```sh
   cd apps/docs
   nub exec vitest run src/components/landing.test.tsx src/prose-truth.test.ts
   ```

   Expected: **FAIL** in `landing.test.tsx` with `expected true to be false`
   from `deniesLiveSurface(html)`, and `prose-truth.test.ts` green. This is the
   two-direction proof's failing half; record the exact assertion output in §6
   below. **STOP** if it passes: the guard does not catch the shipped wording
   and must be corrected before fixing the copy.

2. Apply §3.4, re-run the same command.

   Expected: **PASS**.

3. Whole docs suite:

   ```sh
   nub run --filter docs test
   ```

   Expected: all files pass, 0 failures (currently 46 files / 293 tests; this
   plan adds no new test, it widens two existing ones).

4. Repo gates (the completion gate in AGENTS §7):

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: exit `0` each.

5. Production proof that the sentence is gone from the built page:

   ```sh
   nub run --filter docs build
   nub run --filter docs smoke:build
   ```

   Expected: build succeeds; smoke prints `sitemap 86 pages`, `pages 86 checked`,
   `links … checked`, `ok`, exit `0`.

## 5. STOP conditions

- The new predicate matches a **legitimate** sentence somewhere in the tree
  (e.g. a capability limitation that names the runtime). Narrow the pattern so it
  keeps the site-owns-the-denial meaning; do not add a `// check-tests-ok`
  escape and do not delete the legitimate sentence.
- Any gate in §4.4 fails for a reason outside `apps/docs`: stop, record the
  command and output in this plan §6 and in `TODO.md`, and do not "fix" another
  workstream's files.
- The landing copy would need a new component, prop or dependency to stay true:
  stop — that is a product decision, not this plan.

## 6. Results (measured 2026-10-18)

The first draft of the predicate produced the two errors this plan's STOP
conditions anticipate, both caught **before** the copy changed:

- `nub run test` (whole suite) failed with `['api-reference.mdx']`: the pattern
  matched "a configuration the site does not run", which is about the type-table
  generator, not the live surface. The pattern now requires the denied object
  (`GPUix`, `it`, the component or the library).
- The narrowed pattern then missed the shipped sentence, because "renders" is
  inflected: `render\b` does not match `renders`. The verb now accepts
  `(?:s|ed)?`.

- Failing half (guards final, copy unchanged):
  `nub exec vitest run src/components/landing.test.tsx src/prose-truth.test.ts`
  → **1 failed / 19 passed**; the failure is
  `landing page > lists the six preview tiers …` with
  `expected true to be false` from `deniesLiveSurface(html)`.
- Fixed half: same command → **2 files / 20 tests passed**.
- Whole docs suite: **46 files / 293 tests passed**.
- `nub run check` / `nub run lint` / `nub run test`: exit `0`.
- Built-site smoke (`--no-build` against the fresh build): `sitemap 86 pages`,
  `pages 86 checked`, `links 105 checked`, `search checked`, `not-found
  checked`, `robots checked`, `ok`, exit `0`.

## 7. Acceptance

- `/` no longer claims the site cannot render GPUix, and a reader is pointed at
  the live tier and the playground accurately.
- One shared predicate guards MDX prose and rendered chrome, and the guard is
  proven to fail on the exact sentence that shipped.
- No new dependency, no test-only escape hatch, no change outside `apps/docs`,
  the plan index and `TODO.md`.
