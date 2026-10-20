# 784 — The selection wash is caller-controlled, and the page says it is not

| Field | Value |
| ----- | ----- |
| Phase | F — a documented "cannot" that the runtime supports |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Text row in `COMPONENTS.md`) |
| Depends on | `030` (Text), `059` (text semantics), `203` (capability reference), `342` (a page that denied a runtime style capability), `385` (the measured selection proof) |
| Status | done — 1 cross-document guard + a four-window capture case, both directions measured (§6) |

## 0. The defect, in one sentence

`docs/text.mdx`'s Limitations list ends its selection bullet with "no
`selectionColor` prop — the runtime paints its own highlight colour", which
reads as "the wash cannot be changed", while the runtime's `StyleDesc` exposes
`selectionColor` (a **subtree** colour, default the accent at 35 %), `Text`
already accepts it through its documented `style` escape hatch, and the
package's own capability reference records it as available — so a consumer on a
tinted surface ships a low-contrast selection for no reason.

## 1. Measured evidence (2026-10-20, native captures)

A throwaway probe (deleted after measuring) opened one window per frame, dragged
across a `selectable` `Text` ("Alpha bravo charlie"), and captured the frame.
A frame with no drag was the control, and two identical windows were compared to
prove the comparison is not capture noise:

| Frame | Result |
| ----- | ------ |
| default wash, no drag → drag | changed (`true`) |
| `style={{ selectionColor: "#FF0000" }}`, no drag → drag | changed (`true`) |
| default after vs custom after | **different** (`false` equality) |
| two identical dragged windows | **equal** (`true`) |

A second probe measured inheritance: a `Box style={{ selectionColor: "#00FF00" }}`
around an uncoloured `Text` selected in green (differs from the default), and a
child `Text` with its own `#FF0000` selected red (differs from its parent's
green). So the property is inherited per subtree and a child overrides it.

The published types (`@gpuix/native@0.10.0/dist/host.d.ts` `StyleDesc`) declare:

```ts
/** Selection wash colour for this subtree. Defaults to the theme accent at 35%. */
selectionColor?: string;
```

`docs/gpuix-capabilities.md` §"Text and input" already says "Text is selectable
(with `userSelect` and `selectionColor`)", and `COMPONENTS.md`'s Text row records
selection without the colour. Only `docs/text.mdx` denies it.

## 2. The contract

1. No new prop. `style` is the documented escape hatch for anything the named
   props do not cover (the `Box` page states the rule, and `Text` merges `style`
   last — plan `097`), and a dedicated `selectionColor` prop would add a second
   spelling for one style field.
2. The page states the real contract: the wash is the runtime's inherited
   `selectionColor`; the default is the platform accent at 35 %; set it through
   `style` with a token (`alpha(theme.colors.primary, 0.35)`) on the run or on a
   container, because it inherits; a child's own value wins.
3. The Limitations bullet keeps the true half — selection is **pointer-only**
   (no keyboard extension, no copy binding) — and drops the false half.
4. A native capture holds it: the default wash paints, a caller's colour changes
   the paint, the colour inherits from a container, an own value overrides it,
   and two identical windows are byte-equal.
5. A cross-document guard fails if the page denies the colour again or if the
   capability table stops recording it — the shape plan `342` uses for the
   gradient.

## 3. Files to change (exact)

| File | Change |
| ---- | ------ |
| `packages/primitives/docs/text.mdx` | §Theming gains the selection-colour paragraph and token snippet; the Limitations bullet keeps pointer-only and drops the false clause; the Verification list names the new capture case |
| `packages/primitives/runtime/text-selection.runtime.test.tsx` | one case: four windows (default, default twin, own colour, container colour), each dragged across the measured box, captures compared byte-wise |
| `packages/primitives/src/capabilities.test.ts` | one case: the table still records `selectionColor`; `text.mdx` names it and no longer contains the old sentence |
| `COMPONENTS.md` | the Text row gains a `**Selection colour (784):**` clause |
| `TODO.md` | one ticked row under the primitives workstream |
| `.agents/slop/plans/README.md` | index row for this plan |

No source change: this is a documentation and proof defect, not a behaviour one.

## 4. Implementation

### 4.1 The page

In §Theming, after the clamp paragraph, add prose and a snippet. The prose:

> `selectionColor` is the runtime's **inherited** selection wash — the platform
> default is the accent at 35 %. Set it through `style` on the run or on any
> container above it; a child's own value wins. There is no dedicated prop,
> because `style` is the one escape hatch (the same rule as `Box`).

The snippet:

```tsx
<Text selectable style={{ selectionColor: alpha(theme.colors.primary, 0.35) }}>
  Selectable release notes
</Text>
```

The Limitations bullet becomes:

```md
- Selection is **pointer-only**: no keyboard extension and no copy binding. The
  wash colour is caller-controlled through the inherited `selectionColor` style
  (above); the runtime owns the highlight geometry.
```

### 4.2 The capture case

Four windows in one test (the fixture closes each after the test):

| Window | Tree | Gesture |
| ------ | ---- | ------- |
| `default` | `<Text selectable>` | drag |
| `twin` | the same tree again | drag |
| `own` | `style={{ selectionColor: "#FF0000" }}` | drag |
| `parent` | `<Box style={{ selectionColor: "#00FF00" }}>` around the uncoloured run | drag |

Assert:

- `sameBytes(default, twin)` — the comparison is deterministic, not noise;
- `!sameBytes(default, own)` — the caller's colour reached the paint;
- `!sameBytes(default, parent)` — the colour inherits into the run;
- `!sameBytes(parent, own)` — an own value wins over the container's.

The drag helper and the measured-box traversal already exist in the file; reuse
them and keep the header's per-window note (a selection belongs to the window's
paint state).

### 4.3 The guard

```ts
it("does not deny the selection colour the table records", async () => {
  const doc = await Effect.runPromise(readCapabilities());
  const text = await Effect.runPromise(
    root("packages", "primitives", "docs", "text.mdx"),
  );
  expect(doc).toContain("selectionColor");
  expect(text).toContain("selectionColor");
  expect(text).not.toContain("the runtime paints its own highlight colour");
});
```

## 5. Test plan (both directions)

**Runtime — `runtime/text-selection.runtime.test.tsx`**

- The four-window capture case above. **Old direction:** with the page-level
  claim not under test yet, the assertion that fails when the *runtime* ignores
  the style is `!sameBytes(default, own)`: temporarily dropping `style` from the
  `own` tree makes `own` equal `default` and that assertion fails. Record it.

**Offline — `src/capabilities.test.ts`**

- The guard above. **Old direction:** restoring the sentence "the runtime paints
  its own highlight colour" to `text.mdx` makes the new case fail by message;
  removing `selectionColor` from the capability table fails the `doc` assertion.

**Existing coverage stays green**

- `runtime/text-selection.runtime.test.tsx`'s two existing cases (selectable
  takes the drag; non-selectable takes nothing) are unchanged.

## 6. Commands and expected results

```sh
# old direction: the page restored, the guard added
nub run --filter @gpuixui/primitives test src/capabilities.test.ts
# 1 failed: the old sentence is present

# old direction: the `own` tree without its style, the runtime case added
nub run --filter @gpuixui/primitives test:runtime runtime/text-selection.runtime.test.tsx
# 1 failed: `expected false to be true` for `!sameBytes(default, own)`

# new direction
nub run --filter @gpuixui/primitives test
# 71 files, 1001 tests, 0 failed

nub run --filter @gpuixui/primitives test:runtime runtime/text-selection.runtime.test.tsx
# 3 passed

nub run --filter @gpuixui/primitives check-types
nub run lint
nub run check:tests
```

The full live suite is the merge/release gate and is **not** run while iterating.

Measured results (2026-10-20):

- **Old direction — the guard:** restoring the page's old bullet (it said there
  was no `selectionColor` prop because the runtime paints its own highlight
  colour) makes the new case fail with
  `expected '---\ntitle: Text\ndescription: One ru…' not to contain 'the
  runtime paints its own highlight …'` (1 failed | 10 passed).
- **Old direction — the capture:** dropping the caller's `style` at the `Text`
  seam (`mergeStyle(textStyle(spec, theme), undefined)`) makes `own` equal
  `plain` and the case fails with `expected true to be false` (1 failed | 2
  passed in the file).
- **New direction:** the guard file is **11/11**; the selection file is
  **3/3**; the full offline suite is **71 files / 1001 tests, 0 failed**
  (1000 before). `check-types`, `nub run lint` and `nub run check:tests` are
  green, and the touched files are format-clean.
- The cross-window comparison is sound on this host: two identical dragged
  windows are byte-equal (the `plain`/`twin` assertion), so the three
  difference assertions are evidence rather than capture noise.

## 7. STOP conditions

Stop and report instead of improvising if:

- a drag no longer selects in the probe scene (that is plan `385`'s contract
  regressing, not this plan — report it and do not weaken the new case);
- captures of two identical windows stop being byte-equal (then a cross-window
  comparison cannot prove anything: report it and restructure the case to a
  single window with `selection()` state if the runtime allows clearing it);
- the runtime ignores `selectionColor` in some theme (the probe used the test
  theme; if a shipped palette behaves differently, measure and document it
  rather than claiming the wash is settable everywhere).

## 8. Acceptance criteria

- The page names the inherited `selectionColor` style, shows a token-based
  snippet, and no longer says the runtime's highlight colour cannot be changed.
- The native case proves the default wash, the caller's colour, inheritance and
  override — in four windows, with the twin proving determinism.
- The capability table and the page agree, and a guard fails if either drifts.
- The Text inventory row, `TODO.md`, this plan and the index are current;
  `check-types`, `lint`, `check:tests` and the offline suite are green.
