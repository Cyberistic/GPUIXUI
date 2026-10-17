# 432 — Native coverage is not the absence of a capture (preview tier V)

**Phase:** F (docs truth) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 412 (preview tiers), 411 (registry), 425/428 (delivered pages),
components 117 (inventory), primitives 041/047 (runtime suites)
**Blocks:** nothing — this is a truth fix, not new surface area.

## 1. The bug

Every delivered component page renders:

> Not verified in the GPUix runtime — no native preview has been captured yet.

That sentence is false for all 42 pages. The components are covered by real GPUix
suites:

- Tier 1: `packages/primitives/runtime/*.runtime.test.tsx` (63 tests, plans
  041/047/048) mount every primitive in the real `TestRenderer`.
- Tier 2: `packages/components/src/behaviour/*.test.tsx` (plan 117) mount every
  component in the real renderer.

What is actually missing is a **capture**, not verification. Plan 412's tier X
conflated the two: it is defined as "source + limitation notice", and the only
`unavailable` renderer hard-codes "Not verified". A reader therefore concludes
the component has never run, contradicts `COMPONENTS.md`, and discounts the
runtime evidence the page itself cites.

`playgroundScreen` is `null` on every record (the playground has capability
scenarios, not per-component screens), and no screenshot has been captured, so
tier X is what every page currently reaches. That will stay true for as long as
the playground has no per-component screen — so the honest fix is a tier that
states the coverage that exists.

## 2. Decision

Add **tier V — native coverage by an automated suite** to plan 412's ladder,
between tier N and tier X:

| Order | Tier | What the page shows |
| ----- | ---- | ------------------- |
| 1 | S | the real capture + its provenance caption |
| 2 | N | `Run it natively: nub run dev:playground → <screen>` |
| 3 | **V** | **`Native coverage: <suite> drives this component in the real GPUix renderer. Run <command>. No capture is published for this page yet.`** |
| 4 | X | `Not verified in the GPUix runtime — <reason>` (planned/unsupported only) |

Tier V never claims a pass. It names the suite file, the exact command, and the
fact that no image is published. The component's `status` in `<ComponentState>`
(which mirrors `COMPONENTS.md`) remains the only place that says how far it got.

## 3. Data model

`apps/docs/src/component-meta/schema.ts` gains one nullable field:

```ts
/** The automated suite that drives this component in the real GPUix renderer. */
export class RuntimeCoverage extends Schema.Class<RuntimeCoverage>("RuntimeCoverage")({
  /** The exact command a reader runs. Derived from the suite's package. */
  command: Schema.NonEmptyString,
  /** Repo-relative path to the suite file. */
  testFile: Schema.NonEmptyString,
}) {}

// on ComponentMeta:
runtime: Schema.OptionFromNullOr(RuntimeCoverage),
```

`entries.ts`:

- `planned()` supplies `runtime: null`.
- `DeliveredOptions` requires `runtime: { command, testFile }`.
- a local factory keeps each record to one line:

```ts
const runtime = (
  packageName: "@gpuixui/primitives" | "@gpuixui/components",
  testFile: string,
) => ({
  command: `nub run --filter ${packageName} ${
    packageName === "@gpuixui/primitives" ? "test:runtime" : "test:behaviour"
  }`,
  testFile,
});
```

Populate all 42 delivered records (the suite that drives each component; the
first one that does when several do):

| Record | Suite |
| ------ | ----- |
| text, separator, spacer, stack, box, scroll-area, label | `packages/primitives/runtime/layout.runtime.test.tsx` |
| icon | `packages/primitives/runtime/icons.runtime.test.tsx` |
| button, button-group, checkbox, radio-group, switch | `packages/primitives/runtime/controls.runtime.test.tsx` |
| text-input, text-area, select, tooltip | `packages/primitives/runtime/fields.runtime.test.tsx` |
| progress, skeleton, spinner | `packages/primitives/runtime/loading.runtime.test.tsx` |
| all 22 Tier 2 records | `packages/components/src/behaviour/<testFile from the component module>` — `field.test.tsx` for `inline-validation`, `toast.test.tsx` for `toast` |

## 4. Rendering

`apps/docs/src/components/preview/runtime-coverage.tsx` (new):

```tsx
export function RuntimeCoverage({ testFile, command }: RuntimeCoverage) {
  return (
    <p data-preview-tier="runtime" className="…">
      Native coverage: <code>{testFile}</code> drives this component in the real
      GPUix renderer. Run <code>{command}</code>. No capture is published for
      this page yet.
    </p>
  );
}
```

`select-preview.ts` — new variant and order:

```ts
| { readonly tier: "runtime"; readonly command: string; readonly testFile: string }
```

after the playground branch and before `unavailable`.

`native-preview.tsx` renders `<RuntimeCoverage />` for it.

`preview-unavailable.tsx` stays the tier-X renderer, but its reason is now only
reached by a record with no suite, no screen and no capture (planned records).

## 5. Guard

`apps/docs/src/component-meta/native-coverage.test.ts` (new):

1. **Every delivered record declares a suite; no planned record does.**
2. **The file exists** and ends in `.test.tsx`.
3. **The command is real**: read the `package.json` nearest the suite file, take
   `test:runtime` when defined else `test:behaviour`, and require the record's
   `command` to equal `nub run --filter <package name> <script>`.
4. **The suite drives this component**:
   - Tier 1: the suite imports a relative module whose basename is the record's
     source basename (`Text.tsx` → `../src/components/Text.js`), or imports the
     record's `packageName` (the icon suite imports `@gpuixui/icons`).
   - Tier 2: the suite file's basename equals the component source's basename or
     the source's parent directory (`field.tsx` → `field.test.tsx`,
     `toast/provider.tsx` → `toast.test.tsx`).
5. **Tier selection is stable**: `selectPreview` with the real Button record
   returns `runtime` (not `unavailable`).

`preview.test.tsx` gains the label rules:

- runtime is chosen when there is no capture and no playground screen;
- a screenshot outranks runtime, and a playground screen outranks runtime;
- `<NativePreview slug="button" />` names `controls.runtime.test.tsx` and its
  command, and does **not** contain "Not verified";
- a planned record with no suite still renders the tier-X notice.

## 6. Docs

`docs/preview-strategy.md`:

- "The four honest tiers" → five, with tier V and its exact label;
- the tier-selection paragraph names the order S → N → V → X;
- "What is explicitly not claimed" keeps "that an unverified component works"
  and adds "that native coverage is a capture: tier V names the suite and the
  command, and says no image is published".

No component page changes: `<NativePreview>` is the single decision point.

## 7. Two-direction proofs (record the output in §10)

| Removal | Expected failure |
| ------- | ---------------- |
| Delete `runtime` from the `button` record | `native-coverage.test.ts` — delivered record without a suite; `preview.test.tsx` — Button renders "Not verified" |
| Point `button` at `loading.runtime.test.tsx` | `native-coverage.test.ts` — suite does not import `Button` |
| Change Button's command to `test:behaviour` | `native-coverage.test.ts` — command differs from the package script |
| Drop the runtime branch from `selectPreview` | `preview.test.tsx` — expected `runtime`, got `unavailable` |

## 8. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass; the new coverage suite included; report the count |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run check` / `nub run lint` / `nub run fmt` | exit 0 |
| `nub run --filter docs dev`, then `curl -s localhost:<port>/docs/components/button` | 200, and the page contains "Native coverage" and the real command |

## 9. STOP conditions

- A delivered record has **no** native suite: stop and record it in `TODO.md` as
  a packages task; do not invent coverage and do not silently leave tier X (that
  is the bug). The record must move to `planned` or the suite must land.
- The suite's package defines neither `test:runtime` nor `test:behaviour`: stop;
  the command contract is wrong, not the data.
- A suite exists but does not import the component: stop and correct the mapping
  by hand; do not widen the check to accept it.
- Removing the tier-X fallback would leave a planned record with no honest
  preview: keep the fallback and its test.

## 10. Progress (2026-10-17)

Implemented and measured.

- **Schema + data:** `RuntimeCoverage` on `ComponentMeta`; every one of the 42
  delivered records declares its real suite through `nativeSuite(...)`. No
  planned record declares one.
- **Rendering:** `runtime-coverage.tsx` renders tier V; `selectPreview` orders
  S → N → V → X; `<NativePreview>` is unchanged as the single decision point.
- **Guard:** `native-coverage.test.ts` proves the suite exists, that the
  printed command is the script in the suite's own `package.json`, and that the
  suite imports the component (relative import for primitives, suite-name
  convention for components, package import for `@gpuixui/icons`).
- **Commands:** `nub run --filter docs test` → 27 files, **164 tests pass**
  (was 26/157); `check-types`, `build`, `nub run check`, `nub run lint`,
  `nub run test` all green.
- **Dev route:** `/docs/components/button` → 200, containing "Native coverage"
  and `packages/primitives/runtime/controls.runtime.test.tsx`;
  `/docs/components/card` → 200 with
  `packages/components/src/behaviour/card.test.tsx`.
- **Two directions proven:**
  1. removing Button's `runtime` → 4 failures (`decodes every entry`,
     `without a native suite`, `names a suite…`, and the preview test);
  2. pointing Button at `loading.runtime.test.tsx` → 2 failures including
     `button: … does not import it`;
  3. giving Button a `test:behaviour` command → 2 failures including
     `expected "… test:runtime", found "… test:behaviour"`;
  4. dropping the runtime branch from `selectPreview` → 2 failures
     (`expected tier 'runtime', got 'unavailable'`).
  Each was reverted and the suite returned to 164/164.
