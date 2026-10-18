# 342 — `Box` denied the runtime's two-stop background gradient

**Phase:** F (docs truth)
**Owner:** primitives workstream (`packages/primitives`)
**Depends on:** 030, 041, 047, 097, 203
**Status:** planned
**Estimated scope:** one docs page, one runtime case, one element case, one
cross-doc guard, `COMPONENTS.md` Box row.

## 0. The false claim, measured

`packages/primitives/docs/box.mdx` says, under Limitations:

> No gradient, background image or border-style control: the runtime's
> `StyleDesc` supports solid roles only.

The first half about a dedicated prop is true: `Box` accepts no `background`
prop. The justification is false and the conclusion is wrong: `StyleDesc`
accepts `background: string | LinearGradientBackground` in the pinned 0.10.0
(`@gpuix/native/dist/host.d.ts` line 91; `capabilities.md` already lists
"Two-stop linear gradient — supported"). A caller can pass a gradient through
`Box`'s `style`, which is merged last.

Measured in the real renderer with a probe:

```
$ ./node_modules/.bin/vitest run --config vitest.runtime.config.ts \
    runtime/probe-gradient.runtime.test.tsx
- Expected                       (received)
  { type: "linear-gradient", angle: 90, stops: [ … ] }
+ { type: "linear-gradient", angle: 90, colorSpace: null, stops: [ … ] }
```

The runtime reports the authored gradient object back on `TestElement.style`
(the null `colorSpace` is the runtime's normalised field). So the paint path is
real and the docs are what is broken.

**STOP if** the probe shows `background` absent or a solid value: the
capability map is wrong and this plan must be re-planned against the runtime.

## 1. What to change

The fix is **documentation truth plus the tests that keep it true**; no
component code changes, because `style` is already the override surface and the
element-tree merge already carries any `StyleDesc` property.

1. `docs/box.mdx`
   - Replace the false limitation with: no dedicated `background` prop; a
     two-stop `style.background` linear gradient **is** supported; a background
     image, `borderStyle`, and multi-stop/radial gradients are not (the
     capability table's verdicts).
   - Add a short `## Backgrounds` section with a copyable example. Use theme
     roles for both stops, not literals:
     ```tsx
     <Box
       padding="lg"
       style={{
         background: {
           type: "linear-gradient",
           angle: 90,
           stops: [
             { color: theme.colors.primary, position: 0 },
             { color: theme.colors.accent, position: 1 },
           ],
         },
       }}
     />
     ```
     State that `background` and `backgroundColor` are separate: a gradient
     replaces the solid fill, and `surfaceStyle`'s role still applies when no
     `background` is given.
2. `runtime/layout.runtime.test.tsx` — one case: a `Box` with the gradient in
   `style` reports `type: "linear-gradient"`, the angle and the two stops on the
   painted element. Use `Option.getOrElse(runtime.element(...), expect.fail)`
   and destructure the record at the boundary (`Record<string, unknown>`).
   The null `colorSpace` is ignored, not asserted.
3. `src/components/presentational.test.tsx` — one element-tree case: a
   gradient passed to `Box` survives the caller-style merge (it is not replaced
   by the tone's `backgroundColor`).
4. `src/capabilities.test.ts` — one cross-doc guard: read `docs/box.mdx` and
   fail if it contains `"supports solid roles only"` while the limits table's
   "Two-stop linear gradient" row is `supported`. This is the exact regression:
   a page contradicting the capability reference. It names the file and the
   claim in the failure message.
5. `COMPONENTS.md` Box row — append the truth and the new runtime case.
6. `TODO.md` — tick a primitives task after plan 341.
7. `.agents/slop/plans/README.md` — index this plan.

Do not add a `Box.background` prop: the component's documented rule is that
`style` is where an app overrides the surface, and a prop would be a second way
to do the same thing.

## 2. Test plan

| Test | What it catches |
| ---- | --------------- |
| runtime `layout.runtime.test.tsx` gradient case | the runtime stops painting/reporting the authored gradient, or `Box` drops `background` from `style` |
| element `presentational.test.tsx` gradient case | a future `surfaceStyle` merge starts overwriting `background` |
| `capabilities.test.ts` cross-doc assertion | the false "solid roles only" claim returns, or the capability table changes verdict and the page is not revisited |

Two-direction proof:

- delete `background` from the runtime tree (or replace the gradient with
  `backgroundColor`) → the runtime case fails;
- remove the caller's `background` from the element merge → the element case
  fails;
- re-add "supports solid roles only" to `box.mdx` → the guard fails by file and
  claim.

## 3. Commands and expected results

```sh
cd packages/primitives
./node_modules/.bin/vitest run src/capabilities.test.ts src/components/presentational.test.tsx
./node_modules/.bin/vitest run --config vitest.runtime.config.ts runtime/layout.runtime.test.tsx

cd ../..
nub run check
nub run lint
nub run test
```

Expected: the focused suites green; the runtime suite 382 tests in 23 files;
`nub run check` formats and type-checks clean; `nub run test` unchanged except
the counts.

## 4. STOP conditions

- The probe does not report the gradient (see §0) — stop and re-plan.
- A test needs a type assertion or `any` to read `TestElement.style` — stop and
  decode the record with the harness instead.
- The capability table's gradient verdict itself is wrong — stop; that is a
  plan-203 change, not a box docs change.

## 5. Acceptance

- `box.mdx` no longer claims the runtime is solid-only, shows a themed gradient,
  and lists the limitations that are real (no background image, no
  `borderStyle`, no multi-stop/radial gradient).
- The runtime and element tests prove a `Box` carries and paints a two-stop
  gradient.
- The cross-doc guard fails if the false claim returns.
- `COMPONENTS.md`, `TODO.md` and the plan index agree.

## 6. Outcome (filled in on completion)

- Probe: the renderer reported `{ type: "linear-gradient", angle: 90,
  colorSpace: null, stops: [...] }` for a `Box` with the gradient in `style`.
- `runtime/layout.runtime.test.tsx` gained the paint case (24 tests in that
  file); the package runtime suite is 382 tests in 23 files.
- `src/components/presentational.test.tsx` gained the merge case (18 tests in
  that file); offline 555 tests in 41 files.
- `src/capabilities.test.ts` gained the cross-doc guard (9 tests in that file).
- Two-direction proofs, measured:
  - re-adding "supports solid roles only" to `box.mdx` → the guard fails at the
    `Str.includes(...)` assertion;
  - making `renderBox` ignore the caller's `style` → the element case fails on
    `styleProp(element, "background")`.
- Gates: `nub run check`, `nub run lint`, `nub run test` green.
