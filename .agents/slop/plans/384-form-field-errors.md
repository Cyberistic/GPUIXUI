# 384 — Form field-level errors: locate a message by its schema path

**Phase:** C/F (validation) · **Owner:** components workstream ·
**Depends on:** 110, 115, 200, 201, 308, 383 · **Status:** planned

## 1. Why

`Form` validates an owned value and reports every failure, but only as a flat
list of strings. `validateAll` deliberately drops the `SchemaIssue.Pointer` path
(`validation/logic.ts`), so a consumer cannot tell which `Field` a message
belongs to and must repeat the schema-to-field mapping by hand.

This is a documented limitation in three places:

- `docs/form.mdx` → **Limitations**: "`validateAll` returns messages, not paths,
  so Form cannot attach a message to a particular `Field`."
- `packages/components/src/form.tsx` → `formMeta.limitations`.
- `COMPONENTS.md` → the Form row ("no message-to-field mapping").

`SchemaIssue.Pointer` carries exactly the path (`ReadonlyArray<PropertyKey>`), and
`Schema.decodeUnknownResult(schema, { errors: "all" })` already produces one
`Pointer` per failing field. The missing piece is a walk that keeps the path.
This plan adds it, exposes it through `Form`'s render-prop state, and wires the
example and docs to it. It is a real capability, not API-shape work.

**Measured, 2026-10-18:** for
`Schema.Struct({ email: NonEmptyString, age: Int })` with
`{ email: "", age: "x" }`, the issue tree walks to
`[{ path: ["email"], tag: "Filter" }, { path: ["age"], tag: "InvalidType" }]`.

## 2. The rule

- A message's location is the **schema's own key path**, accumulated through
  nested `Pointer` nodes, root-first. A failure on the value itself has path
  `[]`.
- Paths are not stringified: `PropertyKey` (string, number, symbol) is kept, so
  an array index or a symbol key is not silently coerced.
- Two failures with the same path and message are one entry. Two failures with
  the same message on **different** paths are two entries — they belong under
  different fields.
- The existing `validateAll` behaviour (messages only, deduplicated across
  fields, schema order) is unchanged; it is re-expressed over the new walk.
- `Form` keeps `errors` (the summary strings) and adds the located form. The
  summary stays one `role="alert"` with one text node per distinct message.

## 3. Files

Change only:

- `packages/components/src/validation/logic.ts` — `FieldMessage`,
  `validateFields`, and the shared issue walk.
- `packages/components/src/validation/logic.test.ts` — the new suite.
- `packages/components/src/form.tsx` — `FormState` and the submit path.
- `packages/components/src/behaviour/form.test.tsx` — two native cases.
- `packages/components/examples/form.example.tsx` — inline messages.
- `packages/components/docs/form.mdx` — state, validation, limitations, count.
- `COMPONENTS.md` — the Form row.
- `.agents/slop/plans/README.md` — this plan's row.
- `TODO.md` — add and tick the task.

Do **not** change `field.tsx` (it already takes an `error` prop), any other
component, `docs/component-api.md` (Form stays one part), or docs-site files.

## 4. Steps

### 4.1 Write the failing unit test first

In `packages/components/src/validation/logic.test.ts`, extend the header comment
with the bug being guarded ("a message with no path cannot be attached to the
field that produced it") and add:

```ts
describe("validateFields", () => {
  it.effect("locates each message at its field path, in field order", () =>
    Effect.gen(function* () {
      const fields = yield* validateFields(Signup)({
        email: "nope",
        name: "",
      });

      expect(Arr.map(fields, (field) => field.path)).toEqual([
        ["email"],
        ["name"],
      ]);
      expect(fields[0]?.message).toBe(addressMessage);
    }),
  );

  it.effect("accumulates a nested path and keeps a root failure at []", () =>
    Effect.gen(function* () {
      const Profile = Schema.Struct({
        user: Schema.Struct({ email: Address }),
      });
      const nested = yield* validateFields(Profile)({
        user: { email: "nope" },
      });
      expect(Arr.map(nested, (field) => field.path)).toEqual([
        ["user", "email"],
      ]);

      const root = yield* validateFields(Address)("nope");
      expect(Arr.map(root, (field) => field.path)).toEqual([[]]);
    }),
  );

  it.effect("keeps one entry per path for a shared message", () =>
    Effect.gen(function* () {
      const fields = yield* validateFields(TwiceSame)({
        email: "nope",
        backup: "also-nope",
      });

      expect(Arr.map(fields, (field) => field.message)).toEqual([
        addressMessage,
        addressMessage,
      ]);
      expect(Arr.map(fields, (field) => field.path)).toEqual([
        ["email"],
        ["backup"],
      ]);
    }),
  );
});
```

`TwiceSame` is already defined in the file. Add the import beside `validate`:
`import { validate, validateAll, validateFields } from "./logic.js";`.

Run:

```sh
cd packages/components
nub run --filter @gpuixui/components test -- src/validation/logic.test.ts
```

Expected: **fail** — `validateFields` is not exported. This is the
both-directions proof for the new API.

### 4.2 Implement the walk

In `packages/components/src/validation/logic.ts`:

1. Keep `messagesOf` as the message-only reader used by `validate`.
2. Add the located walker and its type:

```ts
/** One schema failure, located by its key path in the decoded input. */
export interface FieldMessage {
  /** Root-first keys; `[]` for a failure on the value itself. */
  readonly path: ReadonlyArray<PropertyKey>;
  /** The schema's own message for this issue. */
  readonly message: string;
}

const samePath = (
  left: ReadonlyArray<PropertyKey>,
  right: ReadonlyArray<PropertyKey>,
): boolean =>
  Arr.length(left) === Arr.length(right) &&
  Arr.every(left, (key, index) => key === right[index]);

const fieldMessagesOf = (
  issue: SchemaIssue.Issue,
  path: ReadonlyArray<PropertyKey> = [],
): ReadonlyArray<FieldMessage> =>
  Match.value(issue).pipe(
    Match.when(isTag("Composite"), (composite) =>
      Arr.flatMap(composite.issues, (child) => fieldMessagesOf(child, path)),
    ),
    Match.when(isTag("Pointer"), (pointer) =>
      fieldMessagesOf(pointer.issue, Arr.appendAll(path, pointer.path)),
    ),
    Match.when(isTag("Encoding"), (encoding) =>
      fieldMessagesOf(encoding.issue, path),
    ),
    Match.orElse((leaf) => [{ path, message: format(leaf) }]),
  );
```

3. Export the effect:

```ts
/**
 * Every distinct failure with its path, in issue order. Duplicates are removed
 * only when both the path and the message match, so one message on two fields
 * stays two entries.
 */
export const validateFields =
  <T>(schema: Schema.ConstraintDecoder<T>) =>
  (value: unknown): Effect.Effect<ReadonlyArray<FieldMessage>> => {
    const result = Schema.decodeUnknownResult(schema, { errors: "all" })(value);
    return Effect.succeed(
      Result.isFailure(result)
        ? Arr.dedupeWith(fieldMessagesOf(result.failure.issue), (left, right) =>
            samePath(left.path, right.path) && left.message === right.message,
          )
        : [],
    );
  };
```

4. Add the lookup the component needs, so path normalisation and key equality
   live once:

```ts
/** A single key is one segment; an array is already a path. */
const toPath = (
  path: PropertyKey | ReadonlyArray<PropertyKey>,
): ReadonlyArray<PropertyKey> =>
  Match.value(path).pipe(
    Match.when(P.isString, (key) => [key]),
    Match.when(P.isNumber, (key) => [key]),
    Match.when(P.isSymbol, (key) => [key]),
    Match.orElse((segments) => segments),
  );

/**
 * The message located at `path`, or `None`. A single key addresses a top-level
 * field; pass an array for a nested path.
 */
export const fieldMessageAt = (
  fields: ReadonlyArray<FieldMessage>,
  path: PropertyKey | ReadonlyArray<PropertyKey>,
): Option.Option<string> => {
  const wanted = toPath(path);
  return pipe(
    Arr.findFirst(fields, (field) => samePath(field.path, wanted)),
    Option.map((field) => field.message),
  );
};
```

5. Re-express `validateAll` over `validateFields` so the two cannot disagree:

```ts
export const validateAll =
  <T>(schema: Schema.ConstraintDecoder<T>) =>
  (value: unknown): Effect.Effect<ReadonlyArray<string>> =>
    Effect.map(validateFields(schema)(value), (fields) =>
      Arr.dedupe(Arr.map(fields, (field) => field.message)),
    );
```

Keep the JSDoc on both functions accurate: `validate` stays first-message-only,
`validateAll` stays messages-only, `validateFields` is the located form.
`messagesOf` remains the message-only reader used by `validate`.

6. Add one unit case for the lookup to the new describe:

```ts
it.effect("finds a message by a key or a path", () =>
  Effect.gen(function* () {
    const fields = yield* validateFields(TwiceSame)({
      email: "nope",
      backup: "also-nope",
    });

    expect(fieldMessageAt(fields, "backup")).toEqual(
      Option.some(addressMessage),
    );
    expect(fieldMessageAt(fields, ["backup"])).toEqual(
      Option.some(addressMessage),
    );
    expect(fieldMessageAt(fields, "missing")).toEqual(Option.none());
  }),
);
```

7. Re-run the unit suite:

```sh
cd packages/components
nub run --filter @gpuixui/components test -- src/validation/logic.test.ts
```

Expected: the 4 new cases pass and the 3 existing `validateAll` cases still pass
(7 total in the file).

### 4.3 Wire Form

In `packages/components/src/form.tsx`:

1. Import `validateFields` and `FieldMessage` from `./validation/logic.js`;
   remove the `validateAll` import if it becomes unused (it should).
2. Extend `FormState`:

```ts
/** What the render prop receives. */
export interface FormState {
  /** Every distinct message from the last failed submit, in schema order. */
  readonly errors: ReadonlyArray<string>;
  /** The same failures, each with the schema path that produced it. */
  readonly fieldErrors: ReadonlyArray<FieldMessage>;
  /** Mirrors the `pending` prop; a pending form ignores `submit`. */
  readonly pending: boolean;
  /** Validate `value` and call `onSubmit` only when it decodes. */
  readonly submit: () => void;
  /**
   * The message for a field path, or `undefined`. A single key is a top-level
   * field; pass an array for a nested path.
   */
  readonly errorFor: (
    path: PropertyKey | ReadonlyArray<PropertyKey>,
  ) => string | undefined;
}
```

3. Hold `fieldErrors` in state instead of `errors`:

```ts
const [fieldErrors, setFieldErrors] = useState<ReadonlyArray<FieldMessage>>(
  [],
);
```

In `submit`, on failure: `setFieldErrors(Effect.runSync(validateFields(schema)(value)))`;
on success: `setFieldErrors([])` then `onSubmit(decoded.success)`.

4. Derive the summary and the lookup once per render:

```ts
const errors = Arr.dedupe(Arr.map(fieldErrors, (field) => field.message));
const errorFor = useCallback(
  (path: PropertyKey | ReadonlyArray<PropertyKey>): string | undefined =>
    Option.getOrUndefined(
      Option.map(
        Arr.findFirst(fieldErrors, (field) =>
          samePath(field.path, toPath(path)),
        ),
        (field) => field.message,
      ),
    ),
  [fieldErrors],
);
```

Use `Option.getOrUndefined(fieldMessageAt(fieldErrors, path))` — the React
boundary translates absence; do not return `Option` from `FormState`. Import
`fieldMessageAt`, `validateFields` and `type FieldMessage` from
`./validation/logic.js`, and `Option` from `effect/Option`.

5. Pass `fieldErrors`/`errorFor` into `children({ errors, fieldErrors, errorFor, pending, submit })`.

6. Keep the summary rendering on `errors` unchanged. Update the module header to
say fields are attachable now.

### 4.4 Add the failing native cases

In `packages/components/src/behaviour/form.test.tsx`:

- Import `Field, FieldInput` from `../field.js`.
- Extend the header comment with the guarded bug: "a form that knows every
  message but not which field produced it, so inline validation has to be wired
  by hand and can drift from the summary".
- Add two cases:

```ts
/** A form whose render prop prints the located errors and wires one Field. */
const LocatedHarness = ({
  value,
  onSubmit,
}: {
  readonly value: unknown;
  readonly onSubmit: (value: Signup) => void;
}) => (
  <Form schema={Signup} value={value} onSubmit={onSubmit}>
    {(state) => (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <Field
          label="Email"
          error={state.errorFor("email")}
          testId="email-field"
        >
          <FieldInput testId="email" value="" onChange={() => undefined} />
        </Field>
        <Field label="Name" error={state.errorFor("name")} testId="name-field">
          <FieldInput testId="name" value="" onChange={() => undefined} />
        </Field>
        <text testId="paths">
          {Arr.join(
            Arr.map(state.fieldErrors, (field) => field.path.join(".")),
            ",",
          )}
        </text>
        <text testId="missing">
          {state.errorFor("missing") ?? "none"}
        </text>
        <text testId="name-error">
          {state.errorFor(["name"]) ?? "none"}
        </text>
        <Button testId="submit" onClick={state.submit}>
          Create account
        </Button>
      </div>
    )}
  </Form>
);

it("locates each message at the field that produced it", () => {
  const form = renderComponent(
    <LocatedHarness value={invalid} onSubmit={() => undefined} />,
  );

  clickCentreOf(form, "submit");

  expect(form.renderer.getAllText()).toContain("email,name");
  expect(form.renderer.findByText(addressMessage)).toBeDefined();
  expect(form.renderer.getAllText()).toContain(expectedMessages[1] ?? "");
  expect(form.renderer.getAllText()).toContain("none"); // errorFor("missing")
  expect(form.renderer.findByText(expectedMessages[1] ?? "")).toBeDefined();

  form.unmount();
});

it("an inline Field paints the located message and the invalid control", () => {
  const form = renderComponent(
    <LocatedHarness value={invalid} onSubmit={() => undefined} />,
  );

  clickCentreOf(form, "submit");

  const input = form.renderer.findByTestId("email");
  expect(input?.style.borderColor).toBe(darkTheme.colors.destructive);

  form.unmount();
});
```

`renderComponent` defaults to the dark theme in this suite (the existing
both-theme case passes an explicit theme); use `darkTheme` for that assertion.
`invalid` fails **both** fields, so the name message is `expectedMessages[1]`.
`errorFor(["name"])` proves the array form of the path; `errorFor("missing")`
proves absence for a field the schema did not reject.

Use only APIs already used in the suite (`renderComponent`, `clickCentreOf`,
`findByTestId`, `findByText`, `getAllText`, `nodesWithRole`). Import `Arr` from
`effect/Array` for the paths text and the existing style.

Run:

```sh
cd packages/components
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/form.test.tsx
```

Expected: **fail** on the missing `errorFor`/`fieldErrors` members before §4.3
lands (TypeScript) and pass after. Record the failure output in the commit
message.

### 4.5 Update the example

In `packages/components/examples/form.example.tsx`, pass the located message to
each field:

```tsx
<Field
  label="Email"
  description="We never share it"
  error={form.errorFor("email")}
>
```

and the same for `name`. This is the runnable proof that the summary and the
inline messages come from one validation pass. Do not duplicate the message
logic in the example.

### 4.6 Docs, inventory and index

- `packages/components/docs/form.mdx`:
  - Usage: add `error={form.errorFor("email")}` to the email field.
  - The render prop: document the new `FormState` (all five members).
  - Validation: explain paths are schema keys, nested paths accumulate, a
    shared message on two fields stays two entries; the summary still dedupes by
    message.
  - Limitations: replace the "returns messages, not paths" bullet with the
    remaining truth — no field registration, no automatic re-validation; a
    pointer path is the schema's key sequence, not a display label.
  - Verification: 7 → 9 native tests, and state what the two new ones prove.
- `packages/components/src/form.tsx` `formMeta.limitations`: replace the
  field-mapping limitation with "messages carry the schema's key path; the caller
  still chooses when to validate and how to render each field".
- `COMPONENTS.md` Form row: mention `errors`/`fieldErrors`/`errorFor`, 9 native
  tests, and keep "no field registration / no re-validation on edit".
- `.agents/slop/plans/README.md`: add the row below 383.
- `TODO.md`: add under **Tier 2 hardening**:

```md
    - [x] Form field-level errors: `validateFields` keeps the schema path and
      `Form` exposes `fieldErrors`/`errorFor` — plan 384; 4 logic + 2 native
      tests, both-direction proof
```

## 5. Test plan (what must be able to fail)

| Test | Fails without |
| ---- | ------------- |
| `validateFields` locates top-level fields in order | the walker dropping `Pointer.path` (paths all `[]`) |
| `validateFields` accumulates a nested path and keeps a root at `[]` | appending only the outer pointer, or stringifying the path |
| `validateFields` keeps the same message on two paths | deduping by message alone |
| existing `validateAll` suite | the refactor changing order or dropping message dedupe |
| Form native: `fieldErrors` paths + `errorFor` | `Form` not forwarding the located state |
| Form native: inline `Field` + `FieldInput` paint | `errorFor` returning the wrong field or `Field` ignoring it |

Both-directions proof:

1. Before implementation: `validateFields` absent → unit suite fails; `Form`
   has no `errorFor` → behaviour suite fails to type-check/run.
2. After implementation: both green.
3. Mutation check: remove `Arr.appendAll(path, pointer.path)` (use `path`) and
   re-run the unit suite — the nested case must fail; restore.
4. Mutation check: dedupe by message only in `validateFields` — the shared
   message case must fail; restore.

Commands:

```sh
cd packages/components
nub run --filter @gpuixui/components test -- src/validation/logic.test.ts
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/form.test.tsx
```

## 6. Acceptance

- `validateFields` is exported from `validation/logic.ts` with a documented
  `FieldMessage`; `validateAll` is unchanged in behaviour and re-expressed over
  it (3 existing tests still pass).
- `FormState` has `fieldErrors` and `errorFor`; `errors` and the summary are
  unchanged.
- The example and docs use `errorFor`; no duplicated message logic.
- `formMeta`, `COMPONENTS.md`, the docs page, the plan index and `TODO.md` agree
  (the plan 333/335 count checks and the plan 337 API checks must stay green).
- `nub run --filter @gpuixui/components test` and `test:behaviour` pass.
- `nub run check`, `nub run lint`, `nub run test` pass.
- Commit on `agent/components` and push to `origin/agent/components`.

## 7. STOP conditions

Stop and report if:

- `SchemaIssue.Pointer` is absent or its `path` is not the key sequence above —
  the measured tree in §1 is the authority; do not infer a path from message
  text;
- `Arr.dedupeWith` or `Arr.appendAll` does not exist at the pinned Effect 4.0.5
  (a hand-written fold is acceptable only if reported);
- `Form`'s submitted `errors` summary would change order or lose its per-message
  dedupe — that breaks the existing behaviour and is not authorised here;
- the native case cannot read `FieldInput`'s painted border through the harness
  (report the harness limit rather than asserting a different element);
- any change outside §3 is required. Record it as a TODO task instead.
