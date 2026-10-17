# 311 — Timeline: an event rail

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `205` §4 (C2), `111` |
| Status | done — 6 native tests; both-direction proof |
| Source | `docs/component-api.md` §8 (planned parts: `Timeline`, `TimelineItem`); `COMPONENTS.md` → Tier 2 → Timeline; plan `205` C2 |

This plan is self-contained. It adds `Timeline` at the Tier 2 bar.

---

## 1. Why

A list of events with times needs a rail, dots and a status; `List` is a
selection surface and `Stepper` is a workflow indicator. A timeline is
display-only history, so it neither selects nor derives status from an index:
events are not evenly spaced steps.

`COMPONENTS.md` gives the row `div` + `<text>`; the rail is two `div`s per item
(dot + connector). The runtime has no pseudo-elements, so the connector is an
explicit element and the root marks the last item through context.

## 2. The target API

```tsx
<Timeline label="Deploy history">
  <TimelineItem title="Build started" timestamp="09:41" status="complete" />
  <TimelineItem
    title="Tests passed"
    description="412 tests, 0 failures"
    timestamp="09:44"
    status="current"
  />
  <TimelineItem title="Deploy" timestamp="—" status="upcoming" />
</Timeline>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `Timeline` | `role="list"`, the name, the per-item position (last or not) | `label?`, children |
| `TimelineItem` | one `role="listitem"`: timestamp, dot, connector, title and optional description | `title` (required), `description?`, `timestamp?`, `status?` (default `"complete"`), `style?: StateStyle<TimelineItemState>` |

`TimelineItemState` is `{ readonly status: TimelineStatus; readonly last: boolean }`.

- **Status is passed, not derived.** A timeline has no current index to derive
  from; the workflow that knows the events marks them. Default `"complete"`.
- **The last item has no connector.** `Timeline` wraps each direct child in a
  context carrying `last` — computed from `Children.toArray`, exactly one item
  per child (a fragment is one child, so its items would all get the same flag;
  the docs say to pass items directly).
- **No interaction.** No click, no selection, no `aria-current` (0.10.0 has
  none); the current event is announced through colour only. Record it.

### Visual rules (tokens only)

| Status | Dot fill | Title colour | Connector |
| ------ | -------- | ------------ | --------- |
| `complete` | `foreground` | `foreground` | `border` |
| `current` | `primary` | `foreground` | `border` |
| `upcoming` | `muted` | `mutedForeground` | `border` |

Layout: a fixed 16px rail column (dot 8px, `radius.full`, centred) and a content
column with `spacing.md` gap; the connector is a 1px-wide `div` with
`flexGrow: 1` under the dot, `border` colour, so it reaches the next item's dot.
Timestamp: `caption` / `mutedForeground`, rendered above the title inside the
content column. Description: `body` / `mutedForeground`. Root gap: `spacing.lg`.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/timeline.tsx` | **create** — the two parts, the position context, `timelineMeta` |
| `packages/components/src/index.ts` | add `export * from "./timeline.js";` |
| `packages/components/src/inventory.ts` | import and list `timelineMeta` |
| `packages/components/src/behaviour/timeline.test.tsx` | **create** — 6 tests (§6) |
| `packages/components/examples/timeline.example.tsx` | **create** — a deploy history with three statuses |
| `packages/components/docs/timeline.mdx` | **create** |
| `docs/component-api.md` | move Timeline into the built table; source `plan 311` |
| `COMPONENTS.md` | row → `done` / `yes`, 6 native tests, limitations |
| `TODO.md` | tick the row |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour   # expected: Timeline 6
nub run --filter @gpuixui/components test             # expected: inventory pass
nub run check && nub run lint && nub run test         # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- the rail column's connector does not stretch (flex `alignSelf: "stretch"` is
  required; `height: "100%"` is not a supported value in 0.10.0) — record the
  measured style and use the stretch form;
- `role="list"`/`listitem` are dropped on nested rows — fall back to a labelled
  group and record;
- a status needs a distinct "error" dot colour — the row does not promise one;
  use the four tones only if the theme ships them, never a literal.

## 6. Test plan

`src/behaviour/timeline.test.tsx`, real renderer, both themes:

1. renders items in declaration order with timestamp, title and description;
2. the root reports `list` (named by `label`) and each item `listitem`;
3. dot fills follow the three statuses (`primary`, `foreground`, `muted`);
4. every item but the last draws a connector: the rail's child count is 2 for
   completed items and 1 for the last (children are read from `getElement`);
5. a consumer `style` on an item wins, and a style callback receives
   `{ status, last }`;
6. both themes: upcoming titles use `mutedForeground`, complete/current titles
   use `foreground`.

**Both directions.** Always draw the connector (ignore `last`): test 4 fails.
Swap `primary` and `muted` in the status palette: test 3 fails. Restore after
each.

## 7. Acceptance criteria

- Two parts with JSDoc and an exported `TimelineItemState`.
- Six native tests, both themes, no literal colours.
- Example, docs page, inventory row, `COMPONENTS.md` row and the contract agree.
- All gates green.

## 8. Result

Landed 2026-10-18:

- `src/timeline.tsx` — `Timeline` wraps each direct child in a provider whose
  `last` flag comes from scanning for the final `TimelineItem`, so the rail's
  connector is a real element that stops exactly once.
- `src/behaviour/timeline.test.tsx` — 6 tests. The rail is read by child
  position (`item → rail → dot/connector`), which is the only stable way to ask
  "does this row draw a connector?" without a testId per internal element.
- Example, docs page, inventory record, `COMPONENTS.md` row and the contract's
  §8 table updated.
- **Both directions:** dropping the `last` branch draws a connector after the
  final event (test 5 fails); swapping the `primary` and `muted` fills fails the
  status test. Restored after each: behaviour 344 green.
