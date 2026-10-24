/**
 * The `mention-input-lifecycle` fixture: the people the field offers, the
 * expected insertions, and the crop a window's frame is read with.
 *
 * `MentionInput` states three things a `TestRenderer` suite cannot confirm: its
 * suggestion list is a **floating layer** placed below the field, the row the
 * reader is on paints the theme's `accent` fill, and a press on that row runs
 * through the window's own hit test because the layer sits outside the field's
 * element. The behaviour suite reads `aria-selected` and fires a synthetic
 * press; only a frame shows which row was painted where.
 *
 * Native-free on purpose: the registry, the steps and the unit suite share
 * these names on a host with no binding.
 */
import { Pixels } from "@gpuixui/testing";

/** One offered name. */
export interface MentionPerson {
  /** What the component inserts (without the `@`). */
  readonly value: string;
  /** What the row paints; also the words a pointer press is aimed at. */
  readonly label: string;
}

/** The people in input order, which is also the empty query's ranking. */
export const MENTION_PEOPLE: ReadonlyArray<MentionPerson> = [
  { value: "ada", label: "Ada Lovelace" },
  { value: "grace", label: "Grace Hopper" },
  { value: "alan", label: "Alan Turing" },
  { value: "margaret", label: "Margaret Hamilton" },
];

/** The `testId`s the view and the steps share. */
export const MENTION_IDS = {
  probe: "mention-input-probe",
  readout: "mi-readout",
  frame: "mi-frame",
  enabled: "mi-field",
  disabled: "mi-disabled",
} as const;

/** The list inside a field, and one row of it. */
export const listId = (field: string): string => `${field}-list`;
export const rowId = (field: string, value: string): string =>
  `${field}-row-${value}`;

/**
 * The keystroke that types `@`.
 *
 * `Keystroke::parse` reads a printable key's own character, so `shift-2` types
 * `2`; the explicit `key->key_char` form is the one that carries the shifted
 * character into the runtime's input handler.
 */
export const AT_KEY = "2->@";

/** What the empty query's first row inserts, and what Enter commits. */
export const FIRST_INSERTION = "@grace ";

/** What the second query adds: only `alan` starts with `al`. */
export const SECOND_INSERTION = `${FIRST_INSERTION}@alan `;

/** What a pointer press on Margaret Hamilton adds. */
export const PRESSED_INSERTION = `${SECOND_INSERTION}@margaret `;

/** The query typed between the two keyboard insertions. */
export const SECOND_QUERY = "al";

/** The query whose only row is pressed with the pointer. */
export const PRESS_QUERY = "m";

/** The query dismissed with Escape. */
export const DISMISS_QUERY = "g";

/**
 * The accent pixels a highlighted row's inner crop must hold.
 *
 * A row at the list's 200-point minimum is about 28 points high, so its inner
 * crop is ~194 × 22 points — over 17 000 pixels at this host's 2× scale. The
 * floor is far above a rounded corner's fringe and far below a whole fill, so
 * antialiasing cannot make an unhighlighted row look highlighted.
 */
export const MENTION_ACCENT_FLOOR = 1000;

/** How far a row's crop is inset, in points, to clear its rounded corners. */
export const ROW_INSET = 3;

/** How long the list's 4-point entry travel is given before placement is read. */
export const ENTRY_SETTLE_MS = 220;

/** What the probe's readout prints. */
export interface MentionState {
  readonly text: string;
  readonly mentions: number;
}

/**
 * The readout.
 *
 * The brackets hold the raw text, so the trailing space `applyMention` writes
 * is a measurement rather than something a trimmed print would hide.
 */
export const mentionReadout = (state: MentionState): string =>
  `text=[${state.text}] mentions=${state.mentions}`;

/** The inner rectangle of a row, in the capture's device pixels. */
export const rowRegion = (
  box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  scale: number,
): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round((box.x + ROW_INSET) * scale),
    y: Math.round((box.y + ROW_INSET) * scale),
    width: Math.max(1, Math.round((box.width - 2 * ROW_INSET) * scale)),
    height: Math.max(1, Math.round((box.height - 2 * ROW_INSET) * scale)),
  });
