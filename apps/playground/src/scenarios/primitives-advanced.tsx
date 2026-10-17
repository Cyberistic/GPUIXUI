/**
 * The remaining Tier 1 controls: `RadioGroup`, `Rating`, `NumberField` and
 * `OTPField`.
 *
 * These are the package's most intricate keyboard contracts — arrow selection
 * that moves native focus, a rating that clamps and clears, a number over a
 * text input, and one code spread over six cells. The runtime tests in
 * `packages/primitives` are opt-in; this is the shared gate.
 *
 * Measured facts: plan `169` §8.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  NumberField,
  OTPField,
  RadioGroup,
  Rating,
  ThemeProvider as PrimitiveThemeProvider,
} from "@gpuixui/primitives";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import { focusedId, node, read, text, treeOf } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";

const CADENCES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "never", label: "Never" },
] as const;

const ChoiceProbe = () => {
  const theme = useTheme();
  const [cadence, setCadence] = useState("daily");
  const [rating, setRating] = useState(0);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16, width: 420 }}
    >
      <PrimitiveThemeProvider theme={theme}>
        <RadioGroup
          testId="choice-radio"
          label="Digest cadence"
          value={cadence}
          onChange={setCadence}
          options={[...CADENCES]}
        />
        <Rating
          testId="choice-rating"
          label="Satisfaction"
          max={5}
          value={rating}
          onChange={setRating}
        />
      </PrimitiveThemeProvider>
      <Readout testId="choice-readout">
        {`cadence=${cadence} rating=${rating}`}
      </Readout>
    </div>
  );
};

const EntryProbe = () => {
  const theme = useTheme();
  const [quantity, setQuantity] = useState(5);
  const [code, setCode] = useState("");
  const [completes, setCompletes] = useState(0);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16, width: 440 }}
    >
      <PrimitiveThemeProvider theme={theme}>
        <NumberField
          testId="entry-quantity"
          label="Quantity"
          value={quantity}
          onChange={setQuantity}
          min={0}
          max={10}
          autoFocus
        />
        <OTPField
          testId="entry-code"
          label="Code"
          length={6}
          value={code}
          onChange={setCode}
          onComplete={() => setCompletes((count) => count + 1)}
        />
      </PrimitiveThemeProvider>
      <Readout testId="entry-readout">
        {`quantity=${quantity} code=${code} complete=${completes}`}
      </Readout>
    </div>
  );
};

export const primitivesChoiceScenario: PlaygroundScenario = {
  id: "primitives-choice",
  title: "Tier 1: RadioGroup and Rating keyboard contracts",
  capability: "components",
  view: () => <ChoiceProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const radio = yield* ctx.expectSome(
        "the radio group paints",
        Option.fromNullishOr(ctx.host.bounds("choice-radio")),
      );
      // No item carries a testId (the package renders one per option), so the
      // click is aimed inside the first row's circle. The assertion is the
      // selection, not the pixel.
      ctx.host.clickWindow(radio.x + 8, radio.y + radio.height / 6);
      yield* ctx.expectContains(
        "a click selects an option",
        read(ctx, "choice-readout"),
        "cadence=daily",
      );

      ctx.host.keyDown("choice-radio", "down");
      ctx.host.keyUp("choice-radio", "down");
      yield* ctx.expectContains(
        "Down moves the selection",
        read(ctx, "choice-readout"),
        "cadence=weekly",
      );
      const weeklyTree = yield* treeOf(ctx);
      const weekly = yield* node(ctx, weeklyTree, "RadioButton", "Weekly");
      yield* ctx.expectEqual(
        "the new option announces checked",
        text(weekly.value),
        "checked",
      );

      ctx.host.keyDown("choice-radio", "up");
      ctx.host.keyUp("choice-radio", "up");
      yield* ctx.expectContains(
        "Up wraps back to the first option",
        read(ctx, "choice-readout"),
        "cadence=daily",
      );

      ctx.host.clickWindow(radio.x + 8, radio.y + radio.height / 2);
      yield* ctx.expectContains(
        "a click on the second row agrees with the key path",
        read(ctx, "choice-readout"),
        "cadence=weekly",
      );

      const stars = yield* ctx.expectSome(
        "the rating paints",
        Option.fromNullishOr(ctx.host.bounds("choice-rating")),
      );
      ctx.host.clickWindow(stars.x + 8, stars.y + stars.height / 2);
      yield* ctx.expectContains(
        "a click on the first star rates one",
        read(ctx, "choice-readout"),
        "rating=1",
      );

      ctx.host.keyDown("choice-rating", "right");
      ctx.host.keyUp("choice-rating", "right");
      yield* ctx.expectContains(
        "Right raises the rating",
        read(ctx, "choice-readout"),
        "rating=2",
      );
      ctx.host.keyDown("choice-rating", "end");
      ctx.host.keyUp("choice-rating", "end");
      yield* ctx.expectContains(
        "End jumps to the last star",
        read(ctx, "choice-readout"),
        "rating=5",
      );
      const fullTree = yield* treeOf(ctx);
      const fifth = yield* node(ctx, fullTree, "RadioButton", "5 of 5");
      yield* ctx.expectEqual(
        "the fifth star announces checked",
        text(fifth.value),
        "checked",
      );
      ctx.host.keyDown("choice-rating", "right");
      ctx.host.keyUp("choice-rating", "right");
      yield* ctx.expectContains(
        "Right clamps at the last star",
        read(ctx, "choice-readout"),
        "rating=5",
      );
      ctx.host.keyDown("choice-rating", "delete");
      ctx.host.keyUp("choice-rating", "delete");
      yield* ctx.expectContains(
        "Delete clears the rating",
        read(ctx, "choice-readout"),
        "rating=0",
      );
      ctx.host.keyDown("choice-rating", "left");
      ctx.host.keyUp("choice-rating", "left");
      yield* ctx.expectContains(
        "Left clamps at zero",
        read(ctx, "choice-readout"),
        "rating=0",
      );
    }),
};

export const primitivesEntryScenario: PlaygroundScenario = {
  id: "primitives-entry",
  title: "Tier 1: NumberField and OTPField editing contracts",
  capability: "components",
  view: () => <EntryProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.key("up");
      yield* ctx.expectContains(
        "Up steps the number up",
        read(ctx, "entry-readout"),
        "quantity=6",
      );
      ctx.host.key("down");
      ctx.host.key("down");
      yield* ctx.expectContains(
        "Down steps it twice",
        read(ctx, "entry-readout"),
        "quantity=4",
      );

      ctx.host.key("9");
      ctx.host.key("9");
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "a committed typed value clamps to the maximum",
        read(ctx, "entry-readout"),
        "quantity=10",
      );
      ctx.host.key("down");
      yield* ctx.expectContains(
        "the clamped value still steps",
        read(ctx, "entry-readout"),
        "quantity=9",
      );
      const numberTree = yield* treeOf(ctx);
      const quantity = yield* node(ctx, numberTree, "TextInput", "Quantity");
      yield* ctx.expectEqual(
        "the field exposes the committed value",
        text(quantity.value),
        "9",
      );

      ctx.host.click("entry-code-cell-1");
      Arr.forEach(["1", "2", "3", "4", "5", "6"], (digit) =>
        ctx.host.key(digit),
      );
      yield* ctx.expectContains(
        "six digits complete the code",
        read(ctx, "entry-readout"),
        "code=123456 complete=1",
      );
      yield* ctx.expectEqual(
        "focus advanced to the last cell",
        focusedId(ctx),
        "entry-code-cell-6",
      );

      ctx.host.keyDown("entry-code-cell-6", "backspace");
      ctx.host.keyUp("entry-code-cell-6", "backspace");
      yield* ctx.expectContains(
        "Backspace deletes exactly one character",
        read(ctx, "entry-readout"),
        "code=12345",
      );

      ctx.host.keyDown("entry-code-cell-6", "left");
      ctx.host.keyUp("entry-code-cell-6", "left");
      yield* ctx.expectEqual(
        "Left moves native focus back one cell",
        focusedId(ctx),
        "entry-code-cell-5",
      );
      ctx.host.key("7");
      yield* ctx.expectContains(
        "typing in the focused cell rewrites that digit",
        read(ctx, "entry-readout"),
        "code=12347",
      );
    }),
};
