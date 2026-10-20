# 698 — `Surface` repaints on a `revision`, without rebuilding its session

| Field | Value |
| ----- | ----- |
| Status | done |
| Phase | E (specialised foundations) |
| Owner | primitives |
| Depends on | `371`, `696`, `697` |
| Feeds | `packages/data-grid` charts, media frames, any raster consumer whose data changes |

Plan `696` §2 put the repaint path in scope as "the caller repaints by changing
a `revision` prop (documented)", and the shipped `Surface` has no such prop. The
page instead tells readers to "change a prop your `paint` closure reads and
render again", which does nothing. This plan adds the revision edge the plan
promised and makes the page's three repaint paths true.

---

## 1. Measured facts this plan relies on

Measured on this worktree, 2026-10-20, in the `TestRenderer`:

1. **A parent re-render repaints nothing.** A `Surface` with a stable
   `rasterSurface` adapter, re-rendered with a changed `label` (the only prop an
   unrelated data update would change), keeps `paints: 1` after 200 ms. The
   `paint` closure reads its own captured data, and no lifecycle edge runs.
   `docs/surface.mdx` says "A repaint is caller-driven: change a prop your
   `paint` closure reads and render again", so the page promises a repaint that
   never happens.
2. **Rebuilding the adapter tears the session down.** Rendering a fresh
   `rasterSurface(...)` per data change produces
   `create → paint:0 → destroy → create → paint:1`: it repaints, but every data
   update destroys the host session, re-runs `create` and loses whatever an
   adapter acquired there. That is the only working path today.

The existing suite is green before the change: `runtime/surface.runtime.test.tsx`
7/7 (5 from `696`, 2 from `697`).

**STOP** if calling `adapter.resize` with the current bounds does not repaint a
live raster session (probe it first); the revision edge reuses `resize` rather
than adding a seventh contract member.

---

## 2. The contract

`SurfaceProps.revision?: number` (default `0`).

- A **changed** revision on a live session calls `adapter.resize(bounds)` with
  the current box — the contract's own "repaint or reflow for a logicial box" —
  so a raster adapter paints a new frame and a native adapter may reflow.
- The revision is compared by `Object.is`; an unchanged value never calls the
  adapter, and the mount render is seeded, so a session is not resized twice at
  mount.
- A revision change **before** the first frame lands is a no-op: `create`'s
  `resize` paints the first frame anyway, and the caller's adapter closure is
  the one it passed.
- A new `adapter` identity still destroys and recreates the session (the only
  way to change the paint *function*), and the page says so.
- Bounds and theme changes keep their existing edges; `revision` is for data
  changes at the same box.

No `SurfaceAdapter` change: `resize` already means "repaint or reflow for a
box", and every adapter (and the `rasterSurface` tests) already implements it.

---

## 3. Exact files

### Create

| Path | What |
| ---- | ---- |
| `.agents/slop/plans/698-surface-revision-repaint.md` | this plan |

### Change

| Path | Change |
| ---- | ------ |
| `packages/primitives/src/components/Surface.tsx` | `revision` prop (default `0`), an `appliedRevision` ref, and the revision effect |
| `packages/primitives/runtime/surface.runtime.test.tsx` | one case: a revision bump repaints at the same bounds with **one** `create`; an unchanged revision adds no paint |
| `packages/primitives/docs/surface.mdx` | Usage states the three repaint paths; the API table gains `revision`; a **Repainting** paragraph; Verification count |
| `COMPONENTS.md` | the Surface row records the revision edge |
| `TODO.md` | a primitives row for this plan |
| `.agents/slop/plans/README.md` | index this plan after `697` |

Do **not** change `src/surface/adapter.ts` or `raster.ts`.

---

## 4. Implementation sketch

```ts
export interface SurfaceProps {
  // …
  /** A repaint counter: any change repaints a live session at the same box. */
  readonly revision?: number;
}

export const Surface = ({ …, revision = 0 }: SurfaceProps): ReactElement => {
  const appliedRevision = useRef(revision);

  useEffect(() => {
    if (Object.is(appliedRevision.current, revision)) return;
    appliedRevision.current = revision;
    if (!live.current) return;
    run(adapter.resize(boundsRef.current));
  }, [adapter, revision]);
```

The effect sits after the bounds effect so the resize compares already-applied
bounds; it calls `resize` directly instead of going through the bounds guard,
because the box did not change.

---

## 5. Test plan

One new runtime case in `runtime/surface.runtime.test.tsx`,
`repaints on a revision without rebuilding the session`:

1. Mount at `40×30` with a stable adapter that records `create`/`resize`/`paint`.
2. Wait for the first frame; record `creates = 1`, `paints = 1`.
3. Re-render with the same props and the same revision; wait a frame; assert
   `paints` is still 1 (an unchanged revision is silent).
4. Re-render with `revision={1}`; wait for the second paint; assert
   `creates` is still 1, the second `resize` carries the same `40×30`, and the
   second `paint` happened.

Both directions: with the effect removed the second paint never arrives
(timed out); with the `Object.is` guard removed the unchanged-revision render
paints a third time and the case fails by count.

Command:

```sh
cd packages/primitives && nub exec vitest run --config vitest.runtime.config.ts \
  runtime/surface.runtime.test.tsx
# expected: 8/8
```

---

## 6. Result (filled by the executor)

Implemented 2026-10-20.

- `SurfaceProps.revision` (default `0`) and an `appliedRevision` ref; a changed
  revision calls `adapter.resize(bounds)` on a live session.
- The page's Usage sentence is replaced by a **Repainting** table (revision,
  new adapter identity, bounds/theme) and the API table gains `revision`.

Measured after the change:

| Command | Result |
| ------- | ------ |
| `nub exec vitest run --config vitest.runtime.config.ts runtime/surface.runtime.test.tsx` | 8/8 passed |

Both directions:

1. The revision effect reduced to a ref write → the case fails with
   `timed out after 2000 ms waiting for the second frame`.
2. The `Object.is` seed guard removed → 5 runtime cases fail by name (first was
   `create, resize, visible, theme, resize` — a duplicate mount resize), because
   every render re-runs the resize edge.

The full live suite is the merge gate; this plan ran the scoped file only.

---

## 7. Acceptance criteria

- A changed `revision` repaints a live session at the same bounds with a single
  `create`.
- An unchanged `revision` never calls the adapter.
- A revision change before the first frame is a no-op, not a duplicate resize.
- The page names all three repaint paths (revision, new adapter identity,
  bounds/theme) and no longer claims an unrelated prop change repaints.
- The scoped runtime file, the package's offline suite and `check-types` are
  green; the inventory and TODO agree with the measured behaviour.
