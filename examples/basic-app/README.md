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
no GUI session, so the app itself **has not been executed here**. The binding
can be built from source (`apps/playground`, ADR 0003, plan 140); opening this
window remains the missing step.

## What is verified, and what is not

| | |
| --- | --- |
| verified | `nub run --filter @gpuixui/basic-app check-types` — every component is used with its real props |
| verified | the components themselves in the real GPUix 0.10.0 `TestRenderer` (`packages/primitives/runtime/`) — layout, controls, fields, loading, both themes, the labelled scroll region and the info tip |
| **not verified** | *this composition* — the window opening, its layout, hit-testing and the app's own focus order |

The components are verified individually; the app that composes them is not.
That distinction matters: a passing primitives suite is not a screenshot of this
screen.

## Theme

The app takes its palette from `@gpuixui/tokens` (`lightTheme` / `darkTheme`) at
the `ThemeProvider` boundary and switches it with the Light/Dark buttons in the
header. There is no app-local theme.

## What it demonstrates

- **Fields** — `Input` with live e-mail validation, `TextArea`, `Select`,
  `RadioGroup` (density), `Checkbox` (terms) and `Switch` rows.
- **Loading** — a skeleton while the form "arrives", `Progress` while saving and
  a `Spinner` in the save button.
- **Scroll and tips** — a labelled `ScrollArea` (a keyboard scroll stop with
  arrows, page keys and Home/End, plan 072) and `InfoTip` for the notification
  delivery explanation (a named, focusable trigger rather than a hover-only
  icon, plan 073).
- **States** — a disabled save until the form is valid, a loading save, and an
  invalid field with an inline message.
