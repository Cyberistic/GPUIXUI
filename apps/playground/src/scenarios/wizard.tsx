/**
 * `wizard-flow` — the runtime half of a multi-step form (plan `386`).
 *
 * The shipped parts a wizard composes are measured individually (`Field`/`Form`
 * in plan `346`, `Stepper` in plan `347`, text entry in plan `188`). This probe
 * measures the **shell** no probe has covered: a step swap is an unmount, so the
 * next step's first control must be focused explicitly; a rejected step focuses
 * its first invalid field from the click handler; an unmounted step leaves the
 * tab order; and the draft lives in app state, because the native editor is
 * gone. A second mode keeps the steps mounted in hidden absolute slots — the
 * plan-177 recipe — so the extra state a kept subtree owns is measured against
 * the simpler unmount.
 *
 * The rules are pure (`wizard-model.ts`); the view and the steps call the same
 * functions.
 */
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Effect, Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { ariaOf, elementTypeOf, focusedId, painted, read } from "./probes.js";
import {
  EMPTY_DRAFT,
  MESSAGES,
  STEP_ORDER,
  STEP_TITLES,
  describeWizard,
  entryFocus,
  inputId,
  invalidFields,
  isValid,
  nextStep,
  previousStep,
  summary,
} from "./wizard-model.js";
import type {
  Draft,
  Field,
  LastAction,
  Mode,
  StepIndex,
} from "./wizard-model.js";

const FRAME_WIDTH = 560;
const BODY_HEIGHT = 220;

/** The registry of `testId → host instance`, so a ref can be focused later. */
type Registry = Record<string, PublicInstance | null>;

/** Registers a control under its testId; `null` clears it on unmount. */
const register =
  (registry: Registry, testId: string) =>
  (instance: PublicInstance | null): void => {
    registry[testId] = instance;
  };

/** Focuses the registered control, when it is mounted and has an id. */
const focusRegistered = (
  renderer: { focusElement?: (id: number) => void } | null | undefined,
  registry: Registry,
  testId: string,
): void =>
  Option.match(Option.fromNullishOr(registry[testId]), {
    onNone: () => {},
    onSome: (instance) => renderer?.focusElement?.(instance.id),
  });

/** One labelled input and its message slot. */
const TextField = ({
  label,
  testId,
  value,
  message,
  onChange,
  onSubmit,
  register: registerField,
}: {
  readonly label: string;
  readonly testId: string;
  readonly value: string;
  readonly message: Option.Option<string>;
  readonly onChange: (event: EventPayload) => void;
  readonly onSubmit: () => void;
  readonly register: (instance: PublicInstance | null) => void;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}
    >
      <text
        style={{ ...textStyle(theme, "label"), color: theme.colors.foreground }}
      >
        {label}
      </text>
      <input
        testId={testId}
        aria-id={testId}
        aria-label={label}
        ref={registerField}
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        style={{
          ...textStyle(theme, "body"),
          height: 32,
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          backgroundColor: theme.colors.input,
          color: theme.colors.inputForeground,
          borderWidth: theme.borderWidth.thin,
          borderColor: Option.isSome(message)
            ? theme.colors.destructive
            : theme.colors.border,
          borderRadius: theme.radius.md,
        }}
      />
      {Option.match(message, {
        onNone: () => null,
        onSome: (text) => (
          <text
            testId={`${testId}-error`}
            role="alert"
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.destructive,
            }}
          >
            {text}
          </text>
        ),
      })}
    </div>
  );
};

const WizardProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const registry = useRef<Record<string, PublicInstance | null>>({});

  const [step, setStep] = useState<StepIndex>(1);
  const [mode, setMode] = useState<Mode>("unmount");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<ReadonlyArray<Field>>([]);
  const [submits, setSubmits] = useState(0);
  const [last, setLast] = useState<LastAction>("start");
  const [created, setCreated] = useState<Option.Option<string>>(Option.none());

  // A focus request is a nonce plus a target, so a repeated request on the same
  // control still runs, and a rejected step (which changes no step) still asks.
  const [focusNonce, setFocusNonce] = useState(0);
  const focusTarget = useRef<Option.Option<string>>(Option.none());

  const requestFocus = (testId: string): void => {
    focusTarget.current = Option.some(testId);
    setFocusNonce((nonce) => nonce + 1);
  };

  useLayoutEffect(() => {
    Option.match(focusTarget.current, {
      onNone: () => {},
      onSome: (testId) => focusRegistered(renderer, registry.current, testId),
    });
    focusTarget.current = Option.none();
  }, [focusNonce, renderer]);

  const messageOf = (field: Field): Option.Option<string> =>
    Arr.contains(errors, field)
      ? Option.some(MESSAGES[field])
      : Option.none();

  const edit = (field: Field, value: string): void => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (!isValid(field, value)) return;
    setErrors((current) => Arr.filter(current, (entry) => entry !== field));
  };

  const advance = (): void => {
    const invalid = invalidFields(step, draft);
    setLast("next");
    if (Arr.isReadonlyArrayNonEmpty(invalid)) {
      setErrors(invalid);
      requestFocus(inputId(invalid[0]));
      return;
    }
    setErrors([]);
    Option.match(nextStep(step), {
      onNone: () => {},
      onSome: (next) => {
        setStep(next);
        requestFocus(entryFocus(next));
      },
    });
  };

  const back = (): void => {
    Option.match(previousStep(step), {
      onNone: () => {},
      onSome: (previous) => {
        setErrors([]);
        setStep(previous);
        setLast("back");
        requestFocus(entryFocus(previous));
      },
    });
  };

  const submit = (): void => {
    const failing = Arr.getSomes(
      Arr.map(STEP_ORDER, (candidate) => {
        const invalid = invalidFields(candidate, draft);
        return Option.map(Arr.head(invalid), (field) => ({
          step: candidate,
          field,
          invalid,
        }));
      }),
    );
    if (Arr.isReadonlyArrayNonEmpty(failing)) {
      const first = failing[0];
      setErrors(first.invalid);
      setStep(first.step);
      setLast("submit");
      requestFocus(inputId(first.field));
      return;
    }
    setSubmits((count) => count + 1);
    setCreated(Option.some(summary(draft)));
    setLast("submit");
  };

  const accountStep = (): ReactNode => (
    <div
      testId="wizard-step-account"
      style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md }}
    >
      <TextField
        label="Full name"
        testId={inputId("name")}
        value={draft.name}
        message={messageOf("name")}
        onChange={(event) => edit("name", event.value ?? "")}
        onSubmit={advance}
        register={register(registry.current, inputId("name"))}
      />
      <TextField
        label="Email"
        testId={inputId("email")}
        value={draft.email}
        message={messageOf("email")}
        onChange={(event) => edit("email", event.value ?? "")}
        onSubmit={advance}
        register={register(registry.current, inputId("email"))}
      />
    </div>
  );

  const workspaceStep = (): ReactNode => (
    <div
      testId="wizard-step-workspace"
      style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md }}
    >
      <TextField
        label="Workspace slug"
        testId={inputId("slug")}
        value={draft.slug}
        message={messageOf("slug")}
        onChange={(event) => edit("slug", event.value ?? "")}
        onSubmit={advance}
        register={register(registry.current, inputId("slug"))}
      />
      <TextField
        label="Team"
        testId={inputId("team")}
        value={draft.team}
        message={messageOf("team")}
        onChange={(event) => edit("team", event.value ?? "")}
        onSubmit={advance}
        register={register(registry.current, inputId("team"))}
      />
    </div>
  );

  const reviewStep = (): ReactNode => (
    <div
      testId="wizard-step-review"
      style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md }}
    >
      <text
        testId="wizard-review"
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {summary(draft)}
      </text>
      <Pressable
        testId="wizard-submit"
        onClick={submit}
        ref={register(registry.current, "wizard-submit")}
      >
        Create workspace
      </Pressable>
      {Option.match(created, {
        onNone: () => null,
        onSome: (value) => (
          <text
            testId="wizard-done"
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.success,
            }}
          >
            {`Created ${value}`}
          </text>
        ),
      })}
    </div>
  );

  const stepContent = (value: StepIndex): ReactNode =>
    Match.value(value).pipe(
      Match.when(1, () => accountStep()),
      Match.when(2, () => workspaceStep()),
      Match.when(3, () => reviewStep()),
      Match.exhaustive,
    );

  return (
    <div
      testId="wizard-frame"
      style={{
        width: FRAME_WIDTH,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <Pressable
        testId="wizard-mode"
        onClick={() => {
          setMode((current) => (current === "unmount" ? "hide" : "unmount"));
          setLast("mode");
        }}
      >
        {`steps: ${mode}`}
      </Pressable>

      <div
        testId="wizard-steps"
        role="list"
        aria-label="Steps"
        style={{ display: "flex", flexDirection: "row", gap: theme.spacing.lg }}
      >
        {Arr.map(STEP_ORDER, (value) => (
          <div
            key={value}
            testId={`wizard-step-${value}`}
            aria-id={`wizard-step-${value}`}
            role="listitem"
            aria-label={STEP_TITLES[value]}
            aria-selected={step === value}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: theme.radius.full,
                backgroundColor:
                  step === value ? theme.colors.primary : theme.colors.muted,
              }}
            >
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color:
                    step === value
                      ? theme.colors.primaryForeground
                      : theme.colors.mutedForeground,
                }}
              >
                {`${value}`}
              </text>
            </div>
            <text
              style={{
                ...textStyle(theme, "label"),
                color: theme.colors.foreground,
              }}
            >
              {STEP_TITLES[value]}
            </text>
          </div>
        ))}
      </div>

      <div
        testId="wizard-body"
        style={{
          position: "relative",
          width: "100%",
          height: BODY_HEIGHT,
        }}
      >
        {mode === "unmount"
          ? stepContent(step)
          : Arr.map(STEP_ORDER, (value) => (
              <div
                key={value}
                testId={`wizard-slot-${value}`}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: BODY_HEIGHT,
                  visibility: value === step ? "visible" : "hidden",
                  pointerEvents: value === step ? "auto" : "none",
                }}
              >
                {stepContent(value)}
              </div>
            ))}
      </div>

      <div
        testId="wizard-footer"
        style={{ display: "flex", flexDirection: "row", gap: theme.spacing.sm }}
      >
        {step === 1 ? null : (
          <Pressable
            testId="wizard-back"
            onClick={back}
            ref={register(registry.current, "wizard-back")}
          >
            Back
          </Pressable>
        )}
        {step === 3 ? null : (
          <Pressable
            testId="wizard-next"
            onClick={advance}
            ref={register(registry.current, "wizard-next")}
          >
            Next
          </Pressable>
        )}
      </div>

      <Readout testId="wizard-readout">
        {describeWizard({
          step,
          mode,
          draft,
          errors,
          submits,
          last,
          created,
        })}
      </Readout>
    </div>
  );
};

/** The a11y `value` of an input, or `""` when empty. */
const editorValue = (ctx: Smoke.SmokeContext, testId: string) =>
  Effect.map(
    ctx.expectSome(`the ${testId} node is exposed`, ariaOf(ctx, testId)),
    (node) => Option.getOrElse(node.value, () => ""),
  );

export const wizardScenario: PlaygroundScenario = {
  id: "wizard-flow",
  title: "Multi-step form: steps, focus, validation and draft survival",
  capability: "wizard",
  view: () => <WizardProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectSome(
        "the wizard frame is painted",
        Option.fromNullishOr(ctx.host.bounds("wizard-frame")),
      );
      yield* ctx.expectEqual(
        "the wizard starts on the account step",
        read(ctx, "wizard-readout"),
        "step=1 mode=unmount name=none email=none slug=none team=none errors=0 submits=0 last=start created=none summary=none",
      );
      yield* ctx.expectEqual(
        "the account input is the input host element",
        elementTypeOf(ctx, "wizard-name"),
        "input",
      );
      yield* ctx.expectEqual(
        "the workspace step is not mounted",
        Option.isNone(painted(ctx, "wizard-slug")),
        true,
      );
      yield* ctx.expectEqual(
        "the review is not mounted",
        Option.isNone(painted(ctx, "wizard-review")),
        true,
      );
      const paintedText = Arr.join(ctx.host.paintedText(), "\n");
      yield* ctx.expectContains(
        "the indicator paints the first step",
        paintedText,
        "Account",
      );
      yield* ctx.expectContains(
        "the indicator paints the last step",
        paintedText,
        "Review",
      );

      const firstChip = yield* ctx.expectSome(
        "the first step chip is exposed",
        ariaOf(ctx, "wizard-step-1"),
      );
      yield* ctx.expectEqual(
        "the first step chip is a ListItem",
        Option.getOrElse(firstChip.role, () => "none"),
        "ListItem",
      );
      yield* ctx.expectEqual(
        "the current chip is selected",
        Option.getOrElse(firstChip.selected, () => false),
        true,
      );
      const secondChip = yield* ctx.expectSome(
        "the second step chip is exposed",
        ariaOf(ctx, "wizard-step-2"),
      );
      yield* ctx.expectEqual(
        "the next chip is not selected",
        Option.getOrElse(secondChip.selected, () => true),
        false,
      );

      // 1. A rejected Next paints every message and focuses the first field.
      ctx.host.click("wizard-next");
      yield* ctx.expectContains(
        "the wizard stays on the account step",
        read(ctx, "wizard-readout"),
        "step=1",
      );
      yield* ctx.expectContains(
        "an empty step reports both fields",
        read(ctx, "wizard-readout"),
        "errors=name,email",
      );
      yield* ctx.expectContains(
        "the name message is the schema's own",
        read(ctx, "wizard-name-error"),
        MESSAGES.name,
      );
      yield* ctx.expectEqual(
        "an invalid step focuses its first field",
        focusedId(ctx),
        "wizard-name",
      );

      // 2. Editing one field clears only its message.
      ctx.host.click("wizard-name");
      ctx.host.key("a d a");
      yield* ctx.expectContains(
        "typing reaches the draft",
        read(ctx, "wizard-readout"),
        "name=ada",
      );
      yield* ctx.expectContains(
        "editing a field clears only its own error",
        read(ctx, "wizard-readout"),
        "errors=email",
      );
      yield* ctx.expectEqual(
        "the cleared message unpaints",
        Option.isNone(painted(ctx, "wizard-name-error")),
        true,
      );

      // 3. The next rejection focuses the remaining field.
      ctx.host.click("wizard-next");
      yield* ctx.expectContains(
        "the second rejection reports the email",
        read(ctx, "wizard-readout"),
        "errors=email",
      );
      yield* ctx.expectEqual(
        "the second rejection focuses the email",
        focusedId(ctx),
        "wizard-email",
      );

      // 4. A valid step swaps the subtree and focuses its first control.
      ctx.host.click("wizard-email");
      ctx.host.key("a d a @ x");
      yield* ctx.expectContains(
        "the email reaches the draft",
        read(ctx, "wizard-readout"),
        "email=ada@x",
      );
      yield* ctx.expectContains(
        "a valid edit clears the last error",
        read(ctx, "wizard-readout"),
        "errors=0",
      );
      ctx.host.click("wizard-next");
      yield* ctx.expectContains(
        "the valid Next enters the workspace",
        read(ctx, "wizard-readout"),
        "step=2",
      );
      yield* ctx.expectEqual(
        "the account step is unmounted",
        Option.isNone(painted(ctx, "wizard-name")),
        true,
      );
      yield* ctx.expectSome(
        "the workspace input is painted",
        Option.fromNullishOr(ctx.host.bounds("wizard-slug")),
      );
      yield* ctx.expectEqual(
        "a valid step focuses its first field",
        focusedId(ctx),
        "wizard-slug",
      );
      const chip2 = yield* ctx.expectSome(
        "the second chip is exposed",
        ariaOf(ctx, "wizard-step-2"),
      );
      yield* ctx.expectEqual(
        "the indicator marks the second step",
        Option.getOrElse(chip2.selected, () => false),
        true,
      );

      // 5. Back restores the draft from app state — not from a retained editor.
      ctx.host.click("wizard-back");
      yield* ctx.expectContains(
        "Back returns to the account",
        read(ctx, "wizard-readout"),
        "step=1",
      );
      yield* ctx.expectContains(
        "Back names itself",
        read(ctx, "wizard-readout"),
        "last=back",
      );
      yield* ctx.expectEqual(
        "the name draft survives the unmount",
        yield* editorValue(ctx, "wizard-name"),
        "ada",
      );
      yield* ctx.expectEqual(
        "the email draft survives the unmount",
        yield* editorValue(ctx, "wizard-email"),
        "ada@x",
      );
      yield* ctx.expectEqual(
        "Back focuses the step's first field",
        focusedId(ctx),
        "wizard-name",
      );
      ctx.host.click("wizard-next");
      yield* ctx.expectContains(
        "the second visit enters the workspace",
        read(ctx, "wizard-readout"),
        "step=2",
      );
      yield* ctx.expectEqual(
        "the second visit focuses the slug",
        focusedId(ctx),
        "wizard-slug",
      );

      // 6. Enter submits the step; the first invalid field takes focus.
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter stays on the workspace when the slug is empty",
        read(ctx, "wizard-readout"),
        "errors=slug",
      );
      yield* ctx.expectContains(
        "Enter paints the slug message",
        read(ctx, "wizard-slug-error"),
        MESSAGES.slug,
      );
      yield* ctx.expectEqual(
        "Enter re-focuses the invalid slug",
        focusedId(ctx),
        "wizard-slug",
      );
      ctx.host.click("wizard-slug");
      ctx.host.key("m y - w");
      yield* ctx.expectContains(
        "the slug reaches the draft",
        read(ctx, "wizard-readout"),
        "slug=my-w",
      );
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter advances past a valid field",
        read(ctx, "wizard-readout"),
        "errors=team",
      );
      yield* ctx.expectEqual(
        "Enter focuses the next invalid field",
        focusedId(ctx),
        "wizard-team",
      );
      ctx.host.click("wizard-team");
      ctx.host.key("c o r e");
      ctx.host.click("wizard-next");
      yield* ctx.expectContains(
        "the review is the third step",
        read(ctx, "wizard-readout"),
        "step=3",
      );
      yield* ctx.expectContains(
        "the review paints the draft",
        read(ctx, "wizard-review"),
        "ada <ada@x> my-w / core",
      );
      yield* ctx.expectEqual(
        "the review unmounts the editors",
        Option.isNone(painted(ctx, "wizard-slug")),
        true,
      );
      yield* ctx.expectEqual(
        "the review focuses its action",
        focusedId(ctx),
        "wizard-submit",
      );

      // 7. Submit reports the decoded draft once.
      ctx.host.click("wizard-submit");
      yield* ctx.expectContains(
        "a submit counts once",
        read(ctx, "wizard-readout"),
        "submits=1",
      );
      yield* ctx.expectContains(
        "a submit names itself",
        read(ctx, "wizard-readout"),
        "last=submit",
      );
      yield* ctx.expectContains(
        "a submit reports the decoded draft",
        read(ctx, "wizard-done"),
        "Created ada <ada@x> my-w / core",
      );

      // 8. Back through both steps restores every draft.
      ctx.host.click("wizard-back");
      yield* ctx.expectEqual(
        "the slug survives the review",
        yield* editorValue(ctx, "wizard-slug"),
        "my-w",
      );
      yield* ctx.expectEqual(
        "the team survives the review",
        yield* editorValue(ctx, "wizard-team"),
        "core",
      );
      yield* ctx.expectEqual(
        "Back from the review focuses the slug",
        focusedId(ctx),
        "wizard-slug",
      );
      ctx.host.click("wizard-back");
      yield* ctx.expectEqual(
        "the name survives a second Back",
        yield* editorValue(ctx, "wizard-name"),
        "ada",
      );
      yield* ctx.expectEqual(
        "the email survives a second Back",
        yield* editorValue(ctx, "wizard-email"),
        "ada@x",
      );

      // 9. Only the mounted step is in the tab order.
      ctx.host.click("wizard-name");
      const walk = Arr.range(1, 4).map(() => {
        ctx.host.focusNext();
        return focusedId(ctx);
      });
      yield* ctx.expectEqual(
        "the unmounted steps leave the tab order",
        Arr.every(
          walk,
          (id) =>
            !Arr.contains(
              [
                "wizard-slug",
                "wizard-team",
                "wizard-submit",
                "wizard-back",
              ],
              id,
            ),
        ),
        true,
      );
      yield* ctx.expectEqual(
        "the tab walk stays in the account",
        Option.getOrElse(Arr.last(walk), () => "none"),
        "wizard-name",
      );

      // 10. Hide mode retains the inactive subtrees without painting them.
      ctx.host.click("wizard-mode");
      yield* ctx.expectContains(
        "the mode toggles to hide",
        read(ctx, "wizard-readout"),
        "mode=hide",
      );
      yield* ctx.expectEqual(
        "a hidden step is retained",
        elementTypeOf(ctx, "wizard-slug"),
        "input",
      );
      yield* ctx.expectEqual(
        "a hidden step is not painted",
        Option.isNone(painted(ctx, "wizard-slug")),
        true,
      );
      yield* ctx.expectEqual(
        "a hidden step's text is not painted",
        Arr.contains(ctx.host.paintedText(), "Workspace slug"),
        false,
      );
      ctx.host.click("wizard-name");
      const hiddenWalk = Arr.range(1, 4).map(() => {
        ctx.host.focusNext();
        return focusedId(ctx);
      });
      yield* ctx.expectEqual(
        "a hidden step leaves the tab order",
        Arr.every(hiddenWalk, (id) => id !== "wizard-slug"),
        true,
      );
      ctx.host.click("wizard-next");
      yield* ctx.expectEqual(
        "the hidden step still focuses on entry",
        focusedId(ctx),
        "wizard-slug",
      );
      ctx.host.click("wizard-back");
      yield* ctx.expectEqual(
        "the retained editor kept its value",
        yield* editorValue(ctx, "wizard-name"),
        "ada",
      );
    }),
};
