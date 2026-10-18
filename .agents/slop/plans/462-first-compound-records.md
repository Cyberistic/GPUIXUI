# 462 — The first compound records: Tabs and Toasts adopt the `stateful` contract

**Phase:** F · **Owner:** docs-site · **Status:** planned
**Depends on:** 411 (page template), 414 (copyable source), 427 (compound contract, Parts A–C), 425/461 (the delivered Tier 2 pages), 455–458 (previews)

## 1. Why this plan exists

Plan `427` added `parts`, `pattern` and `persistence` to the component record,
`stateful`/`workspace` section lists to the page template, and three guards
(`registry.test.ts`, `component-pages.test.ts`, `content-references.test.ts`).
Every one of those guards is exercised **only by fixtures**: no real record
declares a part or a non-static pattern, and
`registry.test.ts` contains a migration guard that *forbids* any record from
doing so ("leaves the new fields at their defaults on every existing record").
The contract has therefore never proven itself against a shipped component, and
the guards that matter are one line away from being decorative.

Two delivered components are genuinely compound and their pages already show the
gap:

- **Tabs** (`packages/components/src/tabs.tsx`) exports `Tabs`, `TabsList`,
  `TabsTrigger` and `TabsContent`. Its page documents selection, focus and
  controlled state inside `## States`, but never states which of those the
  component owns and which the consumer owns — the exact question a compound
  API raises.
- **Toasts / notifications** (`packages/components/src/toast/…`) is a provider,
  a store and a viewport. Its page describes the `SubscriptionRef` queue and the
  `FiberMap` timers, but its `## Source` includes **only** `provider.tsx`; a
  reader cannot see the viewport the same page tells them to render. The
  `parts` contract exists to catch exactly this and is currently not applied.

Plan `427`'s Tier 3–4 pages stay blocked (`packages/data-grid` and
`packages/docking` do not exist; STOP condition §9 of that plan). This plan does
**not** create placeholder Tier 3–4 records. It makes the existing contract real
on the delivered inventory, which is the only unblocked half of 427.

## 2. What changes (exact files)

| File | Change |
| ---- | ------ |
| `apps/docs/src/component-meta/entries.ts` | `tabs`: `pattern: "stateful"`, `parts` = the four exported parts, all in `packages/components/src/tabs.tsx`. `toast`: `pattern: "stateful"`, `parts` = `ToastProvider` (`toast/provider.tsx`) and `ToastViewport` (`toast/viewport.tsx`). |
| `apps/docs/content/docs/components/tabs.mdx` | Add `## State and ownership` directly after `## Composition`. |
| `apps/docs/content/docs/components/toast.mdx` | Add `## State and ownership` directly after `## Composition`; add a second `<include>` for `packages/components/src/toast/viewport.tsx` in `## Source`. |
| `apps/docs/src/component-meta/registry.test.ts` | Replace the migration guard "leaves the new fields at their defaults on every existing record" with "lists the records that opted into the compound contract" (`["tabs", "toast"]`). The next test, `holds every real record to the compound contract`, already validates defaults **and** opt-ins, so the old guard is the only thing that would reject the change. |
| `apps/docs/README.md` | One sentence under "Adding a component page" naming Tabs and Toasts as the shipped worked examples of a compound record. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `.agents/slop/plans/427-phase-d-docs-and-patterns.md` | §11 gets a bullet: the first two real records prove Parts A–C; Tier 3–4 pages remain blocked. |
| `TODO.md` | Tick a new docs-site row for the compound records; keep the 427 row `[~]` with its note updated; bump the section's progress bar. |

## 3. Exact record edits

In `tabs`' `delivered(...)` options, after `api`:

```ts
pattern: "stateful",
parts: [
  { name: "Tabs", sourcePath: "packages/components/src/tabs.tsx" },
  { name: "TabsList", sourcePath: "packages/components/src/tabs.tsx" },
  { name: "TabsTrigger", sourcePath: "packages/components/src/tabs.tsx" },
  { name: "TabsContent", sourcePath: "packages/components/src/tabs.tsx" },
],
```

In `toast`' options:

```ts
pattern: "stateful",
parts: [
  { name: "ToastProvider", sourcePath: "packages/components/src/toast/provider.tsx" },
  { name: "ToastViewport", sourcePath: "packages/components/src/toast/viewport.tsx" },
],
```

`ToastProvider` and `ToastViewport` are real exports of `@gpuixui/components`
(checked by `registry.test.ts`'s `isExported`); `useToast` is a hook, not a
sub-component, and is deliberately **not** a part.

## 4. Exact page edits

`tabs.mdx`, between `## Composition` and `## API reference`:

```mdx
## State and ownership

`Tabs` owns the uncontrolled selection, the register of triggers and the roving
tab stop; it moves native focus to the trigger it activates. `TabsContent`
unmounts while another tab is selected, so a hidden panel keeps no state. The
consumer owns the controlled value and the panel content: pass `value` +
`onValueChange` and render the panels from the new value. With
`activation="manual"`, focus and selection are separate — the focused trigger is
not selected until Enter or Space.
```

`toast.mdx`, between `## Composition` and `## API reference`:

```mdx
## State and ownership

`ToastProvider` owns the Effect runtime, the store and the auto-dismiss timers;
`ToastViewport` only paints the queue. A provider is not a singleton — two
providers are two stores — so mount one above everything that pushes and render
the viewport last. The consumer owns the push decision and any action handler it
attaches; a toast never navigates or calls the network itself.
```

`toast.mdx` `## Source`, after the existing provider include:

```mdx
<include lang="tsx" meta='title="packages/components/src/toast/viewport.tsx"'>
  ../../../../../packages/components/src/toast/viewport.tsx
</include>
```

Both prose blocks are claims about the real source: `useControllableState` +
`active`/`selected` in `tabs.tsx`, and `ManagedRuntime`/`ToastStore` in
`toast/provider.tsx`. Re-read those files before polishing the wording; if a
claim does not match the source, correct the prose (never the source).

## 5. Test plan

No new test file: the contract guards already exist, and this plan is the first
time they see real data. Every guard below is run and then proven in **both**
directions by a temporary edit that is reverted.

| Guard | Command | Fails when |
| ----- | ------- | ---------- |
| `component-pages.test.ts` "gives every finished component's page the template's blocks and sections" | `nub run --filter docs test` | a `stateful` page lacks `## State and ownership` |
| `registry.test.ts` "holds every real record to the compound contract" | same | a part name is not a package export |
| `registry.test.ts` "lists the records that opted into the compound contract" | same | a record silently gains/loses `parts` or a non-static pattern |
| `content-references.test.ts` "shows every compound part's real source" | same | the Toast page includes `provider.tsx` but not `viewport.tsx` |
| `content-references.test.ts` "declares in the registry exactly the props types a page generates" | same | a page/registry API mismatch (unchanged by this plan; run to prove nothing drifted) |

Two-direction proofs to record in §9:

1. Delete `## State and ownership` from `tabs.mdx` → `component-pages.test.ts`
   fails with `tabs: missing section "State and ownership"`; restore → green.
2. Delete the `viewport.tsx` include from `toast.mdx` → `content-references`
   fails with `ToastViewport (packages/components/src/toast/viewport.tsx) is not
   included`; restore → green.
3. Remove `parts` from the `toast` record (leave `pattern: "stateful"`) → the
   opt-in list test fails with `["tabs"]` instead of `["tabs", "toast"]`;
   restore → green.

## 6. Commands and expected results

```sh
nub run --filter docs test          # 41 files, 255+ tests, exit 0
nub run --filter docs check-types   # exit 0
nub run --filter docs build         # exit 0
nub run check                       # test-quality + lint + format + types, exit 0
nub run lint                        # exit 0
nub run test                        # workspace tests, exit 0
```

After `build`, start it and fetch the two routes:

```sh
nub run --filter docs dev
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/docs/components/tabs
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/docs/components/toast
```

Both `200`; the Toast page's HTML contains `toast/viewport.tsx` in its source
block and Tabs' HTML contains the phrase "State and ownership".

## 7. STOP conditions

- A part name is **not** exported by `@gpuixui/components`: stop; do not add a
  part for an internal module (`store.ts`, `model.ts`, `internal/*`). Record the
  missing public export as a cross-team `TODO.md` row instead.
- The Toast page cannot include `viewport.tsx` because Fumadocs rejects the
  second include: stop and report; do not paste the source into the page.
- The only way to make a test pass is to loosen `missingPartSources`,
  `missingSections` or `registryViolations`: stop. Fix the record or the page.
- `packages/data-grid` / `packages/docking` appear mid-change: still do not add
  Tier 3–4 records here; that is plan 427's remaining scope, not this one.

## 8. Acceptance

- Tabs and Toasts are `pattern: "stateful"` with real, exported parts; both
  pages carry `## State and ownership` in the template's position.
- The Toast page shows the viewport source it tells the reader to render.
- The three fixtures-only guards now run against real records, and each has a
  recorded two-direction proof.
- `nub run --filter docs test`, `check-types`, `build`, `nub run check`,
  `nub run lint` and `nub run test` pass; `TODO.md`, the plan index, plan 427's
  progress note and the docs README are updated; the commits are pushed on
  `agent/docs-site`.

## 9. Progress (2026-10-18)

- **Landed.** `tabs` and `toast` are `stateful` with real parts; both pages
  carry `## State and ownership`; the Toast page includes `viewport.tsx`.
  `registry.test.ts`'s migration guard became "lists the records that opted into
  the compound contract" (`["tabs", "toast"]`); the opt-in list is the only
  place the set is named, and the contract itself is still checked by
  `registryViolations`.
- **Two-direction proofs**, all re-run on 2026-10-18 and reverted:
  - deleting `## State and ownership` from `tabs.mdx` → `component-pages.test.ts`
    failed with `tabs: missing section "State and ownership"`;
  - deleting the `viewport.tsx` include from `toast.mdx` →
    `content-references.test.ts` failed with
    `toast.mdx: ToastViewport (packages/components/src/toast/viewport.tsx) is not included`;
  - reverting the `toast` record to `pattern: "static"` **and** removing its
    `parts` made the opt-in list test fail with `["tabs"]`. Removing `parts`
    alone does not fail it, because the guard keys on the pattern too and a
    stateful record may legitimately have no separate parts.
- `nub run --filter docs test`: 41 files / 255 tests; `check-types`, `build`,
  `nub run check`, `nub run lint` and `nub run test` green. Routes: both pages
  return `200`; the served Toast page contains `toast/viewport.tsx` and the Tabs
  page contains `State and ownership`.
