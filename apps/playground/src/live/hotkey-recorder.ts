/**
 * The `hotkey-recorder-lifecycle` fixture: the chord the probe presses, the
 * readouts it reads, and the tab walk that proves the disabled recorder is out
 * of it.
 *
 * `HotkeyRecorder` is the one shipped control whose job is to **swallow** the
 * keys it records, and its page states the contract a window has to settle:
 * "A recorded key is swallowed; the app's own binding does not fire." Nothing
 * had driven the recorder in a window — its suite reads the renderer's tree — so
 * neither the chord the runtime delivers, the glyphs the stored value paints,
 * nor the app-level channel was measured.
 *
 * The fixture keeps two recorders: an enabled one the probe drives, and a
 * disabled twin at the item the tab walk has to skip. A plain focusable control
 * after the twin is where that walk must land.
 *
 * Native-free: the ids, the keystrokes, the canonical chords, the readout
 * codecs and the check count live here so the view, the steps, the README and
 * the unit test read one source.
 */
import type { PlatformName } from "@gpuixui/tokens";

/** The `testId`s the view, the steps and the unit suite share. */
export const HOTKEY_IDS = {
  probe: "hotkey-probe",
  recorder: "hotkey-recorder",
  readout: "hotkey-readout",
  windowLog: "hotkey-window-log",
  off: "hotkey-off",
  offReadout: "hotkey-off-readout",
  plain: "hotkey-plain",
} as const;

/** The clear control a shipped recorder names after its own id. */
export const hotkeyClearId = (recorder: string): string => `${recorder}-clear`;

/** What the recorder paints while it is listening for a chord. */
export const HOTKEY_RECORDING = "Press keys…";

/** What it paints when no chord is bound, which is also the start state. */
export const HOTKEY_PLACEHOLDER = "Click to record";

/** The keystrokes the probe sends, in the runtime's own spelling. */
export const HOTKEY_KEYS = {
  /** The chord a recorder exists for: the platform's primary modifier. */
  chord: "cmd-shift-k",
  /** The base key the chord presses, as the release and the window log spell it. */
  chordKey: "k",
  /** A modifier on its own is not a chord. */
  modifier: "shift",
  /** Escape cancels a recording instead of being recorded. */
  cancel: "escape",
  /** Space is a chord while recording, not the other half of an activation. */
  space: "space",
  /** A key the disabled recorder must refuse. */
  refused: "enter",
} as const;

/**
 * The canonical chord a captured `cmd-shift-k` reports on `platform`.
 *
 * The runtime's `cmd` flag decodes to `meta`; `normalizeHotkey` writes `Mod`
 * where the platform allows it (Command without Control), and the literal
 * modifier order otherwise — the rule the display formatter shares.
 */
export const capturedChord = (platform: PlatformName): string =>
  platform === "darwin" ? "Mod+Shift+K" : "Meta+Shift+K";

/** The canonical chord a captured Space reports: a named key, no modifier. */
export const SPACE_CHORD = "Space";

/**
 * The keycap each chord paints, as the display formatter's own glyph.
 *
 * `K` is the letter's keycap on every platform; `␣` is the named Space key's.
 */
export const HOTKEY_KEYCAPS = { base: "K", space: "␣" } as const;

/** What an unbound chord reads as in a readout. */
export const HOTKEY_NONE = "none";

/** The captures a reader can look at: the armed box and the bound box. */
export const HOTKEY_CAPTURES = {
  armed: "hotkey-armed",
  bound: "hotkey-bound",
} as const;

/** The enabled recorder's readout: the stored chord and its report count. */
export const hotkeyReadout = (value: string | null, reports: number): string =>
  `value=${value ?? HOTKEY_NONE} reports=${reports}`;

/** The disabled twin's readout: it should never move. */
export const hotkeyOffReadout = (reports: number): string =>
  `reports=${reports}`;

/** What the app-level window handler saw, in arrival order. */
export const windowKeyLog = (keys: ReadonlyArray<string>): string =>
  `window=${keys.length === 0 ? HOTKEY_NONE : keys.join(",")}`;

/**
 * Whether the app-level log carries `key`.
 *
 * The assertion is membership, not the whole arrival list: a run sends the
 * modifier on its own before the chord, and a host that groups or repeats a
 * down would change the list without changing the fact this check exists for —
 * whether the key the recorder swallowed reached the application's handler.
 */
export const windowSaw = (log: string, key: string): boolean =>
  log === windowKeyLog([])
    ? false
    : log.slice("window=".length).split(",").includes(key);

/**
 * Whether the recorder painted keycaps for a chord rather than its raw value.
 *
 * The paint is the keycap glyph for the chord's key — `K` for a letter,
 * `␣` for Space — and the keycaps are separate text nodes with no `+` between
 * them, so a component that painted the stored canonical string would fail
 * both halves. Which glyph each platform uses is the display formatter's
 * contract, held by `@gpuixui/keyboard`'s own suite and the recorder's
 * renderer suite; this probe holds that a window paints a keycap at all.
 */
export const paintsKeycaps = (painted: string, keyGlyph: string): boolean =>
  painted.includes(keyGlyph) &&
  !painted.includes("+") &&
  painted !== HOTKEY_PLACEHOLDER &&
  painted !== HOTKEY_RECORDING;

/**
 * How many checks the probe asserts.
 *
 * Held to the probe's own `ctx.expect*` sites by `hotkey-recorder.test.ts`, so a
 * planted assertion cannot pass without the count moving.
 */
export const HOTKEY_CHECKS = 25;
