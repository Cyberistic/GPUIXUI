# `examples/basic-app` — the Tier 1 set in one workflow

A settings form that uses the Tier 1 component set the way an application would:
a labelled field set with live validation, a select, a checkbox, switches and a
radio group, a save with progress and a spinner, a loading skeleton, a keyboard
scrollable region, an info tip and a light/dark switch.

It is deliberately **not** a gallery of swatches. MISSION asks for realistic
compositions — "a dialog page shows a real form/confirmation workflow, not a
floating rectangle" — and this is the runnable end of that idea.

## Run it

```sh
nub run --filter @gpuixui/basic-app dev      # bun src/main.tsx
```

**Requirements:** the GPUix native binding and a desktop session. This host has
no GUI session, so the **window** has not been opened here. The binding can be
built from source (`apps/playground`, ADR 0003, plan 140); opening this window
remains the missing step. What *is* verified is the composition, below.

## What is verified, and what is not

| | |
| --- | --- |
| verified | `nub run --filter @gpuixui/basic-app check-types` — every component is used with its real props |
| verified | the components themselves in the real GPUix 0.10.0 `TestRenderer` (`packages/primitives/runtime/`) — layout, controls, fields, loading, both themes, the labelled scroll region and the info tip |
| verified | **this composition** in the same real `TestRenderer` — `nub run --filter @gpuixui/basic-app test:runtime` (7 cases): it mounts, the skeleton hands over to the form, the first field takes focus, the consent row's label is painted and clickable, Save is refused until it is accepted, an invalid e-mail keeps it refused, the save lifecycle runs, and the Select paints the option's label. The form is taller than its region, so the suite scrolls the region with a real wheel to reach the consent row — a row below the fold must be reachable. On this host 6 of the 7 pass; the reachability assertion is short by the published box model of the release-tag binding (plan `529` §6.5), not by a component change. |
| **not verified** | *the native window* — `bun src/main.tsx` opening on a machine with a desktop session. The `TestRenderer` is offscreen: it proves layout, paint, hit-testing and focus dispatch, not the window chrome. |

One measured fact, recorded rather than papered over: the runtime **does** grant
`autoFocus` to a field that mounts after the first render (here, when the
skeleton is replaced by the form). Plan `327` reported an empty
`runtime.focused()` because the e-mail field had no `testId`, and `focused()`
names the focused element's `testId`; that was a locator artifact, not a runtime
limitation. The first field now sets `autoFocus` and the suite proves focus
lands on it after the handover (plan `584`).

## Theme

The app takes its palette from `@gpuixui/tokens` (`lightTheme` / `darkTheme`) at
the `ThemeProvider` boundary and switches it with the Light/Dark buttons in the
header. There is no app-local theme.

## What it demonstrates

- **Fields** — `Input` with live e-mail validation, `TextArea`, `Select`,
  `RadioGroup` (density), `CheckboxGroup` (one visible, clickable consent row —
  plan 327) and `Switch` rows.
- **Loading** — a skeleton while the form "arrives", `Progress` while saving and
  a `Spinner` in the save button.
- **Scroll and tips** — a labelled `ScrollArea` (a keyboard scroll stop with
  arrows, page keys and Home/End, plan 072) and `InfoTip` for the notification
  delivery explanation (a named, focusable trigger rather than a hover-only
  icon, plan 073).
- **States** — a disabled save until the form is valid, a loading save, and an
  invalid field with an inline message.
- **Reset** — restores every field and the palette, not just the palette: the
  opening values are one `INITIAL` record used by both `useState` and `reset()`,
  and the native suite proves the consent comes back unchecked (plan 327).
