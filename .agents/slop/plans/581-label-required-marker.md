# 581 — A required marker is announced as a bare asterisk

**Phase:** F (integration and polish) · **Owner:** primitives · **Depends on:** 026, 027, 059, 073, 093, 577

## 0. The bug

`Label`'s `required` prop paints a destructive `*` and its page calls that mark
**"visual only"** (`docs/label.mdx` → API and Limitations). Measured on this
host with the real `TestRenderer`, the marker is not visual only: the runtime
turns every `<text>` into a `Label` node, so a required label produces **three**
nodes —

```
Label "Email"
Label "*"        ← the required marker
Label "Help"
```

A screen reader walking that tree reads an unexplained "asterisk" after the
name. There is no `aria-required`/`aria-labelledby` in 0.10.0 (plan 020 §1.4),
so the marker is the **only** channel that can tell assistive technology the
field is required; today it carries no meaning and the page's "visual only"
claim hides that.

The fix gives the mark a meaning instead of deleting it: the marker becomes the
same shape the package already uses for a meaningful glyph — an image with an
accessible name (`Icon` with a `label`, plan 073/093) — named by a new
`Label.requiredLabel` (default `"required"`). The reusable half is a `label` prop
on `Text`, the primitive that already owns "which host semantics does this run
carry" (`textSemantics`, plan 059).

## 1. Evidence

Runtime accessibility dump **before** (`<Label required description="Help">
Email</Label>`, 2026-10-19):

```
a: { role: "Label", value: "Email" }
b: { role: "Label", value: "*" }
c: { role: "Label", value: "Help" }
```

Probed on the same host, the shape a named mark produces:

```
<text role="img" aria-label="required">*</text>
→ { role: "Image", label: "required", value: "*" }
```

So the runtime maps the name, and the marker keeps its paint.

**After:**

```
a: { role: "Label", value: "Email" }
b: { role: "Image", label: "required", value: "*" }
c: { role: "Label", value: "Help" }
```

`<Label requiredLabel="obligatoire" required>…` names the image
`"obligatoire"`; a blank `requiredLabel` falls back to `"required"` (the
`ariaNameOr` rule plan 026 already applies to `Spinner`/OTP).

## 2. Changes

### 2.1 `packages/primitives/src/components/Text.tsx`

Add one prop:

```ts
/**
 * Accessible name for a **mark**, not prose — a required asterisk, a status
 * glyph. A named run is exposed as an image with this name (the same shape as
 * `Icon`'s `label`); omit it for text, and a blank name is absent (plan 026).
 */
readonly label?: string;
```

`textSemantics` takes the optional name and gives it priority:

```ts
export const textSemantics = (
  role: TextRole,
  label?: string,
): {
  readonly role?: string;
  readonly "aria-level"?: number;
  readonly "aria-label"?: string;
} => {
  const named = ariaName(label);
  if (named !== undefined) return { role: "img", "aria-label": named };
  const level = HEADING_LEVELS[role];
  if (level !== undefined) return { role: "heading", "aria-level": level };
  return role === "code" || role === "codeBlock" ? { role: "code" } : {};
};
```

`renderText` passes `label` through. A blank name leaves the role's own
semantics untouched, so an unnamed `Text` is unchanged.

### 2.2 `packages/primitives/src/components/Label.tsx`

Add `requiredLabel?: string` (JSDoc: the marker's accessible name; defaults to
`"required"`, a blank value falls back to it). The marker stays a `Text` so the
role, tone and layout are unchanged, and gains the name:

```tsx
{required === true ? (
  <Text
    role="label"
    tone="destructive"
    label={ariaNameOr(requiredLabel, "required")}
  >
    *
  </Text>
) : null}
```

No change to `renderLabel`'s signature (it stays pure and theme-free).

### 2.3 Documentation

- `docs/label.mdx` — the `required` consequence stops saying "visual only"; add
  a `requiredLabel` API row; the Accessibility section states that the marker is
  an image named by that prop, and the Limitations section keeps the honest
  caveat that it is **not** `aria-required` (the runtime has none) and is not
  associated with the control (no `aria-labelledby`). Add the new runtime file to
  Verification.
- `docs/text.mdx` — an API row for `label`; the Accessibility section gains a
  "marks" paragraph and a table row (`label` present → `Image` named); the
  Limitations section notes that the name overrides the role's own semantics
  (a named heading is an image, which is why the prop is for marks only).
- `COMPONENTS.md` — append the rule to the **Text / typography** and **Labels**
  rows.
- `.agents/slop/plans/README.md` — index this plan.
- `TODO.md` — add and tick the task under the primitives workstream.

### 2.4 Example

`examples/form.example.tsx` — make the workspace-name field **required** (with
the default marker). The example coverage guard (plan 374) then renders the new
shape in the native suite, and the form reads like a real required field.

## 3. Test plan

### Offline (`src/components/presentational.test.tsx`)

1. `renderText({ label: "  required  " }, testTheme)` → host `role` `"img"`,
   host `aria-label` `"required"`.
2. `renderText({ label: "   " }, testTheme)` → no `role`/`aria-label`; prose
   stays a `Label`. (The blank-name rule.)
3. `renderLabel({ required: true, children: "Email" })` → the marker element
   carries `role="img"` and `aria-label="required"`.
4. `renderLabel({ required: true, requiredLabel: " obligatoire ", children:
   "Email" })` → `aria-label="obligatoire"` (trimmed).
5. `renderLabel({ required: true, requiredLabel: "   ", children: "Email" })` →
   `aria-label="required"` (documented fallback).
6. `renderLabel({ children: "Email" })` → no marker element (one child in the
   name row).

### Runtime (`runtime/label-required.runtime.test.tsx`, new)

Header explains the bug class (a decorative glyph reaching assistive technology
as a bare `*`). One fresh window per case, per `fixture.tsx`.

1. `<Label required>Email</Label>` → the dump contains an `Image` node named
   `"required"`, **and no node whose value is `"*"`**.
2. `<Label required requiredLabel="obligatoire">Email</Label>` → an `Image`
   named `"obligatoire"`.
3. Negative half: `<Label>Email</Label>` → no `Image` node.

Use `a11yNodes`/the existing helpers from `../src/testing/index.js`; a node
match by `aria.role === "Image"` and `aria.label === "required"`. The old
direction reports `role: "Label", value: "*"` and no `Image` node, so cases 1–2
fail before the fix. Case 3 passes in both directions and is the negative half.

### Commands and expectations

Before the fix (old `textSemantics`/marker), both directions:

```sh
cd packages/primitives
nub exec vitest run src/components/presentational.test.tsx
# measured: 2 failed / 27 passed — both new cases (the mark and the marker)
nub exec vitest run --config vitest.runtime.config.ts runtime/label-required.runtime.test.tsx
# measured: 2 failed / 1 passed — no Image node; the marker is still a Label "*";
# the negative case (no `required`, no image) passes in both directions
```

After the fix:

```sh
cd packages/primitives
nub exec vitest run src/components/presentational.test.tsx
# measured: 29 passed
nub exec vitest run --config vitest.runtime.config.ts runtime/label-required.runtime.test.tsx
# measured: 3 passed
```

Gates:

```sh
nub run --filter @gpuixui/primitives test
nub run check
nub run lint
nub run test
```

Expected: primitives green (51 offline files, 745 tests); `check`/`lint` green. `nub run test` is the repo-wide offline suite; the runtime
suite stays out of it by design (plan 030 §4). The host's full runtime suite is
still degraded by the plan-529 artifact (TODO row); only the new scoped file is
claimed.

## 4. STOP conditions

- The probe shows `aria-label` on a `<text role="img">` does **not** reach
  AccessKit: stop and report; the fallback would be `role="presentation"` (a
  silent marker) but that loses required information, so do not guess.
- A named `Text` changes a layout or paint assertion outside its semantics:
  stop and report — `label` must be semantics only.
- `Label.requiredLabel` needs a value that is not a string (i18n keys, a node):
  stop; every existing user-facing fallback in this package is an English
  string (`"Loading"`, `"More information"`, `"Code digit N"`).
- A change is needed outside `packages/primitives` and `examples/form.example.tsx`
  (both this workstream): record it in `TODO.md` instead.

## 5. Acceptance

- A required `Label` no longer publishes a bare `*` node; its marker is an
  `Image` named `required`, or by `requiredLabel`.
- `Text` can name a mark; a blank name stays prose and a named run's role
  semantics are documented.
- The two new offline cases and the three runtime cases fail in the old
  direction where claimed and pass after (6 assertions in the offline pair).
- `docs/label.mdx`, `docs/text.mdx`, `COMPONENTS.md`, the plan index and
  `TODO.md` record the behaviour; the form example shows a required field.
- `nub run check`, `nub run lint`, `nub run test` pass.
