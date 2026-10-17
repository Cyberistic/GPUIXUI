# 160 — Plan: the accessibility tree in the real runtime

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | B (feasibility) → feeds every Tier 1–4 interactive component |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120`, `140` |
| Feeds | `@gpuixui/components` (Button, Checkbox, Switch, Slider, Tabs, List, virtualized grid/tree), docs accessibility pages |

## 1. Goal

`COMPONENTS.md` says AccessKit exposes `role`, `aria-label`, `aria-description`,
`aria-id`, `aria-expanded`, `aria-selected`, `aria-valuetext` and `aria-level`,
and that `aria-checked`, `aria-valuenow`, `aria-labelledby` and
`aria-describedby` do not exist. That list came from the published types, not
from a run. The `TestRenderer` can dump the accessibility tree
(`getA11yTree()`), so the claim is measurable — and the answers decide real
component design:

- can a custom **Checkbox** or **Switch** announce its state at all?
- does a button's **name** come from its text, or must every control set
  `aria-label`?
- does a **Slider** have a value?
- does the a11y tree follow the **painted window** of a `<virtual-list>`, or
  every retained row?
- what does `tabIndex` contribute, and what makes a `Click` action?

A `failed` verdict is a real outcome: the probe reports what the runtime does,
and the library documents the limitation instead of inventing a workaround.

## 2. What is documented, and what the scratch runs showed

The published `@gpuix/native@0.10.0` `HostProps` declares exactly:
`role`, `"aria-label"`, `"aria-description"`, `"aria-id"`, `"aria-expanded"`,
`"aria-selected"`, `"aria-valuetext"`, `"aria-level"`. There is **no**
`aria-checked`, `aria-valuenow`, `aria-valuemin`/`max`, `aria-labelledby` or
`aria-describedby` in the typed API.

`TestRenderer.getA11yTree()` returns a dump whose `nodes` are keyed by ephemeral
ids, each with an optional `aria` object. The published TypeScript type omits
the `frame` counters that the runtime actually prints, so the adapter must
decode unknown input rather than trust the type.

Four throwaway probes in `.agents/slop/scratch/` (not part of the build)
established, on this host:

| Input | Dump |
| ----- | ---- |
| `role="button"`, `aria-label="Save"`, `onClick` | `role: "Button"`, `label: "Save"`, `author_id`, `on_action: ["Click","Focus"]` |
| `role="button"`, text child `Save`, no `aria-label` | `role: "Button"` with **no label**; the text is a separate `Label` child |
| `role="checkbox"` + `aria-label` | `role: "CheckBox"`, label — **no checked state** (the prop is not even typed) |
| `role="switch"` + `aria-checked` (JS probe) | `role: "Switch"`, label — checked state dropped |
| `role="slider"`, `aria-valuetext="42%"`, `aria-valuenow` (JS) | `role: "Slider"`, `value: "42%"` — `valuenow` dropped |
| `role="heading"`, `aria-level={3}` | `role: "Heading"`, `level: 3` |
| `role="option"`, `aria-selected` | `role: "ListBoxOption"`, `selected: true` |
| `role="button"`, `aria-expanded={false}` | `expanded: false` preserved |
| `role="presentation"` | no node; the text child is still a `Label` |
| `<input value="hello" placeholder="type">` | `role: "TextInput"`, `value: "hello"`, `placeholder: "type"`, `on_action: ["Focus"]` |
| 50 `role="option"` rows in a 200 px `<virtual-list>` | **8** option nodes — the painted window, not all 50 |
| two `tabIndex={0}` plus one input | `frame.tab_stop_count: 2`+ |

The probe turns these into a permanent, failing test.

## 3. Scenario `a11y-tree` (capability `a11y`)

New view `apps/playground/src/scenarios/a11y.tsx`, one scenario. Every node has
an `aria-id` (`probe-*`) so the scenario addresses it by author id, never by the
ephemeral dump key. Colours from `useTheme`; the readout is the frame counters.

Tree, `testId` and expected dump:

| Element | Props | Expected |
| ------- | ----- | -------- |
| `a11y-button` | `role="button"`, `aria-id="probe-button"`, `aria-label="Save"`, `onClick` | Button, label Save, `Click` in actions |
| `a11y-unnamed` | `role="button"`, `aria-id="probe-unnamed"`, text child `Unnamed`, `onClick` | Button with **no label** |
| `a11y-checkbox` | `role="checkbox"`, `aria-id="probe-checkbox"`, `aria-label="Check"`, `tabIndex={0}` | CheckBox, label, no checked field |
| `a11y-switch` | `role="switch"`, `aria-id="probe-switch"`, `aria-label="Wifi"`, `aria-expanded={false}` | Switch, label, expanded false |
| `a11y-slider` | `role="slider"`, `aria-id="probe-slider"`, `aria-label="Volume"`, `aria-valuetext="42%"` | Slider, value `42%` |
| `a11y-heading` | `role="heading"`, `aria-id="probe-heading"`, `aria-level={3}` | Heading, level 3 |
| `a11y-option` | `role="option"`, `aria-id="probe-option"`, `aria-selected` | ListBoxOption, selected true |
| `a11y-collapsed` | `role="button"`, `aria-id="probe-collapsed"`, `aria-expanded={false}` | Button, expanded false |
| `a11y-decorative` | `role="presentation"`, `aria-id="probe-decorative"`, text `decorative` | **no node** for that author id |
| `a11y-input` | `<input value="hello" placeholder="type" />` | TextInput, value hello, placeholder type |
| `a11y-vlist` | 50 rows, each `role="option"` + `aria-id="vrow-<n>"`, in a 200 px `<virtual-list>` | row 0 present, row 49 absent, count `< 50` |

Readout `a11y-frame`: `` `nodes=${frame.node_count} tabStops=${frame.tab_stop_count}` ``.

Steps:

1. `nodes >= 10`; `tabStops` is at least 2 (two explicit `tabIndex={0}` plus the
   input if it is a tab stop — record the exact number).
2. `probe-button`: role `Button`, label `Save`, `on_action` contains `Click`.
3. `probe-unnamed`: role `Button`, **no label** — assert the option is `None`.
4. `probe-checkbox`: role `CheckBox`, label `Check`, and the node's `checked`
   state cannot be expressed (the schema has no field; the assertion is that
   the role node exists without one — the limitation is recorded in §8 and
   `COMPONENTS.md`, not faked).
5. `probe-switch`: role `Switch`, expanded `false`.
6. `probe-slider`: role `Slider`, value `42%`.
7. `probe-heading`: role `Heading`, level `3`.
8. `probe-option`: role `ListBoxOption`, selected `true`.
9. `probe-collapsed`: expanded `false` (false survives, it is not treated as
   absent).
10. `probe-decorative`: no node — `role="presentation"` produces none, and its
    text still appears as a `Label` (assert that the presentation author id is
    absent and the decorative text is painted).
11. `probe-input`: role `TextInput`, value `hello`, placeholder `type`.
12. `vrow-0` present, `vrow-49` absent, option count `< 50` — the a11y tree
    follows the **painted** window, so a virtualized grid must not rely on the
    tree for off-screen rows.

## 4. Exact file changes

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/160-native-a11y-tree.md` | this plan |
| `.agents/slop/plans/README.md` | index row for `160` |
| `packages/testing/src/smoke.ts` | `CAPABILITIES` gains `a11y`; `SmokeHost` gains `a11y: () => A11yTree \| null`; new `A11yNode` / `A11yFrame` / `A11yTree` schemas |
| `packages/testing/src/test-support.ts` | `nullHost.a11y` returns `null` |
| `apps/playground/src/smoke/host.ts` | decode `renderer.getA11yTree()` with `Schema.decodeUnknownOption(Smoke.A11yTree)` at the boundary |
| `apps/playground/src/scenarios/a11y.tsx` | the view + the scenario |
| `apps/playground/src/scenarios/index.ts` | register it; add `a11y` to `CORE_CAPABILITIES` |
| `apps/playground/src/smoke/run.test.ts` | registry test expects `a11y-tree` |
| `COMPONENTS.md` | the cross-cutting accessibility paragraph cites the runtime verdict; Checkbox/Switch/Slider rows record the missing state; capability table gains `a11y` |
| `TODO.md` | one task, ticked on landing |

The schema mirrors the runtime report (snake_case keys, as `BoxShadowSnapshot`
mirrors `boxShadow`), so nothing renames it between the runtime and a scenario:

```ts
export class A11yNode extends Schema.Class<A11yNode>("A11yNode")({
  author_id: Schema.OptionFromOptional(Schema.String),
  role: Schema.OptionFromOptional(Schema.String),
  label: Schema.OptionFromOptional(Schema.String),
  description: Schema.OptionFromOptional(Schema.String),
  value: Schema.OptionFromOptional(Schema.String),
  placeholder: Schema.OptionFromOptional(Schema.String),
  selected: Schema.OptionFromOptional(Schema.Boolean),
  expanded: Schema.OptionFromOptional(Schema.Boolean),
  level: Schema.OptionFromOptional(Schema.Number),
  on_action: Schema.OptionFromOptional(Schema.Array(Schema.String)),
}) {}

export class A11yFrame extends Schema.Class<A11yFrame>("A11yFrame")({
  node_count: Schema.Number,
  tab_stop_count: Schema.Number,
}) {}

export class A11yTree extends Schema.Class<A11yTree>("A11yTree")({
  frame: A11yFrame,
  nodes: Schema.Record(Schema.String, Schema.Struct({
    aria: Schema.OptionFromOptional(A11yNode),
  })),
}) {}
```

The scenario resolves a node with
`Arr.findFirstMap(Record.values(tree.nodes), (entry) => Option.filter(entry.aria, (aria) => Option.contains(aria.author_id, id)))`
and asserts on `Option.getOrElse(node.role, () => "none")`-style fields.

## 5. Commands and expected results

1. `nub run --filter @gpuixui/testing test` → exit `0`.
2. `nub run --filter playground check-types` → exit `0`.
3. `nub run --filter playground build` → exit `0`.
4. `nub apps/playground/dist/smoke/run.js --only a11y-tree` → `1/1`, exit `0`,
   `a11y=verified`.
5. `nub apps/playground/dist/smoke/run.js` → **26/26**, exit `0`.
6. `nub run check`, `nub run lint`, `nub run test` → all exit `0`.

## 6. STOP conditions

- **STOP** if `getA11yTree()` returns an empty or structurally different payload
  under the `TestRenderer` (no `frame`, no `nodes`). Record the raw JSON; do not
  invent a schema around a dump that does not exist.
- **STOP** if `aria-id` does not reach `author_id`, because then no node is
  addressable and the probe would have to assert on role alone (ambiguous with
  repeated roles). Record it.
- **STOP** if the a11y tree contains all 50 retained virtual rows rather than
  the painted window; that is a finding, not a bug to hide. Adjust the
  assertion to the measured truth and record it as a limitation.
- **DO NOT** add an `aria-checked` prop to the library or cast through the host
  types to make a checkbox state appear. If the runtime drops it, the honest
  answer is a limitation plus the alternative (announce state in
  `aria-description` or `aria-valuetext`), documented.

## 7. Test plan (two directions)

- The scenario fails if a role stops mapping (assert exact `Button` /
  `CheckBox` / `Slider` / `Heading` / `ListBoxOption` strings), if an
  `aria-label` stops reaching `label`, if `aria-expanded={false}` is dropped as
  falsy, or if the a11y tree stops following the painted window (row 49 would
  appear).
- Two-direction proof: remove `aria-label` from `a11y-button` and confirm the
  run exits `1` naming `button label`; restore. Then remove `aria-level` and
  confirm the heading check fails; restore. Record both in §8.

## 8. Measured facts (fill on landing)

- _to be measured._
