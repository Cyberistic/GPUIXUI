# 779 — An accordion section's body is a named region

**Status:** done 2026-10-20 — 4 accordion native cases (3 red at `HEAD`) + 1
collapsible characterisation case, unit 504 in 47 files, full native suite 983
passed / 22 failed of 1005 (the baseline's 20 plan-540 classes plus two known
50 ms sampler flakes, both green in their own suites on rerun),
`check`/`lint`/`test` exit 0. **Workstream:** components. **Number claim:** `779`
is the first free number across every worktree (components last took `776`,
playground `777`, tokens-theme `777`/`778`); recorded in `PLAN.md` D30.

## 1. Why

Measured on 2026-10-20 in this worktree, against the installed
`@gpuix/react`/`@gpuix/native` 0.10.0 binding, with a scratch behaviour test that
mounted:

```tsx
<Accordion type="multiple" defaultValue={["one"]}>
  <AccordionItem value="one">
    <AccordionTrigger testId="t1">First question</AccordionTrigger>
    <AccordionContent testId="c1"><text>First body</text></AccordionContent>
  </AccordionItem>
  <AccordionItem value="two">
    <AccordionTrigger testId="t2">Second question</AccordionTrigger>
    <AccordionContent testId="c2"><text>Second body</text></AccordionContent>
  </AccordionItem>
</Accordion>
```

`a11yNodes` reported exactly:

| role | name | expanded |
| ---- | ---- | -------- |
| `button` | `First question` | `true` |
| `label` | `First body` | — |
| `button` | `Second question` | `false` |
| `label` | `Second body` | — |

Two findings:

1. **No node describes the relationship between a header and its body.** The
   header says it is expanded, but the body is a loose `label`. With
   `type="multiple"` and several sections open, a screen-reader user reading the
   body cannot tell which section it belongs to, and cannot jump to a section.
   The WAI-ARIA accordion pattern gives each panel `role="region"` named by its
   header; 0.10.0 has no `aria-labelledby`, but `role` and `aria-label` **are**
   supported (measured: adding both to `AccordionContent` produced
   `{"role":"region","name":"First question"}`).
2. The **closed** body's text still appears in the headless dump. A control
   with `visibility: hidden` is reported too (measured separately: a
   visibility-hidden `role="button"` still appears), so the dump does not filter
   hidden nodes. `docs/accordion.mdx` currently claims a closed body leaves "the
   accessible tree"; that is not provable here — it does leave the **tab order**
   (plan 372 measured that) and the visible tree. Correct the sentence instead of
   implying an accessible-tree guarantee the harness cannot verify.

The runtime has no `aria-controls` and no `aria-labelledby`, so the name is the
only supported association channel. `NavigationMenuContent` already borrows its
trigger's visible label this way (plan 724); this is the same rule for an
accordion panel, from the trigger **name** the header already computes
(`controlName`, plan 391).

## 2. Files

| File | Change |
| ---- | ------ |
| `packages/components/src/accordion.tsx` | carry the header's plain-text name on the item context; name the open body `role="region"` |
| `packages/components/src/behaviour/accordion.test.tsx` | 4 native cases (below) |
| `packages/components/src/collapsible.tsx` | the same measured limit in `collapsibleMeta.limitations` |
| `packages/components/src/behaviour/collapsible.test.tsx` | 1 characterisation case for the documented hidden-dump limit |
| `packages/components/docs/accordion.mdx` | anatomy/API/accessibility truth + verification count |
| `packages/components/docs/collapsible.mdx` | the corrected hidden-body claim + verification count |
| `COMPONENTS.md` | Accordions and Collapsible sections rows: the region, and no accessible-tree overclaim |
| `TODO.md` | tick the task with the measured totals |
| `PLAN.md` | D30 number-claim note |
| `.agents/slop/plans/README.md` | index row |

`src/inventory.ts` needs no edit: `accordionMeta` is read from the module. Add
the hidden-dump limitation to `accordionMeta.limitations` (the inventory check
holds the pages to the records, not the reverse).

## 3. Implementation

### 3.1 `AccordionItemContextValue`

Add two fields:

```ts
readonly name: Option.Option<string>;
readonly setName: (name: string | undefined) => void;
```

`AccordionItem` owns `const [name, setName] = useState<Option.Option<string>>(
Option.none())` and includes both in the memoised context value (deps:
`disabled`, `name`, `trigger`, `value`; `setName` is stable).

### 3.2 `AccordionTrigger`

It already computes `const name = controlName(rest["aria-label"], children)`.
Record it on the item without moving the row:

```ts
const { value, disabled, trigger, setName } = useAccordionItemContext();
useLayoutEffect(() => {
  setName(name);
}, [name, setName]);
```

This is a state update, so a renamed header re-renders the body; it must **not**
call `registerTrigger`/`updateTrigger`, whose job is the arrow order.

### 3.3 `AccordionContent`

```ts
const { value, trigger, name } = useAccordionItemContext();
const open = isOpen(value);
const label = Option.getOrUndefined(
  Option.firstSomeOf([
    pipe(
      Option.fromNullishOr(rest["aria-label"]),
      Option.map(Str.trim),
      Option.filter(Str.isNonEmpty),
    ),
    name,
  ]),
);
const named = open && rest.role === undefined && label !== undefined;
```

Pass `open` to `Reveal` as today, and after `{...rest}` spread
`{...(named ? { role: "region", "aria-label": label } : {})}`. Rules:

- **caller first:** an authored `aria-label` wins, trimmed; an authored `role`
  is never overwritten (passing `role="group"` opts out);
- **open only:** a closed body is hidden, and the dump does not filter hidden
  nodes, so the role rides the revealed panel;
- **never invent a name:** a composed or icon-only header without `aria-label`
  yields no region (the trigger itself is already documented as needing a name).

Import `* as Str from "effect/String"`; `pipe` is already imported.

## 4. Tests (native, `src/behaviour/accordion.test.tsx`)

Import `nodesWithRole` from `../internal/a11y.js`.

1. **`names the open section's body with its header`** — render the existing
   `Faq` (section `one` open by default, `three` disabled). Expect exactly one
   `region`, named `What is GPUix?`. At `HEAD`: zero regions.
2. **`the caller's label names the body`** — one open item whose content carries
   `aria-label="Delivery details"`. Expect the single region named
   `Delivery details`. Fails at `HEAD` (no region); removing the caller-first
   branch in §3.3 also fails it (the region would be named by the header).
3. **`a renamed header renames the body in place`** — a small stateful fixture:
   a `role="button"` control flips the header text `Before` → `After`; press it
   through `clickCentreOf` (or the existing click helper used by the suite) and
   expect one region named `After` (not two, not `Before`). Fails at `HEAD`; also
   fails if the name is registered as a second row instead of updated.
4. **`a composed header with no name yields no region`** — an open section whose
   trigger child is an `Icon` and which has no `aria-label`: expect zero
   `region` nodes. This is the pin against inventing a name; it passes both ways
   by design.

Run:

```sh
cd packages/components
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/accordion.test.tsx
```

Expected: `30` tests and `Test Files 1 passed`. Current HEAD is 26 tests for this
file in the index; adjust the documented count to the number the run prints, and
update `docs/accordion.mdx`'s "26 tests" sentence to match.

Before the fix, run the four cases alone (`-t` filter or temporarily) and record
that cases 1–3 fail and case 4 passes. Do not claim both-direction proof
otherwise.

### 4b. Collapsible: the same limit, recorded

`docs/collapsible.mdx` repeats the accordion page's old "leaves the accessible
tree" claim. Correct it to the measured statement (out of the tab order; the
headless dump still lists the hidden node) and add one characterisation case to
`src/behaviour/collapsible.test.tsx`:

```tsx
it("records that the accessibility dump still lists a hidden body", () => {
  const section = renderComponent(<Advanced />);
  section.renderer.clockPause();
  settle(section);
  expect(isHidden(section, "content")).toBe(true);
  expect(
    Arr.some(a11yNodes(section.renderer), (node) => node.name === "Retry budget"),
  ).toBe(true);
  section.renderer.clockResume();
  section.unmount();
});
```

`Advanced` is the existing closed-by-default fixture (`Retry budget` is its
body). The case fails if the binding starts filtering hidden nodes — the signal
to tighten the page again. Add the same sentence to `collapsibleMeta`, update the
page's `18 tests` line and the `COMPONENTS.md` Collapsible count.

## 5. Docs, inventory and bookkeeping

- `docs/accordion.mdx`
  - Anatomy row for `AccordionContent`: "`div`, `role="region"` while open and
    named by its header".
  - Accessibility bullets: the region rule, caller-label precedence, the
    composed-header no-region case, and the corrected hidden-body sentence
    (leaves the tab order; the headless dump still lists hidden nodes, so its
    removal from the accessible tree is not verifiable here).
  - API table row: `AccordionContent` — note `role`/`aria-label`, plus the
    existing `animate`.
  - Verification section: the new count and a sentence for the four cases.
- `accordionMeta.limitations`: add "a closed body is out of the tab order but the
  headless accessibility dump still lists its text (hidden nodes are reported),
  so accessible-tree removal is unverified".
- `COMPONENTS.md` Accordions row: add the region sentence (open body is a named
  region; caller label wins; no region without a header name) and keep the
  hidden-body wording to the tab order.
- `inventory.test.ts` holds docs to records; no new check is needed unless the
  limitations text drifts.

## 6. Gates

```sh
nub run check
nub run lint
nub run test
```

Expected: all exit `0`. Unit tests are unaffected; record the printed count.

Do **not** run the full live suite (merge gate). If a full native run is taken,
it must be `--only` free; use `nub run --filter @gpuixui/components
test:behaviour` and compare against the recorded baseline (20 failures, all the
plan-540 binding classes). A new failure outside those classes is a STOP.

## 7. STOP conditions

Stop and report rather than improvise if:

- `role="region"` does not appear in `a11yNodes` (the binding changed), or the
  caller's `role` cannot be preserved through `Reveal`;
- a rename requires a second registry row (do not change `registerTrigger`'s
  contract for this);
- the four cases cannot be made to fail at `HEAD` (except the deliberate pin);
- `check`/`lint`/`test` disagree with the counts recorded here after one rerun;
- another writer touches `packages/components` while this runs (B3): commit
  what is green, record the measurement, and stop.

## 8. Acceptance

- An open accordion body is one `region` named by its header; a caller
  `aria-label` wins; a renamed header updates the name without duplicating the
  region; a nameless composed header yields no region.
- 4 native cases, three proven to fail at `HEAD`.
- The docs, inventory record, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the
  plan index agree with the code.
- `check`, `lint`, `test` exit 0; commit on `agent/components` and push.
