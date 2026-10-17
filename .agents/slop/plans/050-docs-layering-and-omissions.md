# 050 — The layering model and the deliberate token omissions

**Workstream:** `tokens-theme`
**Phase:** B (working foundation)
**Depends on:** plan 011 (`@gpuixui/tokens`), plan 017 (the focus truth pass),
plan 018 (the single-shadow truth pass), plan 019 (motion)
**Files owned:** `docs/tokens.md`, `docs/design-system.md`,
`packages/tokens/src/theme.test.ts` (one `it`), this plan,
`.agents/slop/plans/README.md` (index row only), `TODO.md` (this workstream
only), `.agents/slop/plans/202-adopt-theme-tokens.md` (execution note appended —
its Owner field names this workstream).

Numbering: the plan index reserves `010–019` for tokens and theming and
`020–049` for primitives, icons and Phase C, so this tokens follow-up takes a
number from the free `050–099` block.

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

`202-adopt-theme-tokens.md` (Owner: this workstream) reconciles `adabraka-ui`'s
`ThemeTokens` with `@gpuixui/tokens`. Its §2.2 (motion) was delivered by plan 019
and its §2.1 (focus geometry) rests on a premise plan 017 disproved. Three
things it asks for are still outstanding, and one of them is what the components
workstream is tripping over right now.

### 1.1 There is no stacking scale, and there is no portal (re-verified)

```sh
V=/private/tmp/opencode/gpuix-verify/node_modules/@gpuix   # @0.10.0
grep -rn "zIndex\|z-index" "$V"/native/dist "$V"/react/dist   # no matches
grep -rn "AnimatePresence\|motion" "$V"/react/dist/index.d.ts # exported
grep -rn "FloatingLayer" "$V"/react/dist/floating.d.ts        # exported
grep -rn "Portal\|portal" "$V"/react/dist/*.d.ts              # no matches
```

So, for the published release the library targets:

- **no `z-index` anywhere** — paint order *is* tree order;
- `FloatingLayer` + `floatingRootStyle` (`@gpuix/react/floating`) and the
  `<anchored>` host element position an overlay and occlude what it covers;
- `AnimatePresence` + `motion` animate enter and exit;
- **no portal**: `createPortal` is an unreleased changeset, so an overlay paints
  where it sits in the tree — a modal scrim that must cover the whole window has
  to be mounted where it paints over its siblings.

`202` §2.3 says overlays mount through `createPortal`; that is true of
`references/gpuix`'s `main`, not of 0.10.0. The components workstream is planning
Dialog/Popover on `Dialog`/`DialogPortal`/`createPortal`
(`workspaces/components/.agents/slop/plans/112-tier2-overlays.md`), which
published 0.10.0 does not export. That is their call to make, but the layering
model belongs in the token catalogue, where it is documented once.

### 1.2 The deliberate omissions are not recorded

`202` §2.4 lists what must **not** be added: breakpoints (app-level, via
`useWindowSize`/`useWindowInsets`), `shadow_xs`/`shadow_xl` (four elevation
levels cover the shipped surfaces), a second spacing or radius scale, a `z`
scale. Unrecorded, the next agent adds one.

## 2. Design decisions (do not re-litigate)

1. **No numeric stacking token, ever.** A `z` token cannot be enforced where the
   runtime has no stacking context; the rule is tree order.
2. **The layering section documents behaviour, not tokens.** The mounting order
   (dropdown → popover → tooltip → modal → toast) is a rule for components and
   apps, not data.
3. **The portal limitation is stated with its evidence.** No "temporary" claim
   that overlays float above the app in 0.10.0.
4. **Omissions are listed as omissions**, each with the reason, so a reviewer
   can see they were decided rather than forgotten.
5. **One enforceable guard**: a test reads `theme.ts` and fails if a stacking
   token appears (202 §6 asks for exactly this).

## 3. Exact changes

### 3.1 `docs/tokens.md` — a `## Layering` section after `## Motion`

Contents, in prose and a short list:

- There is no `z-index` and no stacking context: **tree order is paint order**, so
  the mounting rule is *dropdown → popover → tooltip → modal → toast*, applied by
  mounting (or ordering) accordingly.
- Overlays position with `FloatingLayer`/`floatingRootStyle`
  (`@gpuix/react/floating`) and the `<anchored>` host element, which occludes what
  the layer covers.
- Enter and exit are `AnimatePresence` + `motion`, timed by the motion tokens.
- **No portal in 0.10.0** (`createPortal` is an unreleased changeset): an overlay
  paints where it sits in the tree. A window-covering scrim therefore has to be
  mounted where it paints over its siblings; the docs say so, with the version
  they were verified against.
- The section closes with the sentence that the model is documented, not
  tokenised: there is no layering token, and there will not be one.

### 3.2 `docs/tokens.md` — deliberate omissions

Extend `## Limitations and future work` (keeping it a list):

- no breakpoints: responsiveness is app-level (`useWindowSize`, `useWindowInsets`);
- no `shadow_xs` / `shadow_xl`: four elevation levels cover the shipped surfaces;
- no second spacing or radius scale;
- no stacking scale (see `## Layering`).

### 3.3 `docs/design-system.md`

§7's elevation paragraph gains one sentence: overlays are ordered by tree order
because the runtime has no stacking context, and the section points at
`docs/tokens.md#layering`.

### 3.4 `packages/tokens/src/theme.test.ts`

One `it` inside `describe("theme completeness")`:

```ts
it("ships no stacking scale, because GPUix paints in tree order", () => {
  // `node:fs` is deliberate: this is a policy test over the package's own
  // source, and the package ships zero dependencies (see exports.test.ts).
  const source = readFileSync(new URL("./theme.ts", import.meta.url), "utf8");
  expect(source).not.toMatch(/z-?index/i);
});
```

Import `readFileSync` from `node:fs`. It fails if a future agent adds a stacking
token, which is the decision §1.1 records.

### 3.5 `202-adopt-theme-tokens.md` — an execution note

Append a short section: what this workstream delivered (`motion` in plan 019 —
milliseconds plus `motionTransition`, not the seconds-only shape §2.2 sketched;
the focus ring in plan 017 — a single spread `boxShadow`, because §2.1's
`outlineWidth`/`outlineOffset` are **not** in published 0.10.0), and what remains
(the layering section and omissions, delivered here).

### 3.6 `TODO.md`

Add and tick `Document the layering model and the deliberate token omissions
(plan 050; completes plan 202 §2.3–2.4)`. Add a cross-team bullet:
`components` — published 0.10.0 exports no `Dialog`/`DialogPortal`/`createPortal`
(only `FloatingLayer` + `<anchored>` + `AnimatePresence`), and their plan 112
builds on those; owner: `components`.

### 3.7 `LICENSES/`

Not this workstream's path. `202` §7 asks for `LICENSES/adabraka-ui.md` (MIT,
structure referenced, no assets copied); record it as a TODO item for the
licensing owner instead of writing the file.

## 4. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme

nub run --filter @gpuixui/tokens test         # expect all pass
nub run --filter @gpuixui/tokens check-types  # expect exit 0
nub run check && nub run lint && nub run test # expect exit 0
```

Two-direction proof for §3.4: add `zIndex: 0` to the `Theme` interface and its
four themes, run the test, expect "ships no stacking scale" to fail; remove it.
(Do not commit the mutation.)

## 5. Test plan

- The new `it` fails when a stacking token is introduced and passes without one.
- The docs sections are verified by reading them against §1.1's evidence; the
  headings `## Layering` and the limitation bullets must be present.
- No existing assertion is weakened.

## 6. STOP conditions

- STOP if published 0.10.0 **does** export `createPortal` or accept `zIndex`
  (re-run the greps). The section would then be wrong and must describe the
  supported mechanism instead.
- STOP if documenting layering requires a token — it does not; a layering token
  is a design decision this plan refuses.
- STOP if any gate is red for a reason outside this plan.

## 7. Acceptance criteria

- [ ] `docs/tokens.md` has `## Layering` with the tree-order rule, the
      `FloatingLayer`/`<anchored>`/`AnimatePresence` mechanism and the no-portal
      limitation, each tied to the verified version.
- [ ] `docs/tokens.md` lists the deliberate omissions; `docs/design-system.md`
      points at the section.
- [ ] `theme.test.ts` fails on a stacking token (both directions run).
- [ ] `202-adopt-theme-tokens.md` carries the execution note; `TODO.md` records
      the work and the `components` interlock.
- [ ] `nub run check`, `nub run lint`, `nub run test` exit 0.
- [ ] Committed on `agent/tokens-theme` and pushed.
