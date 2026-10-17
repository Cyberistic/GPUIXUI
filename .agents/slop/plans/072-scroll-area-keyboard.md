# 072 — `ScrollArea` cannot be scrolled with the keyboard

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 scroll container) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `048`, `140` (native host) |
| Status | **done** |

Self-contained: §1 measurement, §2 the rule, §3 files, §4 tests, §5 STOP list,
§6 outcome.

---

## 1. The gap, measured

`ScrollArea` sets `overflow` and nothing else, and its docs said keyboard
scrolling "belongs to the focused content inside the area". Three native probes
on this host (`@gpuix/native@0.10.0`, ADR 0003) show that no such path exists:

1. **A focused scroller ignores the keyboard.** A `div tabIndex={0}` with
   `overflowY: "scroll"` receives `pagedown`, `space` and `down` (the handlers
   logged them, lower-cased), and its scroll offset stays `{ x: 0, y: 0 }`.
2. **Focus traversal does not reveal off-screen content.** Eight buttons inside
   a 60 px-tall scroller: ten `focusNext` calls land focus on `b1` (the order
   wraps) with the offset still `{ 0, 0 }` — a user can Tab onto a control that
   is painted outside the viewport and no scroll follows. Focus on a child does
   **not** bubble to the container's `onFocus`, so the wrapper cannot observe it.
   `renderer.scrollIntoView(childId)` also left the container at `0`
   (measured twice, with `flush()`/`dispatchNativeEvents()` between), so the
   runtime offers no "reveal the focused row" path for a plain scroller.
3. **Programmatic scrolling works.** `renderer.scrollTo(id, 0, -50)` moves the
   offset to `{ 0, -50 }`; `scrollTo(id, 0, -1_000_000)` clamps to the content's
   end (`{ 0, -340 }` for 400 px of content in a 60 px viewport), and a positive
   value clamps to `0`. `renderer.getScrollOffset(id)` reports the current
   offset as `[x, y]`.

So the honest fix is a small keyboard contract on the container itself: make a
labelled `ScrollArea` a named, focusable `region` and scroll it with the keys a
platform scroll region uses. The runtime's clamping means Home/End need no
content measurement.

## 2. The rule

- **A label makes the region a scroll stop.** `label` present ⇒
  `role="region"`, `aria-label={label}`, `tabIndex={0}`, a focus ring, and the
  keyboard contract. `label` absent ⇒ exactly today's inert container (no role,
  no tab stop, no new focus stop in existing apps). The docs state the trade-off
  instead of silently changing tab order.
- **Keys, while the region itself holds native focus:**
  `ArrowUp`/`ArrowDown` move one line; `PageUp`/`PageDown` move one page;
  `Home`/`End` go to the start/end of the scrolled axis. `ArrowLeft`/`ArrowRight`
  do the same on the horizontal axis. A key for an axis the area does not scroll
  is ignored. `held` (key repeat) still scrolls — unlike activation, repeat is
  the point.
- **The handler proves it owns focus.** It compares
  `renderer.getFocusedElementId()` with the container's own id and returns for
  anything else. Focus events do not bubble from children (measured), but key
  events might; the id check is the fact, not a guess. A field inside the area
  therefore keeps its arrow keys.
- **Steps come from the theme.** One line is the body role's line height ×3; one
  page is the measured viewport minus one line (never less than one line).
  `Home` is offset `0`; `End` is `-Number.MAX_SAFE_INTEGER`, which the runtime
  clamps — no invented content height.
- **Focus is painted.** A focused region merges `focusRing(theme)`, like every
  other interactive control.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/layout.ts` | add `ScrollMove`, `decideScroll(key, axis)`, `resolveScroll(move, geometry)` |
| `packages/primitives/src/core/layout.test.ts` | pure tests for the two functions |
| `packages/primitives/src/components/ScrollArea.tsx` | `label` prop; region semantics; ref → `getScrollOffset`/`scrollTo`; focus ring; `onKeyDown` id guard |
| `packages/primitives/src/components/ScrollArea.test.tsx` | element-tree tests (new file) |
| `packages/primitives/runtime/layout.runtime.test.tsx` | native keyboard tests |
| `packages/primitives/docs/scroll-area.mdx` | usage + Keyboard + Accessibility + Limitations + Verification |
| `packages/primitives/examples/layout.example.tsx` | label the example's scroll area |
| `packages/primitives/README.md` | component note + runtime count |
| `examples/basic-app/src/App.tsx` | label the settings scroller |
| `COMPONENTS.md` | Scrollable containers row + runtime count |
| `TODO.md`, `.agents/slop/plans/README.md` | tick and index |

Commands, expected green:

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run check
nub run lint
```

`test:runtime` must run on this host (plan 140's locally built binding). If the
binding is missing it fails loudly; that is a STOP, not a skip.

## 4. Test plan

**Core (can fail on the rules, not the runtime):**

- vertical Down/Up → forward/back line; PageDown/PageUp → page; Home/End →
  start/end; Left/Right are `None` on a vertical area; `space`/`enter` are
  `None`.
- horizontal Left/Right work and Up/Down are `None`.
- `both` handles both arrow axes and Home/End on both.
- `resolveScroll` keeps the other axis's offset, moves one line, and moves a
  page that is viewport − line (clamped to at least one line); End is the
  runtime's clamp sentinel, not a guessed content height.

**Element tree:**

- labelled ⇒ `role="region"`, `aria-label`, `tabIndex=0`, and the focus ring in
  `boxShadow` when focused;
- unlabelled ⇒ no role, no tabIndex, no ring, no `onKeyDown`.

**Runtime (the regression guard):**

1. A labelled area takes focus and `PageDown` moves the offset down; `PageUp`
   returns it; `Home` returns it to `0`; `End` reaches the content end (measured
   against `600 − 60` in a 400/60 scene, using the actual content height).
2. `ArrowDown` moves exactly three body line-heights.
3. An unlabelled area keeps its old behaviour: it is not a tab stop and keys do
   not scroll it.
4. An `Input` inside a labelled area: typing/arrow keys edit the field and the
   area does not scroll (the id guard).
5. A horizontal area scrolls with `ArrowRight` and ignores `ArrowDown`.

**Two directions:** each runtime test is run against the pre-fix component
(no `tabIndex`, no handler) and must fail; then against the fix and pass. The
element tests fail on the old tree because `role`/`tabIndex` are absent. Record
the observed failure text in §6.

## 5. STOP conditions

- `getFocusedElementId` is unavailable on the published `NativeRenderer` type —
  then keyboard scrolling cannot be safely scoped to the region; stop and report
  rather than scrolling while a field is focused.
- `scrollTo` does not clamp in the runtime — then End needs a measured content
  height, which the host does not expose; stop and document.
- The core tests and the runtime disagree on a key's direction — the runtime is
  the authority; correct `core/layout.ts` and record the measurement.
- Any gate (`check`, `lint`, `test`) fails for a reason outside these files.

## 6. Outcome

Implemented and measured on this host with the locally built 0.10.0 binding
(ADR 0003).

- `getFocusedElementId` is on the published `NativeRenderer` type
  (`@gpuix/native/index.d.ts:108`), and `scrollTo`/`getScrollOffset` are in the
  same interface, so the handler is scoped by a fact the runtime reports.
- Offline: `layout.test.ts` gained 7 `decideScroll`/`resolveScroll` tests;
  `ScrollArea.test.tsx` adds 3 element-tree tests. The package suite is **30
  files / 350 tests**, green.
- Native: `layout.runtime.test.tsx` gained 5 tests. The full run is **15 files /
  172 tests**, green at the time of plan 072 (the suite is 16 files / 175 after
  plan 073). The measured numbers: `focusNext` lands on the labelled area (a
  real tab stop), its `Region` node and painted focus ring are present,
  PageDown moves the 120 px viewport,
  Home returns to `0`, End lands on `-480` (600 px of content), ArrowDown moves
  exactly `-54` = 3 × the 18 px body leading, ArrowRight moves the horizontal
  axis by the same step while ArrowDown leaves `x` alone, an unlabelled area is
  skipped by `focusNext` and ignores PageDown, and an `Input` inside a labelled
  area does not scroll it.
- **Two directions:** with `tabIndex`/`onKeyDown` removed from the renderer, the
  three interaction tests fail (`expected 0 to be less than 0`,
  `expected +0 to be -54` twice) and the other 15 pass; restored, all 18 pass.
- Remaining limitation (documented in the docs and `COMPONENTS.md`): Tab can
  still land on a control painted outside the region and the container cannot
  reveal it — focus does not bubble to the wrapper and `scrollIntoView` did not
  move a plain scroller in the probe. The labelled region's own scroll stop is
  the keyboard path to the content.
