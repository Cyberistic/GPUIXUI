import * as Option from "effect/Option";

export interface KeyChord {
  readonly key: string;
  readonly shift?: boolean;
  readonly ctrl?: boolean;
  readonly alt?: boolean;
  readonly cmd?: boolean;
}

const PLAIN: Readonly<Record<string, string>> = {
  "0": "0",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  ".": ".",
  "+": "+",
  "-": "minus",
  _: "-",
  "*": "×",
  "/": "÷",
  "^": "^",
  "(": "(",
  ")": ")",
  ",": ",",
  ":": ":",
  "!": "!",
  "%": "%",
  "=": "=",
  enter: "=",
  return: "=",
  backspace: "DEL",
  delete: "DEL",
  escape: "AC",
  left: "left",
  right: "right",
  up: "up",
  down: "down",
  shift: "SHIFT",
  alt: "ALPHA",
  a: "A",
  b: "B",
  c: "cos",
  d: "D",
  e: "e",
  f: "F",
  g: "log",
  h: "hyp",
  i: "i",
  j: "j",
  k: "k",
  l: "ln",
  m: "M",
  n: "n",
  o: "o",
  p: "π",
  q: "q",
  r: "√",
  s: "sin",
  t: "tan",
  u: "u",
  v: "v",
  w: "w",
  x: "X",
  y: "Y",
  z: "z",
  space: "space",
};

const SHIFTED: Readonly<Record<string, string>> = {
  s: "sin⁻¹",
  c: "cos⁻¹",
  t: "tan⁻¹",
  l: "ln",
  g: "log",
  p: "π",
  x: "X",
  r: "∛",
};

export const isApplicationChord = (chord: KeyChord): boolean =>
  chord.cmd === true && chord.key.toLowerCase() === "k";

export const modeChordIndex = (chord: KeyChord): Option.Option<number> => {
  if (chord.cmd !== true) return Option.none();
  const digit = Number.parseInt(chord.key, 10);
  return Number.isInteger(digit) && digit >= 1 && digit <= 8
    ? Option.some(digit)
    : Option.none();
};

export const calculatorKeyOf = (chord: KeyChord): Option.Option<string> => {
  if (chord.cmd === true || chord.ctrl === true) return Option.none();
  const key = chord.key.toLowerCase();
  if (chord.shift === true && SHIFTED[key] !== undefined) {
    return Option.some(SHIFTED[key]);
  }
  return Option.fromUndefinedOr(PLAIN[key]);
};
