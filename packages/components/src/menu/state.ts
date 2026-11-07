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

export interface MenuRow extends MenuItemSpec {
  readonly activate: () => void;
}

export type MenuCloseReason =
  | "activate"
  | "dismiss"
  | "outside"
  | "leave"
  | "pointer";

export interface MenuContextValue {
  readonly rows: ReadonlyArray<MenuRow>;
  readonly activeId: Option.Option<number>;
  readonly register: (row: MenuRow) => () => void;

  readonly noteFocus: (id: number) => void;

  readonly focusRow: (id: number) => void;

  readonly step: (action: MenuAction) => void;

  readonly typeahead: (char: string) => void;

  readonly activateActive: () => void;

  readonly notePointer: (present: boolean) => void;

  readonly close: (reason: MenuCloseReason) => void;

  readonly closeSubmenu: (rowId?: number) => void;

  readonly claimSubmenu: (close: () => void, triggerId?: number) => () => void;
}

export const MenuContext = createContext<MenuContextValue | undefined>(
  undefined,
);

export const MenuLeaving = createContext(false);

export const useMenuLeaving = (): boolean => useContext(MenuLeaving);

export const useMenuContext = (): MenuContextValue => {
  const value = useContext(MenuContext);
  if (value === undefined) {
    throw new Error("Menu parts must be used inside a menu content");
  }
  return value;
};

const ignorePointer = (): void => undefined;

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
