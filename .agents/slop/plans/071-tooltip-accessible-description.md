# 071 — `Tooltip` content is invisible to assistive technology

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 accessibility) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `060`, `067` |
| Status | **done** |

Self-contained: §1 measurement, §2 the rule, §3 files, §4 tests, §5 STOP list,
§6 outcome.

---

## 1. The gap, measured

`Tooltip` is a themed wrapper over `@gpuix/react/tooltip`, which paints the tip
but sets no role on it and no association to its trigger. A native a11y dump of
the feedback example with the tip open (probe, 2026-10-17, `@gpuix/native@0.10.0`
built from source per ADR 0003) contains **no tooltip node at all**:

```json
[
  { "role": "Heading", "value": "Revenue", "level": 3 },
  { "role": "Status", "label": "Refreshing revenue" },
  { "role": "Label", "value": "Last updated 2 minutes ago" },
  { "role": "Window", "label": "GPUIX Test" }
]
```

The tip's text (`"Booked revenue, net of refunds."`) is painted on screen but
never reaches AccessKit: a screen-reader user cannot reach the explanation at
all, by hover or by keyboard focus. The trigger in that example is a bare
`div tabIndex={0}` with no role and no name, so it is absent too.

The runtime supports the fix. A probe with the roles attached produces:

```json
before hover:
[
  { "role": "Button", "label": "Revenue definition",
    "description": "Booked revenue, net of refunds." },
  { "role": "Window", "label": "GPUIX Test" }
]
after hover:
[
  { "role": "Button", "label": "Revenue definition",
    "description": "Booked revenue, net of refunds." },
  { "role": "Tooltip", "label": "Booked revenue, net of refunds." },
  { "role": "Window", "label": "GPUIX Test" }
]
```

Two facts make that work:

- `role_from_aria` maps `"tooltip"` → `Role::Tooltip`
  (`references/gpuix/packages/native/src/accessibility.rs:207`), and
  `TooltipContent` forwards host props.
- `HostProps` supports `aria-description`; AccessKit exposes it as the node's
  `description`, so the content is announced when the trigger takes focus, even
  while the tip is closed. There is still no `aria-describedby`.

## 2. The rule

- The tip always carries `role="tooltip"`; when its content is a **string** it
  also carries `aria-label` with that text, so the node has a name.
- When the content is a string, the same text becomes the trigger's
  **`aria-description`**, so assistive technology announces it on focus even
  before the tip opens.
- Non-string content is painted and exposed as a `role="tooltip"` node but gets
  no invented name — the same rule `Button`/`Toggle` follow for non-text
  children (plan `058`). A consumer that needs the description announced passes
  a string.
- This does not force semantics onto the trigger: the consumer still owns its
  role and name. A bare focusable `div` remains only focusable; the docs and the
  feedback example now give the trigger `role="img"` + `aria-label`.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/Tooltip.tsx` | derive `description` from a string content; `TooltipTrigger aria-description`; `TooltipContent role="tooltip"` + `aria-label` |
| `packages/primitives/src/components/Select.test.tsx` | two element-tree tests: string content reaches the trigger and the tip; non-string content stays unnamed |
| `packages/primitives/runtime/fields.runtime.test.tsx` | a runtime test: the trigger's a11y node carries the description while the tip is closed, and the open tip is a named `Tooltip` node |
| `packages/primitives/examples/feedback.example.tsx` | the info trigger gets `role="img"` + `aria-label` (a focusable, named image) |
| `packages/primitives/runtime/examples.runtime.test.tsx` | the feedback tooltip opens on **keyboard focus** and its description is present |
| `packages/primitives/docs/tooltip.mdx` | Usage, Accessibility, Limitations, Verification |
| `packages/primitives/README.md` | the `aria-labelledby` limitation table row gains the description channel |
| `COMPONENTS.md` | `Tooltips` row |
| `TODO.md` | add and tick the task |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Test plan and commands

Offline (element tree):

1. With `content: "A hint"`, the `TooltipTrigger` child carries
   `aria-description: "A hint"`, and the `TooltipContent` child carries
   `role: "tooltip"` and `aria-label: "A hint"`.
2. With a non-string content element, `aria-description` is absent and the
   content's `aria-label` is absent, but `role` is still `"tooltip"`.

Runtime:

3. Mount the wrapper with a focusable, named `div` trigger. Before any hover or
   focus, the trigger's a11y node exists with its label and
   `description: "A hint"`. After hovering the trigger, a `Tooltip` node named
   `"A hint"` exists. (The runtime node type is `Tooltip`; `roleFromAria` maps
   `tooltip` to it.)
4. The feedback example: `focusNext()` lands on the info trigger, its a11y node
   is an `Image` named `"About revenue"` with the description, and the `Tooltip`
   node appears — the example is now reachable by keyboard.

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
```

Expected after the change: offline **340** (338 + 2), runtime **167** (165 + 2).

**Two-direction proof:** remove the `aria-description`, the `role` and the
`aria-label` from the wrapper, run the offline and runtime suites, record the
exact failures, then restore. The non-string test fails too, because it also
asserts the `tooltip` role; only its "no invented name" half is a guard against
over-claiming.

## 5. STOP conditions

- Stop if `TooltipContent` drops the `role`/`aria-label` props (then the layer's
  own host element is the place to set them; report the tree instead of
  weakening the test).
- Stop if attaching `aria-description` to `TooltipTrigger` replaces the child's
  own props or changes hover/focus behaviour; report the measured diff.
- Stop if the runtime dump shows the description only after the tip has opened
  (that would mean the fix is not actually an association; record it).
- Stop if `nub run check` cannot stay green.

## 6. Outcome

Executed on this host, 2026-10-17 (locally built `@gpuix/native@0.10.0`,
ADR 0003).

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test` | **340 green** (29 files) |
| `nub run --filter @gpuixui/primitives test:runtime` | **167 green** (15 files) |
| a11y before hover | `Image` "About revenue" with `description` "Booked revenue, net of refunds." |
| a11y with the tip open | `Tooltip` "Booked revenue, net of refunds." |
| feedback example by keyboard | `focusNext()` reaches the trigger; the tip opens |

**Two-direction proof:** with the three props removed, offline **338 passed /
2 failed** — both Tooltip tests (`expected undefined to be "A hint"`; the tip's
`role` was undefined) — and runtime **165 passed / 2 failed** — the wrapper test
(`expected undefined to be 'A hint'`) and the feedback example test. Restored:
**340 offline / 167 runtime green**.
