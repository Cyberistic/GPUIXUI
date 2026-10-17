/**
 * `input-edit` — typing into `<input>` and `<textarea>`.
 *
 * GPUix requires `autoFocus` (or a click) before a field receives key events, so
 * the first step clicks the field. The readout is the controlled value, which
 * proves the native edit reached React through `onChange`; `onSubmit` proves
 * Enter is delivered.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { theme } from "../theme.js";
import type { PlaygroundScenario } from "../types.js";

const InputProbe = () => {
  const [value, setValue] = useState("");
  const [submits, setSubmits] = useState(0);
  const [note, setNote] = useState("");

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 400 }}
    >
      <input
        testId="input-field"
        value={value}
        placeholder="type here"
        onChange={(event) => setValue(event.value ?? "")}
        onSubmit={() => setSubmits((count) => count + 1)}
        style={{
          color: theme.text,
          backgroundColor: theme.panelAlt,
          padding: 8,
        }}
      />
      <textarea
        testId="input-area"
        value={note}
        minRows={2}
        onChange={(event) => setNote(event.value ?? "")}
        style={{
          color: theme.text,
          backgroundColor: theme.panelAlt,
          padding: 8,
        }}
      />
      <text testId="input-readout" style={{ color: theme.muted, fontSize: 12 }}>
        {`value=${value} submits=${submits} area=${note.replace(/\n/g, "|")}`}
      </text>
    </div>
  );
};

export const inputScenario: PlaygroundScenario = {
  id: "input-edit",
  title: "Input editing, onChange and onSubmit",
  capability: "input",
  view: () => <InputProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("input-field");
      ctx.host.key("h");
      ctx.host.key("i");
      const readout = yield* ctx.expectSome(
        "input readout present",
        Option.fromNullishOr(ctx.host.text("input-readout")),
      );
      yield* ctx.expectContains("typing reached onChange", readout, "value=hi");

      ctx.host.key("enter");
      const afterEnter = yield* ctx.expectSome(
        "input readout after enter",
        Option.fromNullishOr(ctx.host.text("input-readout")),
      );
      yield* ctx.expectContains(
        "Enter reached onSubmit",
        afterEnter,
        "submits=1",
      );

      ctx.host.click("input-area");
      ctx.host.key("x");
      const area = yield* ctx.expectSome(
        "textarea readout present",
        Option.fromNullishOr(ctx.host.text("input-readout")),
      );
      yield* ctx.expectContains("textarea edited", area, "area=x");
    }),
};
