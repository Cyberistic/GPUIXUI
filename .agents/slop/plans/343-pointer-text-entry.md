# Plan 343 — Pointer entry: caret placement, drag selection and textarea lines

**Workstream:** playground (`apps/playground`, `packages/testing`).
**Phase:** B → C (the input primitive).
**Depends on:** `100`, `110`, `120`, `140`, `188` (the keyboard text-entry
contract), `171` (highlight geometry).
**Owner path boundary:** only `apps/playground` and `packages/testing`.

---

## 1. Why this exists

`text-entry` (plan `188`) proves the **keyboard** half of the native editor:
caret keys, `shift-arrow`, `cmd-a`, Backspace, `readOnly`, the placeholder,
clipping and textarea autosize. It says nothing about the **pointer** half,
which every inline-edit, tag input, search field and table cell rename depends
on:

- does a click place the caret at the nearest glyph, or does it only focus?
- does a drag select a run, and does a later plain click clear that selection?
- does `shift`-click extend a selection?
- does Enter insert a newline in a `<textarea>`, and do `Up`/`Down` move between
  its lines?

The earlier plan also concluded "text entry is the native editor's" (PLAN.md
D33). That claim needs the pointer route measured, or a component author cannot
know whether to implement selection themselves.

## 2. Measured facts (this host, `TestRenderer` 1280×800, 0.10.0)

A controlled `<input>`/`<textarea>` at `fontSize: 20`, width 300, mono family.

| Gesture | Result |
| ------- | ------ |
| click at `x + 25` of `abcdef`, type `M` | `abMcdef` — the caret lands after `ab` (nearest glyph) |
| click at `x + 300 - 4`, type `2` | appends: `…2` |
| click at `x + 3`, type `1` | prepends: `1…` |
| press at `x + 3`, move to `x + 120`, release, type `Z` | the whole run is selected and replaced: `Z` |
| …then click at the right edge and type `Y` | `ZY` — the plain click **cleared** the selection |
| click at `x + 3`, **shift-click** at `x + 120`, type `S` | `S` — shift-click extended the selection |
| textarea: click, type `x`, `enter`, `y` | `x\ny`; the field autosizes 32 → 64 |
| then `up`, type `Z` | `xZ\ny` — `Up` moved to the previous line |

Two rules: the **native editor owns pointer selection** (a component must not
reimplement it), and `shift`-click is delivered to the editor through the
renderer's modifier argument, so a component that captures clicks must not
swallow it.

## 3. Files

Change:

- `packages/testing/src/smoke.ts` — `SmokeHost.click` gains an optional
  `modifiers?: string`; add `SmokeHost.pressWindow(x, y)`.
- `packages/testing/src/test-support.ts` — the inert host gains `pressWindow`
  and keeps `click` compatible.
- `packages/testing/src/native.ts` — forward `modifiers` to
  `renderer.nativeSimulateClick`; implement `pressWindow` with
  `nativeSimulateMouseDown`.
- `packages/testing/src/native.test.ts` — a test for the two new verbs against
  the real renderer? **No** — that file runs with the binding; instead add the
  adapter checks in the smoke scenario. (The package's own tests stay
  platform-free; `native.test.ts` is the existing binding-gated suite and is
  left unchanged.)
- `apps/playground/src/scenarios/pointer-entry.tsx` — the
  `pointer-text-entry` scenario (capability `input`, so no capability change).
- `apps/playground/src/scenarios/index.ts` — import + register after
  `textEntryScenario`.
- `COMPONENTS.md` — the input capability row's evidence list and the
  Input/TextArea inventory notes.
- `apps/playground/README.md` — evidence row, suite/check counts, structure.
- `TODO.md` — tick the task; note any cross-team consequence.
- `.agents/slop/plans/README.md` — index row.

## 4. The scenario

### 4.1 Host additions

`SmokeHost`:

```ts
readonly click: (testId: string, modifiers?: string) => void;
/** Presses the primary button at window coordinates (a drag's first half). */
readonly pressWindow: (x: number, y: number) => void;
```

`createHost`:

```ts
click: (testId, modifiers) =>
  withCenter(renderer, testId, (point) =>
    renderer.nativeSimulateClick(point.x, point.y, 0, modifiers),
  ),
pressWindow: (x, y) => renderer.nativeSimulateMouseDown(x, y),
```

`nullHost`: `click: () => {}` stays valid; add `pressWindow: () => {}`.

### 4.2 View

Four independent fixtures, each with its own local state and a `Readout`:

| testId | Content |
| ------ | ------- |
| `pointer-field` / `pointer-readout` | controlled `<input>` starting at `abcdef`, width 300, `fontSize: 20`, mono family |
| `pointer-drag-field` / `pointer-drag-readout` | the same, independent state |
| `pointer-shift-field` / `pointer-shift-readout` | the same, independent state |
| `pointer-area` / `pointer-area-readout` | controlled `<textarea>`, no `minRows`, same width/font |

Every field declares `autoFocus` only on the first one is **not** needed: each
gesture starts with a click, which focuses.

### 4.3 Steps

Read window coordinates from `ctx.host.bounds(...)`, then drive the host:

1. **Caret placement.** On `pointer-field`: click at `x + 25`, type `M`; the
   readout is `abMcdef` (the marker's index is 2 — measured; assert the marker
   is strictly inside the run, `0 < indexOf("M") < 6`). Click at
   `x + width - 4`, type `2` → ends with `2`; click at `x + 3`, type `1` →
   starts with `1`. Together: the caret follows the pointer from edge to edge.
2. **Drag selection.** On `pointer-drag-field`: press at `x + 3`, move to
   `x + 120`, release, type `Z` → the readout is exactly `Z` (the run was
   replaced). Then click at the right edge and type `Y` → `ZY` (the click
   cleared the old selection; typing inserts).
3. **Shift-click.** On `pointer-shift-field`: click at `x + 3`, then
   `click("pointer-shift-field", "shift")` is the *centre*, not the right edge
   — use `pressWindow`? No: a shift-click at a coordinate has no host verb.
   **Add `clickWindow(x, y, modifiers?)`?** `clickWindow` already exists without
   modifiers. Extend it the same way (`modifiers?: string`) and use
   `clickWindow(x + 120, centreY, "shift")` after the opening click. Result:
   type `S` → the readout is exactly `S`.
4. **Textarea lines.** On `pointer-area`: click, type `x`, `enter`, `y` → the
   readout is `x\ny` and the field's height is 64 ± 1 (two rows; one row was
   32). Then `up`, type `Z` → `xZ\ny`.

Extra check: the readouts prove the value; the height check proves the
autosize. No screenshot.

### 4.4 Host signature for step 3

Extend `clickWindow` as well:

```ts
readonly clickWindow: (x: number, y: number, modifiers?: string) => void;
```

`createHost`: `clickWindow: (x, y, modifiers) => renderer.nativeSimulateClick(x, y, 0, modifiers)`.

## 5. Documentation

- `COMPONENTS.md` capability table `input` row: add `pointer-text-entry`.
- `COMPONENTS.md` **Input** and **TextArea** inventory rows: append the pointer
  contract (click places the caret at the nearest glyph, drag selects, a click
  clears, shift-click extends, Enter/Up in a textarea) and that a component must
  not reimplement selection or swallow a shift-click.
- `apps/playground/README.md`: evidence row; counts `71 → 72` and
  `1951 → …`; structure list.
- `TODO.md`: tick the task.
- Plan index: status `landed` with the counts and proofs.

## 6. Commands and expected results

```sh
nub run --filter playground build          # exit 0
nub apps/playground/dist/smoke/run.js --only pointer-text-entry  # exit 0
nub apps/playground/dist/smoke/run.js      # exit 0; 72/72, `input=verified`
nub run check                              # exit 0
nub run test                               # exit 0
nub apps/playground/dist/live/run.js       # exit 0; live stays 22/22
```

## 7. Test plan and the two-direction proof

- **M1 — pointer ignored.** Change the caret field's click x from `x + 25` to
  `x + 3` in the first step. Expect exit `1` with the marker at index 0.
- **M2 — drag selection lost.** Remove the `press/move/release` steps and type
  `Z`: expect exit `1` because the readout is `abcdefZ`, not `Z`.
- **M3 — shift-click swallowed.** Replace the shift-click with a plain
  `clickWindow` at the same point: expect exit `1` because typing `S` gives
  `Sbcdef` (selection replaced from the caret only) rather than `S`.

Record the exact strings in §8.

## 8. Result (filled in after the run)

_(executor records the M-strings and final counts)_

## 9. STOP conditions

Stop and report if:

- a click does **not** move the caret (exit 1 on the first step): that is a
  different editor contract than plan `188` implies and needs a plan revision,
  not a relaxed assertion;
- `shift-click` types an `S` in the middle instead of replacing the run: record
  the actual behaviour and stop before writing the docs;
- the textarea's Enter does not insert a newline (it would be the `onSubmit`
  path — plan `046` measured that a `<textarea>` only submits when the listener
  is set);
- a fix requires editing a package outside this workstream.

## 10. Acceptance

- `pointer-text-entry` green; suite `72/72`, exit `0`.
- The three mutations each exit `1`; the restored tree is green.
- `nub run check`, `nub run lint`, `nub run test` pass; live stays `22/22`.
- Docs, inventory, TODO and plan index updated; committed and pushed.
