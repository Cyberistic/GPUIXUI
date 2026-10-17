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
  useState,
} from "react";
import { initial, move as moveActive, type MenuAction } from "./logic.js";

/** One registered row: its host id and what activating it does. */
export interface MenuRow {
  readonly id: number;
  readonly disabled: boolean;
  /** Run the row's action. The row closes the menu itself after it. */
  readonly activate: () => void;
}

/** Why a menu closed, which decides where focus goes afterwards. */
export type MenuCloseReason = "activate" | "dismiss" | "outside" | "leave";

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
  /** Run the active row, if there is one. */
  readonly activateActive: () => void;
  /**
   * Close the menu. `activate` and `dismiss` return focus to the trigger;
   * `leave` (Tab) and `outside` (a press elsewhere) leave focus where it went.
   */
  readonly close: (reason: MenuCloseReason) => void;
}

export const MenuContext = createContext<MenuContextValue | undefined>(
  undefined,
);

/** The menu a part belongs to. Throws when there is none (plan 110 §8.6). */
export const useMenuContext = (): MenuContextValue => {
  const value = useContext(MenuContext);
  if (value === undefined) {
    throw new Error("Menu parts must be used inside a menu content");
  }
  return value;
};

/** Replace the row with the same id, or append it. Order is registration order. */
const upsert = (
  rows: ReadonlyArray<MenuRow>,
  row: MenuRow,
): ReadonlyArray<MenuRow> => {
  const existing = Arr.findFirst(rows, (candidate) => candidate.id === row.id);
  return Option.match(existing, {
    onNone: () => Arr.append(rows, row),
    onSome: (current) =>
      current.disabled === row.disabled
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

  return useMemo(
    () => ({
      rows,
      activeId,
      register,
      noteFocus,
      focusRow,
      step,
      activateActive,
      close,
    }),
    [
      activateActive,
      activeId,
      close,
      focusRow,
      noteFocus,
      register,
      rows,
      step,
    ],
  );
};
