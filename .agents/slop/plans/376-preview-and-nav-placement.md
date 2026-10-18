# 376 — Preview card and navigation menu placement truth

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `112` (overlays), `320` (navigation menu), `323` (floating placement), `325` (nav hover), `326`/`327` (behaviour harness), `333`/`335` (docs truth) |
| Status | done — PreviewCard 8 → 10, NavigationMenu 17 → 19 native tests (behaviour 551). Both-direction proof: the centre case failed at 70 px off, the bottom-edge cases covered their trigger, and the caller ref read `null`; all pass after. |

## 1. The problem

Plan `323` measured two defects in GPUix 0.10.0's anchored layer and fixed them
for **Popover**, **Dropdown menu** and **Combobox** through
`internal/use-placement.ts`:

1. `align="center"` centres on the trigger's containing block, not the trigger;
2. `fit="snap"` clamps a surface inside the window instead of flipping it, so a
   bottom surface near the window edge is moved up **over** its trigger.

Two Tier 2 surfaces were missed and still hand the caller's intent straight to
the runtime:

- `PreviewCardContent` exposes `side`, `align` and `alignOffset` and passes them
  to `FloatingLayer` unchanged.
- `NavigationMenuContent` hardcodes `side="bottom" align="start"`.

Measured on this host, 2026-10-18, in the real renderer (fixed 1280×800 root):

| Probe | Trigger | Surface | Result |
| ----- | ------- | ------- | ------ |
| Preview card, `align="center"`, trigger 120 wide at x=40 | centre 100 | centre 280 | **180 px off** |
| Preview card at the bottom edge (trigger y=740, h=32) | 740–772 | y=726, h=66 → 726–792 | **covers the trigger** |
| Navigation menu at the bottom edge (trigger y=740, h=32) | 740–772 | y=724, h=68 → 724–792 | **covers the trigger** |

Both components promise placement in their docs and inventory rows
(`side`/`align` in the Preview Card API table). Shipping the runtime's defect as
if it were ours is the same broken promise plan `323` fixed elsewhere.

A second, smaller defect in the same file: `NavigationMenuContent` spreads
`...rest` onto `FloatingLayer` and then sets `ref={…}` **after** the spread, so a
caller's `ref` is silently discarded — the class of bug plan `128` swept.

## 2. Scope

**In scope**

- `src/preview-card.tsx`: resolve placement with the shared hook; centre
  compensation; one-shot flip; caller `ref` composed with the internal surface
  ref; `alignOffset` destructured so it adds to the measured correction instead
  of overriding it through `...rest`.
- `src/navigation-menu.tsx`: expose the open item's registered trigger instance
  from the nav context, resolve placement for the panel, compose the caller's
  `ref` with the internal panel ref.
- Two native tests per component (centre, edge flip; plus the caller ref for the
  nav), example and docs updates, inventory notes, `COMPONENTS.md`, `TODO.md`,
  this plan and its index row.

**Out of scope — do not touch**

- `internal/placement.ts` and `internal/use-placement.ts`: the rule and the
  one-shot measurement are already proven by plan `323`; no rule changes.
- No new `side`/`align` props on `NavigationMenuContent` — the panel's intent is
  bottom/start; only the resolved placement changes.
- No changes to `ContextMenuContent` (its `anchored` layer already clamps inside
  the window — measured at `(1270, 790)`: surface x=1092..1272, y=694..792).
- No files outside `packages/components/`, `COMPONENTS.md`, `TODO.md` and this
  plan set.

## 3. Files and exact changes

### 3.1 `packages/components/src/preview-card.tsx`

1. Import `usePlacement` from `./internal/use-placement.js` (the module already
   imports `useMergedRef`).
2. In `PreviewCardContent`, destructure `alignOffset = 0` and `ref` as well, and
   add:

   ```ts
   const surface = useRef<PublicInstance | null>(null);
   const setSurface = useMergedRef<PublicInstance | null>(surface, ref);
   const placement = usePlacement({
     open,
     side,
     align,
     margin: collisionPadding,
     trigger,
     surface,
   });
   ```

3. Pass the resolved values:

   ```tsx
   side={placement.side}
   align={placement.align}
   alignOffset={placement.alignOffset + alignOffset}
   ref={setSurface}
   ```

4. Update the module header: mention the shared measured placement rule.
5. Update `previewCardMeta.limitations`: append

   ```ts
   "placement is measured once per open: `align=\"center\"` is corrected from the panel's bounds and a snapped card near the window edge flips once instead of covering its trigger (0.10.0 snaps, it does not flip)",
   ```

### 3.2 `packages/components/src/navigation-menu.tsx`

1. Add to `NavigationMenuContextValue`:

   ```ts
   /** The registered trigger instance for a value, once React has attached it. */
   readonly triggerFor: (value: string) => PublicInstance | undefined;
   ```

2. In `NavigationMenu`, add a stable callback over the existing `triggers` map:

   ```ts
   const triggerFor = useCallback(
     (value: string) => triggers.current.get(value),
     [],
   );
   ```

   and include it in the context object and dependency array.

3. In `NavigationMenuContent`:
   - Destructure `ref` from props (it currently stays in `...rest`, where the
     later `ref` prop overrides it).
   - Read `triggerFor` from the nav context.
   - Keep the panel state for the `ArrowDown` focus effect, and add:

   ```ts
   const surface = useRef<PublicInstance | null>(null);
   const trigger = useRef<PublicInstance | null>(null);
   trigger.current = triggerFor(value) ?? null;
   const setSurface = useMergedRef(surface, ref);
   const setLayer = useCallback(
     (instance: PublicInstance | null) => {
       setSurface(instance);
       setPanel(instance ?? undefined);
     },
     [setSurface],
   );
   const placement = usePlacement({
     open,
     side: "bottom",
     align: "start",
     margin: 8,
     trigger,
     surface,
   });
   ```

   - Pass `side={placement.side}`, `align={placement.align}`,
     `alignOffset={placement.alignOffset}` and `ref={setLayer}` to
     `FloatingLayer`.
4. Update `navigationMenuMeta.limitations`: append

   ```ts
   "the panel is placed once per open: a bottom panel near the window edge flips above its trigger instead of being snapped over it",
   ```

### 3.3 `packages/components/src/behaviour/preview-card.test.tsx`

Header comment: add the two bugs guarded — a centre-aligned card 180 px off its
trigger, and a card at the window's bottom edge covering the trigger.

Add **two** tests after the existing opening tests (each fails on the pre-change
code):

1. **centres a centre-aligned card on its trigger**:
   - fixture: `<div style={{ padding: 40, width: 800 }}>` containing a
     `PreviewCard defaultOpen` with a trigger of `width: 120` and a content
     `align="center"`, `testId="preview"`;
   - read `requireBounds(card, "trigger")` and `requireBounds(card, "preview")`;
   - assert `Math.abs(surfaceCentre - triggerCentre) <= 1`.
2. **flips above a trigger at the window's bottom edge**:
   - fixture wrapper `paddingTop: 740, paddingLeft: 40` (window is 800 high);
   - `PreviewCard defaultOpen`, default side `bottom`, content two short lines;
   - assert `surface.y + surface.height <= trigger.y` **or**
     `surface.y >= trigger.y + trigger.height` (no overlap), and
     `surface.y >= 0` (the flip stays inside the window).

### 3.4 `packages/components/src/behaviour/navigation-menu.test.tsx`

Header comment: add the panel-over-trigger and discarded-caller-ref bugs.

Add **two** tests:

1. **flips a bottom panel above a trigger at the window's bottom edge**:
   - render the existing two-item nav inside
     `<div style={{ paddingTop: 740, paddingLeft: 40 }}>`;
   - focus the trigger and press `enter` (the suite's existing opening path);
   - assert the same no-overlap rule as §3.3 and `panel.y >= 0`.
2. **composes the caller's ref with the panel ref**:
   - `const ref = createRef<PublicInstance>()`;
   - render a nav with `ref` on `NavigationMenuContent`;
   - open the panel, then assert `ref.current !== null` and
     `ref.current.id === root.renderer.findByTestId("panel")?.id`.
   - On the old code the later `ref={…}` prop replaces the caller's, so
     `ref.current` stays `null`.

### 3.5 `packages/components/examples/preview-card.example.tsx`

Give the second card `align="center"` so the example exercises the corrected
path, and add one sentence to the header comment saying centre alignment is
measured against the trigger.

### 3.6 `packages/components/docs/preview-card.mdx`

1. Add a **Placement** section before **Theming**:
   - `side` and `align` are the caller's; the default is bottom/start;
   - `align="center"` is corrected from the measured panel because the runtime
     centres on the containing block;
   - a snapped card near the window edge flips once (above/beside its trigger)
     instead of covering it;
   - `alignOffset` adds to the measured correction;
   - the rule is the same one Popover, Dropdown menu and Combobox use.
2. Add `alignOffset?` to the `PreviewCardContent` API row.
3. In **Limitations**, replace the follow-cursor bullet's trailing clause with
   one that also names the placement truth: no follow-cursor positioning; the
   flip is one-shot per open, not a live collision tracker while resizing.
4. **Verification**: `(8 tests)` → `(10 tests)` and name the two new cases.

### 3.7 `packages/components/docs/navigation-menu.mdx`

1. Add a **Placement** paragraph (or a section) stating that the panel opens
   below the trigger and flips above it once when a bottom panel would be
   snapped over the trigger, measured from the registered trigger instance.
2. **Verification**: `(17 tests)` → `(19 tests)`; name the new cases.

### 3.8 `COMPONENTS.md`

- **Preview Card** row: append "placement measured once per open — `align=\"center\"` is corrected from the panel and a snapped card flips off its trigger"; test count 8 → 10.
- **Navigation Menu** row: append "the panel flips above its trigger when a bottom panel would be snapped over it; the caller's `ref` is composed on the panel"; test count 17 → 19.

### 3.9 `TODO.md`

Under **Tier 2 hardening after the inventory closed**, add and tick:

```
- [x] Preview card and navigation menu placement truth: centre alignment and the
  near-edge flip now use the shared measured rule, and the nav panel composes the
  caller's ref — plan 376; 4 native tests, both-direction proof (behaviour 551)
```

### 3.10 This plan set

Add plan 376 to `.agents/slop/plans/README.md` with status `done` once every gate
passes.

## 4. Commands and expected results

Run from `workspaces/components`.

```sh
nub run --filter @gpuixui/components check-types
# expected: exit 0

nub run --filter @gpuixui/components test
# expected: 37 files / 361 tests pass (no new unit tests)

nub run --filter @gpuixui/components test:behaviour
# expected: 47 files pass; behaviour total 547 → 551 (PreviewCard 8 → 10,
# NavigationMenu 17 → 19)

nub run check
nub run lint
nub run test
# expected: exit 0
```

The temporary probe files (`src/behaviour/probe-placement.test.tsx`,
`probe-context-edge.test.tsx`) are evidence only and are deleted before the
final run; the real tests above replace them.

## 5. Both-direction proof

After the suite is green, prove each assertion can fail:

1. In `preview-card.tsx`, change the layer back to `side={side} align={align}`
   and drop `alignOffset` (keep the ref composition). Run
   `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/preview-card.test.tsx`
   from `packages/components`.
   Expected: **both** new tests fail (centre is off by 180 px; the card covers
   the trigger). Restore.
2. In `navigation-menu.tsx`, revert the layer to `side="bottom" align="start"`
   and the later `ref={…}` override (keep `triggerFor`). Run the same command for
   `src/behaviour/navigation-menu.test.tsx`.
   Expected: the edge-flip test fails and the caller-ref test fails. Restore.
3. Re-run both files: 10/10 and 19/19.

Record the exact failing assertion names in the commit message body.

## 6. STOP conditions

Stop and report instead of improvising if:

- `usePlacement` cannot measure the nav panel because the trigger instance is not
  registered by the time the panel mounts (the nav registers on the trigger's
  ref callback; if the map is empty at panel mount, record the ordering evidence
  and stop rather than adding a second timing mechanism);
- the caller-ref test cannot obtain the panel instance through
  `findByTestId("panel")` (then assert against the returned ref's id through
  `getElement` and keep the same claim);
- fixing placement breaks hover travel into a top-anchored panel (pointer enters
  the panel through the side gap); record it and stop — do not weaken the hover
  tests;
- any file outside §3 must change;
- a gate fails twice for the same reason.

## 7. Acceptance criteria

- `PreviewCardContent` honours `side`/`align` through the shared measured rule:
  centre lands on the trigger's centre (±1 px) and a bottom card near the window
  edge opens above the trigger instead of covering it.
- `NavigationMenuContent` flips above its trigger at the bottom edge and composes
  the caller's `ref`.
- Four new native tests fail on the pre-change code paths in §5 and pass after.
- Example, docs (including the stated test counts), inventory records,
  `COMPONENTS.md`, `TODO.md` and the plan index are synced.
- `nub run check`, `nub run lint` and `nub run test` pass; no probe files remain.
