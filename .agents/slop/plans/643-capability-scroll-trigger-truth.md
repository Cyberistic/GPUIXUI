# 643 — the capability table still calls a `ScrollArea` hover-only

**Phase:** F (documentation truth)
**Owner:** primitives workstream (`docs/gpuix-capabilities.md`,
`packages/primitives/src/capabilities.test.ts`, `TODO.md`)
**Depends on:** 399b (the labelled area as a slot trigger), 583/590 (the focus
tracker), 610 (the handle's viewport `id`), 638 (an unlabelled area is not a
trigger)

## 0. The defect

`docs/gpuix-capabilities.md` §3's **Pointer, keyboard, focus and scroll events**
row ends its workaround with:

> … a `ScrollArea` keeps its imperative `ref` and stays hover-only

That was true before plan `610`. It is not true now:

- `ScrollAreaHandle` carries `readonly id: number | undefined`
  (`packages/primitives/src/components/ScrollArea.tsx:72-90`), the viewport's
  host id;
- `Tooltip` derives focus-open from the slot's `ref` host id and the native
  focus tracker's sample (`packages/primitives/src/components/Tooltip.tsx`,
  plan `596`);
- so a `Tooltip` around a **labelled** `ScrollArea` opens on `Tab` (measured,
  plan `610` §7), and `COMPONENTS.md`'s ScrollArea row already says so under
  **Keyboard (610)**.

The only remaining limit is hover: GPUix hit-tests the painted child and does
not bubble a pointer event to an ancestor, so the tip opens on hover only while
the pointer is over the region itself (plan `399b`). And an **unlabelled** area
is not a trigger at all (plan `638`).

The two documents therefore disagree: the capability table says the region can
never be a focus trigger, while the inventory records the measured opposite.

## 1. The fix

### 1.1 `docs/gpuix-capabilities.md` — the events row's workaround cell

Replace the trailing clause

```
a `ScrollArea` keeps its imperative `ref` and stays hover-only
```

with the measured contract:

```
a labelled `ScrollArea`'s imperative handle carries its viewport `id`, so a
wrapped area's tooltip opens on focus (`Tab`) while hover reaches only the
region itself (plans `610`, `399b`)
```

No other row changes. Do **not** weaken the row's `partial` verdict: the
published build still sends no `onFocus`/`onBlur`, which is why the tracker
exists.

### 1.2 `packages/primitives/src/capabilities.test.ts` — tie the two documents

Add one case to the existing `describe("GPUix capability reference")`:

```ts
it("agrees with the inventory about a ScrollArea tooltip trigger", async () => {
  // The bug guarded (plan 643): this row's workaround still ended
  // "a ScrollArea … stays hover-only" after plan 610 gave the handle its
  // viewport id, while COMPONENTS.md already recorded Tab opening the tip.
  const doc = await Effect.runPromise(readCapabilities());
  const events = Arr.join(
    rowFor(doc, "Pointer, keyboard, focus and scroll events"),
    " ",
  );
  expect(events).toContain("viewport `id`");
  expect(events).not.toContain("stays hover-only");

  const inventory = await Effect.runPromise(root("COMPONENTS.md"));
  const scrollRow = pipe(
    Str.split("\n")(inventory),
    Arr.findFirst((line) => Str.startsWith("| Scrollable containers |")(line)),
    Option.getOrElse(() => ""),
  );
  expect(scrollRow).toContain("Keyboard (610)");
  expect(scrollRow).toContain("opens on `Tab`");
});
```

Reuse the file's existing helpers (`root`, `rowFor`, `Option`, `Arr`, `Str`);
no new imports beyond what is already there.

Why this can fail in both directions: reverting the doc sentence fails the
`toContain("viewport \`id\`")` / `not.toContain("stays hover-only")` pair;
deleting plan `610`'s sentence from `COMPONENTS.md` fails the inventory half.
The test reads real files, not a fixture.

## 2. Test plan — proof in both directions

1. Before editing the doc, run the new case: it fails on
   `expected … to contain 'viewport \`id\`'` (and on `stays hover-only`).
2. Apply §1.1 only; the case passes. Run the whole file.
3. Temporarily delete the `Keyboard (610)` sentence from `COMPONENTS.md`; the
   case fails on the inventory half. Restore it.
4. `nub run check` runs the offline suite; `nub run lint`; `nub run test`.
   No runtime suite is needed — this change touches prose and its guard.

## 3. Commands

```sh
cd packages/primitives
nub exec vitest run src/capabilities.test.ts
nub run check-types
cd ../..
nub run check
nub run lint
nub run test
```

Expected: the capabilities file is green (10 cases: the existing 9 plus the new
one), and the root gates pass.

## 4. STOP conditions

Stop if:

- the events row cannot be located by the existing `rowFor` helper (its first
  cell changed) — re-plan rather than loosening the matcher to a substring that
  matches several rows;
- `COMPONENTS.md` no longer contains a `ScrollArea` `Keyboard (610)` sentence —
  that is a second, independent regression; record it instead of deleting the
  guard;
- the new case passes before the doc fix (it must not) — the assertion is
  vacuous, and the guard is wrong.

## 5. Acceptance and result

- [ ] plan indexed in `.agents/slop/plans/README.md`;
- [ ] the false "stays hover-only" claim is gone; the row states the focus-open
      path and the two real limits (hover hit-testing, unlabelled areas);
- [ ] one new offline case fails on the old sentence and on a removed
      `COMPONENTS.md` sentence, and passes with both in place;
- [ ] `TODO.md` row ticked; `COMPONENTS.md` already records plan `610`, so no
      duplicate sentence is added there;
- [ ] `nub run check`, `nub run lint`, `nub run test` green;
- [ ] commit pushed to `origin/agent/primitives`.

### Result

Measured 2026-10-19 in this worktree.

- **Before the fix:** the new case failed with
  `expected '… a ScrollArea keeps its imperative ref and stays hover-only' to
  contain 'viewport `id`'`, and the same string failed the `not.toContain`
  assertion. The inventory half passed, proving only the capability doc was
  wrong.
- **After the doc fix:** the case passed and the file is **10/10**.
- **Second direction:** deleting the `Keyboard (610)` sentence from
  `COMPONENTS.md`'s ScrollArea row failed the guard on
  `expected '' to contain 'Keyboard (610)'`; restoring it made the case pass.
- Gates: `nub run check` (format, lint, type-check), `nub run lint` and
  `nub run test` pass — primitives **60 files / 857 tests**, components 32/308,
  icons, tw and playground green. No runtime suite was touched (prose + guard
  only).
