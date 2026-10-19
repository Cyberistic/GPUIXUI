# 610 — A `Tooltip` around a `ScrollArea` is hover-only

| Field | Value |
| ----- | ----- |
| Phase | F (interaction truth) |
| Owner | primitives workstream |
| Depends on | `072`, `341`, `345`, `396`, `399b`, `595`, `596` |
| Status | done |

Self-contained: §0 what is true before this plan and the measurement, §1 the
decision, §2 the change, §3 the files, §4 commands, §5 the test plan and the
two-direction proof, §6 STOP conditions, §7 acceptance.

---

## 0. What is true before this plan

A labelled `ScrollArea` is one focusable root (`role="region"`, `tabIndex=0`, a
name and a ring). Plan `399b` made it accept `TriggerHandlers`, so a `Tooltip`
around it forwards the hover handlers and writes its tip into the region's
`aria-description`. Plan `596` then made **every single-root trigger's**
keyboard tip work on the release runtime by putting `ref` into the slot contract
and comparing the trigger's host id with the focus tracker's sample. The
`ScrollArea` was left out, and both its page and the Tooltip page say so:

> **Keyboard open has one limit too.** The area's public `ref` is the imperative
> scroll handle, so the only ref a tooltip could use is already taken; on a
> runtime that dispatches no focus events (the pinned 0.10.0 build, plan `583`)
> a wrapped area's tip stays hover-only.

Measured on this host (release-tag binding, 2026-10-19) before the change:

| Step | Result |
| ---- | ------ |
| mount `<Tooltip content="A hint"><ScrollArea label="Region" …/></Tooltip>` | region painted |
| `focusNext()` | native focus on `region` |
| tip painted? | **no** |
| region `aria-description` | `"A hint"` (the description path already worked) |

Why: GPUix's `asChild` clones the wrapper's `ref` onto the child, and the child
is a React component that declares `ref` as its **imperative handle**
(`useImperativeHandle`). The tooltip's ref therefore receives the handle object
`{ element, scrollTo }`, not the host instance. It reads only one property,
`trigger.current?.id`, so the comparison with the tracked host id is always
`undefined` and the focus-open path never fires. Hover works only when the root
itself is hit-tested (the runtime does not bubble a mouse event to an ancestor,
plan `399b`).

This is the last trigger in the library whose keyboard tip is missing, and the
cause is a missing property on a public object rather than a runtime limit.

## 1. The decision

**The imperative handle carries the host id.** Add a readonly `id` to
`ScrollAreaHandle`, returning the viewport host's id. A slot's `ref` may then
identify the region exactly as it identifies a host element, without a second
ref prop and without changing the public `ref` type (a caller still receives
`{ element, id, scrollTo }`).

`Tooltip` needs no change: it already reads `trigger.current?.id`, and the slot
contract's runtime shape (`{ id }`) is satisfied. The property is documented as
the slot bridge, not as a second way to address the element — `element` remains
the host instance.

## 2. The change

`packages/primitives/src/components/ScrollArea.tsx`:

```ts
export interface ScrollAreaHandle {
  readonly element: PublicInstance | null;
  /** The viewport host's id, so a slot trigger can identify the region. */
  readonly id: number | undefined;
  readonly scrollTo: (target: Partial<ScrollPosition>) => void;
}
```

and the handle object gains the matching getter:

```ts
useImperativeHandle(props.ref, () => ({
  get element() {
    return root.current;
  },
  get id() {
    return root.current?.id;
  },
  scrollTo,
}));
```

No new prop, no `Tooltip` change, no paint change.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `src/components/ScrollArea.tsx` | `ScrollAreaHandle.id` and its getter |
| `runtime/scroll-area-trigger.runtime.test.tsx` | header corrected; one new keyboard-focus case; the old "unverifiable on this artifact" note deleted |
| `docs/scroll-area.mdx` | replace the "Keyboard open has one limit too" paragraph with the handle-`id` rule and the working example note |
| `docs/tooltip.mdx` | the trigger table's `ScrollArea` row and the stale footnote ¹ now state that focus opens it (tracker + handle id) |
| `COMPONENTS.md` | Tooltip row: drop "hover-only on this build"; ScrollArea row: record the handle id |
| `TODO.md` | new ticked row; progress `152/152` |
| `.agents/slop/plans/README.md` | index this plan after `609` |

No example change: the scroll-area example already mounts the region, and the
Tooltip example demonstrates the generic trigger.

## 4. Commands and expected results

```sh
cd packages/primitives

nub exec vitest run --config vitest.runtime.config.ts \
  runtime/scroll-area-trigger.runtime.test.tsx
# expect: 5/5 pass (4 existing + the new focus case)

nub run --filter @gpuixui/primitives test
# expect: 60 files / 837 tests pass (no offline file added)

nub run check
# expect: exit 0
```

The full runtime suite is the merge gate:

```sh
nub run --filter @gpuixui/primitives test:runtime
# expect: 57 files / 797 tests (796 + the new case), all pass
```

## 5. Test plan

**Runtime — `runtime/scroll-area-trigger.runtime.test.tsx`.** New case:
*"opens a Tooltip on keyboard focus"*.

1. Mount the content-filled region (so hover cannot be the cause) inside a
   `Tooltip` with `content="A hint"`.
2. `focusNext()`; assert native focus is `target`.
3. Wait for the focus tracker (the fixture's `settleFocus`) and assert the tip
   is painted.
4. Click the region and assert the tip closes while focus stays on it (the
   dismissal rule from plan `605`).
5. Press Escape / leave and re-enter? — not needed here; plan `596` owns the
   shared dismissal matrix. Keep this case to "focus opens, click dismisses".

The existing description and keyboard-scroll cases stay; they prove the new
property did not replace the region's own contract.

**Both directions.**

- Remove the `id` getter: the new case fails (tip stays shut), the other cases
  pass.
- Return a constant wrong id (`0`): the new case fails the same way, proving the
  comparison is with the real host id, not just presence.
- Remove the `focusNext` step: no tip, so the case cannot pass by hover.

## 6. STOP conditions

- Stop if the slot's `ref` receives a raw host instance rather than the handle
  (the `useImperativeHandle` shape changed in the installed React): re-plan
  against the measured shape, do not add a second ref prop.
- Stop if exposing `id` breaks a caller that passes its own `ref`: the handle
  shape is additive; a type error there is a real API conflict and must be
  reported, not silenced with a cast.
- Do not make the handle a full `PublicInstance` imposter or forward arbitrary
  methods; the slot reads `id`, and `element` remains the documented instance.

## 7. Acceptance

- A `Tab` into a wrapped labelled region opens its tip and the region still
  scrolls by keyboard.
- The handle's `id` is documented; no second ref or new prop exists.
- Scoped and offline suites pass, the full runtime suite is green, and the
  docs/inventory/TODO/index agree.

## 8. Result (2026-10-19)

- `ScrollAreaHandle` now has `readonly id: number | undefined`, backed by a
  getter over the viewport host. `Tooltip` needed no change: it already reads
  `trigger.current?.id`, which now resolves for a wrapped region.
- Measured before: focus reached `region` and `tip` was `false`. After: the tip
  paints on `Tab`, Escape dismisses it while the region keeps focus, and the
  region's PageDown/Home scroll case still passes.
- Both failing directions observed on the scoped case: without the `id` getter
  the tip stays shut (`expected false to be true`), and a constant wrong id
  (`0`) fails identically.
- Runs: scoped `scroll-area-trigger` 5/5, offline 60 files / 837 tests, full
  runtime 57 files / **797 tests** (from 796), `nub run check` exit `0`.
- `docs/scroll-area.mdx`, `docs/tooltip.mdx`, `COMPONENTS.md`, `TODO.md` and the
  plan index now state the working focus path; no example or public prop
  changed.
