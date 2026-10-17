# 200 — Adopt `base-gpui`'s compound-part API contract as the Tier 1–2 public API spec

| Field | Value |
| ----- | ----- |
| Phase | A (feasibility) → the spec every Tier 1–2 component plan consumes |
| Owner | components workstream (owns `packages/components`), with primitives for Tier 1 |
| Depends on | `020-gpuix-runtime-capability.md` (what GPUix actually supports), `030-primitives-package.md` (the Tier 1 package), plans `110–117` (the Tier 2 parts) |
| Status | in progress — claimed by the components workstream 2026-10-17 |
| Source | `references/base-gpui` (MIT, `Copyright (c) 2026 Luke Tandjung`), commit `64b2233`; `docs/components/*.md` (37 guides) and `docs/component-architecture.md` |

This plan is self-contained. It is a **translation** task: read `base-gpui`'s
published API guides and write down the contract in React terms. **No Rust is
copied, and no `src/**` is transcribed.** `base-gpui` is MIT; the obligation is
attribution for *design*, recorded in `LICENSES/`.

---

## 1. Why

`base-gpui` is a port of **Base UI** — a React headless library — to Rust. Its
public surface is React idiom by construction: part names, `value` /
`default_value` / `on_value_change`, per-part builder signatures and per-part
style-state structs. It is a reviewed API design we would otherwise invent, and
its 37 guides document every builder with an exact signature. Adopting it gives
the whole library one predictable shape before components proliferate.

## 2. The contract (the target API shape)

Write these rules into `docs/component-api.md`. They apply to every component in
Tiers 1–2; per-component part names come from plans `110–117` and the matching
`base-gpui` guide.

### 2.1 Compound parts

- A component is a **compound**, never a monolithic widget:
  `<Root><List><Item/></List><Panel/></Root>`.
- Every part is its own exported component with its own props type.
- Children are typed **by position**: a `Panel` inside a `List` is a compile
  error. In React this is a discriminated `children` type on the parent
  (`children: ReactNode` narrowed by a `Part` union) plus a dev-time check —
  not `React.Children` string matching.
- The root part is `Root`; the controlled-state prop lives on `Root` only.

### 2.2 Controlled / uncontrolled — one rule, one place

- `value` makes the part controlled; the selection changes **only** when the
  caller supplies a new value.
- `defaultValue` is the uncontrolled initial value. `value` and `defaultValue`
  are mutually exclusive — a component that gets both logs one
  `Effect.logWarning` and ignores `defaultValue`.
- `onValueChange(value)` fires on request; `onValueChange` is the only change
  callback name.
- The resolution lives in exactly one hook, and the repo already has it:
  `useControllableState` from `@gpuix/react/floating` (published in 0.10.0 —
  verified). Do not write a second one.

### 2.3 State-aware styling

`base-gpui` exposes `.style_with_state(|state, part| …)` with a public per-part
style-state struct. Translate it two ways and pick per component:

- the published `StateStyle<State> = StyleDesc | ((state: State) => StyleDesc)`
  from `@gpuix/react/floating` — use when the consumer styles through a prop; or
- a `children: (state: State) => ReactNode` render prop — use when the consumer
  composes markup.

The state object is **public API**: name it `<Part>State` and export the type.
State names come from `base-gpui`'s per-part structs (`active`, `disabled`,
`focused`, `highlighted`, `selected`, `orientation`). Never emulate this with DOM
data attributes or CSS variables — there are none.

### 2.4 Keyboard

- Keyboard behaviour is the shared contract in `packages/primitives/src/core/keyboard.ts`
  (plan `030`): Enter on key down, Space on key up, `defaultPrevented` respected,
  roving tabindex, Escape, Arrow movement.
- Every component's guide records its own keys, drawn from `base-gpui`'s
  `## Keyboard interaction` section.

### 2.5 Accessibility — the supported subset only

Map `base-gpui`'s AccessKit roles onto GPUix's **verified** subset
(`role`, `aria-label`, `aria-description`, `aria-id`, `aria-expanded`,
`aria-selected`, `aria-valuetext`, `aria-level`) — plan `020` §1.4. Never invent
`aria-checked`, `aria-valuenow`, `aria-labelledby` or `aria-describedby`; record
the gap as a limitation, exactly as `base-gpui` does for `aria-controls`.

### 2.6 Translation table

| `base-gpui` (Rust) | Our React |
| ------------------ | --------- |
| `TabsRoot > TabsList > TabsTab` | `Tabs.Root > Tabs.List > Tabs.Tab` |
| `.value(v)` / `.default_value(v)` | `value` / `defaultValue` |
| `.on_value_change(f)` | `onValueChange` |
| `.style_with_state(\|state, part\| …)` | `style` as `StateStyle<State>` **or** `children(state)` |
| `TabsTabStyleState { active, disabled, … }` | exported `TabsTabState` type |
| `actions.rs` + `.key_context(..)` + `.on_action(..)` | `tabIndex` + `onKeyDown` + `packages/primitives` keyboard contract |
| `base_gpui::init(cx)` | nothing — React/GPUix has no per-component init |

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `docs/component-api.md` | **create** — §2 above, plus a parts table per Tier 1–2 component copied from the matching `base-gpui` guide (`docs/components/*.md`) |
| `docs/README.md` | add `component-api.md` to the documents table (Phase A) |
| `PLAN.md` §4 | add a decision row: "public component API follows `base-gpui`'s compound-part contract, translated to React" |
| `LICENSES/base-gpui.md` | record MIT + `Copyright (c) 2026 Luke Tandjung` and "design reference only; no source copied" |
| `.agents/adr/0002-compound-part-api.md` | ADR accepting the contract (template in `.agents/adr/README.md`) |

Do **not** create component source in this plan. The per-component plans
(`110–117`, `030`) consume this contract.

## 4. Commands and expected results

```sh
test -f references/base-gpui/docs/component-architecture.md   # expected: exit 0
ls references/base-gpui/docs/components/*.md | wc -l          # expected: 37
grep -c "onValueChange\|defaultValue" docs/component-api.md   # expected: >= 2
grep -n "aria-checked\|aria-valuenow\|aria-labelledby" docs/component-api.md
# expected: matches only inside the "unsupported — do not invent" paragraph
nub run check                                                  # expected: exit 0
```

## 5. STOP conditions

Stop and report — do not improvise — if:

- a `base-gpui` guide documents a builder whose React equivalent needs a GPUix
  capability plan `020` says does not exist (no transform, no `aria-checked`, no
  colour animation, no `position: fixed`);
- the contract would require copying Rust source rather than reading the guide;
- `references/base-gpui` is missing or its `docs/components/*.md` count differs
  from 37 (the reference moved — re-read before writing);
- you cannot state a part's state names from the guide and would have to invent
  them.

## 6. Test plan

The deliverable is a document, so the test is a **contract test on the first
component that consumes it** (plan `111`), plus document gates:

- `docs/component-api.md` must contain the six §2 rules; a `grep` per rule is the
  check.
- The ADR and `PLAN.md` row must exist.
- **Able-to-fail check:** add a `docs/component-api.test.ts` that reads the file
  and asserts the translation table contains `onValueChange` and `defaultValue`;
  delete one row and the test fails. This is a documentation contract, so keep
  the test to the table's required rows, not prose.

## 7. Acceptance criteria

- `docs/component-api.md` exists, contains §2, and every claim in it is traceable
  to a `base-gpui` guide or to plan `020`.
- `LICENSES/base-gpui.md` records the MIT copyright line and "design reference
  only".
- `PLAN.md` §4 and the ADR record the decision.
- No component source was written and no Rust was copied.
