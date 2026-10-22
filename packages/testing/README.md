# @gpuixui/testing

The **platform-free half** of the native smoke suite: the check model, the
scenario runner, the report and the runtime preflight.

It never imports `@gpuix/react` or `@gpuix/native`. That is the whole point: its
tests run on any host — including a host where no GPUix binding exists — while
the native half (`apps/playground`) supplies the real renderer.

## What it is not

- Not a test framework. It is the scenario/check/report model; run it under
  `@effect/vitest` or a CLI.
- Not evidence. `runScenarios` only reports what it was actually run against.
  A capability is `verified` only when every scenario covering it **ran** and
  passed, `failed` when one did not, and `unverified` when the run only sampled
  it — which is why a runner passes `coverage` (the registry it selected out of)
  and a `--only` run prints the capability it touched as `unverified` rather
  than claiming a total it never measured. A host that could not load a binding
  exits `2` (unverified) rather than reporting success.
- Not native. It has no GPUix dependency and cannot mount a renderer.

## Surface

```ts
import { Native, Report, Runtime, Smoke } from "@gpuixui/testing";
```

| Namespace | Responsibility |
| --------- | -------------- |
| `Runtime` | `detectRuntime` (never fails), `bindingHint`, `RuntimeStatus` |
| `Smoke`   | `SmokeHost`, `SmokeScenario`, `runScenarios`, `SmokeReport`, capability union; the async twin `AsyncSmokeHost`/`AsyncSmokeScenario`/`runAsyncScenarios` for a real window; and the verdict seam — `Coverage`, `coverageOf(registry)` (the scope a selection filtered against, counted per capability) and `capabilityStatuses(results, coverage)` (the pure rule, for a runner that builds its own report) |
| `Native`  | `createTestHost` over the structural `NativeRenderer`/`NativeElement` port: the synchronous offscreen host, with the `testId` lookups, ancestor-bounds fallback, subtree text join, style decode and drag synthesis this package can test without a renderer |
| `Pixels`  | `decodePng` (inflate injected), `encodePng` (deflate injected), `pixelAt`, `countColour`, `boundsOfColour`, `hexToRgba`, `crop`, `countDifferingPixels`, `PixelRegion`, `Pixels`, `Rgba` — paint evidence from a captured frame |
| `State`   | `runCommands` — replay a component runtime's commands and query the final state |
| `Report`  | `formatReport`, `reportJson`, `passed`, `exitCode` |

## Adapting a host

A consumer either passes its synchronous renderer to `Native.createTestHost` —
the port is structural, so a real `TestRenderer` satisfies it with no wrapper —
or adapts to `Smoke.SmokeHost` itself: an input surface (click, key, wheel, drag,
text selection) and an inspection surface (text, bounds, scroll offset, the
selected text, the runtime's own painted style, screenshot).

`Native` is where the offscreen decisions live, and they are unit-tested against
a fake renderer: a `<virtual-list>` or `<anchored>` layer paints no bounds of its
own, so input aimed at it walks up to the nearest painted ancestor; a subtree's
text is a join; a style the runtime reports with the wrong type fails the decode;
a drag is a down, N moves and an up.

`dragSelect(from, to)` is separate from `drag` on purpose: the runtime registers
its selection listeners during **paint**, so a hand-rolled down/move/up with no
flush between the steps selects nothing. `selectedText()` reads the joined
selection and `clearSelection()` drops it, so a probe can prove that content
copies and chrome opts out.

`paintedStyle(testId)` is the **runtime's own style report**, decoded into a
`StyleSnapshot` at the adapter boundary: `backgroundColor`/`borderRadius`/`color`/
`fontFamily`/`fontSize`/`boxShadow` as `Option`s. A property the runtime did not
report is `None`; a payload whose property type changed fails the whole decode
(`null`), deliberately — a runtime that changed its style report is a defect a
scenario must see, never something to coerce.

## Adapting a window

A real window's automation API is asynchronous and its renderer reports no
style, so the live half adapts to `Smoke.AsyncSmokeHost` and runs through
`Smoke.runAsyncScenarios`: same checks, same report, same exit code. Its verbs
return `Effect`s and every failure is a `SmokeHostError` naming the verb. Paint
is proved from the frame: `capture(name)` writes a PNG, `pixels(name)` decodes
it, and a probe counts exact colours with `Pixels.countColour` — or asks what
two frames of the same box changed by: `Pixels.crop` cuts a region out of a
capture (clamped to the frame, `null` when it lies outside) and
`Pixels.countDifferingPixels` counts the pixels that differ, `null` when the two
frames are not the same shape. The editor-overlay probe uses the pair to prove a
field painted nothing over the code beneath it. `Pixels.boundsOfColour` is the
bound of a paint rather than a count — the terminal probe uses it to prove a
word's ink is centred in its frame. A frame that arrives as raw RGBA (the kitty
graphics protocol a terminal sends) becomes a file with `Pixels.encodePng`, one
`None` filter per row; it fails on a byte count that does not fill its size
rather than writing a broken PNG. The inflate and deflate functions are injected
by the runner, so this package still imports no platform or GPUix module.

A tween is measured on the **motion clock**, not on wall time: a paint on a
software renderer can block longer than the tween, so "capture at 107 ms" races
the frame it names. The optional `clockPause`/`clockFastForward`/`clockResume`
verbs freeze the clock the renderer computes motion states from, advance it by an
exact offset and hand the frame back to live time — the same reading every run.
They are optional because only a window has one; the offscreen renderer exposes
a clock too, but no scenario has needed to drive it.

Keys are two verbs on purpose. `key(keystroke)` presses through the automation
protocol, which a window delivers as a **key down only** (measured: a probe
listening on `onKeyDown`/`onKeyUp` saw `space` arrive once, as a press). A
control that activates on release — Space on a button, checkbox or switch,
which is the platform's own rule — is therefore driven with `keyUp(keystroke)`,
which releases through the renderer's `simulateKeyUp`.

Pointer input is four verbs. `click` presses and releases, `drag` presses and
travels, and `hover` moves the pointer onto the element's centre **without
pressing** — the only way to drive the enter/leave pair a tooltip or a
hover style listens for, since any press also fires the press handlers.
`clickWith` holds `cmd`/`ctrl`/`alt`/`shift` for the press, because a desktop
list selects by chord: the runtime reports the held set on the click event, and
`Smoke.formatModifiers` is the one spelling of it (`["shift", "cmd"]` is
`cmd-shift`, whatever the argument order). The automation protocol always
dispatches `click_count: 1`, so a double press cannot be synthesized; a probe
that needs one drives it with a key instead.

`a11yTree()` is the offscreen renderer's accessibility dump, decoded into
`Smoke.A11yTree`: the platform's `role`, `label`, `description`, `value`,
`author_id`, `expanded`, `selected`, `level` and `on_action` per node, with the
dump's ephemeral node keys flattened away. The port types the raw dump as
`unknown` because the pinned `index.d.ts` says `string` while the JS returns the
parsed object; a dump the adapter cannot decode reports `null`, never an empty
tree. Only a node with a role is in the dump, and a window's automation protocol
has no a11y verb, so this is a `TestRenderer` measurement.

A `<virtual-list>` is addressed in rows, not pixels: `scrollToItem(testId,
index)` reveals a row that is not mounted, and `listAnchor(testId)` reads the
renderer's `[itemIndex, offsetInItem, viewportHeight]` anchor (or `null` for
anything that is not a list) as a `ListAnchor`. Pixel arithmetic lies while row
heights are estimates, so a reveal is checked by the index it anchored at.

The window itself is addressable too: `windowSize()` reads the renderer's
paintable box (the size a dock passes as a split's caller-owned `max`), and
`zoomWindow()` runs the platform's zoom — the one lever a window exposes, since
the binding publishes no `setSize`. A size the renderer answers with a zero,
negative or non-finite dimension is reported as a `SmokeHostError`, not as a box
to measure against; `apps/playground`'s `windowSizeOf` is that guard, and
`window-resize-reflow` is the probe that reads both channels against a real
layout.

Nullish returns on `SmokeHost` are the runtime boundary: a missing `testId`
comes back as `null`, a scenario converts it with `Option.fromNullishOr` and
fails with a label naming the id via `ctx.expectSome`.

A scenario is one capability, one view, one `steps` effect:

```ts
export const layoutScenario: Smoke.SmokeScenario = {
  id: "layout-flex",
  title: "Flex layout and gaps",
  capability: "layout",
  steps: (ctx) =>
    Effect.gen(function* () {
      const box = yield* ctx.expectSome(
        "box a painted",
        Option.fromNullishOr(ctx.host.bounds("layout-a"))
      );
      yield* ctx.expectNear("a width", box.width, 200, 1);
    })
};
```

Every `expect*` records a `passed` check when it holds and fails with
`SmokeAssertionError` when it does not, so a failed check is data in the report.

## Development

```sh
nub run --filter @gpuixui/testing build       # dist/ via tsc
nub run --filter @gpuixui/testing check-types
nub run --filter @gpuixui/testing test
```

`src/test-support.ts` holds the inert fixtures the tests share and is excluded
from the build.
