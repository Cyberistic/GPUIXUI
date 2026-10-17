# 179 — Tier 4 feasibility: a terminal surface

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | B→D (feasibility probe) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100`, `110`, `120`, `140`, `154` (log viewer), `176` (key delivery) |
| Closes | `COMPONENTS.md` Tier 4 → *Terminal surfaces* (`?`, "unverified whether a PTY surface is feasible") |

## 1. Question

MISSION lists "terminal surfaces if feasible" in Tier 4. `COMPONENTS.md` records
the honest state: **no terminal host element; unverified whether a PTY surface is
feasible.** The library needs an answer, and — like every other probe — the
answer must be measured, not assumed.

Three separate claims are being tested, and they can have different verdicts:

1. **Render** — can a terminal grid (fixed rows, monospace runs, per-run colour,
   a block caret) be painted from published elements?
2. **Input** — can a focused surface receive printable keys, Enter, Escape,
   arrows, Backspace and a `ctrl-` chord, the way a terminal's input path needs?
3. **Process** — does the runtime provide a PTY/process surface, or must the app
   own the process (and therefore the whole emulation)?

The runtime types already answer (3) negatively: `ElementType` is
`div | text | img | svg | canvas | input | textarea | anchored | code | diff |
markdown | virtual-list`, and `GpuixRenderer` exposes only window, focus,
scroll, selection, image and prompt APIs — no process, PTY, terminal or media
surface. That is a documented limitation from the installed 0.10.0 types, not a
runtime observation. This probe therefore measures (1) and (2) and records (3)
as the design constraint: **the terminal is a component over a text grid; the
PTY belongs to the app.**

## 2. Design

New scenario `terminal-grid`, capability `terminal`, in
`apps/playground/src/scenarios/terminal.tsx`.

View:

- `terminal-surface`: a `div` with `tabIndex={0}`, `role="textbox"`,
  `aria-label`, and an `onKeyDown` that owns the edit line. `role="textbox"`
  maps to AccessKit `TextInput` (measured by `a11y-tree`).
- `terminal-list`: a `<virtual-list>` of scrollback rows (`240 px` tall,
  `18 px` rows), each row a `<text>` at `fontFamily: theme.typography.code`,
  `fontSize: 12`, with test ids `terminal-row-<n>` / `terminal-text-<n>`.
- Two coloured runs on fixed rows (an error and a success token) so `paintedStyle`
  can prove per-run colour without ANSI parsing.
- A **fixed prompt row** below the list (`terminal-input`), never inside the
  virtual window, so the caret cannot scroll away.
- Readouts: `terminal-status`, `terminal-count`, `terminal-events` (the last few
  `key`/modifier tokens the handler saw), and `terminal-history`.

Behaviour the steps drive:

| Key | Effect |
| --- | ------ |
| printable (`keyChar` or a one-character `key`) | appended to the prompt |
| `backspace` | removes one character |
| `enter` | commits the prompt to scrollback, clears it, records history |
| `up` | recalls the last committed command into the prompt |
| `escape` | clears the prompt, status `cancelled` |
| `ctrl-c` | clears the prompt, status `interrupted` |

## 3. Assertions

1. clicking the surface moves native focus to it (`host.focused()`);
2. typing `l`, `s` paints `ls` in the prompt and reaches the handler;
3. Enter commits: the prompt clears, the count grows, the committed line is in
   the scrollback;
4. `up` recalls it; `backspace` shortens it; `escape` clears it and sets status;
5. `ctrl-c` arrives with `modifiers.ctrl` and aborts the line;
6. the scrollback starts at the tail (200 lines) and `scrollToItem(0)` paints
   row 0, with `listScrollTop` reporting index 0 — then the tail again;
7. the prompt row stays painted and focused across a scrollback jump;
8. row height is exactly the declared 18 px, and two runs with the same
   character count have equal painted width (monospace alignment) — **if the
   runtime reports text bounds**; otherwise the check is replaced by the painted
   mono `fontFamily` and the row geometry, and the difference is recorded;
9. the error run paints `theme.colors.destructive` and the success run
   `theme.colors.success`.

## 4. Files

```
apps/playground/src/scenarios/terminal.tsx   NEW
apps/playground/src/scenarios/index.ts       EDIT  import + registry + PROBE_CAPABILITIES
packages/testing/src/smoke.ts                EDIT  CAPABILITIES += "terminal"
apps/playground/README.md                    EDIT  the section, structure, evidence row, count
COMPONENTS.md                                EDIT  Tier 4 terminal row → partial (probe) with the measured facts
TODO.md                                      EDIT  tick the probe; note the PTY boundary
.agents/slop/plans/README.md                 EDIT  index this plan
```

## 5. Commands and expected results

```sh
nub run --filter playground build && nub apps/playground/dist/smoke/run.js --only terminal-grid
# -> "1/1 scenarios passed", exit 0
nub apps/playground/dist/smoke/run.js
# -> 47/47 scenarios passed, capabilities include terminal=verified, exit 0
nub run check && nub run lint && nub run test
```

## 6. Two directions

- Ignoring printable keys in the handler fails `printable keys edit the prompt`.
- Dropping `scrollToItem(list, 0)` fails `the head is painted after the jump`.
- **Correction measured while running the plan:** removing `tabIndex={0}` does
  **not** stop a click from focusing the surface, so that is a runtime fact, not
  a component guard. The probe records it, and the two-direction list does not
  claim it. The component's own focus code was deleted with it (native focus is
  enough) and the scenario still passed, which is why the view has no `useGpuix`
  call.
- Each mutation is applied temporarily, the failing check named, and the file
  restored.

## 7. STOP conditions

- The surface cannot focus at all → stop and report: a terminal without an
  input surface is not feasible, and the row becomes `unsupported (evidence)`.
- Printable keys never reach a focused `div`'s `onKeyDown` → stop; the
  command-palette probe measured them reaching an `<input>`, and a terminal
  built on `<input>` is the fallback to document, not to improvise here.
- `role="textbox"` or `aria-label` makes the tree throw → drop the role only,
  keep the label, and record it.
- Text bounds are unavailable → keep the probe, replace assertion 8 with the
  painted mono family and row geometry, and record the measured gap. Do not fake
  an alignment measurement.

## 8. Measured result

Run 2026-10-17 in this worktree:

| Command | Result |
| ------- | ------ |
| `nub run --filter playground build && nub apps/playground/dist/smoke/run.js --only terminal-grid` | 1/1, **27 checks**, `terminal=verified` |
| `nub apps/playground/dist/smoke/run.js` | **47/47**, `exit 0`, `terminal=verified` |
| `nub run check`, `nub run lint`, `nub run test` | pass (282 primitives, 40 testing, 20 playground, 19 icons) |

What the probe established (all 27 checks in
`.artifacts/smoke-report.json`):

- **Focus and keys.** A click natively focuses the `div` surface — even with
  `tabIndex` removed, so a clickable focus target needs no component focus call
  (the first implementation's `useGpuix().focusElement` was deleted and the
  check still passed). Printable keys reach the surface's `onKeyDown`;
  Enter commits and clears; `up` recalls the last command; `backspace` removes
  one character; Escape clears with status `cancelled`; `ctrl-c` arrives as
  `key: "c"` with `modifiers.ctrl === true` and aborts the line.
- **Grid.** Rows paint at exactly 18 px; two 8-character runs paint the **same
  width**, and the run reports the theme's mono family — the grid aligns on the
  font's advance, no per-cell element is needed.
- **Colour.** Per-run `paintedStyle.color` equals `colors.destructive` and
  `colors.success`, so ANSI ranges can map to theme tokens.
- **Scrollback.** 200 lines start at the tail; `scrollToItem(list, 0)` paints
  the head and `listScrollTop` reports index `0`; the tail is reachable again.
  The prompt row is a **sibling** of the list, so it stays painted and keeps
  native focus across the jump.
- **The limitation.** `ElementType` in the installed
  `@gpuix/native/dist/host.d.ts` is exactly
  `div | text | img | svg | canvas | input | textarea | anchored | code | diff |
  markdown | virtual-list`, and `GpuixRenderer`'s methods are window, focus,
  scroll, selection, image, path-prompt and debug only: **no PTY or process
  surface**. A terminal is a component over the text grid; the process, ANSI
  parsing, per-cell background and glyph atlas are the app's. A block caret is a
  themed `div` (painted, not asserted beyond the prompt row's text).

Two-direction proofs (mutation → the named check failed → file restored):

| Mutation | Failing check |
| -------- | ------------- |
| the handler ignores printable characters | `printable keys edit the prompt` |
| the `scrollToItem(list, 0)` call is removed | `the head is painted after the jump` |
| `tabIndex={0}` removed | **still passed** — recorded above as a runtime fact |
