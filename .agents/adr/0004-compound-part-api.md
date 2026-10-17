# 0004 — The public component API follows base-gpui's compound-part contract

- Status: accepted
- Date: 2026-10-17
- Deciders: components workstream
- Related: plan `200`, `docs/component-api.md`; `LICENSES/base-gpui.md`

## Context

GPUixUI has twenty-odd Tier 2 components and a growing set of Tier 1
primitives. Without one API convention every component invents its own shape:
some take a `title` prop, some export `Header`/`Title` parts, some take a config
object. `base-gpui` is a Rust port of Base UI and therefore already speaks the
React idiom — compound parts, `value`/`default_value`/`on_value_change` — and its
37 component guides publish the exact part names and keyboard rules. It is MIT,
so its design may be adopted with attribution; its Rust source is not copied.

The published GPUix runtime (0.10.0) is the constraint: no `aria-checked`,
`aria-valuenow`, `aria-labelledby`, `aria-describedby`, `outline*`, transform
animation or CSS. The contract may only use the verified subset recorded in plan
`020`.

## Decision

Every Tier 1–2 component exposes **compound parts** when it has more than one
styled region: one exported component and props type per part, root first
(`Tabs` > `TabsList` > `TabsTrigger` > `TabsContent`). A single-region
component exports one part (`Badge`, `Avatar`). The controlled/uncontrolled
rule uses `value`/`defaultValue`/`onValueChange` and lives in one hook
(`useControllableState`). Styling is state-aware through a `style` prop or a
`children(state)` render prop, never DOM attributes or CSS. Accessibility uses
only the roles and ARIA properties GPUix 0.10.0 accepts; the gaps are recorded as
limitations. `docs/component-api.md` is the contract and the parts index.

## Consequences

Easier: a consumer can predict any component's shape, docs pages share one
anatomy section, and a part can be restyled or composed without a wrapper prop.
Harder: a small component pays for a parts table even when it has one part, and
landed monolithic components (Alert, Pagination, SearchInput, Combobox,
DatePicker, TimePicker, CommandMenu) need a migration follow-up. Impossible: a
component that hides an interactive region behind a boolean prop, or a second
controlled/uncontrolled implementation.
