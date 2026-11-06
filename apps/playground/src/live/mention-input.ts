import { Pixels } from "@gpuixui/testing";

export interface MentionPerson {
  readonly value: string;

  readonly label: string;
}

export const MENTION_PEOPLE: ReadonlyArray<MentionPerson> = [
  { value: "ada", label: "Ada Lovelace" },
  { value: "grace", label: "Grace Hopper" },
  { value: "alan", label: "Alan Turing" },
  { value: "margaret", label: "Margaret Hamilton" },
];

export const MENTION_IDS = {
  probe: "mention-input-probe",
  readout: "mi-readout",
  frame: "mi-frame",
  enabled: "mi-field",
  disabled: "mi-disabled",
} as const;

export const listId = (field: string): string => `${field}-list`;
export const rowId = (field: string, value: string): string =>
  `${field}-row-${value}`;

export const AT_KEY = "2->@";

export const FIRST_INSERTION = "@grace ";

export const SECOND_INSERTION = `${FIRST_INSERTION}@alan `;

export const PRESSED_INSERTION = `${SECOND_INSERTION}@margaret `;

export const SECOND_QUERY = "al";

export const PRESS_QUERY = "m";

export const DISMISS_QUERY = "g";

export const MENTION_ACCENT_FLOOR = 1000;

export const ROW_INSET = 3;

export const ENTRY_SETTLE_MS = 220;

export interface MentionState {
  readonly text: string;
  readonly mentions: number;
}

export const mentionReadout = (state: MentionState): string =>
  `text=[${state.text}] mentions=${state.mentions}`;

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
