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
  A capability is `verified` only when every scenario covering it passed on a
  host that ran it; a host that could not load a binding exits `2` (unverified)
  rather than reporting success.
- Not native. It has no GPUix dependency and cannot mount a renderer.

## Surface

```ts
import { Report, Runtime, Smoke } from "@gpuixui/testing";
```

| Namespace | Responsibility |
| --------- | -------------- |
| `Runtime` | `detectRuntime` (never fails), `bindingHint`, `RuntimeStatus` |
| `Smoke`   | `SmokeHost`, `SmokeScenario`, `runScenarios`, `SmokeReport`, capability union; the async twin `AsyncSmokeHost`/`AsyncSmokeScenario`/`runAsyncScenarios` for a real window |
| `Pixels`  | `decodePng` (inflate injected), `pixelAt`, `countColour`, `hexToRgba`, `Pixels`, `Rgba` — paint evidence from a captured frame |
| `State`   | `runCommands` — replay a component runtime's commands and query the final state |
| `Report`  | `formatReport`, `reportJson`, `passed`, `exitCode` |

## Adapting a host

A consumer adapts its renderer to `Smoke.SmokeHost` — an input surface (click,
key, wheel, drag) and an inspection surface (text, bounds, scroll offset, the
runtime's own painted style, screenshot). The adapter is the only place a GPUix
type appears; scenarios see plain values.

`paintedStyle(testId)` is the **runtime's own style report**, decoded into a
`StyleSnapshot` at the adapter boundary: `backgroundColor`/`color`/`fontFamily`/
`fontSize`/`boxShadow` as `Option`s. A property the runtime did not report is
`None`; a payload whose property type changed fails the whole decode (`null`),
deliberately — a runtime that changed its style report is a defect a scenario
must see, never something to coerce.

## Adapting a window

A real window's automation API is asynchronous and its renderer reports no
style, so the live half adapts to `Smoke.AsyncSmokeHost` and runs through
`Smoke.runAsyncScenarios`: same checks, same report, same exit code. Its verbs
return `Effect`s and every failure is a `SmokeHostError` naming the verb. Paint
is proved from the frame: `capture(name)` writes a PNG, `pixels(name)` decodes
it, and a probe counts exact colours with `Pixels.countColour`. The inflate
function is injected by the runner, so this package still imports no platform
or GPUix module.

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
