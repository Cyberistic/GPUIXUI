# Plan 330 — the shipped Tier 2 components in the playground

**Workstream:** playground (`apps/playground`, `packages/testing`).
**Phase:** C/D acceptance for the Tier 2 set, plus a live-window follow-up.
**Depends on:** plans `100`, `110`, `120`, `140`, `155`, `164`, `183`, `187`,
`189`, `190`, `193`; `packages/components` on the integration branch (merge
`master` first).
**Numbering note:** `300–329` are already in use by the playground (300–302),
the components workstream (300–324) and tokens-theme (300–328). The shared index
counts every worktree, so this plan takes `330` — the first free number.

---

## 1. Why

`TODO.md` has carried this row since plan `183`: *“Mount the real Tier 2
components in the playground (`@gpuixui/components`: dialog, menu, toast) and
drive open/close/confirm in the native suite.”* It was blocked only because the
package was not on the integration branch.

The block is gone. `master` now carries `packages/components` with Dialog,
ConfirmDialog, DropdownMenu, ContextMenu and the Toast system, all with their
own native behaviour suites. The playground's job is different from those
suites: it proves the **consumer path** — the shipped components rendered by
the playground's real `TestRenderer` under the shipped token theme, driven by
the same `SmokeHost` gestures a user makes (click, key, focus traversal, right
click, real time). That is the evidence a `COMPONENTS.md` row cites for “works
when a consumer imports it”, which a package-internal suite cannot claim.

What the probes already measured and this plan must **not** re-derive: modal
focus entry/trap/return (plan `155`), pointer-anchored menus (plan `164`),
nested-layer dismissal (plan `187`), the toast viewport mechanism (plan `183`).
Those plans used local implementations because the package was absent. This
plan asserts the shipped implementations reproduce the same measured contract.

## 2. What is measured

Three scenarios, all capability `tier2` (a new capability, added to
`Smoke.Capability`):

| Scenario id | Component | Contract asserted |
| ----------- | --------- | ----------------- |
| `tier2-dialog` | `Dialog`, `ConfirmDialog` | closed by default; trigger opens; the surface is painted, named and centred; focus enters; Tab/Shift-Tab stay inside; Escape closes and returns focus to the trigger; ConfirmDialog puts initial focus on **Cancel**; Enter cancels and never confirms; confirm reports once and **leaves the dialog open**; Escape then closes it |
| `tier2-menu` | `DropdownMenu`, `ContextMenu` | click opens; arrow keys move the highlight; Enter activates exactly once and restores focus; Escape closes; right click opens the context menu within 12 px of the pointer; a row runs once; an outside press dismisses |
| `tier2-toast` | `ToastProvider`, `ToastViewport` | nothing at rest; a push paints one card with its title and tone glyph; the card is inset bottom-right and 380 px wide; its action runs once and dismisses it; a second push stacks above; the dismiss control removes only its card; Escape does not clear the stack; a short duration dismisses itself in bounded real time |

Expected new checks: **≥ 55** across the three scenarios. The suite goes
`61 → 64` scenarios and the `tier2` capability becomes `verified`.

## 3. Files

Create:

- `apps/playground/src/scenarios/tier2-dialog.tsx` — `tier2DialogScenario`.
- `apps/playground/src/scenarios/tier2-menu.tsx` — `tier2MenuScenario`.
- `apps/playground/src/scenarios/tier2-toast.tsx` — `tier2ToastScenario`.
- `apps/playground/src/scenarios/await-readout.ts` — the bounded real-time wait
  the toast scenario needs (and a unit test for it is **not** useful: it is a
  scheduler helper, exercised by the scenario itself).
- `apps/playground/tsconfig.vendor.json` — compiles the source-first components
  package into `vendor/` (see §8.1 for the measured reason).

Change:

- `apps/playground/package.json` — add `"@gpuixui/components": "workspace:*"` to
  `dependencies`, and run `vendor` from `build`, `check-types` and `test`.
- `apps/playground/.gitignore` — ignore `vendor/`.
- `apps/playground/src/scenarios/index.ts` — import the three scenarios, add
  them to `scenarios`, add `"tier2"` to `CORE_CAPABILITIES`.
- `packages/testing/src/smoke.ts` — add `"tier2"` to the `Capability` schema
  union (find `export const Capability = Schema.Literals([...])`; keep the list
  alphabetical if the surrounding list is).
- `apps/playground/src/scenarios/toast.tsx` — replace the fixed
  `Effect.sleep("350 millis")` before the short-toast assertion with the bounded
  wait from `await-readout.ts`. **Reason:** the suite failed once on this host
  under load (`dismissed=none` after 350 ms for a 250 ms timer) while 60 other
  scenarios passed; the assertion is correct, the wait was too tight. Keep the
  rest of the scenario unchanged.
- `TODO.md` — tick the Tier 2 mount row, add the plan to the playground plan
  list, correct the suite counts (`61 → 64` headless).
- `COMPONENTS.md` — add the `tier2` capability row and the evidence sentence in
  the “end-to-end native composition” block.
- `.agents/slop/plans/README.md` — add plan `330` to the playground table.

Do **not** edit `packages/components/**` in this plan. If a shipped component
needs a change to pass, STOP (§7) and record a cross-team task in `TODO.md`.

## 4. Prerequisites

From `workspaces/playground`:

```sh
git merge master --no-edit          # if master is not already an ancestor
nub install                         # links packages/components into apps/playground
ls packages/components/src/index.ts # must exist
```

Expected: the merge completes (resolve shared-doc conflicts by keeping this
branch's playground evidence **and** `master`'s Tier 2 inventory table), and
`nub install` exits `0`. Then add the dependency:

```sh
# edit apps/playground/package.json, then
nub install
ls apps/playground/node_modules/@gpuixui/components
```

Expected: the symlink/directory exists. STOP if `nub install` fails or the
package is not linked — record the exact error and do not hand-create a
`node_modules` entry.

## 5. Implementation

### 5.1 `packages/testing` — the capability

`Smoke.Capability` is a schema literal union; every capability a scenario
declares must be in it, and `scenarioProblems` requires every capability in
`CORE_CAPABILITIES`/`PROBE_CAPABILITIES` to be covered. Add `"tier2"` to the
schema and to `CORE_CAPABILITIES` in `scenarios/index.ts`.

### 5.2 `await-readout.ts`

```ts
import { Effect, Schedule } from "effect";
import * as Str from "effect/String";
import type { Smoke } from "@gpuixui/testing";

/** Waits up to 2 s for `testId`'s text to contain `needle`; resolves either way. */
export const awaitReadout = (
  ctx: Smoke.SmokeContext,
  testId: string,
  needle: string,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const text = ctx.host.text(testId);
    if (text !== null && Str.includes(needle)(text)) return;
    return yield* Effect.fail("not yet");
  }).pipe(
    Effect.retry(
      Schedule.spaced("50 millis").pipe(
        Schedule.upTo({ duration: "2 seconds" }),
      ),
    ),
    Effect.orElseSucceed(() => undefined),
  );
```

The caller still asserts with `expectContains`, so a timeout produces the
normal failing check with the measured readout — the wait never decides pass or
fail by itself. Use `Effect.orElseSucceed` (not `orDie`) so a timeout is a
readable check, not a defect.

### 5.3 `tier2-dialog.tsx`

View: a frame div (`testId="tier2-dialog-frame"`, full window size, theme
background) containing:

- `<Dialog>` with `<DialogTrigger testId="dialog-open">Open editor</DialogTrigger>`
  and `<DialogContent testId="dialog-content" label="Edit project">` holding
  `DialogHeader`/`DialogTitle`/`DialogDescription`, two primitives `Input`s
  (`dialog-field`, `dialog-field-2`), a `DialogFooter` with a
  `<DialogClose testId="dialog-cancel">Cancel</DialogClose>` and a primitives
  `Button testId="dialog-save"` that increments a counter and closes through a
  controlled `open`.
- A readout (`tier2-dialog-readout`) with `open=<bool> saves=<n> confirms=<n>
  cancels=<n>`.
- `<ConfirmDialog ...>` driven by `confirmOpen` state with a trigger button
  (`confirm-open`), `tone="danger"`, `onConfirm` incrementing `confirms`
  **without** closing.

Steps, in order:

1. `frame` bounds exist; width/height > 0.
2. `dialog-content` is not painted at rest (`bounds === null`) and the readout
   says `open=false`.
3. `ctx.host.click("dialog-open")`; readout `open=true`; `dialog-content`
   bounds exist and its centre is near the frame centre (within 2 px on both
   axes; the component centres in an `anchored` veil, measured in plan `112`).
4. `ctx.host.focused()` is `dialog-content` (the surface takes focus).
5. Tab traversal: six `focusNext()` calls; after each, the focused id is one of
   `dialog-content` / `dialog-field` / `dialog-field-2` / `dialog-cancel` /
   `dialog-save` / `dialog-close`. This proves the trap without depending on
   the exact tab order.
6. Shift-Tab: three `focusPrevious()` calls, same containment assertion.
7. `ctx.host.key("escape")`; `dialog-content` no longer painted; `open=false`;
   focus is `dialog-open` (returned to the trigger).
8. `ctx.host.click("confirm-open")`; `dialog-content` painted and its label
   makes the a11y node `Dialog`/“Delete project” present.
9. Focus is `confirm-cancel` — Cancel holds initial focus.
10. `ctx.host.key("enter")`; the dialog closes and `confirms=0`.
11. Reopen; `ctx.host.click("confirm-accept")`; `confirms=1` and the dialog is
    **still painted** (the component never closes itself).
12. `ctx.host.key("escape")`; closed; focus back on `confirm-open`.

Assert the a11y roles once: a `Dialog` node named “Delete project” (role name
from the runtime dump — reuse `node()`/`treeOf()` from `probes.ts`; if the dump
calls the role something else, assert the role the runtime reports and record
it in the plan’s result section rather than bending the component).

### 5.4 `tier2-menu.tsx`

View: a frame with

- `<DropdownMenu>` + `<DropdownMenuTrigger testId="menu-open">Actions</DropdownMenuTrigger>`
  + `<DropdownMenuContent testId="menu-content">` with rows
  `menu-rename` (Rename), `menu-archive` (disabled Archive), `menu-delete`
  (Delete).
- `<ContextMenu>` wrapping a target div `testId="menu-target"` (240×120) and a
  `<ContextMenuContent testId="context-content">` with `context-copy` (Copy) and
  `context-paste` (Paste).
- Readout `tier2-menu-readout`: `opens=<n> selected=<name|none> copied=<n>
  pasted=<n>`.

Steps:

1. At rest neither content is painted.
2. Click `menu-open`; `menu-content` painted; its text contains `Rename`.
3. `key("down")` then `key("enter")`: `selected=Rename` and the menu is closed.
4. Focus returns to `menu-open`.
5. Reopen; `key("down")` twice skips the disabled Archive (the highlight must
   land on Delete); `key("escape")`; closed; focus `menu-open`.
6. `rightClick("menu-target")`; `context-content` painted; its bounds are within
   12 px of the target's centre on both axes (the context menu is
   pointer-positioned; plan `164` measured ≤ 1 px, allow 12 for the surface
   inset).
7. `key("enter")` on the first row (Copy): `copied=1`, closed.
8. Reopen the context menu, then `ctx.host.click("menu-open")`-free outside
   press: `ctx.host.clickWindow(5, 5)`; closed.
9. Escape on a fresh menu closes it.

### 5.5 `tier2-toast.tsx`

View: `<ToastProvider>` wrapping a frame; the frame is **not** full-window so
the viewport insets are measurable against it, or the frame is full-window and
the expectations use the window frame (match the toast probe: full window, insets
24 from the theme’s `xl`). Controls: `toast-push`, `toast-push-action`,
`toast-push-short`, `toast-dismiss-all`; `<ToastViewport />` is the **last**
child of the root. A readout `tier2-toast-readout` prints
`count=<n> actions=<n> last=<title|none>` from `useToast().toasts`.

Short duration: `duration: Duration.millis(300)` in the draft; the long ones
omit `duration` and the provider gets `defaultDuration` large (e.g.
`Duration.minutes(5)`), so only the short one can vanish on its own.

Steps:

1. At rest: no card (`bounds("toast-1") === null`), readout `count=0`.
2. Click `toast-push`; readout `count=1`; `toast-1` painted with its title.
3. The card is inset **16 px** from the frame’s right and bottom and is 380 px
   wide (the viewport uses `theme.spacing.xl`, which tokens define as 16, and
   `maxWidth: 380`; assert ±1).
4. Click `toast-dismiss`; readout `count=0`; the card is gone after one
   `host.flush()` (there is no exit animation in the shipped viewport).
5. Push the action toast; click `toast-action`; `actions=1`, `count=0`.
6. Push two long toasts; the second sits one gap above the first; the newest
   owns the bottom inset.
7. `key("escape")`; `count` unchanged (Escape is not a toast shortcut).
8. Push the short toast; `awaitReadout(ctx, "tier2-toast-readout", "count=")` is
   insufficient — wait for the card’s disappearance instead by polling the
   readout count inside a bounded `Effect.retry` (reuse `awaitReadout` with the
   exact expected count string), then assert `bounds` is `null` and the long
   toast survived.

Use the store’s generated ids (`toast-1`, `toast-2`, …) only if the shipped
store starts its counter at 1; verify by reading the first push’s id from the
readout (`last=`) instead of assuming it. A scenario must fail with a readable
message when the id differs, not silently skip a check.

### 5.6 Registry, docs and inventory

- `scenarios/index.ts`: add the three scenarios at the end of the list and add
  `"tier2"` to `CORE_CAPABILITIES`.
- `COMPONENTS.md`: add
  `| tier2 | tier2-dialog, tier2-menu, tier2-toast | verified |` and a paragraph
  in the “End-to-end native composition” block naming the shipped components.
- `TODO.md`: tick the mount row and record the counts.
- `.agents/slop/plans/README.md`: index this plan as **landed** with its
  measured result.

## 6. Test plan

1. **Scenario integrity is already tested.** `scenarios/index.test.ts` (or the
   existing integrity test) exercises `scenarioProblems`; adding a scenario with
   the `tier2` capability must keep it green, and removing `"tier2"` from the
   schema must fail the type check. Run `nub run --filter playground test`
   (84 tests at the merge point) — expected unchanged plus any new unit tests.
2. **Each scenario can fail.** Prove one check per scenario by mutation, and
   revert it:
   - dialog: replace the `focusNext()` loop with a single `focusNext()` and
     assert the trap is gone — the containment check must fail (exit `1`);
   - menu: change the context-menu pointer expectation from the target centre
     to the frame origin (0,0) — the placement check must fail;
   - toast: change the inset expectation from 24 to 0 — the inset check must
     fail.
   Record the exact failing lines in the result section.
3. **The suite is green end to end.** From the repo root:
   `nub run --filter playground build && nub apps/playground/dist/smoke/run.js`
   Expected: exit `0`, `64/64` scenarios, `tier2=verified`, a screenshot per new
   scenario.
4. **Live follow-up is not in this plan.** The live suite (`smoke:live`) mounts
   the shell and navigates scenarios by clicking the sidebar; adding three
   scenarios to the sidebar is covered by `shell-navigation`. A dedicated
   `live-tier2` probe is the next plan (`331`) if the headless run is green.

## 7. STOP conditions

Stop and report with evidence if:

- `nub install` cannot link `@gpuixui/components` in `apps/playground`;
- the components package fails to import in the playground because of a
  tsconfig `jsxImportSource` mismatch (this is the known
  `@gpuixui/tokens/react` problem in `TODO.md`; record it as a cross-team task,
  do not patch another workstream’s package);
- a shipped component throws inside the `TestRenderer` for a reason that is a
  component defect — record a `TODO.md` cross-team row with the error and the
  scenario, and leave the scenario out rather than bending the assertion;
- the toast id or role shape differs from §5.5/§5.3 in a way that needs a
  component change.

Do not: edit `packages/components/**`, weaken a check to make a defect pass,
skip a scenario, or claim the live suite ran.

## 8. Result — measured on this host (2026-10-18)

The plan landed. What the runtime and the compiler actually did, including the
parts that changed the plan:

1. **The components package cannot be executed from source by `nub`.**
   `packages/components/tsconfig.json` maps `@gpuix/react/jsx-runtime` to
   `./node_modules/@gpuix/react/jsx-runtime.d.ts` (a type-only shim added because
   the isolated linker puts `@gpuix/react` under that package, not under tokens).
   Node refuses to strip types from a file under `node_modules`:
   `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. The failure reproduces from
   inside the package (`nub -e 'import("./src/index.ts")'`), so it is a property
   of the package, not of the playground. **The consumer compiles it instead:**
   `apps/playground/tsconfig.vendor.json` extends the package's own tsconfig and
   emits to `apps/playground/vendor/` (`vendor` script, run by `build`,
   `check-types` and `test`), and the three scenarios import the compiled root by
   relative path so the same specifier resolves from `src/` and `dist/`. The
   durable fix belongs to `components`/`tokens` and is recorded in `TODO.md`.
2. **The native renderer wants one root host element.** A provider whose children
   are siblings (`<ToastProvider><A/><B/></ToastProvider>`) at the root paints
   nothing. The toast view therefore wraps the provider in the frame div, which
   is also the mount parent its `position: "absolute"` viewport resolves against.
   The components package's own toast harness records the same rule.
3. **The shipped viewport insets by 16 px, not 24.** It uses
   `theme.spacing.xl`, and tokens define `xl: 16`; the earlier `toast-lifecycle`
   probe's 24 was that probe's own constant. The scenario asserts the component's
   real value.
4. **The stack order is oldest-above-newest.** The viewport is a bottom-anchored
   column, so the newest card owns the bottom inset and the older card sits
   above it.

Measured suite: **64/64 scenarios, exit `0`**, `tier2=verified`, 63 checks in the
three scenarios (`tier2-dialog` 24, `tier2-menu` 18, `tier2-toast` 21).

Mutation proofs (each fails with exit `1`, then reverted):

- M1 `dismissible={false}` on the shipped `Dialog` → `Escape closed the dialog:
  expected a string containing "open=false", got "open=true …"`.
- M2 remove `disabled` from the menu's Archive row → `the second arrow skipped
  the disabled row: expected "menu-delete", got "menu-archive"`.
- M3 `style={{ right: 4 }}` on the shipped `ToastViewport` → `the card is inset
  from the right: expected 16 ± 1, got 4`.

The toast probe's fixed 350 ms wait was replaced with `awaitReadout` (bounded
2 s, 50 ms polls, dispatcher `advance(0)` per poll); the check that used to flake
now waits for the frame and still fails with the measured readout on timeout.

## 9. Acceptance

- [ ] `@gpuixui/components` is a dependency of `apps/playground` and imports
      from its public root.
- [ ] `tier2-dialog`, `tier2-menu`, `tier2-toast` exist, are registered, and
      each has at least 15 checks.
- [ ] The headless suite is `64/64`, exit `0`, with `tier2=verified`.
- [ ] At least three mutation proofs recorded (one per scenario).
- [ ] `nub run --filter playground test` and `check-types` pass.
- [ ] `TODO.md`, `COMPONENTS.md` and the plan index are updated.
- [ ] The toast flake is gone: three consecutive full runs, no fixed 350 ms
      sleep deciding a check.
