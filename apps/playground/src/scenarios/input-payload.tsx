/**
 * `input-payload` — the fields every pointer and key handler receives.
 *
 * The library's handlers already read three fields that no scenario had
 * measured (plan `524`):
 *
 * - `clickCount`: a component would like a double click, but the runtime
 *   reports `1` for every click in both harnesses. The probe records every
 *   count, so a future runtime that starts counting fails here.
 * - `keyChar` / `isHeld`: a text field reports the produced character
 *   (Unicode included) and a repeat is marked; a plain focusable `div` gets
 *   neither.
 * - `precise` / `touchPhase`: a simulated wheel is always a precise gesture
 *   phase, so a component cannot use it to tell a trackpad from a line wheel.
 *
 * The native editor also consumes `cmd-a` before React's `onKeyDown`, which is
 * why the field's key log has no such entry while its value is still replaced
 * by the next character.
 */
import { useState } from "react";
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

/** The event fields this probe reads; GPUix supplies the rest. */
interface InputEvent {
  readonly key?: string;
  readonly keyChar?: string;
  readonly isHeld?: boolean;
  readonly clickCount?: number;
  readonly button?: number;
  readonly x?: number;
  readonly y?: number;
  readonly deltaY?: number;
  readonly precise?: boolean;
  readonly touchPhase?: string;
  readonly value?: string;
  readonly modifiers?: { readonly cmd?: boolean };
}

/** `${key}/${keyChar}/${phase}/${chord}` — absent fields are `-`. */
const keyLine = (event: InputEvent): string =>
  `${event.key ?? "-"}/${event.keyChar ?? "-"}/${
    event.isHeld === true ? "held" : "down"
  }/${event.modifiers?.cmd === true ? "cmd" : "-"}`;

/** `${key}:${keyChar}` — the text field's produced character. */
const typedLine = (event: InputEvent): string =>
  `${event.key ?? "-"}:${event.keyChar ?? "-"}`;

const InputPayloadProbe = () => {
  const theme = useTheme();
  const [counts, setCounts] = useState<ReadonlyArray<number>>([]);
  const [lastClick, setLastClick] = useState("-");
  const [lastPress, setLastPress] = useState("-");
  const [lastKey, setLastKey] = useState("-");
  const [lastFieldKey, setLastFieldKey] = useState("-");
  const [fieldKeys, setFieldKeys] = useState<ReadonlyArray<string>>([]);
  const [value, setValue] = useState("");
  const [wheel, setWheel] = useState("-");

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 360 }}
    >
      <div
        testId="payload-target"
        tabIndex={0}
        role="group"
        aria-label="Payload target"
        onClick={(event: InputEvent) => {
          setCounts((current) => Arr.append(current, event.clickCount ?? 0));
          setLastClick(`${event.button ?? "-"}/${event.x},${event.y}`);
        }}
        onMouseDown={(event: InputEvent) =>
          setLastPress(`${event.clickCount ?? "-"}`)
        }
        onKeyDown={(event: InputEvent) => setLastKey(keyLine(event))}
        onScroll={(event: InputEvent) =>
          setWheel(
            `${event.deltaY}/${event.precise}/${event.touchPhase ?? "-"}`,
          )
        }
        style={{
          width: 200,
          height: 120,
          backgroundColor: theme.colors.muted,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      />
      <Readout testId="payload-clicks">{`${counts.length}`}</Readout>
      <Readout testId="payload-counts">
        {Arr.join(
          Arr.map(counts, (count) => `${count}`),
          ",",
        )}
      </Readout>
      <Readout testId="payload-last">{lastClick}</Readout>
      <Readout testId="payload-press">{lastPress}</Readout>
      <Readout testId="payload-key">{lastKey}</Readout>
      <Readout testId="payload-wheel">{wheel}</Readout>
      <input
        testId="payload-field"
        value={value}
        onChange={(event: InputEvent) => setValue(event.value ?? "")}
        onKeyDown={(event: InputEvent) => {
          setLastFieldKey(typedLine(event));
          setFieldKeys((current) => Arr.append(current, typedLine(event)));
        }}
        style={{
          width: 200,
          color: theme.colors.inputForeground,
          backgroundColor: theme.colors.input,
          padding: theme.spacing.xs,
        }}
      />
      <Readout testId="payload-field-key">{lastFieldKey}</Readout>
      <Readout testId="payload-keys">{Arr.join(fieldKeys, "|")}</Readout>
      <Readout testId="payload-value">{value}</Readout>
    </div>
  );
};

type SmokeContext = Parameters<PlaygroundScenario["steps"]>[0];

/** Reads a readout, failing by name when the view did not mount it. */
const read = (ctx: SmokeContext, testId: string) =>
  ctx.expectSome(
    `${testId} is painted`,
    Option.fromNullishOr(ctx.host.text(testId)),
  );

export const inputPayloadScenario: PlaygroundScenario = {
  id: "input-payload",
  title: "Input payloads: click count, key char and repeat",
  capability: "input",
  view: () => <InputPayloadProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const box = yield* ctx.expectSome(
        "payload target painted",
        Option.fromNullishOr(ctx.host.bounds("payload-target")),
      );
      const cx = Math.round(box.x + box.width / 2);
      const cy = Math.round(box.y + box.height / 2);

      ctx.host.click("payload-target");
      yield* ctx.expectEqual(
        "a click is counted once",
        yield* read(ctx, "payload-clicks"),
        "1",
      );
      yield* ctx.expectEqual(
        "a click reports one click",
        yield* read(ctx, "payload-counts"),
        "1",
      );
      yield* ctx.expectEqual(
        "a click carries the primary button and its centre",
        yield* read(ctx, "payload-last"),
        `0/${cx},${cy}`,
      );

      yield* Effect.sleep(Duration.millis(80));
      ctx.host.click("payload-target");
      yield* Effect.sleep(Duration.millis(80));
      ctx.host.click("payload-target");
      yield* ctx.expectEqual(
        "three clicks are three clicks",
        yield* read(ctx, "payload-clicks"),
        "3",
      );
      yield* ctx.expectEqual(
        "no click is a double click",
        yield* read(ctx, "payload-counts"),
        "1,1,1",
      );

      ctx.host.press("payload-target");
      ctx.host.releasePointer(cx, cy);
      yield* ctx.expectEqual(
        "a press reports one click",
        yield* read(ctx, "payload-press"),
        "1",
      );
      yield* ctx.expectEqual(
        "a press/release pair is one more click",
        yield* read(ctx, "payload-clicks"),
        "4",
      );

      ctx.host.keyDown("payload-target", "a");
      ctx.host.keyUp("payload-target", "a");
      yield* ctx.expectEqual(
        "a plain key is not held",
        yield* read(ctx, "payload-key"),
        "a/-/down/-",
      );

      ctx.host.keyDown("payload-target", "a", true);
      ctx.host.keyUp("payload-target", "a");
      yield* ctx.expectEqual(
        "a forced repeat is held",
        yield* read(ctx, "payload-key"),
        "a/-/held/-",
      );

      ctx.host.key("cmd-a");
      yield* ctx.expectEqual(
        "a div sees a command chord",
        yield* read(ctx, "payload-key"),
        "a/-/down/cmd",
      );

      ctx.host.click("payload-field");
      ctx.host.key("h");
      yield* ctx.expectEqual(
        "the field receives typed text",
        yield* read(ctx, "payload-keys"),
        "h:h",
      );
      ctx.host.key("space");
      yield* ctx.expectEqual(
        "the field reports the character, not the key name",
        yield* read(ctx, "payload-field-key"),
        "space: ",
      );
      ctx.host.key("é");
      ctx.host.key("日");
      yield* ctx.expectEqual(
        "non-ASCII typing reaches React",
        yield* read(ctx, "payload-value"),
        "h é日",
      );
      yield* ctx.expectEqual(
        "every typed key is reported",
        yield* read(ctx, "payload-keys"),
        "h:h|space: |é:é|日:日",
      );

      ctx.host.key("cmd-a");
      yield* ctx.expectEqual(
        "the native editor consumes select-all",
        yield* read(ctx, "payload-keys"),
        "h:h|space: |é:é|日:日",
      );
      yield* ctx.expectEqual(
        "select-all left the value alone",
        yield* read(ctx, "payload-value"),
        "h é日",
      );

      ctx.host.key("space");
      yield* ctx.expectEqual(
        "the selection was real",
        yield* read(ctx, "payload-value"),
        " ",
      );

      ctx.host.wheel("payload-target", 0, 40);
      yield* ctx.expectEqual(
        "a synthetic wheel is precise",
        yield* read(ctx, "payload-wheel"),
        "40/true/moved",
      );

      ctx.host.click("payload-target");
      ctx.host.key("alt-s");
      yield* ctx.expectEqual(
        "an option chord types nothing",
        yield* read(ctx, "payload-key"),
        "s/-/down/-",
      );
    }),
};
