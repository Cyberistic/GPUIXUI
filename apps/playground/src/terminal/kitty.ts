import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Pixels } from "@gpuixui/testing";

export class KittyParseError extends Schema.TaggedError<KittyParseError>()(
  "KittyParseError",
  { reason: Schema.String },
) {
  get message(): string {
    return `kitty stream decode failed: ${this.reason}`;
  }
}

export class KittyFrame extends Schema.Class<KittyFrame>("KittyFrame")({
  id: Schema.Int,

  placement: Schema.Int,
  pixels: Pixels.Pixels,
}) {}

export class KittyHandshake extends Schema.Class<KittyHandshake>(
  "KittyHandshake",
)({
  alternateScreen: Schema.Boolean,
  alternateScreenLeft: Schema.Boolean,
  cursorHidden: Schema.Boolean,
  cursorShown: Schema.Boolean,
  title: Schema.OptionFromNullishOr(Schema.String),
  mouse: Schema.Boolean,
  mousePixel: Schema.Boolean,
  mouseOff: Schema.Boolean,
  keyboard: Schema.Boolean,
  keyboardPopped: Schema.Boolean,
  bracketedPaste: Schema.Boolean,
  bracketedPasteOff: Schema.Boolean,
  inBandResize: Schema.Boolean,
  inBandResizeOff: Schema.Boolean,
  imageDeletes: Schema.Int,

  syncBatches: Schema.Int,
}) {}

export class KittyStream extends Schema.Class<KittyStream>("KittyStream")({
  handshake: KittyHandshake,
  frames: Schema.Array(KittyFrame),
}) {}

// oxlint-disable-next-line no-control-regex -- the input is an escape stream: ESC and ST are its delimiters
const APC = /\x1b_G([^;\x1b]*)(?:;([^\x1b]*))?\x1b\\/g;

const parameters = (raw: string): Record<string, string> =>
  Object.fromEntries(
    Arr.map(
      Arr.filter(Arr.fromIterable(raw.split(",")), (pair) => pair.length > 0),
      (pair) => {
        const at = pair.indexOf("=");
        return at < 0 ? [pair, ""] : [pair.slice(0, at), pair.slice(at + 1)];
      },
    ),
  );

const int = (value: string | undefined, name: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new KittyParseError({ reason: `${name} is not a positive integer` });
  }
  return parsed;
};

interface Pending {
  readonly id: number;
  readonly placement: number;
  readonly width: number;
  readonly height: number;
  readonly compressed: boolean;
  readonly chunks: ReadonlyArray<string>;
}

interface Step {
  readonly pending: Option.Option<Pending>;
  readonly frames: ReadonlyArray<KittyFrame>;
}

const finish = (
  pending: Pending,
  inflate: (bytes: Uint8Array) => Uint8Array,
): KittyFrame => {
  const encoded = pending.chunks.join("");
  const bytes = Uint8Array.from(Buffer.from(encoded, "base64"));
  const data = pending.compressed ? inflate(bytes) : bytes;
  const expected = pending.width * pending.height * 4;
  if (data.length !== expected) {
    throw new KittyParseError({
      reason: `frame ${pending.id} carries ${data.length} bytes, expected ${expected} for ${pending.width}x${pending.height} RGBA`,
    });
  }
  return new KittyFrame({
    id: pending.id,
    placement: pending.placement,
    pixels: new Pixels.Pixels({
      width: pending.width,
      height: pending.height,
      data,
    }),
  });
};

const complete = (
  state: Step,
  pending: Pending,
  inflate: (bytes: Uint8Array) => Uint8Array,
): Step => ({
  pending: Option.none(),
  frames: Arr.append(state.frames, finish(pending, inflate)),
});

const step =
  (inflate: (bytes: Uint8Array) => Uint8Array) =>
  (state: Step, match: RegExpMatchArray): Step => {
    const params = parameters(match[1] ?? "");
    const payload = match[2] ?? "";
    const frames = (pending: Pending): Step =>
      complete(state, pending, inflate);
    if (params.a === "T") {
      if (params.t !== undefined && params.t !== "d") {
        throw new KittyParseError({
          reason: `frame transport ${params.t} is not inline data (t=d)`,
        });
      }
      if (params.f !== "32") {
        throw new KittyParseError({
          reason: `frame format ${params.f} is not RGBA (f=32)`,
        });
      }
      const started: Pending = {
        id: int(params.i, "image id"),
        placement: int(params.p, "placement id"),
        width: int(params.s, "frame width"),
        height: int(params.v, "frame height"),
        compressed: params.o === "z",
        chunks: [payload],
      };
      return params.m === "0"
        ? frames(started)
        : { pending: Option.some(started), frames: state.frames };
    }
    return Option.match(state.pending, {
      onNone: () => state,
      onSome: (pending) => {
        if (params.m === undefined) return state;
        const grown = {
          ...pending,
          chunks: Arr.append(pending.chunks, payload),
        };
        return params.m === "0"
          ? frames(grown)
          : { pending: Option.some(grown), frames: state.frames };
      },
    });
  };

const handshakeOf = (text: string, imageDeletes: number): KittyHandshake => {
  // oxlint-disable-next-line no-control-regex -- an OSC title ends with BEL or ST
  const title = /\x1b\]2;([^\x07\x1b]*)(?:\x07|\x1b\\)/.exec(text);
  return new KittyHandshake({
    alternateScreen: text.includes("\x1b[?1049h"),
    alternateScreenLeft: text.includes("\x1b[?1049l"),
    cursorHidden: text.includes("\x1b[?25l"),
    cursorShown: text.includes("\x1b[?25h"),
    title: Option.fromNullishOr(title?.[1]),
    mouse: text.includes("\x1b[?1003h"),
    mousePixel: text.includes("\x1b[?1016h"),
    mouseOff: text.includes("\x1b[?1003l"),
    keyboard: text.includes("\x1b[>31u"),
    keyboardPopped: text.includes("\x1b[<u"),
    bracketedPaste: text.includes("\x1b[?2004h"),
    bracketedPasteOff: text.includes("\x1b[?2004l"),
    inBandResize: text.includes("\x1b[?2048h"),
    inBandResizeOff: text.includes("\x1b[?2048l"),
    imageDeletes,
    syncBatches: Arr.length(
      // oxlint-disable-next-line no-control-regex -- a control sequence starts with ESC
      Arr.fromIterable(text.matchAll(/\x1b\[\?2026h/g)),
    ),
  });
};

export const parseKittyStream = (
  stream: Uint8Array,
  inflate: (bytes: Uint8Array) => Uint8Array,
): KittyStream => {
  const text = new TextDecoder("latin1").decode(stream);
  const matches = Arr.fromIterable(text.matchAll(APC));
  const initial: Step = { pending: Option.none(), frames: Arr.empty() };
  const parsed = Arr.reduce(matches, initial, step(inflate));
  const imageDeletes = Arr.length(
    Arr.filter(matches, (match) => parameters(match[1] ?? "").a === "d"),
  );
  return new KittyStream({
    handshake: handshakeOf(text, imageDeletes),
    frames: parsed.frames,
  });
};
