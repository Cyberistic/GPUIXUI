# 115 — Feedback: Toast system and inline validation

- **Phase:** C-5
- **Workstream:** components · **Owns:** `packages/components/**`
- **Depends on:** plan 110, plan 111 (Alert styling), plan 112 (layer patterns)

This is the one Tier 2 area whose logic is genuinely asynchronous. It is also
the first place the repo's Effect rules earn their keep: a toast queue with
timers, cancellation and a bounded size is a state machine, not a `setTimeout`.

APIs below were verified against `effect@4.0.5` type definitions:
`ManagedRuntime.make`, `SubscriptionRef.make/.changes/.get/.modify`,
`FiberMap.make/.run`, `Effect.sleep`, `Duration.Input`, `SchemaError.message`,
`SchemaIssue.makeFormatterDefault`. **`Layer.scoped` does not exist in 4.0.5** —
use `Layer.effect`, which runs its effect in the layer's scope.

---

## 1. Toast — files

```
src/toast/
├── model.ts          # Schema.Class inputs and the Toast value
├── model.test.ts     # decoding rules
├── store.ts          # Effect service: SubscriptionRef + FiberMap
├── store.test.ts     # @effect/vitest, TestClock
├── provider.tsx      # ManagedRuntime boundary + React context
├── viewport.tsx      # rendering
└── toast.test.tsx    # native renderer behaviour
src/toast.tsx         # re-exports ToastProvider, useToast, ToastViewport and the types
```

Public surface:

```tsx
export { ToastProvider, useToast, ToastViewport } from "./toast/provider.js";
export type { ToastInput, ToastTone } from "./toast/model.js";
export const toast: {
  readonly push: (input: ToastInput) => Effect.Effect<Toast>;
  readonly dismiss: (id: string) => Effect.Effect<void>;
  readonly dismissAll: Effect.Effect<void>;
};  // Effect-returning; only usable inside an Effect or through useToast()
```

## 2. `toast/model.ts`

```ts
import * as Schema from "effect/Schema";
import * as Effect from "effect/Effect";

export const ToastTone = Schema.Literal("info", "success", "warning", "danger");

export class ToastInput extends Schema.Class<ToastInput>("ToastInput")({
  title: Schema.NonEmptyString,
  description: Schema.OptionFromOptionalKey(Schema.String),
  tone: ToastTone.pipe(Schema.withDecodingDefault(Effect.succeed("info"))),
  duration: Schema.OptionFromOptionalKey(Schema.Duration),
}) {}

export class Toast extends Schema.Class<Toast>("Toast")({
  id: Schema.NonEmptyString,
  title: Schema.NonEmptyString,
  description: Schema.OptionFromOptionalKey(Schema.String),
  tone: ToastTone,
}) {}
```

Ids are **monotonic counters** from the store, not `Random` values: deterministic
tests and no id reuse (id reuse is the bug that lets a stale timer dismiss a
newer toast).

`model.test.ts`: decoding `{ title: "Saved" }` yields `tone: "info"`,
`description: None`, `duration: None`; an empty title fails with `SchemaError`;
an unknown tone fails; a string duration decodes through `Schema.Duration` when
`duration` is given as a `Duration` object (`Duration.seconds(3)`).

## 3. `toast/store.ts`

```ts
export interface ToastStoreService {
  readonly toasts: Effect.Effect<ReadonlyArray<Toast>>;
  readonly changes: Stream.Stream<ReadonlyArray<Toast>>;
  readonly push: (input: ToastInput) => Effect.Effect<Toast>;
  readonly dismiss: (id: string) => Effect.Effect<void>;
  readonly dismissAll: Effect.Effect<void>;
}

export interface ToastStoreOptions {
  readonly max?: number;                       // default 3
  readonly defaultDuration?: Duration.Input;   // default 5 seconds
}

export const makeToastStore: (
  options?: ToastStoreOptions,
) => Effect.Effect<ToastStoreService, never, Scope.Scope>;

/**
 * `Layer.effect`, not `Layer.scoped`: Effect 4.0.5 has no `Layer.scoped`. A
 * layer built with `effect` runs its effect in the layer's own scope, which is
 * what keeps the `FiberMap` alive for the runtime's lifetime.
 */
export const layer: (options?: ToastStoreOptions) => Layer.Layer<ToastStoreService>;
```

Implementation notes, in order:

1. `const state = yield* SubscriptionRef.make<{ seq: number; toasts: ReadonlyArray<Toast> }>({ seq: 0, toasts: [] })`.
2. `const timers = yield* FiberMap.make<string>()` — the map is scoped, so
   auto-dismiss fibers die with the runtime.
3. `push(input)`: `SubscriptionRef.modify` to append with `id: String(seq + 1)`,
   trimming from the front when over `max` (and interrupting the trimmed toast's
   timer), then `FiberMap.run(timers, id, Effect.sleep(duration).pipe(Effect.andThen(dismiss(id))))`
   unless the duration is `Duration.zero`/infinite (document the rule: an
   infinite duration disables auto-dismiss).
4. `dismiss(id)`: remove from the array **and** `FiberMap.remove(timers, id)`.
5. `dismissAll`: `SubscriptionRef.set(empty)` + `FiberMap.clear(timers)`.
6. `changes`: `SubscriptionRef.changes(state).pipe(Stream.map((s) => s.toasts))`.
7. Use `Effect.fn("ToastStore.push")` / `Effect.fnUntraced` per EF-14.

`store.test.ts` (`@effect/vitest`, `it.effect`, `TestClock`):
1. push → `toasts` has one toast with `id: "1"` and the decoded tone.
2. `max: 2`, three pushes → ids `["2","3"]` (the oldest was dropped).
3. `dismiss("2")` removes only that toast.
4. `dismissAll` empties the list.
5. auto-dismiss: push, `TestClock.adjust(Duration.seconds(5))`, list is empty.
6. **stale timer:** push A, dismiss A, push B, adjust 5s → B is still present
   while its own timer has not elapsed... then adjust to B's own deadline and it
   disappears. This is the regression guard for "a dismissed toast's timer
   removed the next toast"; name the file header with that bug.
7. a custom `duration` shorter than the default dismisses first.
8. errors: pushing an invalid `ToastInput` (empty title) fails with `SchemaError`
   and leaves the list unchanged.

## 4. `toast/provider.tsx`

- Creates the runtime once: `useState(() => ManagedRuntime.make(layer(options)))`.
- Context value: `{ runtime, store }` where `store` is resolved with
  `runtime.runSync(Layer... )`? No — resolve through the runtime's context:
  `runtime.runFork(store.push(...))` needs the service. Use
  `runtime.runSync(Effect.flatMap(ToastStoreService, (s) => s.toasts))` for
  reads, and expose:
  `push: (input) => runtime.runFork(Effect.flatMap(ToastStoreService, (s) => s.push(input)))`.
- Subscribe for rendering with `useSyncExternalStore`:
  `runtime.runFork(store.changes.pipe(Stream.runForEach(setSnapshot)))` in an
  effect; the snapshot starts as `[]`. Document that `changes` emits the current
  value first, so no initial read is needed.
- `useEffect(() => () => runtime.dispose(), [runtime])`.
- `useToast()` throws when used outside the provider (boundary programming error).
- This is the **only** file in the package allowed to call `runtime.run*`
  (EF-21).

## 5. `toast/viewport.tsx`

- `ToastViewport`: `position:"absolute", right:space.xl, bottom:space.xl`,
  `display:"flex", flexDirection:"column", gap:space.md`,
  `pointerEvents:"none"`, `width:380`, `zIndex` is not available in GPUix —
  stacking is paint order, so the viewport must be the last child of the app
  root. Document that.
- Each toast: `pointerEvents:"auto"`, `colors.popover` surface, `borderWidth:1`,
  `borderColor:colors.border`, `borderRadius:radius.md`,
  `boxShadow:elevation.md`, `padding:space.lg`, `flexDirection:"row"`,
  `gap:space.lg`, plus a 3px left bar in the tone colour (`div`).
- Content: title `sm/semibold/foreground`; description `xs/mutedForeground`;
  dismiss `IconButton` (`aria-label:"Dismiss"`, `testId:"toast-dismiss"`).
- Tone glyphs: info `"i"`, success `"✓"`, warning `"!"`, danger `"✕"` in the
  tone colour. No icon dependency in this phase; note it in the docs.

`toast.test.tsx` (native renderer), rendering a harness with two buttons
(`push`, `dismiss-all`):
1. Click push → `getAllText()` contains the title.
2. Two pushes → the second toast's `y` is below the first's (`getElementBounds`).
3. Dismiss button click removes that toast only.
4. `dismissAll` empties the viewport.
5. The viewport itself does not block clicks on the page behind it: a button
   outside the toast area still receives a click at its centre
   (`pointerEvents:"none"` proven).
6. Both themes: toast background equals the theme `colors.popover`.

## 6. Inline validation — files

```
src/validation/logic.ts       # schema → messages, pure
src/validation/logic.test.ts
src/field.tsx                 # Field, FieldLabel, FieldDescription, FieldError, FieldInput
src/field.test.tsx
```

```ts
/** Decode `value`, returning the first user-facing message or None. */
export const validate: <A>(
  schema: Schema.Schema<A>,
) => (value: unknown) => Effect.Effect<Option.Option<string>>;

/** All messages from a failed decode, deduplicated, in issue order. */
export const validateAll: <A>(
  schema: Schema.Schema<A>,
) => (value: unknown) => Effect.Effect<ReadonlyArray<string>>;
```

Implementation: `Schema.decodeUnknownResult(schema, options)`; message text is
always `SchemaIssue.makeFormatterDefault()`'s, so a check's `message` annotation
reaches the user verbatim and a raw issue never does. Never re-implement message
formatting; never expose the raw issue to users.

Three details settled at implementation time (2026-10-17), each with a test:

1. **`errors: "all"`.** The runtime's default parse options stop at the **first**
   failing field, so a struct with two bad fields yields one issue, not two.
   `validateAll` therefore decodes with `errors: "all"`; `validate` keeps the
   default, which is why the two functions legitimately disagree.
2. **`validate` reads the walk, not `error.message`.** The runtime's message
   keeps the field's JSON pointer (`…\n  at ["email"]`), which a form has no use
   for. `validate` is the head of the same walk `validateAll` performs, so the
   two can never disagree on text.
3. **`Pointer` and `Encoding` are transparent.** A struct field arrives as
   `Pointer(path, issue)` and a `Schema.Class` adds an outer `Encoding` node; the
   walk recurses through both and drops the path. `Composite` is the only node
   whose children are all reported.

`logic.test.ts`: a `Schema.NonEmptyString` with a custom `message` annotation
returns exactly that message for `""`; a valid value returns `None`; a struct
with two failing fields returns two distinct messages in field order; duplicate
messages are deduplicated; `validateAll` on a valid value returns `[]`.

Component:

```tsx
export interface FieldProps extends Props {
  label: string;
  description?: string;
  error?: string;        // when present, tone is destructive
  required?: boolean;
  children: ReactNode;   // a FieldInput, or any control
}
export const Field;
export const FieldInput: FC<InputProps & { invalid?: boolean }>;
```

- `Field` lays out label → control → description/error, gap `space.xs`.
- `FieldLabel` renders `required` as a trailing `"*"` in `colors.destructive`
  and keeps the accessible name clean by putting `required` in
  `aria-description` rather than the label text.
- `FieldError` is `role:"alert"`, `fontSize:xs`, `colors.destructive`, and
  replaces the description slot while present (one message, not both).
- `FieldInput` passes `aria-description={error ?? description}` to the GPUix
  `<input>` and paints `borderColor:colors.destructive` when `invalid`.
  **Documented limitation:** GPUix has no `aria-describedby`, so the association
  is a description, not an id reference.
- `Field` does not own the value or run validation automatically. The consumer
  holds state and calls `validate`; the component shows the result. Rationale:
  a validation library is out of scope for this phase, and an implicit
  auto-validate would fire on every keystroke.

`field.test.tsx`:
1. Label, description and control render.
2. `error` replaces the description and carries `role:"alert"`.
3. `required` adds the marker and the control's `aria-description` says required.
4. `invalid` paints the destructive border colour (both themes).
5. Typing in `FieldInput` fires `onChange` with the text (real keystrokes).

## 7. Examples and docs

`examples/toast.example.tsx` — a "Save changes" button that pushes a success
toast, an "Undo" action that pushes with an undo hint, and a failure toast.
`examples/field.example.tsx` — a real form field wired to `validate` with an
`Apply` button that validates on submit and shows the message.

`docs/toast.mdx`: stacking limit, auto-dismiss, manual dismiss, viewport paint
order limitation (must be last child), no progress indicator, a11y
(`role:"status"` on the viewport for polite announcements — add it and test it).
`docs/field.mdx`: label/description/error anatomy, `validate` usage, the
`aria-describedby` limitation with evidence, and "not a form library".

## 8. Commands

```
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
nub run check:tests && nub run lint && nub run fmt
```

Expected: exits 0. The store suite must report the auto-dismiss and stale-timer
tests by name (no skips).

## 9. STOP conditions

1. `FiberMap.run` cannot be called from the service methods with the runtime's
   scope → STOP and report the type error; do **not** swap in `setTimeout`.
2. `useSyncExternalStore` cannot be driven by the `changes` stream without
   tearing (React 19 concurrent rendering) → STOP; report the observed tear and
   the option of `SubscriptionRef.get` + a version counter.
3. `TestClock.adjust` does not fire `Effect.sleep` inside the forked timer →
   report with the test output; do not lengthen the test with a real sleep.
4. The viewport blocks pointer input despite `pointerEvents:"none"` → STOP; this
   is a runtime bug that would make the toast system unusable.
5. `SchemaError.message` turns out to leak input values into user-facing copy →
   switch to `SchemaIssue.makeFormatterDefault()` with `reportInput: false` and
   note the decision.

## 10. Acceptance criteria

- [ ] Toast store is Effect-native, cancellable, bounded and deterministic.
- [ ] Auto-dismiss and stale-timer behaviour proven with `TestClock`.
- [ ] Toast and Field render and behave correctly in the native renderer.
- [ ] `runtime.run*` appears only in `toast/provider.tsx`.
- [ ] Examples, docs pages, `COMPONENTS.md` rows.
- [ ] Limitations documented: no progress bar, paint-order stacking, no
      `aria-describedby`, no form library.
