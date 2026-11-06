export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Box extends Point {
  readonly width: number;
  readonly height: number;
}

export type OpenSource = "pointer" | "keyboard";

export type CloseReason =
  | "activate"
  | "dismiss"
  | "leave"
  | "outside"
  | "pointer";

export const SUBMENU_OPEN_DELAY_MS = 100;

export const MENU_CLOSE_GRACE_MS = 80;

export interface Size {
  readonly width: number;
  readonly height: number;
}

export const placeSurface = (
  point: Point,
  surface: Size,
  frame: Size,
): Point => ({
  x: Math.max(0, Math.min(point.x, frame.width - surface.width)),
  y: Math.max(0, Math.min(point.y, frame.height - surface.height)),
});

export const SUBMENU_GAP = 4;

export const submenuPlacement = (input: {
  readonly parent: Box;
  readonly row: Box;
  readonly submenu: Size;
  readonly frame: Size;
}): Point => {
  const right = input.parent.x + input.parent.width + SUBMENU_GAP;
  const left = input.parent.x - SUBMENU_GAP - input.submenu.width;
  const side = right + input.submenu.width <= input.frame.width ? right : left;
  const placed = placeSurface(
    { x: side, y: input.row.y },
    input.submenu,
    input.frame,
  );
  return { x: placed.x - input.parent.x, y: placed.y - input.parent.y };
};

export const keyboardAnchor = (bounds: Box): Point => ({
  x: bounds.x,
  y: bounds.y + bounds.height,
});

export const pointerAnchor = (payload: {
  readonly x?: number | null;
  readonly y?: number | null;
}): Point => ({ x: payload.x ?? 0, y: payload.y ?? 0 });

export type PressAction = "ignore" | "open" | "close";

export const rightPress = (press: {
  readonly isRightClick: boolean;
  readonly onTrigger: boolean;
  readonly open: boolean;
}): PressAction => {
  if (!press.isRightClick) return "ignore";
  if (press.onTrigger) return "open";
  return press.open ? "close" : "ignore";
};

export const restoresFocus = (
  source: OpenSource,
  reason: CloseReason,
): boolean =>
  source === "keyboard" && (reason === "activate" || reason === "dismiss");

export const focusAfterClose = (
  source: OpenSource,
  reason: CloseReason,
): "trigger" | "none" => (restoresFocus(source, reason) ? "trigger" : "none");

export const TYPEAHEAD_WINDOW_MS = 500;

export interface TypedBuffer {
  readonly text: string;
  readonly at: number;
}

export const idleTyped: TypedBuffer = { text: "", at: 0 };

export const typed = (
  buffer: TypedBuffer,
  char: string,
  now: number,
): TypedBuffer => {
  const letter = char.toLowerCase();
  if (buffer.text === "" || now - buffer.at > TYPEAHEAD_WINDOW_MS) {
    return { text: letter, at: now };
  }
  const repeating = [...buffer.text].every((seen) => seen === letter);
  return repeating
    ? { text: buffer.text, at: now }
    : { text: `${buffer.text}${letter}`, at: now };
};

export interface TypedRow {
  readonly label: string;
  readonly disabled?: boolean;
}

const normalise = (value: string): string => value.trim().toLowerCase();

export const typedMatch = (
  rows: ReadonlyArray<TypedRow>,
  from: number | undefined,
  prefix: string,
): number | undefined => {
  const needle = normalise(prefix);
  if (needle === "") return undefined;

  const candidates = rows.flatMap((row, index) => {
    const label = normalise(row.label);
    return row.disabled === true || label === "" || !label.startsWith(needle)
      ? []
      : [index];
  });
  const after = candidates.find((index) => index > (from ?? -1));

  return after ?? candidates[0];
};

export interface TypeaheadStep {
  readonly buffer: TypedBuffer;

  readonly index?: number;
}

export const typeChar = (
  rows: ReadonlyArray<TypedRow>,
  from: number | undefined,
  buffer: TypedBuffer,
  char: string,
  now: number,
): TypeaheadStep => {
  const next = typed(buffer, char, now);
  const index = typedMatch(rows, from, next.text);
  return index === undefined ? { buffer: idleTyped } : { buffer: next, index };
};
