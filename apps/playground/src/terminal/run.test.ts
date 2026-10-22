/**
 * The terminal probe's own rules, where a pty is not needed.
 *
 * The bugs this file catches: a fixture colour and its hex drifting apart (the
 * app paints one and the probe looks for the other, so a correct run reports no
 * page), a press frame being accepted before the page it replaced (the probe
 * would assert a repaint it never saw), a shell path with a quote corrupting the
 * command, and a CLI that spawns a pty for an argument it should have rejected.
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import * as Arr from "effect/Array";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Pixels } from "@gpuixui/testing";
import { EXIT } from "../smoke/run.js";
import { KittyFrame } from "./kitty.js";
import {
  TERMINAL_INK,
  TERMINAL_INK_FILL,
  TERMINAL_NO_TERMINAL,
  TERMINAL_NO_TERMINAL_FILL,
  TERMINAL_CLICK_INK,
  TERMINAL_CLICK_INK_FILL,
  TERMINAL_PRESSED,
  TERMINAL_PRESSED_FILL,
  TERMINAL_REST,
  TERMINAL_REST_FILL,
  terminalFill,
  terminalInk,
} from "./logic.js";
import {
  POINTER_CLICK,
  RESIZE_SEQUENCE,
  RESIZED_GRID,
  TERMINAL_GRID,
  evidenceOf,
  firstPainted,
  main,
  paintedOf,
  ptyCommand,
  selectScenarios,
  shareOf,
  terminalCommand,
  terminalRegistry,
} from "./run.js";

/** A page frame with a run of ink pixels, the shape a click repaints. */
const inked = (
  page: Pixels.Rgba,
  ink: Pixels.Rgba,
  count: number,
): KittyFrame => {
  const frame = solidFrame(page, 20, 10);
  for (let at = 0; at < count; at += 1) {
    frame.pixels.data[at * 4] = ink.r;
    frame.pixels.data[at * 4 + 1] = ink.g;
    frame.pixels.data[at * 4 + 2] = ink.b;
    frame.pixels.data[at * 4 + 3] = ink.a;
  }
  return frame;
};

/** A solid frame, the shape a terminal capture decodes to. */
const solidFrame = (colour: Pixels.Rgba, width = 4, height = 2): KittyFrame => {
  const data = new Uint8Array(width * height * 4);
  for (let at = 0; at < data.length; at += 4) {
    data[at] = colour.r;
    data[at + 1] = colour.g;
    data[at + 2] = colour.b;
    data[at + 3] = colour.a;
  }
  return new KittyFrame({
    id: 1,
    placement: 1,
    pixels: new Pixels.Pixels({ width, height, data }),
  });
};

const frame = (colour: Pixels.Rgba): KittyFrame => solidFrame(colour);

describe("the fixture colours", () => {
  it("paints the fill a terminal run read terminal mode", () => {
    expect(terminalFill(true, 0)).toBe(TERMINAL_REST_FILL);
    expect(terminalFill(true, 1)).toBe(TERMINAL_PRESSED_FILL);
    expect(terminalFill(false, 0)).toBe(TERMINAL_NO_TERMINAL_FILL);
    expect(terminalFill(false, 3)).toBe(TERMINAL_NO_TERMINAL_FILL);
  });

  it("keeps every hex and its decoded colour in step", () => {
    const parts = (colour: Pixels.Rgba) => [
      colour.r,
      colour.g,
      colour.b,
      colour.a,
    ];
    const pairs = [
      [TERMINAL_REST_FILL, TERMINAL_REST],
      [TERMINAL_PRESSED_FILL, TERMINAL_PRESSED],
      [TERMINAL_NO_TERMINAL_FILL, TERMINAL_NO_TERMINAL],
      [TERMINAL_INK_FILL, TERMINAL_INK],
    ] as const;
    expect(
      Arr.map(pairs, ([hex]) => {
        const decoded = Pixels.hexToRgba(hex);
        return decoded === null ? hex : parts(decoded);
      }),
    ).toEqual(Arr.map(pairs, ([, colour]) => parts(colour)));
  });
});

describe("reading a run's frames", () => {
  it("measures the share of a frame a colour paints", () => {
    expect(shareOf(frame(TERMINAL_REST), TERMINAL_REST)).toBe(1);
    expect(shareOf(frame(TERMINAL_REST), TERMINAL_PRESSED)).toBe(0);
  });

  it("takes the press frame only after the page frame", () => {
    const painted = paintedOf([frame(TERMINAL_REST), frame(TERMINAL_PRESSED)]);
    expect(Option.isSome(painted)).toBe(true);
    expect(Option.isSome(painted) && Option.isSome(painted.value.pressed)).toBe(
      true,
    );
  });

  it("does not read a press frame as the page", () => {
    expect(Option.isNone(paintedOf([frame(TERMINAL_PRESSED)]))).toBe(true);
  });

  it("finds the frame the terminal's resize painted", () => {
    const resized = solidFrame(
      TERMINAL_REST,
      RESIZED_GRID.columns * 8,
      RESIZED_GRID.rows * 16,
    );
    const painted = paintedOf([frame(TERMINAL_REST), resized]);
    expect(Option.isSome(painted) && Option.isSome(painted.value.resized)).toBe(
      true,
    );
  });

  it("reads a press as a repaint of the ink, not the page", () => {
    expect(terminalInk(false)).toBe(TERMINAL_INK_FILL);
    expect(terminalInk(true)).toBe(TERMINAL_CLICK_INK_FILL);
    const painted = paintedOf([
      frame(TERMINAL_REST),
      inked(TERMINAL_REST, TERMINAL_CLICK_INK, 150),
    ]);
    expect(Option.isSome(painted) && Option.isSome(painted.value.clicked)).toBe(
      true,
    );
    expect(Option.isSome(painted) && Option.isNone(painted.value.pressed)).toBe(
      true,
    );
  });

  it("does not read a page frame as a repaint", () => {
    const painted = paintedOf([frame(TERMINAL_REST), frame(TERMINAL_REST)]);
    expect(Option.isSome(painted) && Option.isNone(painted.value.pressed)).toBe(
      true,
    );
  });

  it("measures the first frame when the page never painted", () => {
    // A wrong page colour must fail its checks with the pixels it did paint;
    // only a stream with no frame at all is "no evidence".
    const evidence = evidenceOf([frame(TERMINAL_PRESSED)]);
    expect(Option.isSome(evidence)).toBe(true);
    expect(
      Option.isSome(evidence) && Option.isNone(evidence.value.pressed),
    ).toBe(true);
    expect(Option.isNone(evidenceOf([]))).toBe(true);
  });

  it("finds the first frame a colour fills", () => {
    const frames = [frame(TERMINAL_PRESSED), frame(TERMINAL_REST)];
    expect(Option.isSome(firstPainted(frames, TERMINAL_REST, 0.9))).toBe(true);
    expect(Option.isNone(firstPainted(frames, TERMINAL_INK, 0.9))).toBe(true);
  });
});

describe("the command this runner spawns", () => {
  it("sizes the pty and runs the app through nub", () => {
    expect(terminalCommand("/app/dist/terminal/main.js")).toBe(
      `stty rows ${TERMINAL_GRID.rows} cols ${TERMINAL_GRID.columns}; exec nub '/app/dist/terminal/main.js'`,
    );
  });

  it("quotes a path a shell would otherwise split", () => {
    // A checkout under a directory with a quote must not turn into a second
    // command; the escaped form is the one bash and sh both read.
    expect(terminalCommand("/tmp/it's here/main.js")).toBe(
      `stty rows ${TERMINAL_GRID.rows} cols ${TERMINAL_GRID.columns}; exec nub '/tmp/it'\\''s here/main.js'`,
    );
  });

  it("sends the resize a kitty terminal sends", () => {
    expect(RESIZE_SEQUENCE).toBe("\x1b[48;20;50;0;0t");
  });

  it("aims a left press at the frame's centre", () => {
    expect(POINTER_CLICK).toBe("\x1b[<0;400;320M\x1b[<0;400;320m");
  });

  it("forwards our writes through a cat, because script needs a pipe", () => {
    const command = ptyCommand("/app/main.js");
    expect(command.startsWith("cat | /usr/bin/script -q /dev/null")).toBe(true);
    expect(command).toContain("exec nub ");
    expect(command).toContain("/app/main.js");
  });
});

describe("selecting scenarios", () => {
  it("runs both when none is named", () => {
    expect(selectScenarios([])).toEqual(terminalRegistry);
  });

  it("runs the one named", () => {
    expect(
      Arr.map(selectScenarios(["terminal-input"]), (meta) => meta.id),
    ).toEqual(["terminal-input"]);
  });
});

describe("the CLI's argument guard", () => {
  it.effect("rejects an unknown flag without spawning a pty", () =>
    Effect.gen(function* () {
      expect(yield* main(["--onlyy", "terminal-render"])).toBe(EXIT.unverified);
    }).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(NodePath.layer),
    ),
  );

  it.effect("rejects an unknown scenario id", () =>
    Effect.gen(function* () {
      expect(yield* main(["--only", "no-such-probe"])).toBe(EXIT.unverified);
    }).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(NodePath.layer),
    ),
  );

  it.effect("lists the ids and exits 0", () =>
    Effect.gen(function* () {
      expect(yield* main(["--list"])).toBe(EXIT.passed);
    }).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(NodePath.layer),
    ),
  );
});
