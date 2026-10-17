# 087 — The "put a `Label` beside it" advice for a standalone checkbox/switch is false

| Field | Value |
| ----- | ----- |
| Phase | F (docs truth) |
| Owner | primitives workstream |
| Depends on | `025`, `030`, `047`, `065`, `074` |
| Status | **in progress** |

Self-contained: §1 the false claim, §2 the rule, §3 the files, §4 the check,
§5 STOP conditions, §6 the outcome.

---

## 1. The false claim

GPUix 0.10.0 has no `aria-labelledby` and no `htmlFor`, and a `<text>` sibling is
not part of an interactive element (`docs/gpuix-capabilities.md` §4). Plan `065`
acted on that for groups: every `CheckboxGroup` row is **one** `role="checkbox"`
element with the label inside, so the text is the hit area and the tab stop.

The standalone `Checkbox` and `Switch` docs still recommend the opposite:

| File | Claim |
| ---- | ----- |
| `src/components/Checkbox.tsx` | ``/** Accessible name. The visible name goes in a `Label` beside it. */`` |
| `src/components/Switch.tsx` | the same sentence |
| `docs/checkbox.mdx` §Limitations | "pair it with a `Label` or use the `label` prop for the accessible name only" |
| `docs/switch.mdx` §Limitations | "pair it with a visible `Label` or text row" |

Measured against the runtime (`docs/gpuix-capabilities.md` §4, plan `065` §0): a
visible `Label` beside a box is painted text. Clicking it does nothing, and it
is not associated with the control. The control is still *named* through its
own `label` prop, so a screen reader hears the name — but the visual pairing
over-promises a pointer interaction that does not exist, and the docs' phrasing
suggests the pair is one control when it is two accessibility nodes.

This is the same gap the components workstream's `TODO.md` records (a Tier 2
`CheckboxRow`/`Field` owns the clickable labelled row for non-group controls).
The truth pass does not add that component; it stops this package from
recommending a pattern it knows is inert.

## 2. The rule

**A visible `Label` beside a standalone `Checkbox`/`Switch` is cosmetic: it is
not clickable and not associated. Say so, and point at the component that does
give a labelled row.**

- Component docstrings: the `label` prop is the accessible name; a `Label`
  beside the box/switch is painted text, not a hit area and not an association.
- `docs/checkbox.mdx` and `docs/switch.mdx`: the Accessibility section and the
  Limitations bullet state both facts (named via `label`; not clickable, not
  associated) and name the alternatives: `CheckboxGroup` for a labelled row of
  checkboxes, a Tier 2 field row for the other cases.
- No code change, no API change, no test change: the behaviour already matches
  the corrected words.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/Checkbox.tsx` | correct the `label` prop docstring |
| `packages/primitives/src/components/Switch.tsx` | correct the `label` prop docstring |
| `packages/primitives/docs/checkbox.mdx` | Accessibility + Limitations: not clickable, not associated; point at `CheckboxGroup` |
| `packages/primitives/docs/switch.mdx` | the same two sections |
| `TODO.md` | add and tick the truth pass; record the contract's callback-name question separately |
| `.agents/slop/plans/README.md` | index this plan |

No `COMPONENTS.md` change: its `Checkboxes` row already records the row
contract and the missing `aria-labelledby`; it is the docs that lag.

## 4. The check

The docs fact is now measured by a runtime case:
`runtime/controls.runtime.test.tsx` → **"does not toggle a standalone Checkbox
from a Label beside it"**. A fresh window mounts a `Checkbox` and a `Label`
beside it; a hit-tested click on the label's centre must not call `onChange`,
while a click on the box must. If GPUix ever associates the sibling, this test
fails and the docs (and the `CheckboxGroup` row guidance) become wrong together.

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run check
nub run lint
```

Expected: offline green with the same count as before this plan; runtime green
with one more case; `check` and `lint` exit `0`. Record the counts in §6.

## 5. STOP conditions

- Stop if a `Label` in this runtime **can** move focus or toggle a sibling
  (then the advice is true and the plan is wrong): prove it with `focusNext` or
  a hit-tested click on the label, and report instead of editing the docs.
- Stop if `CheckboxGroup` cannot cover the labelled-row case; do not point at a
  component that does not solve it.
- Do not add a `CheckboxRow`/`SwitchRow` here — it belongs to the components
  workstream's Tier 2 field work (their `TODO.md` records the ask).
- Do not remove the `label` prop's accessible-name role from the docs: the
  control **is** named; only the visible pairing is inert.

## 6. Outcome

Executed on this host, 2026-10-18.

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test` | 36 files, **419 tests green** — unchanged; no component behaviour changed |
| `nub run --filter @gpuixui/primitives test:runtime` | 19 files, **231 tests green** (was 230; +1 label case) |
| `nub run check` | exit `0` (lint, format, types, `check-tests`) |
| `nub run lint` | exit `0` |
| click on a `Label` beside a `Checkbox` | `onChange` not called |
| click on the `Checkbox` itself | `onChange` called once |

Changed:

- `Checkbox.tsx` / `Switch.tsx` — the `label` docstring now says a visible
  `Label` is painted text, not a hit area and not associated, and `Checkbox`
  points at `CheckboxGroup` for a labelled row.
- `docs/checkbox.mdx` — Accessibility and Limitations separate the two facts:
  the box **is** named through `label`; the visible text is **not** clickable and
  **not** associated; `CheckboxGroup` is the row.
- `docs/switch.mdx` — the same correction in both sections.
- `runtime/controls.runtime.test.tsx` — the measured case above.

No API changed. The runtime fact is the one plan `065` established for rows: a
click on a `CheckboxGroup` row's label toggles only because the row **is** the
checkbox element; a `Label` sibling of a standalone box is a different element
and receives the click itself — now proven directly rather than inferred.


