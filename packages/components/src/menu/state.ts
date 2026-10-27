/**
 * The state every menu shares: its rows, which one is active, and how a row is
 * activated.
 *
 * The wrap/skip arithmetic lives in `menu/logic.ts` over
 * `internal/collection.ts`; this module only keeps the registry in React state
 * and keeps focus and highlight the same thing.
 */

import { useGpuix } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTypeahead } from "../typeahead.js";
import {
  initial,
  move as moveActive,
  resolveActiveIndex,
  type MenuAction,
  type MenuItemSpec,
} from "./logic.js";

/** One registered row: its host id, its searchable text and what activating it does. */
export interface MenuRow extends MenuItemSpec {
  /** Run the row's action. The row closes the menu itself after it. */
  readonly activate: () => void;
}

/**
 * Why a menu closed, which decides where focus goes afterwards.
 *
 * `pointer` is the pointer leaving the menu; it is the one reason that moves
 * nothing but the surface, because the pointer is already where the reader put it.
 */
export type MenuCloseReason =
  | "activate"
  | "dismiss"
  | "outside"
  | "leave"
  | "pointer";

/** The rules a menu part follows; throws outside a menu content. */
export interface MenuContextValue {
  readonly rows: ReadonlyArray<MenuRow>;
  readonly activeId: Option.Option<number>;
  readonly register: (row: MenuRow) => () => void;
  /** Note that a row has focus, so the highlight follows a click or Tab. */
  readonly noteFocus: (id: number) => void;
  /** Move the highlight and real focus to `id`. */
  readonly focusRow: (id: number) => void;
  /** Apply one keyboard action to the highlight. */
  readonly step: (action: MenuAction) => void;
  /**
   * Type the next character: the highlight jumps to the next row matching the
   * accumulated prefix. A prefix that matches nothing clears the buffer.
   */
  readonly typeahead: (char: string) => void;
  /** Run the active row, if there is one. */
  readonly activateActive: () => void;
  /**
   * A row or the surface's own box reports the pointer on itself. The surface's
   * owner turns that into a hold or a wait; a menu that ignores the pointer does
   * nothing (the Dropdown).
   */
  readonly notePointer: (present: boolean) => void;
  /**
   * Close the menu. `activate` and `dismiss` return focus to the trigger;
   * `leave` (Tab), `outside` (a press elsewhere) and `pointer` leave focus where
   * it went, because the reader already put it there.
   */
  readonly close: (reason: MenuCloseReason) => void;
  /**
   * Close the submenu opened from this menu, if one is open and it is not the
   * one `rowId` opens.
   *
   * A row that is not a submenu trigger closes whatever submenu is open when the
   * pointer reaches it. The trigger of the open submenu is the exception — the
   * pointer coming back to it is not a reason to close it. The row that opened
   * the closed submenu takes the focus back: here the highlight is real focus.
   */
  readonly closeSubmenu: (rowId?: number) => void;
  /**
   * Register an open submenu and the row that opens it. Opening another closes
   * the previous one. Returns the release function the submenu calls when it
   * closes or unmounts.
   */
  readonly claimSubmenu: (close: () => void, triggerId?: number) => () => void;
}

export const MenuContext = createContext<MenuContextValue | undefined>(
  undefined,
);

/**
 * Whether the surface a row sits in is painted only for its exit.
 *
 * A leaving surface stops taking presses — the seam's `presenceStyle` removes its
 * own hitbox and `PresenceShield` covers the content — but the runtime's Tab
 * order is decided element by element, and neither a `pointerEvents` rule nor the
 * shield removes a descendant's `tabIndex`. Measured on 0.11.0: with a menu open,
 * the window's order is trigger, the controls after it, then the rows; press
 * Escape (the row ghosts for its exit) and two Tabs land on a row that unmounts
 * under the keyboard, which leaves the window with no focused element. A row
 * therefore reads this flag and drops its own stop while its surface leaves,
 * which is the only route this runtime offers — the flag cannot reach caller
 * content, so a control a consumer puts inside a modal ghost keeps its stop.
 */
export const MenuLeaving = createContext(false);

/** Whether the menu a part sits in is painted only for its exit. */
export const useMenuLeaving = (): boolean => useContext(MenuLeaving);

/** The menu a part belongs to. Throws when there is none (plan 110 §8.6). */
export const useMenuContext = (): MenuContextValue => {
  const value = useContext(MenuContext);
  if (value === undefined) {
    throw new Error("Menu parts must be used inside a menu content");
  }
  return value;
};

/** A surface that does not follow the pointer ignores every row's report. */
const ignorePointer = (): void => undefined;

/** Replace the row with the same id, or append it. Order is registration order. */
const upsert = (
  rows: ReadonlyArray<MenuRow>,
  row: MenuRow,
): ReadonlyArray<MenuRow> => {
  const existing = Arr.findFirst(rows, (candidate) => candidate.id === row.id);
  return Option.match(existing, {
    onNone: () => Arr.append(rows, row),
    onSome: (current) =>
      current.disabled === row.disabled && current.label === row.label
        ? rows
        : Arr.map(rows, (candidate) =>
            candidate.id === row.id ? row : candidate,
          ),
  });
};

/**
 * The menu's registry and highlight. `close` belongs to the root, because only it
 * knows which surface is open.
 */
export const useMenuState = (
  close: (reason: MenuCloseReason) => void,
  notePointer: (present: boolean) => void = ignorePointer,
): MenuContextValue => {
  const renderer = useGpuix().renderer;
  const [rows, setRows] = useState<ReadonlyArray<MenuRow>>([]);
  const [activeId, setActiveId] = useState<Option.Option<number>>(
    initial.activeId,
  );

  const register = useCallback((row: MenuRow) => {
    setRows((current) => upsert(current, row));
    return () => {
      setRows((current) =>
        Arr.filter(current, (candidate) => candidate.id !== row.id),
      );
    };
  }, []);

  const noteFocus = useCallback((id: number) => {
    setActiveId(Option.some(id));
  }, []);

  const focusRow = useCallback(
    (id: number) => {
      setActiveId(Option.some(id));
      renderer?.focusElement?.(id);
    },
    [renderer],
  );

  const step = useCallback(
    (action: MenuAction) => {
      Option.match(moveActive({ activeId }, rows, action).activeId, {
        onNone: () => undefined,
        onSome: focusRow,
      });
    },
    [activeId, focusRow, rows],
  );

  const typeahead = useTypeahead(
    rows,
    resolveActiveIndex({ activeId }, rows),
    (row) => focusRow(row.id),
  );

  const activate = useCallback(
    (id: number) => {
      Option.match(
        Arr.findFirst(rows, (row) => row.id === id),
        {
          onNone: () => undefined,
          onSome: (row) => {
            if (!row.disabled) row.activate();
          },
        },
      );
    },
    [rows],
  );

  const activateActive = useCallback(() => {
    Option.match(activeId, {
      onNone: () => undefined,
      onSome: activate,
    });
  }, [activate, activeId]);

  // One submenu per menu. A ref, not state: this is an imperative handle, and
  // putting it in state would re-render every row when a submenu opens.
  const submenu = useRef<{
    readonly close: () => void;
    readonly triggerId: number | undefined;
  } | null>(null);

  const closeSubmenu = useCallback((rowId?: number) => {
    const open = submenu.current;
    if (open === null || (rowId !== undefined && open.triggerId === rowId)) {
      return;
    }
    submenu.current = null;
    open.close();
  }, []);

  const claimSubmenu = useCallback((close: () => void, triggerId?: number) => {
    const previous = submenu.current;
    submenu.current = { close, triggerId };
    if (previous !== null && previous.close !== close) previous.close();
    return () => {
      if (submenu.current?.close === close) submenu.current = null;
    };
  }, []);

  return useMemo(
    () => ({
      rows,
      activeId,
      register,
      noteFocus,
      focusRow,
      step,
      typeahead,
      activateActive,
      close,
      notePointer,
      closeSubmenu,
      claimSubmenu,
    }),
    [
      activateActive,
      activeId,
      claimSubmenu,
      close,
      closeSubmenu,
      focusRow,
      noteFocus,
      notePointer,
      register,
      rows,
      step,
      typeahead,
    ],
  );
};
