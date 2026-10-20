/**
 * `OTPField` and the **real clipboard**: a paste fills the whole code.
 *
 * **The bug guarded (plan `752`).** `docs/otp-field.mdx` and the OTP runtime
 * suite's own header said a clipboard paste was "unverified", because 0.10.0 has
 * no `onPaste` and the `TestRenderer` was assumed to have no clipboard. The
 * first fact is true and irrelevant — a paste reaches a native `<input>` as an
 * ordinary multi-character `onChange`, never as `onPaste` — and the second is
 * false: the headless renderer wraps the real platform, so `cmd-c`/`cmd-v` are
 * delivered. The forward fill in `applyOtpInput` was therefore proven only as a
 * pure rule, and the most common gesture in a two-factor form had no native
 * guard: a regression could report one change per character, lose the
 * `onComplete` call or leave focus in the receiving cell, and every suite would
 * stay green.
 *
 * Measured here (release-tag 0.10.0, 2026-10-20): a copied six-digit code lands
 * as **one** `onValueChange` and **one** `onComplete`, fills six cells and
 * leaves focus on the last; separators are dropped, an over-long paste
 * truncates, a paste into a full code fills forward from the receiving cell, and
 * a disabled field refuses the paste.
 *
 * **Pasteboard side effect.** Both the offscreen renderer and a real window use
 * the **system** pasteboard, so running this file replaces the user's clipboard.
 * Every case copies from its own read-only field first and never depends on what
 * the clipboard held (the rule playground plan `764` established).
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Input } from "../src/components/Input.js";
import { OTPField } from "../src/components/OTPField.js";
import { Stack } from "../src/components/Stack.js";
import {
  a11yValueOf,
  isFocusRing,
  type Runtime,
} from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

/** What one paste reported, and what the frame shows afterwards. */
interface PasteResult {
  readonly values: ReadonlyArray<string>;
  readonly complete: ReadonlyArray<string>;
  readonly cells: ReadonlyArray<string>;
  readonly focused: string;
  readonly rings: number;
}

/** The six cells' reported text, in order — one string per cell. */
const cellsOf = (runtime: Runtime, label: string): ReadonlyArray<string> =>
  Arr.map(Arr.range(1, 6), (index) =>
    Option.getOrElse(
      a11yValueOf(runtime.a11y(), {
        role: "TextInput",
        label: `${label} digit ${index}`,
      }),
      () => "",
    ),
  );

/** How many focus rings the window paints. */
const ringsOf = (runtime: Runtime): number =>
  Arr.length(
    Arr.filter(runtime.all(), (element) =>
      isFocusRing(element.style.boxShadow),
    ),
  );

/**
 * Copy `source` from a read-only field, then paste it into cell 1 (or `cell`).
 *
 * The copy always precedes the paste, so the clipboard content is this case's
 * own and nothing depends on the machine's prior clipboard.
 */
const paste = async (
  source: string,
  options: {
    readonly disabled?: boolean;
    readonly defaultValue?: string;
    readonly cell?: number;
  } = {},
): Promise<PasteResult> => {
  const values: string[] = [];
  const complete: string[] = [];
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Input testId="source" label="Source" value={source} readOnly />
        <OTPField
          testId="otp"
          label="Code"
          disabled={options.disabled}
          defaultValue={options.defaultValue}
          onValueChange={(value) => values.push(value)}
          onComplete={(value) => complete.push(value)}
        />
      </Stack>
    </Surface>,
  );
  runtime.click("source");
  runtime.type("cmd-a");
  runtime.type("cmd-c");
  runtime.click(`otp-cell-${options.cell ?? 1}`);
  runtime.type("cmd-v");
  return {
    values,
    complete,
    cells: cellsOf(runtime, "Code"),
    focused: Option.getOrElse(runtime.focused(), () => "nothing"),
    rings: ringsOf(runtime),
  };
};

it("fills the whole code from one paste, with one change and one completion", async () => {
  const result = await paste("123456");
  expect(result.values).toStrictEqual(["123456"]);
  expect(result.complete).toStrictEqual(["123456"]);
  expect(result.cells).toStrictEqual(["1", "2", "3", "4", "5", "6"]);
  // The caret continues where typing would: on the last cell of a full code.
  expect(result.focused).toBe("otp-cell-6");
});

it("drops a separator carried by the pasted text", async () => {
  const result = await paste("123-456");
  expect(result.values).toStrictEqual(["123456"]);
  expect(result.complete).toStrictEqual(["123456"]);
  expect(result.cells).toStrictEqual(["1", "2", "3", "4", "5", "6"]);
});

it("truncates a paste longer than the code", async () => {
  const result = await paste("12345678");
  expect(result.values).toStrictEqual(["123456"]);
  expect(result.complete).toStrictEqual(["123456"]);
  expect(result.cells).toStrictEqual(["1", "2", "3", "4", "5", "6"]);
});

it("fills forward from the receiving cell of a full code", async () => {
  // The receiving cell is replaced first, then the rest fills to the right and
  // truncates, so a paste at cell 3 of `999999` keeps the first two digits.
  const result = await paste("123456", { defaultValue: "999999", cell: 3 });
  expect(result.values).toStrictEqual(["991234"]);
  expect(result.complete).toStrictEqual(["991234"]);
  expect(result.cells).toStrictEqual(["9", "9", "1", "2", "3", "4"]);
  expect(result.focused).toBe("otp-cell-6");
});

it("refuses a paste while disabled, and paints no ring", async () => {
  const result = await paste("123456", { disabled: true });
  expect(result.values).toStrictEqual([]);
  expect(result.complete).toStrictEqual([]);
  expect(result.cells).toStrictEqual(["", "", "", "", "", ""]);
  // A native read-only host still takes a pointer focus; the field must not
  // paint the focused cell (plan `332`'s rule for a disabled field).
  expect(result.rings).toBe(0);
});
