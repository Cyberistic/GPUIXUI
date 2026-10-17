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
| `Smoke`   | `SmokeHost`, `SmokeScenario`, `runScenarios`, `SmokeReport`, capability union — plus the async twins `AsyncSmokeHost`, `AsyncSmokeScenario`, `runAsyncScenarios` and `SmokeHostError` |
| `Report`  | `formatReport`, `reportJson`, `passed`, `exitCode` |
| `Native`  | `createHost(renderer)`, the structural `NativeRenderer` port, and the lookups (`find`, `allElements`, `boundsOf`, `hitBoundsOf`, `centerOf`, `subtreeText`, `focusedElement`) |

## Adapting a host

A consumer adapts its renderer to `Smoke.SmokeHost` — an input surface (click,
hover, key, wheel, drag) and an inspection surface (text, bounds, scroll offset,
the runtime's own painted style, accessibility tree, screenshot). The adapter is the only place a GPUix
type appears; scenarios see plain values.

`Native.createHost(renderer)` is that adapter, already implemented: pass a real
`TestRenderer` and the suite can run. The renderer is typed **structurally**
(`Native.NativeRenderer`), so this package still imports no `@gpuix/*` and loads
on a host with no binding; the real `TestRenderer` satisfies the port
structurally, which the playground's type check proves. A fake renderer can
implement it too, which is how the adapter's own rules are tested.

Two bounds rules are kept apart on purpose. `Native.boundsOf` reports what the
element itself painted — `None` for `<canvas>`, `<anchored>` and
`<virtual-list>`, which scenarios assert. `Native.hitBoundsOf` walks to the
nearest ancestor with bounds and is the only rule input targeting may use, or a
click aimed inside such a layer lands at the origin. `SmokeHost.bounds` uses the
first; `centerOf`/`click`/`wheel` use the second.

`key` runs the renderer's keystroke parser (typed text, `enter`, `escape`, …).
A control whose contract is "activate on Space **up**" needs the two halves
separately, so `keyDown(testId, key)` and `keyUp(testId, key)` deliver them the
way a physical keyboard does — `simulateKeystrokes("space")` does not.

`paintedStyle(testId)` is the **runtime's own style report**, decoded into a
`StyleSnapshot` at the adapter boundary: `backgroundColor`/`color`/`fontFamily`/
`fontSize`/`boxShadow` as `Option`s. A property the runtime did not report is
`None`; a payload whose property type changed fails the whole decode (`null`),
deliberately — a runtime that changed its style report is a defect a scenario
must see, never something to coerce.

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

## The live (async) host

A real window is driven through a promise API (`@gpuix/native/automation`), so
its host verbs are effects. `runAsyncScenarios` takes an `AsyncSmokeHost` and
returns the **same** `SmokeReport`, which is what lets a live run reuse
`Report.formatReport` and `Report.exitCode` instead of inventing a second log.

`AsyncSmokeHost` is deliberately **smaller** than `SmokeHost`: bounds, text,
painted text, input (click/hover/keys/wheel/drag), `waitFor`, scroll offsets,
focus, selection, screenshots and the motion clock. That is the automation
protocol's surface — plus focus, because the live runner owns the renderer it
created and `getFocusedElementId` is a renderer method (the protocol itself has
no focus query; the host maps the id back through the automation tree — plan
`190`). Selection uses the protocol's `getSelectedText`/`clearSelection` plus a
real paced drag (plan `191`). It has no style report, accessibility dump or list
anchor, so those assertions stay with the synchronous `TestRenderer` suite
rather than being approximated.

A verb that throws becomes `SmokeHostError` (`verb` names the call) and is
recorded as an `errored` check — never a silent pass and never a failed
assertion. `waitFor(testId)` waits until an element exists, which a live runner
needs because the protocol has no frame boundary: input returns after a tick
while React commits on a later frame. `bounds` is the exception to the throwing
rule: a `testId` that matches nothing is `null` (the interface's absent value),
so a scenario can assert that a removed surface is really gone (plan `192`).

## Development

```sh
nub run --filter @gpuixui/testing build       # dist/ via tsc
nub run --filter @gpuixui/testing check-types
nub run --filter @gpuixui/testing test
```

`src/test-support.ts` holds the inert fixtures the tests share and is excluded
from the build.
