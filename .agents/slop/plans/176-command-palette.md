# Plan 176 — the command palette: window shortcuts, a non-modal overlay and a filtered list

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B → D (Tier 4 **Command palette**, **Application menus**).
**Depends on:** plans `100`, `110`, `120`, `140`, `155`, `158`, `159`, `164`.

## 1. Why this plan exists

The Tier 4 inventory has two rows nothing has measured: **Command palette** and
**Application menus**. `window-key-shortcut` proved only that `cmd-k` reaches the
app-level handler and that a flag can flip; it never opened a real palette, never
put a text field under the overlay, and never filtered or committed anything.
`modal-focus-trap` measured a **trapping** modal; a palette is deliberately not a
trap — it owns one focus, and the arrow keys move a *visual* selection.

The unmeasured facts, each of which changes how the component is built:

1. **Does the app-level window handler still receive keys while an `<input>` is
   focused and the user types?** If it does, a shortcut layer cannot fire on a
   bare letter while a field has focus — it must filter by chord or by the
   focused element. (The runtime delivers window keys *after* the element's own
   handler per plan `140` §4, but that was measured with a focused `div`, not an
   editor.)
2. **Does a chord (`cmd-k`) reach the window handler while the input is
   focused, and does it avoid typing into the field?** A palette must be
   re-openable from inside itself.
3. **Does Escape reach both the input and the window handler?** Double delivery
   would close a nested layer twice; a single delivery fixes where Escape must
   be handled.
4. **Which event carries the palette's keys?** Plan `054` measured that the
   native editor consumes arrow **key down** in the OTP cells, so an `<input>`'s
   arrow handling was expected on key up; this run measured key **down** for a
   palette input (§8), which is why the handler is there. Enter is already known
   to arrive as `onSubmit` (plan `041`).
5. **Does a conditional overlay layer hit-test above the page?** A palette row
   must be clickable through the veil; a scrim click outside must dismiss.
6. **Can focus return to the trigger** when the palette unmounts, and does the
   overlay steal layout when it is not an in-flow modal?

It also settles the honest shape of an **application menu** on 0.10.0: the host
renderer exposes only `setWindowTitle` / `activateWindow` / `minimizeWindow` /
`zoomWindow` / `toggleFullscreen` — there is **no native menu or tray API** (read
from `node_modules/@gpuix/native/dist/host.d.ts`, `NativeRenderer`). A menu is
therefore an in-window surface opened by a window key, i.e. this probe's path.
That is a documented limitation, not a missing component.

## 2. What is built

### 2.1 A pure state module (unit-tested on any host)

New `apps/playground/src/scenarios/command-palette-state.ts`:

```ts
export interface Command {
  readonly id: string;
  readonly label: string;
}

/** Case-insensitive substring match; a blank query matches every command. */
export const filterCommands = (
  commands: ReadonlyArray<Command>,
  query: string,
): ReadonlyArray<Command>;

/** Wraps in both directions; an empty list always yields 0. */
export const moveActive = (index: number, delta: number, length: number): number;
```

`filterCommands` trims the query and compares case-insensitively (`Str`/
`Arr` from Effect, no native helpers). `moveActive` uses the mathematical
modulo so a negative delta wraps to the end.

### 2.2 The capability

`packages/testing/src/smoke.ts` gains `"command"` to `CAPABILITIES` (after
`"workspace"`). This is a real capability: `smoke-report.json` must say which
scenario proves the app-level command surface. The registry lists `"command"` in
`PROBE_CAPABILITIES`.

### 2.3 The scenario

One scenario, `command-palette` (capability `command`), in
`apps/playground/src/scenarios/command-palette.tsx`.

The frame is the real test window (1280 × 800); the page is 640 × 400.

- `palette-trigger` — a `Pressable` (so a click gives it native focus) that
  opens the palette.
- `palette-background` — body text that must **disappear from the paint** while
  the veil covers the window (the veil is opaque).
- `palette-readout` — `open=<bool> query=<q|-> active=<n> committed=<label|none>
  last=<reason> window=<key|none> keys=<n>`.
- While open, an `<anchored deferred position={{x:0,y:0}} priority={1} occlude>`
  holds a `palette-layer` (window-sized, `position: "relative"`) with two
  **sibling** absolute children:
  - `palette-veil` — window-sized, `backgroundColor: theme.colors.overlay`,
    `onClick` → `close("outside")`. It is a sibling *under* the surface, not a
    parent, so a click inside the surface never bubbles into the dismisser.
  - `palette-surface` — `role="dialog"`, `aria-label="command palette"`,
    `aria-id`, `left: 40, top: 40, width: 420`, the card surface.
    - `palette-input` — `<input autoFocus aria-label="search commands"
      value={query} onChange=… onKeyDown=… onKeyUp=… onSubmit=…>`.
    - `palette-list` — `role="listbox"`, `aria-label="commands"`; one
      `palette-item-<id>` per filtered command, `role="option"`,
      `aria-selected={index === active}`, `aria-id={`palette-item-${id}`}`,
      `onClick` commits.
    - `palette-empty` — "No commands" when the filter matches nothing.

Key handling, following the measured contracts:

| Key | Path | Effect |
| --- | ---- | ------ |
| ArrowDown / ArrowUp | `<input onKeyDown>` | `moveActive(active, ±1, filtered.length)` |
| Enter | `<input onSubmit>` | commit `filtered[active]` |
| Escape | `<input onKeyDown>` | `close("escape")` |
| `cmd-k` | app window handler (`useWindowKey`) | `open("cmd-k")` |

Plan `054` suggested arrows would arrive on key **up** in a text field; this
probe measured key **down** for this input (§8), so the handler is on key down.

Opening captures `renderer.getFocusedElementId()` **in the handler**, before the
input mounts; closing restores it through `renderer.focusElement` when the
element still has bounds (the same guard `modal-focus-trap` uses). Opening
resets `query`/`active`, so a reopened palette never shows stale state.

The window handler records **every** key it receives (`window=… keys=…`) and
opens on `cmd-k`; it does not close on Escape, so the Escape measurement is not
masked by two competing handlers.

### 2.4 The steps

1. Click `palette-trigger`. Assert readout `open=true`, painted text contains all
   three commands, `focused()` is `palette-input`, and the background text is
   gone from the paint.
2. Type `set`. Assert `query=set`, the list's subtree text is exactly
   `Open settings`, `New file`/`Toggle sidebar` are absent from the paint, and
   the window handler received the typing (`window=t keys=3`) — fact 1.
3. Backspace three times (query empty, three commands). ArrowDown → `active=1`;
   ArrowDown → `active=2`; ArrowDown → `active=0` (wraps); ArrowUp → `active=2`
   (wraps backwards). After every key `focused()` is still `palette-input` —
   the palette keeps one focus owner and the active row is visual only.
4. In the accessibility tree, `palette-surface` has a non-empty role (record the
   measured string), `palette-item-toggle-sidebar` has `selected: true` while
   `palette-item-new-file` has `selected: false`. No `aria-activedescendant`
   exists in 0.10.0, so this is the keyboard selection's only AT-visible form.
5. Press Enter (`onSubmit`): `committed=Toggle sidebar`, `open=false`,
   `last=commit:toggle-sidebar`, focus is back on `palette-trigger`, and the
   palette text is gone from the paint.
6. Press `cmd-k` with the trigger focused: the palette reopens
   (`last=cmd-k`, `window=k`), `query=-` (reset), focus is `palette-input`.
   Type `o` (two commands match), then press `cmd-k` again: `window=k` and
   `query=o` **unchanged** — a chord does not type into the field — while the
   palette stays open. Facts 2.
7. Press Escape: the palette closes, `last=escape`, focus returns to
   `palette-trigger`, and the readout's `window=` shows what the app-level
   handler saw (measurement; see §5 for the branch). Type `x`: the closed
   palette does not take it (`open=false`, `window=x`).
8. Click `palette-trigger` again, then click `palette-veil` (its centre is the
   window centre, outside the 40..460 × 40..~260 surface): `open=false`,
   `last=outside`, and the background text is painted again. Focus after this
   dismissal is recorded in §8, not asserted unless it is stable.
9. Click `palette-trigger`, click `palette-item-new-file` directly: the row is
   hit-tested **above** the veil, so `committed=New file`, `open=false`. This is
   the layering proof.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | add `"command"` to `CAPABILITIES` |
| `apps/playground/src/scenarios/command-palette-state.ts` | new pure `filterCommands` / `moveActive` |
| `apps/playground/src/scenarios/command-palette-state.test.ts` | new unit tests (§6) |
| `apps/playground/src/scenarios/command-palette.tsx` | new view + `command-palette` steps |
| `apps/playground/src/scenarios/index.ts` | import/register the scenario; `"command"` in `PROBE_CAPABILITIES` |
| `apps/playground/src/smoke/run.test.ts` | assert the id and capability are registered |
| `apps/playground/README.md` | scenario list, `44 → 45`, a command-palette row |
| `COMPONENTS.md` | capability table row; Tier 4 **Command palette** and **Application menus** notes |
| `TODO.md` | add and tick the task; progress `39/46 → 40/47` |
| `.agents/slop/plans/README.md` | index this plan |

No change outside the owned paths. If the probe needs one (for example a host
method), record it in `TODO.md` and stop that part.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground build` | clean build |
| `nub apps/playground/dist/smoke/run.js --only command-palette` | green, exit `0`, `command=verified` |
| `nub apps/playground/dist/smoke/run.js` | `45/45 scenarios passed`, exit `0` |
| `nub run --filter playground test` | unit tests green, including the new state module |
| `nub run --filter @gpuixui/testing test` | unchanged harness tests green with the new literal |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proofs** (record the failing label and the exit code):

1. Remove the window handler's `cmd-k` branch: the `--only command-palette` run
   must exit `1` on "cmd-k reopened the palette"; restore it, green.
2. Make the active row take native focus on ArrowDown (call `focusElement` on
   the item, or give items `tabIndex={0}` and focus them): the run must exit `1`
   on "the arrows keep focus in the input"; restore it, green.
3. Break `filterCommands` (return every command): the unit test must fail and
   the smoke run must exit `1` on the filtered-list check.

## 5. STOP conditions and branches

- **The window handler does not receive plain typing while the input is
  focused** (fact 1 is false): assert the measured `window=` value instead,
  and record the rule *the shortcut layer owns the chord only; a bare letter
  never reaches the window handler while an editor is focused*. Do not fake a
  count.
- **Escape does not reach the window handler from inside the input**: keep the
  input-level close (the design requirement), assert only that the palette
  closed and focus returned, and record that app-level Escape is not a reliable
  second route. Do not assert a delivery that did not happen.
- **`cmd-k` types a `k` into the field** or clears the query: record it; the
  honest rule is that a palette must filter modifier chords out of its change
  handler. Keep the check only if the runtime truly leaves the value alone.
- **`autoFocus` does not focus the input on a conditional mount**: focus it
  explicitly through the ref + `renderer.focusElement` in a layout effect, and
  record the path used. The capability is "the input is focused", not
  "`autoFocus` works".
- **The absolute surface and veil do not layer as siblings** (an item click
  closes the palette through the veil, or the veil is under the page): STOP,
  record the measured paint bounds and the click target, and do not restructure
  the app's shell to work around it. A palette that cannot receive a row click
  is a documented limitation.
- **The overlay steals layout** (the page reflows when the palette opens): the
  layer must be inside `<anchored>`; record the measured bounds of
  `palette-background` and treat a moved page as a finding.
- **A change outside the owned paths is required**: record it in `TODO.md`; do
  not edit it.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `filterCommands` | unit | a filter that ignores case, whitespace, or the empty query; a match that keeps non-matching rows |
| `moveActive` | unit | wrapping in both directions, and a negative index on an empty list |
| `command-palette` | native smoke | a palette with no input focus, a filter that does not repaint, an active row that is not the committed one, arrows that move native focus, a chord that types, a lost focus return, a veil that swallows row clicks, an overlay that reflows the page |
| two-direction runs (§4) | native smoke | the checks passing when the shortcut branch, the filter or the single-focus contract is removed |
| registry assertions | unit (`apps/playground`) | the scenario or the `command` capability falling out of the registry |
| full suite | native smoke | the new capability literal or registry entry breaking report aggregation |

## 7. Acceptance criteria

- `command-palette` is registered, green, and its measured facts are in §8, the
  app README and `COMPONENTS.md` (Command palette and Application menus).
- The suite is **45/45**, exit `0`; `command=verified` in
  `.artifacts/smoke-report.json`.
- All three two-direction proofs are recorded with the failing label and exit
  code.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Outcome

Executed on this host on 2026-10-17; **45/45 green**, exit `0`, `command=verified`
in `.artifacts/smoke-report.json`. `command-palette` records **58 checks**.

Measured facts (also in plan `140` §4, `COMPONENTS.md` and the app README):

- **The window handler and the field both see typing.** Three letters produced
  the field's `onChange` and `window=t keys=3`. A shortcut layer therefore must
  filter for chords; it cannot assume a focused editor consumes plain letters.
- **Enter and Backspace do not reach the window handler.** Enter is delivered as
  the field's `onSubmit` and commits the row; Backspace edited the query but did
  not increment the window key count. Commit and delete must stay in the field.
- **A chord is safe while typing.** `cmd-k` reached the window handler twice
  (open and while typing) and left `query=o` unchanged.
- **Arrows are delivered as key down**, not key up (`input=d:down`), so the
  palette moves its active row on key down. This differs from the OTP cells'
  key-up contract (plan `054`); the two paths are not interchangeable.
- **The palette has exactly one focus owner.** After four arrow presses native
  focus was still `palette-input`, while the active index walked
  `1 → 2 → 0 → 2` (wrapping in both directions) — the selection is visual.
- **The accessibility story is `aria-selected`.** The surface is AccessKit
  `Dialog`; each row is a `ListBoxOption` whose `selected` follows the active
  index, and an inactive row reports `false`. There is no
  `aria-activedescendant`, so the visual active row is not focus for AT.
- **Commit and dismissal return focus.** `onSubmit` committed
  `Toggle sidebar`, closed the palette and focused the trigger; Escape closed
  it, focused the trigger, and the app-level handler saw the same Escape.
- **An unmatched query is honest.** `setz` painted the empty state
  (`No commands`), and Enter with no match neither closed the palette nor
  committed anything — the `onSubmit` guard is the only thing between an empty
  list and a crash or a stale commit.
- **The overlay hit-tests as layers.** The veil covers the page
  (`≥ 640 × 400`, painted overlay colour); a row click commits with the veil
  underneath (the sibling surface is on top); a click on the veil's centre
  dismisses with `last=outside` and unmounts the layer.
- **`autoFocus` works on a conditional mount** and the previously focused
  element is captured in the open handler *before* the input mounts — a layout
  effect would capture the input itself.
- **There is no application-menu API in 0.10.0.** `NativeRenderer` has only
  window controls and no `menu`/`Menu`/`tray` symbol exists in the native or
  React types, so a menu is an in-window surface on this measured path.

Two-direction proofs:

1. Disabling the window handler's `cmd-k` branch made the run exit `1` with
   `the window shortcut reopens the palette: expected a string containing "open=true", got "open=false … last=cmd-k window=k"`
   and `command=failed`; restoring it made the scenario green.
2. Making `move` call `renderer.focusNext()` made the run exit `1` with
   `the arrows keep focus in the input: expected "palette-input", got "palette-trigger"`
   (and, in an earlier ordering, the stuck active index showed the keys no
   longer reached the field); restoring the single-focus model made it green.
3. Making `filterCommands` return every command failed the unit test
   (`matches case-insensitively…`, 1 failed / 19 passed) and the smoke run exited
   `1` with
   `the filter leaves exactly the matching command: expected "Open settings", got "New fileOpen settingsToggle sidebar"`.

No change outside the owned paths.
