# 797 — The field ink contract, in the frame: text, placeholder, selection wash and caret

**Phase:** F (pixel evidence) · **Workstream:** playground · **Status:** landed

**Depends on:** `100`, `110`, `120`, `140`, `150`, `188`, `197`, `330`, `533`,
`624`, `674`, `690`, `697`, `701`, `707`, `708`, `713`, `715`, `722`, `736`,
`745`, `754`, `761`, `764`, `771`, `773`, `775`, `778`, `784`, `791`.

**Owns:** `apps/playground` and `packages/testing` only. No other path is edited.

---

## 1. The bug being guarded

`@gpuixui/primitives`' `nativeTextTheme` is the one place the design system is
handed to a **native editor**:

```ts
// packages/primitives/src/core/style.ts:179
export const nativeTextTheme = (theme: PrimitiveTheme): GpuixTheme => ({
  appearance: theme.mode,
  bg: theme.colors.input,
  text: theme.colors.inputForeground,
  textMuted: theme.colors.mutedForeground,
  textFaint: theme.colors.placeholder,
  accent: theme.colors.primary,
  caret: theme.colors.primary,
  ...
});
```

Its doc comment claims it "keeps a field's placeholder, caret and selection in
the same palette as everything else". Every field in the library (`Input`,
`TextArea`, `NumberField`, each `OTPField` cell) passes it, and **no check in
either registry reads a field's painted pixels**:

| Evidence today | What it proves | What it cannot prove |
| -------------- | -------------- | -------------------- |
| `text-entry` / `live-text-entry` (`188`, `624`) | the placeholder **paints** and stops painting; caret **moves** (read from the value) | the colour of either |
| `pointer-entry` / `live-pointer-entry` (`343`, `535`, `536`) | a click places the caret, a drag selects | the caret's or the wash's ink |
| `editing-actions` (`764`) | `cmd-a`, copy, cut, paste and undo | what a selection looks like |
| `primitives-fields` / `live-primitives-*` (`168`, `570`) | a field mounts, edits, validates | its text ink |
| `text-ink-pixels` (`773`) | `<text>` glyphs carry their token | a **native editor's** glyphs |
| source reading (`theme.rs`, `input.rs`) | what *should* happen | what the rasteriser did |

A runtime that ignored `nativeTextTheme` entirely, or a future GPUix that
changed the field's default ink, would pass **all of it** — while every text
field in the library painted the wrong placeholder, an unthemable selection and
a caret in the wrong role. Plan `771` found the sibling hole for typefaces and
plan `791` the one for the modal veil; this is the field.

**Goal:** prove from decoded frames, in both hosts, which of the field's four
inks reach the paint, and record exactly which of them the theme controls.

---

## 2. Reconnaissance (measured, not assumed)

### 2.1 The pinned runtime's source (release tag `9fcd6288`, zed `81c99f81`)

`packages/native/src/custom_elements/input.rs` in
`.agents/slop/scratch/gpuix-build/release/gpuix`:

| Line | Fact |
| ---- | ---- |
| `layout_text` | the run's colour is `style.color`; **`theme.text` is not read** |
| `1392-1395` | an empty field's placeholder is `gpui::rgba(0x8f8f8fff)` — **a fixed grey**, not `text_faint`/`text_muted` |
| `1815-1818` | the selection wash is `gpui::rgba(0x7c86ff59)` — **a fixed indigo**, not `accent` |
| `362-364`, `426-427` | the caret is `self.theme.caret` — the one themed ink |
| `675-700` | the caret paints only when `focus_handle.is_focused(window) && window.is_window_active()` and blinks: `(ms_since_activity / 500) % 2 == 0` |
| `2069` | the runtime's own test `caret_color_comes_from_the_input_theme` |

The same element code backs `<input>` and `<textarea>`, so one fixture covers
both.

### 2.2 The offscreen frame (scratch probe, plan `792` dir)

`.agents/slop/scratch/plan-792/field-ink-probe.mjs`, run with
`nub .agents/slop/scratch/plan-792/field-ink-probe.mjs` on this host, a
`300 × 220` test root at device scale **2** (frame `600 × 440`), four raw
fields on `input #191D25`:

| Fixture | Configured | Painted |
| ------- | ---------- | ------- |
| text `MMMMMM` | `color: inputForeground` | **1246 px of `#EEF1F5`** (0 near the placeholder token) |
| placeholder `MMMMMM` | `placeholder: "MMMMMM"` | **1250 px of `#8F8F8F`** (0 near the `placeholder` token `#7C8595`) |
| selected (`cmd-a`) | selection | **4348 px of `#3C4271`** = `blendOver(#7C86FF59, #191D25)`; **0 px** of the theme's selection blend `#3B3E59` (= the dark `#A7A9FF3D` over the input) |
| caret (empty, focused by a click + `end`) | `theme.caret = #3BC97F` | **0 px** of either `success` or `primary` — the offscreen window is not *active*, so `caret_shown` is false |

The text/placeholder columns start at content-relative `x = 1.5`, so an
element's `bounds` box is its **content origin**.

### 2.3 The caret, measured live — it does not paint here

The first live run of the twin (§6 step 6) measured the raw caret field after a
click (native focus confirmed on `field-caret` by `host.focused()`), a typed `m`
(which resets the blink anchor) and `home`: **0 caret pixels at 0 ms and at
250 ms** — two different blink phases — with the closest pixel a grey glyph
edge (`#7C8086`). The screenshot also showed nowhere in the field for the caret
to be. So `window.is_window_active()` is false for this host's automation
window as well, and the caret is **source evidence only** in both hosts. The
caret half (fixtures, checks 11–15, the `CARET_*` constants and `caretColumn`)
was removed, exactly as §8 requires. No caret claim is made.

### 2.4 Contrast, computed from the tokens (arithmetic, not a check)

| Pair | Ratio |
| ---- | ----- |
| runtime placeholder `#8F8F8F` on dark `input #191D25` | **5.22** |
| theme token `#7C8595` on dark `#191D25` | **4.54** |
| runtime placeholder `#8F8F8F` on light `input #FFFFFF` | **3.23** — below AA 4.5 |
| theme token `#66707F` on light `#FFFFFF` | **5.01** |

So the inert `textFaint` mapping is not cosmetic: in the light theme the
runtime's fixed grey is the *only* placeholder colour a consumer can get, and
it is below AA. This is the cross-team consequence of §2.1, recorded in
`TODO.md` (owner: `primitives`/`tokens`), not fixed here.

---

## 3. What is deliberately *not* claimed

- **The caret in either host.** §2.2 and §2.3 measured it unpaintable
  (`window.is_window_active()` is false in the offscreen TestRenderer and in the
  live automation window), so it stays source evidence. The plan's original
  live-only caret half was removed after that measurement.
- **Caret width, blink phase or blink rate.** Only its ink.
- **Placeholder or selection *colour choice*.** The probe asserts the measured
  runtime value and the absence of the token; it does not ask for a better grey.
- **Light-theme frames.** One frame per state on the dark palette; the light
  numbers above are arithmetic on token values.
- **A `<textarea>`'s ink separately.** It is the same native element and the same
  theme; one input fixture stands for both, stated in the docs.
- **Glyph shape/anti-aliasing.** Interior pixels only, tolerance `6`, as in
  `773`.
- **Any pixel outside the fixture boxes.** The stage point is sampled once so a
  field cannot paint a wash over its neighbour.

---

## 4. Design

### 4.1 The fixture — `apps/playground/src/scenarios/field-ink.tsx`

One `700 × 240` stage on `theme.colors.background`, with a `24` px inset and a
`16` px gap. Five fields, all `300 × 44`, no overlap:

| `testId` | Mount | Initial state | Purpose |
| -------- | ----- | ------------- | ------- |
| `field-text` | shipped `Input` (`@gpuixui/primitives`) | `value="MMMMMM"` | the editor's text ink |
| `field-placeholder` | shipped `Input` | empty, `placeholder="MMMMMM"` | the placeholder ink, with `nativeTextTheme` applied |
| `field-selected` | shipped `Input` | `value="MMMMMM"`; clicked + `cmd-a` in the steps | the selection wash |

One `420 × 200` stage on `background`; the three fields are one 300-wide column
at `(24, 24)` with a `16` px gap (heights are the shipped `md` control height).
Every role is read from `useTheme()`, never a literal — except the two measured
runtime constants, which are named in the model.

### 4.2 The pure model — `apps/playground/src/scenarios/field-ink-model.ts`

```ts
/** The runtime's hard-coded placeholder ink (input.rs:1394, tag 9fcd6288). */
export const RUNTIME_PLACEHOLDER = "#8f8f8f";
/** The runtime's hard-coded selection wash (input.rs:1817, tag 9fcd6288). */
export const RUNTIME_SELECTION = "#7c86ff59";

/** Interior pixels that must carry an ink before it is evidence. */
export const FIELD_INK_MINIMUM = 400;

export interface FieldFixtures {
  readonly text: string;          // inputForeground
  readonly placeholder: string;   // the placeholder token
  readonly selection: string;     // the selection token
  readonly input: string;         // the field surface, for both blends
}

export const fieldFixtures = (colors: ThemeColors): FieldFixtures;
/** `hex` at its own alpha over `under`, or None when either will not parse. */
export const washOver: (hex: string, under: string) => Option.Option<Pixels.Rgba>;
/** True when two colours can be told apart at `tolerance`. */
export const tokensSeparate: (left: string, right: string, tolerance: number) => boolean;
```

The scan itself is the existing glyph scan, hoisted (see §4.4): `scanInk(frame,
window, box, expected, tolerance)` returns `{ sampled, near, closest }`.

### 4.3 The checks

`fieldInkChecks(ctx, driver, options)` reads one frame (`options.caret` absent)
or three (`live`), where `driver` is the one headless/live difference:
`{ reader, capture, click, key }`.

| # | Check | Assertion |
| - | ----- | --------- |
| 1 | the text field paints its token | `scanInk(text box, inputForeground, 6).near >= 400` |
| 2 | the text field is not the placeholder ink | `scanInk(text box, placeholder token, 6).near === 0` |
| 3 | the placeholder paints the runtime's fixed grey | `scanInk(placeholder box, #8F8F8F, 6).near >= 400` |
| 4 | the placeholder ignores the `placeholder` token | `scanInk(placeholder box, placeholder token, 6).near === 0` |
| 5 | the empty placeholder field paints no editor ink | `scanInk(placeholder box, inputForeground, 6).near === 0` |
| 6 | the selection paints the runtime wash | `scanInk(selected box, washOver(#7C86FF59, input), 2).near >= 1000` |
| 7 | the selection ignores the `selection` token | `scanInk(selected box, washOver(selection, input), 2).near === 0` |
| 8 | the two washes are far enough apart to fail a swap | `tokensSeparate(...)` — a fixture guard, no frame |
| 9 | the placeholder grey and the token are far enough apart | same guard, `tolerance 6` |
| 10 | the stage point is `background` | one sample at the stage's bottom-right inset |

The frame checks also count `paintedBox` and the device-scale read, so the
scenario reports **19** checks, not the ten rows above.

The wash checks use `blendOver`'s own arithmetic (`Pixels.blendOver(over,
alpha, under)`), so a change to the blend model fails the check rather than
silently widening it.

### 4.4 The one refactor: hoist the box scan

`scanInk`, `InkScan` and `inkEvidence` currently live in
`text-ink-model.ts`; this is their second consumer, so they move to
`apps/playground/src/scenarios/frames.ts` (the file that already owns device
scale, `pixelAt`, `framePoint` and `expectColour`).
`text-ink-model.ts` **re-exports** them, so its scenario, its tests and its
public shape are unchanged.

### 4.5 The live steps

Both hosts run the same path: click `field-selected`, `cmd-a`, settle `120`,
one capture, checks 1–10. The live twin adds the settle and one retained
artifact; there is no second state to capture because the caret half was
measured unobservable (§2.3).

---

## 5. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/field-ink-model.ts` | **new** — the two runtime constants, fixtures, `washOver`, `tokensSeparate`, ids |
| `apps/playground/src/scenarios/field-ink-model.test.ts` | **new** — see §7 |
| `apps/playground/src/scenarios/field-ink.tsx` | **new** — view, shared checks, headless + live scenarios |
| `apps/playground/src/scenarios/text-ink-model.ts` | move `scanInk`/`InkScan`/`inkEvidence` to `frames.ts`, re-export them here |
| `apps/playground/src/scenarios/frames.ts` | hold the hoisted scan |
| `apps/playground/src/scenarios/index.ts` | register `fieldInkScenario` |
| `apps/playground/src/live/scenarios.tsx` | register the `live-field-ink` twin (`ready: "field-ink-stage"`, one capture, one retained artifact `live-field-ink.png`) |
| `apps/playground/README.md` | a `###` section under Pixel evidence; the live table row; the two scenario totals |
| `TODO.md` | tick the task with ids/counts; two cross-team rows (`primitives`, `tokens`) |
| `.agents/slop/plans/README.md` | the number note and the table row |

No `packages/testing` source change is required beyond the app-side hoist; the
package's `Pixels` helpers are used as they are.

---

## 6. Steps, commands, expected results

1. **Prove the bug is live.** With the plan committed and nothing else changed:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only field-ink-pixels   # expect exit 2, unknown id
   ```

   STOP if that id already runs — the number is wrong.

2. **Write the model and its tests.** `nub run --filter playground test -- field-ink` → the new tests pass; the file's other suites unchanged.

3. **Write the view and both scenarios**, register both.

4. **Build and list:**

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --list | wc -l   # 119 (was 118)
   nub apps/playground/dist/live/run.js --list | wc -l    # 108 (was 107)
   ```

5. **Headless, focused:**

   ```sh
   nub apps/playground/dist/smoke/run.js --only field-ink-pixels
   ```

   Expected: `1/1 scenarios passed`, exit `0`, **19 checks** (measured). If the
   frame disagrees with §2.2, go to §8.

6. **Live, focused (opens a window):**

   ```sh
   nub apps/playground/dist/live/run.js --only live-field-ink
   ```

   Expected: `1/1`, exit `0`, **19 checks** (the same path as headless). The
   caret half of this step was measured and removed (§2.3) before this run.

7. **Mutation proofs** (§7) — each observed red, then reverted, then focused
   green again.

8. **End-of-task full headless** (a registry change is cross-cutting):

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `119/119`, exit `0`, checks `4340 + N` exactly, 65 capabilities.
   **Do not run the full live suite** — it is the merge gate.

9. **Gates:** `nub run check`, `nub run lint`, `nub run test`.

---

## 7. Test plan

### 7.1 Unit tests — `field-ink-model.test.ts` (each can fail)

1. `fieldFixtures` maps each role to its token: text → `inputForeground`,
   placeholder → `placeholder`, selection → `selection`, surface → `input`.
   Mutating any mapping fails one assertion.
2. The text and placeholder inks are distinct, so a swap cannot pass.
3. `washOver(RUNTIME_SELECTION, darkInput)` = `#3C4271` — the measured blend.
4. `washOver(darkSelection, darkInput)` = `#3B3E59` (the dark `#A7A9FF3D` over
   the input) and is **not** near the runtime wash at tolerance `2` — the guard
   that makes check 7 falsifiable.
5. `RUNTIME_PLACEHOLDER` and the dark `placeholder` token are not near each
   other at tolerance `6` (check 4's guard).
6. `scanBox` on a 2 × 2 synthetic frame counts exactly the two expected pixels,
   and a frame whose size disagrees with the window returns `sampled: 0` (so it
   cannot pass by sampling nothing).
7. `washOver` on an unparseable colour is `None`, and `tokensSeparate` refuses
   an unparseable side instead of claiming separation.
8. `FIELD_IDS` are unique.

That is **12** tests (measured) plus the mutation below, all pure.

### 7.2 Runtime mutation proofs (observed, reverted, recorded in the plan)

| # | Mutation | Expected red check |
| - | -------- | ------------------ |
| M1 | `field-text`'s style `color` set to `placeholder` | "the text field paints its token" — reports the closest hex |
| M2 | check 3's expected changed to the `placeholder` token | "the placeholder paints the runtime's fixed grey" (0/35760, closest `#888889`) |
| M3 | check 6's expected changed to the theme selection blend | "the selection paints the runtime wash" (0/35760, closest `#3C4271`) |
| M4 | the placeholder fixture's `placeholder` set to `""` | "the placeholder paints the runtime's fixed grey" (0/35760, closest `#2A303B`) |
| M5 | the `field-selected` click and `cmd-a` removed | "the selection paints the runtime wash" (0/35760, closest `#51555C`) |
| M6 | the stage's background set to `card` | "the stage point is the background token" (`#11141a` vs `#191d25`) |

Unit mutation: `RUNTIME_PLACEHOLDER` changed to the token value failed **two**
tests by name ("parses the placeholder grey as an opaque colour", "separates the
runtime placeholder from the placeholder token"), proving the model, not just
the frame, carries the fact.

---

## 8. STOP conditions

- **The text or placeholder scan finds fewer than 400 px** near its expected
  ink → STOP. Record the count and closest pixel; do not lower the minimum and
  do not widen the tolerance.
- **The live caret is not painted** in both caret frames → **triggered**: 0
  caret pixels at 0 ms and 250 ms with native focus confirmed (§2.3). The
  caret half was removed; the caret is source evidence only.
- **The selection wash is absent** (below 1000 px) → STOP: the step order is
  wrong (the click did not focus the field) or `cmd-a` did not select. Record
  the closest pixel; there is no smaller threshold to fall back to.
- **The frame's device scale is not an integer** → STOP; the capture path is
  broken, not the runtime.
- **A check fails only in the live twin** → re-run focused twice, then STOP and
  record both runs (window-state dependence is a known class here, plans `390`,
  `603`).

---

## 9. Ledgers

`apps/playground/README.md` gains a `###` section under **Pixel evidence**
with §2's table and the stop-notes; the live table gains `live-field-ink`; the
"118/118" and "107 live" counts become the measured ones. `TODO.md` ticks this
task with the focused ids and counts, and adds two cross-team rows:

- **`primitives`** — `nativeTextTheme`'s `textFaint`, `text`, `bg`, `border`
  and `accent` are inert for `<input>`/`<textarea>` (only `caret` is read);
  correct the doc comment and document the placeholder/selection limits, or
  stop passing the inert fields.
- **`tokens`** — the `selection` token has no consumer in the native editor; the
  fixed wash is `#7C86FF59`. Either document that, or negotiate a runtime field.

`COMPONENTS.md`'s Input row is owned by `primitives`; the cross-team TODO rows
cite this plan so the owner can amend it.

---

## 10. Acceptance

- `field-ink-pixels` and `live-field-ink` exist, are registered in both
  registries (the live guard's uniqueness/capability rules pass), and both
  report **19** checks.
- The frame evidence is the measured one in both hosts: text `#EEF1F5`,
  placeholder `#8F8F8F` (token absent), wash `#3C4271` (token absent); the caret
  is recorded as unpaintable here (§2.3), not claimed.
- M1–M6 fail by name; the unit mutation fails; each is reverted.
- Full headless `119/119`, exit `0`, checks `4340 + N`; `check`/`lint`/`test`
  green; no full live gate.
- README, TODO.md and the plan index carry the measured facts and the exact ids
  run.

---

## 11. Outcome (measured on this host, 2026-10-20)

- `field-ink-pixels` — **19 checks**, green (8.4 s focused); `live-field-ink` —
  **19 checks**, green (6.5 s focused, three runs). The frame agrees with §2.2
  in both hosts: text `#EEF1F5`, placeholder `#8F8F8F` with 0 px of the token,
  selection `#3C4271` with 0 px of the dark token's `#3B3E59`.
- **The caret half was dropped** (§2.3, §8): 0 caret pixels at 0 ms and 250 ms
  with native focus confirmed, in the live window as well as offscreen. Recorded
  in `apps/playground/README.md`, `TODO.md` and this plan; the caret stays
  source evidence only.
- Five runtime mutations (M1–M6 minus the two caret rows the drop removed) and
  the unit mutation observed red by name and reverted; focused green again after
  each revert.
- 12 pure tests (playground **593 → 605**). Full headless **119/119 · 4359 · 65**
  (exit `0`, exactly `4340 + 19`) on the committed head; live registry
  **107 → 108**; no full live gate (merge gate).
- `nub run check`, `nub run lint` and `nub run test` green (playground **605**,
  testing 69, components 308, primitives 282, tokens 196, tw 103, icons 19,
  docs 7).
