# 025 — fields have a real disabled state

**Phase:** C (Tier 1 completeness). **Owner:** primitives workstream.
**Depends on:** plan `030` (the field components), `041` (runtime harness),
`046` (TextArea has no `onSubmit`).
**Status:** done (2026-10-17).

## 1. Why

Every interactive Tier 1 control except the two fields has a `disabled` prop:
`Button`, `Checkbox`, `RadioGroup`, `Select`, `Switch`. `Input` and `TextArea`
expose only `readOnly`, so a form cannot disable a field the way it disables the
submit button. The published `<input>`/`<textarea>` host has **no `disabled`
prop** (measured in `@gpuix/native@0.10.0` `dist/host.d.ts`: `InputProps` is
`value`, `placeholder`, `readOnly`, `theme`), so the honest implementation is:

- **read-only** at the host: the runtime refuses edits;
- **out of the tab order** and **not auto-focused**;
- **de-emphasised** with the same disabled chrome a disabled Button uses
  (`controlStyle` with `disabled: true`: opacity `0.5`, no hover/active);
- **guarded handlers**: no `onChange`, no `onSubmit`, no focus ring.

That is a *disabled field* as far as a pointer/keyboard user is concerned. It is
not a native `disabled` control for assistive technology — GPUix has no way to
express that — and the difference must be recorded in `COMPONENTS.md` and the
field docs, not hidden. (AccessKit sees a read-only field.)

## 2. Files

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Input.tsx` | `FieldProps.disabled`; `fieldChrome` paints disabled and skips the ring; `fieldHostProps` forwards `readOnly`, `tabIndex`, and guards handlers |
| `packages/primitives/src/components/fields.test.tsx` | the offline contract from §4 |
| `packages/primitives/runtime/fields.runtime.test.tsx` | the native probe from §4 |
| `packages/primitives/docs/input.mdx` | document `disabled` and the read-only limitation |
| `packages/primitives/docs/textarea.mdx` | same |
| `COMPONENTS.md` | notes for Text inputs / Text areas record the disabled behaviour and its limitation |
| `TODO.md` / plan index | record plan 025 when the gates pass |

`TextArea` reuses `FieldProps`/`fieldChrome`/`fieldHostProps`; do **not** add a
parallel implementation there.

## 3. Steps

1. In `FieldProps` add:

   ```ts
   /** Not editable, out of the tab order, and painted with the disabled chrome. */
   readonly disabled?: boolean;
   ```

2. `fieldChrome`:

   ```ts
   const spec = { variant: fieldVariant, size, invalid, disabled, fullWidth };
   const base = mergeStyle(
     mergeStyle(controlStyle(spec, theme), fieldTextStyle(theme)),
     disabled === true ? { cursor: "not-allowed" } : undefined,
   );
   const ring = focused && disabled !== true ? controlFocusStyle(spec, theme) : {};
   return mergeStyle(mergeStyle(base, ring), style);
   ```

   `controlStyle` already paints `opacity: 0.5` and pins hover/active to the
   resting fill when `disabled` is true; the explicit cursor overrides
   `fieldTextStyle`’s `cursor: "text"`.

3. `fieldHostProps`:

   ```ts
   readOnly: props.readOnly === true || props.disabled === true,
   autoFocus: props.disabled === true ? undefined : props.autoFocus,
   tabIndex: props.disabled === true ? -1 : undefined,
   onSubmit: props.disabled === true ? undefined : props.onSubmit,
   onChange: (event) =>
     props.disabled === true ? undefined : onValueChange(event.value ?? ""),
   ```

   Keep every other prop as it is. Type-check against
   `@gpuix/react`’s `InputProps`; `tabIndex` is on `HostProps`.

4. Tests (§4), then:

   ```sh
   nub run --filter @gpuixui/primitives test
   nub run --filter @gpuixui/primitives test:runtime
   nub run check
   nub run test
   ```

   Expected: offline 15 files / 164 tests (three new); runtime 7 files / 70
   tests (two new) — record the exact counts if they differ.

5. Commit and push:

   ```sh
   git add packages/primitives COMPONENTS.md TODO.md .agents/slop/plans
   git commit -m "feat(primitives): a real disabled state for fields"
   git push origin agent/primitives
   ```

## 4. Test plan

**Offline (`fields.test.tsx`)** — assert the decoded element tree:

1. A disabled Input forwards `readOnly: true`, `tabIndex: -1`, no
   `autoFocus`, and its style has `opacity < 1` and `cursor: "not-allowed"`.
2. A disabled Input’s `onChange` and `onSubmit` handlers are absent from the
   element (the guards), so a stray runtime event cannot reach the parent.
   If a handler is still attached but guarded, invoke it and assert the owner
   was not called — either shape is acceptable, the assertion is that the
   parent never observes an edit.
3. A disabled TextArea is read-only too and keeps no submit handler (it has
   none at all, per plan 046).

**Runtime (`fields.runtime.test.tsx`)**:

1. Render a disabled Input with an `onChange` recorder; click it (which would
   focus a normal field), type `"h e l l o"`; assert the recorder is empty and
   the field painted the de-emphasised opacity.
2. Render a disabled TextArea, click and type `"a enter b"`; assert no edit was
   reported.

Both-direction proof: before the change the field compiles without `disabled`,
so the new tests are the regression. To prove the runtime test can fail, remove
`props.disabled === true ? undefined :` from `autoFocus`/handlers on a scratch
copy and confirm the typing probe reports an edit; restore before committing.

## 5. STOP conditions

- The runtime ignores `readOnly` (typing still produces `onChange`). STOP: the
  disabled contract cannot be honest with this host; record the measured
  behaviour and do not ship a fake disabled state.
- `tabIndex` on an `<input>` prevents neither click-focus nor typing in a way
  that makes the runtime probe unreliable — record and test the strongest true
  statement instead of loosening the assertion.
- A field consumer outside this workstream passes `disabled` expecting a native
  disabled semantic — grep and report; do not silently reinterpret it.

## 6. Acceptance

- `Input`/`TextArea` accept `disabled`; it is honest, documented and tested in
  the runtime.
- Disabled fields cannot be edited, submitted or tabbed into; they paint the
  same disabled chrome as other controls; their focus ring never paints.
- Docs and `COMPONENTS.md` state the read-only accessibility limitation.
- `nub run check` and `nub run test` green; the runtime suite green.
