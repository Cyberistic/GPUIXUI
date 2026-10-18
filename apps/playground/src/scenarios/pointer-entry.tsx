/**
 * `pointer-text-entry` — the native editor's pointer half.
 *
 * `text-entry` (plan `188`) proves the keyboard contract. Every inline rename,
 * search box, tag input and table-cell editor also depends on the pointer:
 * where a click puts the caret, whether a drag selects, whether a click clears
 * that selection, whether `shift`-click extends it, and whether Enter and the
 * arrow keys work in a `<textarea>`.
 *
 * Measured (plan `343` §2): the runtime's editor owns all of it — a click lands
 * on the nearest glyph, a drag selects, a plain click clears, `shift`-click
 * extends, and Enter/Up navigate a textarea. A component must therefore not
 * reimplement selection, and must not swallow a modified click.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import type { EventPayload } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { textStyle } from "@gpuixui/tokens";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

/** A controlled editor with its own state, so each gesture starts from a clean run. */
const Field = ({
  id,
  initial,
  area = false,
}: {
  readonly id: string;
  readonly initial: string;
  readonly area?: boolean;
}) => {
  const theme = useTheme();
  const [value, setValue] = useState(initial);
  const style = {
    width: 300,
    fontSize: 20,
    fontFamily: textStyle(theme, "code").fontFamily,
  };
  const onChange = (event: EventPayload): void => {
    if (event.value !== undefined) setValue(event.value);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {area ? (
        <textarea testId={id} value={value} onChange={onChange} style={style} />
      ) : (
        <input testId={id} value={value} onChange={onChange} style={style} />
      )}
      <Readout testId={`${id}-readout`}>{value}</Readout>
    </div>
  );
};

const PointerEntryProbe = () => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 360,
        backgroundColor: theme.colors.background,
      }}
    >
      <Field id="pointer-field" initial="abcdef" />
      <Field id="pointer-drag-field" initial="abcdef" />
      <Field id="pointer-shift-field" initial="abcdef" />
      <Field id="pointer-area" initial="" area />
    </div>
  );
};

export const pointerEntryScenario: PlaygroundScenario = {
  id: "pointer-text-entry",
  title: "Pointer entry: caret, drag selection, shift-click and textarea lines",
  capability: "input",
  view: () => <PointerEntryProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const box = (id: string) =>
        ctx.expectSome(
          `${id} painted`,
          Option.fromNullishOr(ctx.host.bounds(id)),
        );
      const read = (id: string) =>
        ctx.expectSome(
          `${id} readout present`,
          Option.fromNullishOr(ctx.host.text(`${id}-readout`)),
        );
      const middle = (bounds: {
        readonly y: number;
        readonly height: number;
      }) => bounds.y + bounds.height / 2;

      // A click places the caret at the nearest glyph: start, middle, end.
      const field = yield* box("pointer-field");
      ctx.host.clickWindow(field.x + 25, middle(field));
      ctx.host.key("M");
      ctx.host.advance(0);
      const middleValue = yield* read("pointer-field");
      const marker = middleValue.indexOf("M");
      yield* ctx.expectEqual(
        "a middle click puts the caret inside the run",
        marker > 0 && marker < 6,
        true,
      );
      ctx.host.clickWindow(field.x + field.width - 4, middle(field));
      ctx.host.key("2");
      ctx.host.advance(0);
      const atEnd = yield* read("pointer-field");
      yield* ctx.expectEqual(
        "a right-edge click appends",
        atEnd.endsWith("2"),
        true,
      );
      ctx.host.clickWindow(field.x + 3, middle(field));
      ctx.host.key("1");
      ctx.host.advance(0);
      const atStart = yield* read("pointer-field");
      yield* ctx.expectEqual(
        "a left-edge click prepends",
        atStart.startsWith("1"),
        true,
      );

      // A drag selects the run; typing replaces it. A later click clears it.
      const drag = yield* box("pointer-drag-field");
      ctx.host.pressWindow(drag.x + 3, middle(drag));
      ctx.host.movePointer(drag.x + 120, middle(drag));
      ctx.host.releasePointer(drag.x + 120, middle(drag));
      ctx.host.key("Z");
      ctx.host.advance(0);
      const dragged = yield* read("pointer-drag-field");
      yield* ctx.expectEqual("a drag selects the whole run", dragged, "Z");
      ctx.host.clickWindow(drag.x + drag.width - 4, middle(drag));
      ctx.host.key("Y");
      ctx.host.advance(0);
      const afterClick = yield* read("pointer-drag-field");
      yield* ctx.expectEqual(
        "a plain click clears the drag selection",
        afterClick,
        "ZY",
      );

      // Shift-click extends from the first click to the second.
      const shift = yield* box("pointer-shift-field");
      ctx.host.clickWindow(shift.x + 3, middle(shift));
      ctx.host.clickWindow(shift.x + 120, middle(shift), "shift");
      ctx.host.key("S");
      ctx.host.advance(0);
      const shifted = yield* read("pointer-shift-field");
      yield* ctx.expectEqual("shift-click extends the selection", shifted, "S");

      // A textarea takes a newline and Up moves back to the previous line.
      const area = yield* box("pointer-area");
      ctx.host.clickWindow(area.x + 3, area.y + 12);
      ctx.host.key("x");
      ctx.host.key("enter");
      ctx.host.key("y");
      ctx.host.advance(0);
      const typed = yield* read("pointer-area");
      yield* ctx.expectEqual(
        "Enter inserts a newline in a textarea",
        typed,
        "x\ny",
      );
      const grown = yield* box("pointer-area");
      yield* ctx.expectNear(
        "a two-line textarea autosizes",
        grown.height,
        64,
        1,
      );
      ctx.host.key("up");
      ctx.host.key("Z");
      ctx.host.advance(0);
      const rewound = yield* read("pointer-area");
      yield* ctx.expectEqual("Up moves to the previous line", rewound, "xZ\ny");
    }),
};
