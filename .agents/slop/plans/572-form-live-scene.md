# 572 — Form's submit lifecycle on the live surface

**Workstream:** docs-site (`apps/docs`, `docs/preview-strategy.md`)
**Phase:** F — integration and polish
**Depends on:** 412, 455, 456, 475, 486, 508, 515, 523, 567, 570, 571
**Status:** implemented

## 1. The measured gap

`/docs/components/form` documents a lifecycle that a still cannot show:

| State | What the page promises | What tier A shows today |
| ----- | ---------------------- | ----------------------- |
| idle | children render with `errors: []`, `pending: false` | the resting form |
| invalid submit | every schema message appears in one `role="alert"`; `onSubmit` is not called | nothing — the message is only produced by a press |
| valid submit | errors clear; `onSubmit` receives the decoded value | nothing |

Measured on 2026-10-19: the `form` record has no `liveScene`, so
`<NativePreview slug="form">` selects tier **V** (the native behaviour suite),
and `<ComponentPreview slug="form">` renders a tier-A illustration of the idle
state. The scene table shipped 47 scenes (44 record scenes and 3 composed
pages) and 24 gestures; `Form` is the one delivered component whose *primary
documented behaviour* — validate, then submit — has no live proof.

`MISSION.md` asks every component page for an "interactive/runnable preview
where supported", and `docs/preview-strategy.md` says a scene is expected "when
the state the page documents is one a still cannot prove". `Form` meets that
test and the component is `done` with a real behaviour suite, so the honest tier
is L, not only V/A.

`scene-contract.test.ts` cannot see this: it requires a scene when a record is
`stateful`, and `form` is `static` (one component, a render-prop child, no
compound parts). This plan adds the scene and pins it in the interaction map, so
a later edit cannot quietly drop it.

## 2. Files to change

All paths are under `apps/docs` unless stated.

| File | Change |
| ---- | ------ |
| `preview/form-scene.ts` | **create** — the schema, its message, and the scene's starting value, JSX-free |
| `preview/scenes.ts` | `"form"` in `LIVE_SCENES`; `SCENE_TEXT`, `SCENE_GESTURE`, `SCENE_INTERACTION` |
| `preview/scene-views.tsx` | `FormScene`, registered in `LIVE_SCENE_VIEWS`; import `Form`, `Field`, `FieldInput` by subpath |
| `src/component-meta/entries.ts` | `liveScene: "form"` on the `form` record |
| `src/components/preview/scene-contract.test.ts` | read `preview/form-scene.ts` as part of the scene source; add the form interaction pair |
| `src/components/preview/form-scene.test.ts` | **create** — the expectation is the message the real schema formatter produces |
| `content/docs/components/form.mdx` | one sentence saying what the live surface proves |
| `docs/preview-strategy.md` | tier-L list, scene/split/gesture totals, one gesture row |
| `apps/docs/README.md` | record-scene and gesture totals |
| `content/docs/component-pages.mdx` | scene total |
| `TODO.md` | add and tick the task |
| `.agents/slop/plans/README.md` | index this plan |

## 3. Scene contract

### 3.1 `preview/form-scene.ts` (create)

The schema must be importable by a node test, so it lives outside the JSX file.
It is the real schema the scene hands to `Form`; the message is the one the
runtime paints because `Form` forwards `validateAll`'s messages verbatim.

```ts
import * as Schema from "effect/Schema";

/** The message Form prints for an address without an `@` (the scene's text). */
export const FORM_MESSAGE = "Enter an address with an @";

/** The field the scene's invalid submit fails on. */
export const FormEmail = Schema.String.check(
  Schema.makeFilter((value: string) => value.includes("@"), {
    identifier: "FormSceneEmailHasAtCheck",
    title: "Form scene email has @",
    description: "An address that contains `@`.",
    message: FORM_MESSAGE,
  }),
);

/** Two fields, so a failed submit is a real composite, not one leaf. */
export class FormValues extends Schema.Class<FormValues>("FormValues")({
  email: FormEmail,
  name: Schema.NonEmptyString,
}) {}

/** What the scene starts with: an empty address and name. */
export const EMPTY_FORM: { readonly email: string; readonly name: string } = {
  email: "",
  name: "",
};
```

### 3.2 `preview/scenes.ts`

```ts
// LIVE_SCENES — append after "inline-edit"
"form",

// SCENE_TEXT
form: FORM_MESSAGE,

// SCENE_GESTURE
form: [{ kind: "click", testId: "scene-form-submit" }],

// SCENE_INTERACTION
form: "Press Create account with an empty email to see the schema's message.",
```

Import `FORM_MESSAGE` from `./form-scene` (no cycle: `form-scene.ts` imports only
`effect/Schema`). The instruction must not contain the message — the smoke
asserts the text is **absent before** the press.

### 3.3 `preview/scene-views.tsx`

```ts
import {
  Field,
  FieldInput,
} from "@gpuixui/components/field";
import { Form } from "@gpuixui/components/form";
import { EMPTY_FORM, FormValues } from "./form-scene";
```

```tsx
const FormScene = (): ReactElement => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [created, setCreated] = useState(false);

  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Create account</Text>
      <Text role="caption" tone="muted">
        The real Form. Press Create account with an empty email to see the
        schema's message.
      </Text>
      <Form
        schema={FormValues}
        value={{ email, name }}
        onSubmit={() => setCreated(true)}
        label="Create account"
        style={{ width: 360 }}
      >
        {(form) => (
          <Stack direction="column" gap="sm">
            <Field label="Email" description="We never share it">
              <FieldInput
                testId="scene-form-email"
                value={email}
                onChange={(event) => setEmail(event.value ?? "")}
              />
            </Field>
            <Field label="Name">
              <FieldInput
                testId="scene-form-name"
                value={name}
                onChange={(event) => setName(event.value ?? "")}
              />
            </Field>
            <Button testId="scene-form-submit" onClick={form.submit}>
              Create account
            </Button>
            {created ? <Text role="body">Account created</Text> : null}
          </Stack>
        )}
      </Form>
    </Stack>
  );
};
```

`EMPTY_FORM` is the starting value's *shape*; the scene's own `useState` holds
the live value. `created` is only painted after a valid submit, so a future
second gesture can assert it; the shipped gesture proves the invalid path.

Register `form: FormScene` in `LIVE_SCENE_VIEWS`.

### 3.4 `src/component-meta/entries.ts`

Add `liveScene: "form",` to the `form` record options. No other field changes.
`registry.test.ts` then requires the key to exist in `LIVE_SCENES`.

### 3.5 `scene-contract.test.ts`

The expectation now lives in a pure module the view imports, so include that
module in the source the guard reads:

```ts
const viewSource = [
  readFileSync(sceneViewsPath, "utf8"),
  readFileSync(formScenePath, "utf8"),
  ...pattern views,
].join("\n");
```

with

```ts
const formScenePath = fileURLToPath(
  new URL("../../../preview/form-scene.ts", import.meta.url),
);
```

Add the pair to `interactionScenes`:

```ts
["form", "form"],
```

## 4. The failing-first test

Create `src/components/preview/form-scene.test.ts`:

```ts
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as SchemaIssue from "effect/SchemaIssue";
import { describe, expect, it } from "vitest";
import {
  EMPTY_FORM,
  FORM_MESSAGE,
  FormEmail,
  FormValues,
} from "../../../preview/form-scene";
import { SCENE_TEXT } from "../../../preview/scenes";

/**
 * Guards plan 572: the smoke looks for `SCENE_TEXT.form` after pressing submit,
 * and Form paints whatever the schema's formatter returns. If the message
 * annotation and the expectation drift, the smoke would look for text no form
 * can produce — the scene would fail for the wrong reason, or a page could
 * claim a message the schema never emits.
 */
describe("the form scene's expectation", () => {
  it("is the message the schema formatter produces for an empty address", () => {
    const decoded = Schema.decodeUnknownResult(FormEmail)("");
    expect(Result.isFailure(decoded)).toBe(true);
    if (Result.isFailure(decoded)) {
      expect(SchemaIssue.makeFormatterDefault()(decoded.failure.issue)).toBe(
        FORM_MESSAGE,
      );
    }
  });

  it("is the text the scene waits for", () => {
    expect(SCENE_TEXT.form).toBe(FORM_MESSAGE);
  });

  it("rejects the starting value at the address field, not only somewhere", () => {
    const decoded = Schema.decodeUnknownResult(FormValues)(EMPTY_FORM);
    expect(Result.isFailure(decoded)).toBe(true);
  });
});
```

Both directions to measure before calling it done:

1. Temporarily set `SCENE_TEXT.form = "Something else"` → the second test fails
   by name; revert.
2. Temporarily change the filter's `message` to `"No @"` → the first test fails
   by name; revert.

## 5. Document updates (derived, not remembered)

`preview-gaps.test.ts` derives every number below. Run it first and read the
failures, then make the prose agree. With `form` added the expected values are:

| Document | Old | New |
| -------- | --- | --- |
| `docs/preview-strategy.md` `N scenes ship today` | 47 | 48 |
| `docs/preview-strategy.md` `N are one per record` | 44 | 45 |
| `docs/preview-strategy.md` `N more are opened by a real gesture` | 24 | 25 |
| `docs/preview-strategy.md` `N scenes document state only a gesture produces` | 24 | 25 |
| `docs/preview-strategy.md` tier-L list | — | add `Form` |
| `docs/preview-strategy.md` gesture table | 24 rows | add `Form` with the instruction above |
| `apps/docs/README.md` `(44 today)` and `(24 of those …)` | 44 / 24 | 45 / 25 |
| `content/docs/component-pages.mdx` `47 scenes today` | 47 | 48 |

The tier-L list and the gesture table must use the **registry title** (`Form`)
exactly; the guard compares names with the registry in both directions.

`form.mdx` gains one sentence in `## States` (or directly under the intro):

> The live surface above runs the real `Form`: press **Create account** with an
> empty email to see the schema's message, then fill the address and press it
> again to submit the decoded value.

It must not claim the live scene captures keyboard focus (it does not).

## 6. Commands and expected results

Run from the repository root.

```sh
nub run --filter docs test
```

Expected: all suites green. If a document count or a scene name is stale, the
failure names the file, the scene and the two values. The new
`form-scene.test.ts` runs here.

```sh
nub run --filter docs check-types
```

Expected: exit `0` — `fumadocs-mdx`, the app's `tsc` and `preview/tsconfig`
all pass.

```sh
nub run --filter docs smoke:preview
```

Expected: exit `0`; the output lists `form` with `Enter an address with an @`
present after the press and a sized canvas (> 1×1). A scene that paints the
message before the press fails the absent-before assertion.

```sh
nub run --filter docs smoke:build
```

Expected: exit `0`, the same 97 pages; `/docs/components/form` still answers,
and its `<NativePreview>` now renders the live tier with the runtime coverage
beneath it.

```sh
nub run check && nub run lint
```

Expected: green.

## 7. STOP conditions

Stop and report rather than improvise if:

1. The wasm renderer cannot paint `Form` (`data-gpuix="failed"` or a timeout);
   record the scene, the failure and the console output, and leave the record at
   tier V rather than shipping a scene the renderer cannot run.
2. The press does not produce the schema message in GPUI's tree after the
   gesture; capture the renderer's text nodes and stop — do not relax the
   absent-before/present-after contract.
3. `Form`'s `submit` refuses to run because a provider is missing from the
   preview document; fix the provider (the same two-provider rule every scene
   follows) or stop, do not change the component.
4. A guard demands a count that the registry does not derive (for example a
   hand-written list of scene names in prose). Update the derived source, not
   the number; if the guard itself is wrong, stop and report.

## 8. Acceptance

- [x] `form` has a live scene, and the scene's expectation is the schema's own
      message, proved by a test that fails when either changes.
- [x] The smoke proves the message is absent before the press and present after.
- [x] The component page says what the surface proves and does not overclaim.
- [x] Every derived total in `docs/preview-strategy.md`,
      `apps/docs/README.md`, `content/docs/component-pages.mdx` matches the code.
- [x] `nub run --filter docs test`, `check-types`, `smoke:preview`,
      `smoke:build`, `nub run check` and `nub run lint` pass, with the measured
      command output recorded in this plan.

## 9. Measured results (2026-10-19)

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | exit `0` — 88 files / 632 tests |
| `nub run --filter docs check-types` | exit `0` — app and preview type-check |
| `nub run --filter docs smoke:preview` | exit `0` — `scene form opened by 1 step(s) — 640x520 canvas, 9 text nodes`; `/docs/components/form loaded the live iframe — …scene=form&platform=default&mode=dark (606x358)` |
| `nub run --filter docs smoke:build` | exit `0` — 97 pages, 120 links, search and 404 checked |
| `nub run check` | exit `0` — `check:tests`, lint, format and all workspace type-checks |
| `nub run test` | exit `0` — every workspace suite, including 88 docs files / 632 tests |

Both directions were measured on the new test:

1. `SCENE_TEXT.form = "Something else"` → `expected 'Something else' to be
   'Enter an address with an @'` (the second test fails by name); reverted.
2. The filter's `message` set to `"No @"` while `FORM_MESSAGE` stayed → `expected
   'No @' to be 'Enter an address with an @'` (the first test fails by name);
   reverted.
