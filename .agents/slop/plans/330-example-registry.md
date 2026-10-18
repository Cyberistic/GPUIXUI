# 330 — The example registry: complete it, then prove every example renders

**Phase:** C/F · **Owner:** components workstream · **Depends on:** 110, 117, 300–329.

## 1. Why

Every Tier 2 component has an example module, a docs page and an inventory record.
`examples/index.ts` is the **only** mount point for those examples: it is the map
`id → example` a native surface (`apps/playground`, `packages/testing`, any host)
iterates. It is also the contract the docs pages name.

Measured on 2026-10-18, on `agent/components`:

```sh
cd packages/components
ls examples/*.example.tsx | wc -l      # 41
grep -c '^  "\?[a-z-]*"\?:' examples/index.ts   # 24
ls docs/*.mdx | wc -l                  # 41
```

**Seventeen of forty-one examples are not registered** — carousel, chat,
color-picker, countdown, drawer, fieldset, form, hotkey-recorder, inline-edit,
keyboard-shortcuts, mention-input, message, navigation-menu, preview-card,
stepper, tag-input, timeline. A host that mounts the registry therefore silently
loses 41% of the library, including whole families (forms, chat, navigation).

The second gap is verification. `tsc` proves an example *typechecks*; nothing
proves it *mounts*. An example is a composition with caller-owned state, and
`assertParts` (plan 304) throws at render when a part is misplaced. A docs
snippet a consumer copies is the most exposed code in the package, and it is the
only code with no renderer test.

The inventory suite (`src/inventory.test.ts`) checks docs/records/rows against
the filesystem but never reads the registry, so this drift was invisible.

## 2. Contract

- The registry key is the example module's basename: `examples/<id>.example.tsx`
  is registered under `<id>`. One entry per module; a second variant inside a
  module (e.g. `DrawerSheetExample`) is not a separate screen.
- Every example module is registered, and every registry key has a docs page
  `docs/<id>.mdx` and exactly one inventory record whose `example` is
  `examples/<id>.example.tsx`.
- Every registered example **mounts** in the real renderer and paints text. A
  throw (a misplaced part, a bad prop, a broken provider) fails the suite with
  the example's id.
- The registry stays a static import map. No dynamic `import()`: a missing
  module must be a type error, not a runtime rejection.

## 3. Files and exact changes

1. `packages/components/examples/index.ts`
   - Add the 17 missing imports and entries, alphabetically as the file already
     is. Export names already exist (`CarouselExample`, `ChatExample`, …).
   - No other API change: `examples` keeps its `Readonly<Record<string,
     ComponentType>>` type.
2. `packages/components/src/inventory.test.ts`
   - Import `examples` from `../examples/index.js` (safe in the node suite: the
     module imports component code, not `@gpuix/react/testing`).
   - Read `examples/` with `readdirSync` (this file already uses `node:fs` under
     plan 117 §3) and assert, in one new `it`:
     - every `*.example.tsx` basename is a registry key;
     - every registry key has `docs/<id>.mdx` on disk;
     - every registry key is the `example` of exactly one inventory record.
   - Use Effect helpers (`R.keys`, `Arr.filter`, `Arr.sort`) as the file does.
3. `packages/components/src/behaviour/examples.test.tsx` — **create**
   - One native test: build the root once, `rerender(<Example key={id} />)` for
     each registry key under the default (dark) theme, and assert each painted a
     non-empty `getAllText()`. Unmount at the end. Ids are taken from the
     registry, so a new example is covered automatically.
   - Header comment states the bug it guards: a registered-but-unmountable
     example, and an example module missing from the registry.
4. `packages/components/README.md`
   - One table row for `examples/index.ts` and one sentence in "Adding a
     component": register the example under its basename; the inventory test and
     the example suite enforce it.
5. `.agents/slop/plans/README.md` — index 330 and its status.
6. `TODO.md` — one Tier 2 hardening task, ticked after the gates pass.

## 4. Test plan (each must be able to fail)

Unit (`src/inventory.test.ts`, new assertion):

- **fails today**: 17 modules have no registry entry. Removing a single entry
  from a complete registry fails it again (both-direction proof).
- A registry key with no docs page or no record fails with the id.

Behaviour (`src/behaviour/examples.test.tsx`):

- Mounting every example fails if any example throws (misplaced part, invalid
  prop) or paints nothing. Two-direction proof: temporarily give one example a
  text-only child inside a `PartChildren` slot that requires elements, or
  remove its host element, and the suite fails with that id; restore and it
  passes.

The registry assertion covers **coverage**; the native suite covers **working**.
Neither can pass by reading the other.

## 5. Commands

```sh
cd packages/components
nub run --filter @gpuixui/components test              # expect 331 → 334
nub run --filter @gpuixui/components test:behaviour    # expect 492 → 493, 47 files
nub run --filter @gpuixui/components check-types
cd ../.. && nub run check && nub run lint && nub run test
```

Expected: every command exits 0; the unit suite fails before the registry fix.
Counts are written into the plan **after** the run, never assumed.

## 6. STOP conditions

Stop and report if:

- a registry module cannot be imported without the native binding (then the unit
  check must live in the behaviour suite and the split must be documented);
- an example fails to mount for a reason outside `examples/` (a component bug):
  fix the component with its own regression test, or record the failure and do
  not tick the task;
- the only way to make an example paint is to remove its control (then the
  example is decorative — rewrite it or record the limitation);
- adding the native suite pushes a single test past the 20 s native budget
  without a diagnosis.

## 7. Acceptance

- [x] All 41 example modules are registered; the registry has 41 entries.
- [x] The inventory suite fails when one registration is removed, and passes
      with the full registry.
- [x] The behaviour suite mounts all 41 examples in the real renderer.
- [x] `README.md` states the basename rule; `TODO.md` is ticked; plan index is
      current.
- [x] `nub run check`, `nub run lint`, `nub run test` and the behaviour suite are
      green, with the measured counts recorded in §8.

## 8. Result

Landed 2026-10-18.

- `examples/index.ts`: the 17 missing imports and entries, in alphabetical order.
  Measured coverage: **41 modules, 41 registry entries, 41 docs pages, 41
  inventory records** — the four sets now agree, which before this plan they did
  not (24 registered).
- `src/inventory.test.ts`: one new assertion, `registers every example, with a
  page and a record for each entry`. It reads the `examples/` directory
  (`node:fs`, already authorised for this repository-check file by plan 117 §3),
  and reports a missing entry, a key with no module, a key with no docs page, and
  a key with no inventory record as named problems.
- `src/behaviour/examples.test.tsx`: one native test that rerenders every
  registry entry in the real renderer and asserts it painted at least one text
  run. The list comes from the registry, so a new example is covered by
  registration alone.
- Both-direction proofs, run on this host:
  - deleting `carousel: CarouselExample,` from the registry failed the unit
    assertion with `carousel: example module is not registered`;
  - replacing `card: CardExample` with a component that returns `null` failed the
    native test with `card: expected 0 to be greater than 0`.
  Restoring each made the suite pass again.
- Measured: unit **332** (34 files, was 331); behaviour **493** (47 files, was
  492). `nub run check`, `nub run lint` and `nub run test` exit 0.
- `README.md` documents the basename rule and the two checks; `TODO.md` carries
  the task and the playground interlock now records that mounting — not the
  registry — is what remains.
