import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState, type KeyboardEvent } from "react";
import {
  dismiss,
  hoverOpen,
  initial,
  step,
  type AppMenuSpec,
  type MenuBarState,
} from "@/lib/shell-logic";

/**
 * Browser preview for the Application menu page.
 *
 * `@gpuixui/shell`'s `AppMenu` is a GPUix host bar, so the page cannot mount it
 * and this drawing is a labelled approximation. The navigation is the package's:
 * `step` folds a keyboard action into the bar's state, `hoverOpen` is the
 * macOS rule that a sibling title takes over while a menu is open, and
 * `dismiss` closes the dropdown and names the trigger that takes the focus
 * back. Only the paint is the browser's.
 */

/** One runnable entry in a menu's dropdown. */
export interface AppMenuItem {
  readonly id: string;
  readonly label: string;
  /** A display-only accelerator, e.g. `"mod+s"`. The app binds the chord. */
  readonly accelerator?: string;
  readonly disabled?: boolean;
}

/** One top-level menu: a labelled button and its dropdown rows. */
export interface AppMenuEntry {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly items: ReadonlyArray<AppMenuItem>;
}

/** The menus the drawing opens with. */
export const APP_MENU_ENTRIES: ReadonlyArray<AppMenuEntry> = [
  {
    id: "file",
    label: "File",
    items: [
      { id: "new", label: "New file", accelerator: "mod+n" },
      { id: "open", label: "Open…", accelerator: "mod+o" },
      { id: "save", label: "Save", accelerator: "mod+s" },
    ],
  },
  {
    id: "edit",
    label: "Edit",
    items: [
      { id: "undo", label: "Undo", accelerator: "mod+z" },
      { id: "redo", label: "Redo", accelerator: "mod+shift+z", disabled: true },
    ],
  },
  {
    id: "view",
    label: "View",
    items: [
      { id: "sidebar", label: "Toggle sidebar", accelerator: "mod+b" },
      { id: "zoom", label: "Actual size" },
    ],
  },
];

/** The menus reduced to what the package's navigation needs. */
export const appMenuSpecs = (
  menus: ReadonlyArray<AppMenuEntry>,
): ReadonlyArray<AppMenuSpec> =>
  Arr.map(menus, (menu) => ({
    id: menu.id,
    disabled: menu.disabled === true,
    items: Arr.map(menu.items, (item) => ({
      id: item.id,
      disabled: item.disabled === true,
    })),
  }));

/** The row the state highlights, when it names one a reader can run. */
export interface AppMenuSelection {
  readonly menuId: string;
  readonly itemId: string;
}

/** The row the state highlights, and the menu it belongs to. */
export const activeRow = (
  state: MenuBarState,
  menus: ReadonlyArray<AppMenuEntry>,
): Option.Option<AppMenuSelection> =>
  Option.match(state.openMenu, {
    onNone: () => Option.none(),
    onSome: (menu) =>
      Option.match(Arr.get(menus, menu), {
        onNone: () => Option.none(),
        onSome: (entry) =>
          Option.match(state.activeItem, {
            onNone: () => Option.none(),
            onSome: (item) =>
              Option.match(Arr.get(entry.items, item), {
                onNone: () => Option.none(),
                onSome: (row) =>
                  row.disabled === true
                    ? Option.none()
                    : Option.some({ menuId: entry.id, itemId: row.id }),
              }),
          }),
      }),
  });

/** The label of the row the state highlights, when it names one. */
export const activeRowLabel = (
  state: MenuBarState,
  menus: ReadonlyArray<AppMenuEntry>,
): Option.Option<string> =>
  Option.match(activeRow(state, menus), {
    onNone: () => Option.none(),
    onSome: (selection) =>
      Option.match(
        Arr.findFirst(menus, (entry) => entry.id === selection.menuId),
        {
          onNone: () => Option.none(),
          onSome: (entry) =>
            Option.match(
              Arr.findFirst(
                entry.items,
                (item) => item.id === selection.itemId,
              ),
              {
                onNone: () => Option.none(),
                onSome: (item) => Option.some(item.label),
              },
            ),
        },
      ),
  });

/** What the drawing reports under the bar. */
export const appMenuReadout = (
  state: MenuBarState,
  menus: ReadonlyArray<AppMenuEntry>,
): string =>
  Option.match(state.openMenu, {
    onNone: () => "no menu is open",
    onSome: (menu) => {
      const label = Option.match(Arr.get(menus, menu), {
        onNone: () => "a menu",
        onSome: (entry) => entry.label,
      });
      const row = Option.match(activeRowLabel(state, menus), {
        onNone: () => "no row is highlighted",
        onSome: (name) => `the highlighted row is ${name}`,
      });
      return `${label} is open · ${row}`;
    },
  });

/** The drawing itself: the bar, its dropdown and the highlighted row. */
export interface AppMenuFrameProps {
  readonly menus: ReadonlyArray<AppMenuEntry>;
  readonly state: MenuBarState;
  readonly onStateChange: (state: MenuBarState) => void;
  readonly onSelect: (menuId: string, itemId: string) => void;
}

/** The bar, the dropdown and the readout. */
export function AppMenuFrame({
  menus,
  state,
  onStateChange,
  onSelect,
}: AppMenuFrameProps) {
  const specs = appMenuSpecs(menus);

  const runActive = (): void => {
    Option.match(activeRow(state, menus), {
      onNone: () => undefined,
      onSome: (selection) => {
        onSelect(selection.menuId, selection.itemId);
        onStateChange(dismiss(state).state);
      },
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const key = event.key;
    if (key === "Escape") {
      event.preventDefault();
      onStateChange(dismiss(state).state);
      return;
    }
    if (key === "ArrowRight" || key === "ArrowLeft") {
      event.preventDefault();
      onStateChange(
        step(state, specs, {
          _tag: "MoveBar",
          delta: key === "ArrowRight" ? 1 : -1,
        }),
      );
      return;
    }
    if (key === "ArrowDown") {
      event.preventDefault();
      onStateChange(
        Option.isSome(state.openMenu)
          ? step(state, specs, { _tag: "MoveItem", delta: 1 })
          : step(state, specs, {
              _tag: "Open",
              menu: Option.getOrElse(state.activeMenu, () => 0),
            }),
      );
      return;
    }
    if (key === "ArrowUp" && Option.isSome(state.openMenu)) {
      event.preventDefault();
      onStateChange(step(state, specs, { _tag: "MoveItem", delta: -1 }));
      return;
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      if (Option.isSome(state.openMenu)) runActive();
      else
        onStateChange(
          step(state, specs, {
            _tag: "Open",
            menu: Option.getOrElse(state.activeMenu, () => 0),
          }),
        );
    }
  };

  return (
    <div className="gx-shell-demo">
      <div
        aria-label="Editor"
        className="gx-shell-menubar"
        onKeyDown={handleKeyDown}
        role="menubar"
      >
        {Arr.map(menus, (menu, index) => {
          const open = Option.contains(state.openMenu, index);
          const highlighted = open || Option.contains(state.activeMenu, index);
          return (
            <span className="gx-shell-menu-slot" key={menu.id}>
              <button
                aria-disabled={menu.disabled === true}
                aria-expanded={open}
                aria-haspopup="menu"
                className="gx-shell-trigger"
                data-highlighted={highlighted ? "true" : "false"}
                data-menu={menu.id}
                data-open={open ? "true" : "false"}
                onClick={() => {
                  if (menu.disabled === true) return;
                  onStateChange(
                    open
                      ? dismiss(state).state
                      : step(state, specs, { _tag: "Open", menu: index }),
                  );
                }}
                onMouseEnter={() =>
                  onStateChange(hoverOpen(state, specs, index))
                }
                role="menuitem"
                type="button"
              >
                {menu.label}
              </button>
              {open ? (
                <div
                  aria-label={menu.label}
                  className="gx-shell-dropdown"
                  role="menu"
                >
                  {Arr.map(menu.items, (item, itemIndex) => (
                    <button
                      aria-disabled={item.disabled === true}
                      aria-selected={Option.contains(
                        state.activeItem,
                        itemIndex,
                      )}
                      className="gx-shell-row"
                      data-item={item.id}
                      key={item.id}
                      onClick={() => {
                        if (item.disabled === true) return;
                        onSelect(menu.id, item.id);
                        onStateChange(dismiss(state).state);
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <span className="gx-shell-row-label">{item.label}</span>
                      {item.accelerator === undefined ? null : (
                        <span className="gx-shell-accelerator">
                          {item.accelerator}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </span>
          );
        })}
      </div>
      <p className="gx-shell-readout">{appMenuReadout(state, menus)}</p>
    </div>
  );
}

/** The page's preview: the bar, its dropdown and the row a reader chose. */
export function AppMenuDemo() {
  const [state, setState] = useState<MenuBarState>(initial);
  const [chosen, setChosen] = useState<Option.Option<string>>(Option.none());

  return (
    <div className="gx-shell-demo">
      <AppMenuFrame
        menus={APP_MENU_ENTRIES}
        onSelect={(menuId, itemId) =>
          setChosen(Option.some(`${menuId}/${itemId}`))
        }
        onStateChange={setState}
        state={state}
      />
      <div className="gx-shell-actions">
        <span className="gx-shell-hint">
          {Option.match(chosen, {
            onNone: () =>
              "A closed bar opens nothing on hover; an open one takes a sibling.",
            onSome: (id) => `The bar reported “${id}”.`,
          })}
        </span>
      </div>
    </div>
  );
}

export const appMenuDemoSource = `import { AppMenu, type AppMenuEntry } from "@gpuixui/shell";

const menus: ReadonlyArray<AppMenuEntry> = [
  {
    id: "file",
    label: "File",
    items: [
      { id: "new", label: "New file", accelerator: "mod+n" },
      { id: "save", label: "Save", accelerator: "mod+s" },
    ],
  },
  { id: "edit", label: "Edit", items: [{ id: "undo", label: "Undo", accelerator: "mod+z" }] },
];

export function EditorMenu() {
  return (
    <AppMenu
      label="Editor"
      menus={menus}
      onSelect={(menuId, itemId) => run(menuId, itemId)}
    />
  );
}`;
