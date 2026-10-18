# 377 — `Text` cannot underline or strike, and the page never says so

| | |
| --- | --- |
| Phase | F (integration and polish) |
| Workstream | primitives |
| Depends on | 020, 030, 041, 047, 059, 082, 203, 365 |
| Status | done |

## 0. The gap, measured

The Tier 1 text primitive exposes a role, a tone, alignment, truncation, a clamp
and selectable text — but no inline decoration. Published 0.10.0's `StyleDesc`
has `textDecoration?: "underline" | "line-through" | "none"`, and the native
renderer maps all three (`renderer.rs`'s `text_decoration` match; the upstream
react package has a style-coverage test for both painted values). `docs/text.mdx`
does not mention the capability or its absence, so the limitation is silent.

Measured on this host, GPUix 0.10.0, with a throwaway capture probe (deleted
after the measurements below were recorded): three frames of the same string,

| Frame | Bytes equal to the plain frame? |
| ----- | ------------------------------- |
| `<Text role="body">Hello</Text>` (reference) | — |
| `style={{ textDecoration: "underline" }}` | **no** — underline paints |
| `style={{ textDecoration: "line-through" }}` | **no** — strike paints |
| underline vs line-through | **no** — the two decorations differ |

So the runtime is not the limitation; the component is. A previous price, a
deprecated setting, or a link-like inline emphasis is not expressible through
`Text` today without passing `style` by hand, which the package's own rule says
belongs to deliberate overrides, not to the API of a typographic primitive.

The same probe establishes the honest limit that *is* real: `StyleDesc` has no
`fontStyle`, so italic cannot be expressed — the page must say so rather than
leave a reader guessing.

## 1. The rule

`Text` gains one optional inline decoration, named after the CSS property it
resolves to:

```ts
export type TextDecoration = "underline" | "line-through";
```

- Omitted means none; there is no `"none"` member because it is already the
  absence, and a caller who needs to override a decoration from `style` can still
  do so (`style` merges last).
- It resolves into `textDecoration` in `textStyle`, beside `textAlign`,
  `whiteSpace` and `lineClamp`, so there is one text resolver, not a second one
  in the component.
- It is paint only: no role, no accessibility node, no keyboard contract. A
  strikethrough is not an announcement; a screen reader hears the words.

## 2. Exact changes

All paths are under `packages/primitives/`.

### 2.1 `src/core/style.ts`

1. Beside `TextTone`/`TextSpec`, add the exported union with a TSDoc summary:

   ```ts
   /** Inline decoration the runtime paints; omitted means none. */
   export type TextDecoration = "underline" | "line-through";
   ```

2. Add `readonly decoration?: TextDecoration;` to `TextSpec` with a one-line
   comment.
3. In `textStyle`, after the tone/colour and before truncate:

   ```ts
   if (spec.decoration !== undefined) style.textDecoration = spec.decoration;
   ```

### 2.2 `src/core/index.ts`

Add `TextDecoration` to the `./style.js` type-export block (alphabetical).

### 2.3 `src/components/Text.tsx`

- Import `type TextDecoration`.
- Add to `TextProps`:

  ```ts
  /** Underline or strike through the run. Omit for no decoration. */
  readonly decoration?: TextDecoration;
  ```

- Destructure it in `renderText` and include it in the `spec` object.
- Update the module docstring only if it enumerates props (it does not).

### 2.4 `docs/text.mdx`

1. Usage: add a realistic pair — a struck previous value beside the current one:

   ```tsx
   <Stack direction="row" gap="2xs" align="baseline">
     <Text role="caption" tone="muted" decoration="line-through">$49</Text>
     <Text role="bodyStrong">$39</Text>
   </Stack>
   ```

   and the inline-emphasis shape: `<Text tone="primary" decoration="underline">View changelog</Text>`
   (still non-interactive; a real link is Tier 2).
2. API table: add the `decoration` row (type, default none, what it paints).
3. Limitations: add **no italic** — the runtime has no `fontStyle`; a different
   family or weight is the only emphasis the style model offers. Also note that
   decoration has no colour/style/offset control (one `textDecoration` value).
4. Verification: add the core and element cases plus the new capture suite.

### 2.5 `COMPONENTS.md`

In the Text row, append: `decoration` (`underline` / `line-through`) resolves
through `textStyle`; a capture proves both paint (underline and strike differ
from plain and from each other), and italic is recorded as unexpressible because
the runtime has no `fontStyle` (plan `377`).

### 2.6 `TODO.md`

Add and tick the row under the primitives workstream, with the measured counts;
update the workstream counter if the row count changes.

## 3. Test plan

### 3.1 Core — `src/core/style.test.ts`

- `textStyle({ role: "body", tone: "default" }, theme).textDecoration` is
  `undefined` (the default must not change any painted text).
- Each of the two values reaches `textDecoration` for the requested role.

### 3.2 Element tree — `src/components/presentational.test.tsx`

- `renderText({ decoration: "line-through" }, theme)` carries
  `textDecoration: "line-through"`; the plain render has no `textDecoration`.
- A caller `style={{ textDecoration: "none" }}` wins over the prop (the documented
  merge order).

### 3.3 Runtime — new `runtime/text-decoration.runtime.test.tsx`

Follow `runtime/text-align.runtime.test.tsx` (plan `365`): one window, temp
directory under `Effect.scoped`, `renderer.captureScreenshot`, byte comparison.

- `decoration="underline"` must be **byte-identical** to a frame that passes
  `textDecoration: "underline"` through `style` (our resolver maps the prop to
  the runtime's value), and **different** from the plain frame.
- `decoration="line-through"` must differ from both the plain and the underline
  frames.
- The plain frame is the reference; no assertion compares a frame with itself.

**Both directions.** Remove the `textDecoration` assignment from `textStyle` and
the underline case must fail (`expected true, received false`); remove the
`line-through` branch/union member and the strike case must fail. Record both
mutation outcomes in §8.

## 4. Commands and expected results

```sh
cd packages/primitives
nub run test                 # 46 files, 665 → 667+ tests, green
nub run check-types          # no output
nub run test:runtime         # 32 → 33 files, 616 → 618+ tests, green
```

From the repo root:

```sh
nub run check                # green
nub run lint
nub run test
```

Expected: every command exits `0`; the new runtime file is listed, the suite
totals rise by the number added.

## 5. STOP conditions

- **A capture of `textDecoration: "underline"` is byte-identical to plain.** The
  type is published but the pinned binding does not paint it; do not ship a prop
  that does nothing. Stop, and record the capability as unverified in
  `docs/gpuix-capabilities.md` instead. (The probe above already measured a
  difference on this host, so this should not fire on the pinned build.)
- **The two decorations paint identically.** They are not distinct values in the
  pinned runtime; stop and ship only the one that paints, with the evidence.
- **`StyleDesc` in the pinned version has no `textDecoration`.** The prop cannot
  type-check; stop and re-plan (the installed type does declare it).
- **The capture suite needs a new platform-specific path or a screenshot
  normalisation.** Do not add a heuristic; stop and record why the proof cannot
  be made.

## 6. Records updated

- This plan: status, §8 measurements and both mutation directions.
- `.agents/slop/plans/README.md`: the plan's row in the `020–049` block table.
- `TODO.md`: the new row ticked.
- `COMPONENTS.md`: the Text row sentence.
- `packages/primitives/README.md`: the runtime suite count.

## 7. Acceptance

1. `Text` accepts `decoration: "underline" | "line-through"`, omitted by default.
2. `textStyle` resolves it; the component has no second resolver.
3. A runtime capture proves both decorations paint and differ from plain and from
   each other; a plain frame is unchanged.
4. `docs/text.mdx` documents the prop, a realistic composition, the italic
   limitation, and the verification.
5. All package and repo gates are green; both mutations fail by case name.

## 8. Measured results

Implemented and run on this host, 2026-10-18:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | **46 files, 667 tests**, green (665 before) |
| `nub run --filter @gpuixui/primitives test:runtime` | **33 files, 618 tests**, green (616 before) |
| `nub run check` | green (check-tests, lint, fmt, check-types) |

The capture suite's reference frames were measured before the component change
(§0). Both mutation directions are recorded after the implementation run in this
table:

| Mutation | Failing case | Failure |
| -------- | ------------ | ------- |
| drop `textDecoration` from `textStyle` | `paints underline exactly like a manual frame` | `expected false to be true` (and the strike case also fails) |
| keep underline, drop the `line-through` mapping | `paints line-through unlike plain and underline` | `expected true to be false` (the underline case still passes) |
