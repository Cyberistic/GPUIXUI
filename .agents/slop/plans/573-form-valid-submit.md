# 573 — Form's valid submit is proved on the live surface

**Workstream:** docs-site (`apps/docs`, `docs/preview-strategy.md`)
**Phase:** F — integration and polish
**Depends on:** 412, 455, 493, 572
**Status:** implemented

## 1. The measured gap

Plan 572 put the real `Form` on the live surface and proved one half of its
documented lifecycle: `scene-form-submit` is pressed with an empty email, the
schema's own message paints, and `smoke:preview` asserts that message is absent
before the press and present after it.

The page documents the other half in the same breath:

> The live surface above runs the real `Form`: press **Create account** with an
> empty email to see the schema's message, then fill the address and press it
> again to submit the decoded value.

Nothing proves that second press. `preview/scene-views.tsx` already paints
`Account created` after a successful submit, and `preview/form-scene.ts` already
defines the schema and `EMPTY_FORM`, but the smoke has only one expectation per
scene (`SCENE_TEXT`) and one gesture list, so the valid path is reachable by a
reader and unproved by the gate. The same gap is recorded in plan 572 §3.3:
"`created` is only painted after a valid submit, so a future second gesture can
assert it".

The scene table is additive; this plan does **not** add a scene. It adds a
per-step expectation to the existing gesture contract so a multi-phase scene can
prove an intermediate state. `Form` is the first scene that needs one.

## 2. Files to change

All paths are under `apps/docs` unless stated.

| File | Change |
| ---- | ------ |
| `preview/scenes.ts` | `SCENE_TEXT.form` becomes `Account created`; the gesture fills both fields and submits again; new `SCENE_STEP_TEXT` map; instruction updated |
| `preview/scene-views.tsx` | The caption names both phases instead of only the invalid one |
| `scripts/smoke-live-preview.ts` | Read `SCENE_STEP_TEXT`; assert a milestone is absent before its step and present after it |
| `src/components/preview/scene-contract.test.ts` | Guard the milestone table against the scene source, step list and instruction |
| `src/components/preview/form-scene.test.ts` | Expect the final text and the milestone to equal the real schema message |
| `content/docs/components/form.mdx` | Say what the surface now proves (both phases), without a new claim |
| `docs/preview-strategy.md` | Update the Form gesture row and the "Gestures are proved" sentence |
| `TODO.md` | Add and tick this task |
| `.agents/slop/plans/README.md` | Index this plan |

## 3. The contract change

### 3.1 `preview/scenes.ts`

Add after `SCENE_TEXT`:

```ts
/**
 * Text a multi-phase gesture paints at an intermediate step (plan 573).
 *
 * `SCENE_TEXT` proves the scene's final state. A lifecycle with two documented
 * outcomes needs the first one checked too, or a regression that swallowed the
 * invalid branch would still pass the final-state assertion. The key is the
 * **1-based** step that paints the text; the smoke asserts the text is absent
 * before that step and present after it.
 */
export const SCENE_STEP_TEXT: Readonly<
  Partial<Record<LiveScene, Readonly<Record<number, string>>>>
> = {
  form: { 1: FORM_MESSAGE },
};
```

Change `SCENE_TEXT.form` to `"Account created"`. `FORM_MESSAGE` stays imported
for the milestone and the test.

Change the gesture:

```ts
form: [
  { kind: "click", testId: "scene-form-submit" },
  { kind: "fill", testId: "scene-form-email", text: "ada@example.com" },
  { kind: "fill", testId: "scene-form-name", text: "Ada Lovelace" },
  { kind: "click", testId: "scene-form-submit" },
],
```

Change the instruction:

```ts
form: "Press Create account with an empty email to see the schema message, then fill both fields and press again.",
```

The instruction must not contain either expectation (`FORM_MESSAGE` or
`Account created`), which the contract test enforces.

### 3.2 `preview/scene-views.tsx`

Replace the caption under the `Form` heading with:

```tsx
<Text role="caption" tone="muted">
  The real Form. Press Create account with an empty email to see the
  schema's message, then fill both fields and press again.
</Text>
```

No other scene change.

### 3.3 `scripts/smoke-live-preview.ts`

Import `SCENE_STEP_TEXT` beside `SCENE_TEXT` and replace the step loop with:

```ts
for (const [index, step] of steps.entries()) {
  const milestone = SCENE_STEP_TEXT[scene]?.[index + 1];
  if (milestone !== undefined) {
    const before = await paintedText(session);
    if (before.includes(milestone)) {
      console.error(
        `FAIL live scene ${scene}: "${milestone}" was painted before step ${index + 1}; the step proves nothing`,
      );
      return 1;
    }
  }
  await runStep(session, step);
  // A popover measures and paints on the frame after the click that
  // opened it; the next step's locator needs those painted bounds.
  await sleep(250);
  if (milestone !== undefined) {
    const painted = await waitForPaintedText(session, milestone);
    if (painted === null) {
      const after = await paintedText(session);
      console.error(
        `FAIL live scene ${scene}: expected "${milestone}" after step ${index + 1} (${JSON.stringify(after)})`,
      );
      return 1;
    }
  }
}
```

`waitForPaintedText` is already declared above `main`; no new helper. The final
`SCENE_TEXT` wait stays where it is.

### 3.4 `src/components/preview/form-scene.test.ts`

The header comment currently says the smoke looks for the schema message. Change
it to say the smoke proves **both** outcomes: the schema message after the first
press and `Account created` after the valid submit. Assertions:

```ts
expect(SCENE_TEXT.form).toBe("Account created");
expect(SCENE_STEP_TEXT.form?.[1]).toBe(FORM_MESSAGE);
```

Keep the existing formatter proof (the message is the one the real schema
emits).

The two-direction proof for this file: change either expectation and the test
fails by value; it is not a stubbed copy because `FORM_MESSAGE` is produced by
running `Schema.decodeUnknownSync`/the formatter, as the existing test does.

### 3.5 `src/components/preview/scene-contract.test.ts`

Import `SCENE_STEP_TEXT`. Add one test inside `describe("gesture scenes")`:

```ts
/**
 * A multi-phase gesture names text an intermediate step paints (plan 573).
 * The milestone is a promise to the smoke like `SCENE_TEXT`: an index outside
 * the step list, a string the scene never renders or a copy in the reader's
 * instruction would make the check pass for the wrong reason.
 */
it("names milestone text the scene paints, at a real step", () => {
  const problems = gestureScenes.flatMap((scene) => {
    const steps = SCENE_GESTURE[scene] ?? [];
    return Object.entries(SCENE_STEP_TEXT[scene] ?? {}).flatMap(
      ([rawIndex, text]) => {
        const index = Number(rawIndex);
        const instruction = SCENE_INTERACTION[scene] ?? "";
        if (!Number.isInteger(index) || index < 1 || index > steps.length) {
          return [`${scene}: step ${rawIndex} is outside ${steps.length}`];
        }
        if (text.length === 0 || !viewSource.includes(text)) {
          return [`${scene}: "${text}" is not painted by the scene`];
        }
        if (text === SCENE_TEXT[scene]) {
          return [`${scene}: "${text}" repeats the final expectation`];
        }
        if (instruction.includes(text)) {
          return [`${scene}: the instruction names "${text}"`];
        }
        return [];
      },
    );
  });
  expect(problems).toEqual([]);
});
```

Extend the existing "never names the text the gesture is supposed to reveal"
test to include milestones:

```ts
const leaked = gestureScenes.filter((scene) => {
  const instruction = SCENE_INTERACTION[scene];
  if (instruction === undefined) return false;
  const milestones = Object.values(SCENE_STEP_TEXT[scene] ?? {});
  return (
    instruction.includes(SCENE_TEXT[scene]) ||
    milestones.some((text) => instruction.includes(text))
  );
});
```

No count changes: the scene table still ships 48 scenes; the Form scene still
counts as one gesture scene, now with four steps.

## 4. Prose

### 4.1 `content/docs/components/form.mdx`

Replace the sentence under **States** with:

> The live surface above runs the real `Form` through both outcomes: press
> **Create account** with an empty email to see the schema's message, then fill
> both fields and press again to submit the decoded value and paint
> `Account created`.

This states exactly what the smoke asserts.

### 4.2 `docs/preview-strategy.md`

- In the gesture table replace the Form row with:
  `| Form | press with an empty email, fill both fields, press again | the schema message paints, clears and the submitted state is reached |`
- In the "Gestures are proved, not implied" paragraph, add one sentence:
  "A step may also carry an intermediate expectation (`SCENE_STEP_TEXT`): Form's
  first press must paint the schema message and its valid submit must paint
  `Account created`, so neither half can regress behind the other."
- The scene totals do not change (48 scenes / 25 gesture scenes).

## 5. Commands and expected results

```sh
nub run --filter docs test
```

Expected: exit `0`; the Form scene test and the scene-contract suite pass, and
the rest of the 88-file suite stays green.

```sh
nub run --filter docs check-types
```

Expected: exit `0`.

```sh
nub run --filter docs smoke:preview
```

Expected: exit `0`; the Form line reports four steps and the scene reaches
`Account created`. The other 47 scenes and every page stay green.

```sh
nub run --filter docs smoke:build
```

Expected: exit `0`; page and link counts unchanged.

```sh
nub run check && nub run lint
```

Expected: green.

## 6. STOP conditions

Stop and report rather than improvise if:

1. `Locator.fill` cannot reach `scene-form-email`/`scene-form-name`; record the
   renderer's text nodes and stop. Do not switch the target to the `Field`
   label or relax the absent-before rule.
2. Filling a field does not reach the scene's `useState` (the final press still
   paints the schema message). Fix the scene wiring, not the expectation.
3. The final `Account created` is painted before the fourth step; stop and
   report — the scene would open itself and the proof is worthless.
4. Any existing scene's counts or expectations move. The milestone map is
   additive; only Form's row changes.

## 7. Test plan

| Test | Type | Catches |
| ---- | ---- | ------- |
| `form-scene.test.ts` | unit | a final text or milestone that drifts from the real schema message and the rendered scene |
| `scene-contract.test.ts` "names milestone text…" | unit | a milestone index outside the step list, a string no scene renders, a duplicate of the final text, or a leak into the reader instruction |
| `scene-contract.test.ts` "never names…" | unit | the instruction revealing either expectation |
| `smoke:preview` | browser | the schema message absent before step 1 and present after it; `Account created` absent before all steps and present after step 4 |

Two-direction proof for the smoke: set the final press's milestone to
`SCENE_TEXT.form` temporarily (the message clears on success), observe
`FAIL live scene form: expected … after step 4`, then revert. For the unit
guard: point the milestone at step 5 and observe the index failure, then revert.

## 8. Acceptance

- [x] A reader can perform both outcomes on the live surface; the page says so.
- [x] The smoke proves the invalid message and the valid submit, each in the
      right direction.
- [x] The milestone contract is guarded against stale indices, unpainted text
      and instruction leaks.
- [x] Scene and gesture totals are unchanged; every derived document agrees.
- [x] Every command in §5 ran with the recorded result.

## 9. Measured results (2026-10-19)

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | exit `0` — 88 files / 635 tests |
| `nub run --filter docs check-types` | exit `0` — app and preview type-check |
| `nub run --filter docs smoke:preview` | exit `0` — `scene form opened by 4 step(s) — 640x520 canvas, 8 text nodes`; all 48 scenes and 48 pages green |
| `nub run --filter docs smoke:build` | exit `0` — 97 pages / 120 links |
| `nub run check` | exit `0` — `check:tests`, lint, format and every workspace type-check |
| `nub run test` | exit `0` — every workspace suite, including 88 docs files / 635 tests |
| `nub run lint` | exit `0` |

Both forced defects were measured and reverted:

1. `SCENE_TEXT.form` set to `FORM_MESSAGE` (the message clears on the valid
   submit) → `FAIL live scene form: expected "Enter an address with an @" after
   4 gesture step(s)` and the dumped tree already contained `Account created`;
   exit `1`. The smoke fails when the final expectation is wrong even though
   every step ran.
2. The Form milestone moved to step `5` → `AssertionError: expected [ 'form:
   step 5 is outside 4' ] to deeply equal []`; the contract guard names the
   stale index. Reverted.
