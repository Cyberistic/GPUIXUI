import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useRef, useState, type KeyboardEvent } from "react";
import {
  initialRoving,
  moveRoving,
  splitOverflow,
  type ToolbarItemSpec,
} from "@/lib/shell-logic";
import { BrowserIcon } from "./browser-icon";

/**
 * Browser preview for the Toolbar page.
 *
 * `@gpuixui/shell`'s `Toolbar` is a GPUix host strip, so the page cannot mount
 * it and this drawing is a labelled approximation. The rules are the package's:
 * `splitOverflow` decides which actions stay in the strip and which overflow,
 * `initialRoving` and `moveRoving` decide which slot holds the single tab
 * stop. Only the paint is the browser's.
 */

/** One action in the strip. */
export interface ToolbarAction {
  readonly id: string;
  readonly label: string;
  /** A label shared by adjacent actions; a separator falls between groups. */
  readonly group?: string;
  readonly disabled?: boolean;
}

/** The actions the drawing opens with: two groups and a disabled action. */
export const TOOLBAR_ACTIONS: ReadonlyArray<ToolbarAction> = [
  { id: "new", label: "New", group: "file" },
  { id: "open", label: "Open", group: "file", disabled: true },
  { id: "save", label: "Save", group: "file" },
  { id: "undo", label: "Undo", group: "edit" },
  { id: "redo", label: "Redo", group: "edit" },
  { id: "find", label: "Find", group: "find" },
];

/** The visible slots the drawing offers: the overflow trigger takes one. */
export const TOOLBAR_SLOTS: ReadonlyArray<number> = [3, 4, 5, 6];

/** The slots the drawing opens with. */
export const TOOLBAR_MAX = 5;

/** The actions reduced to what the package's navigation needs. */
export const toolbarSpecs = (
  actions: ReadonlyArray<ToolbarAction>,
): ReadonlyArray<ToolbarItemSpec> =>
  Arr.map(actions, (action) => ({
    id: action.id,
    disabled: action.disabled === true,
  }));

/** The slots the strip holds: the visible actions and the overflow trigger. */
export interface ToolbarStrip {
  /** The actions painted in the strip. */
  readonly visible: ReadonlyArray<ToolbarAction>;
  /** The actions the overflow menu holds. */
  readonly overflow: ReadonlyArray<ToolbarAction>;
  /** How many slots the strip holds, the overflow trigger included. */
  readonly slots: number;
}

/** The strip the package's overflow split produces. */
export const toolbarStrip = (
  actions: ReadonlyArray<ToolbarAction>,
  max: number,
): ToolbarStrip => {
  const split = splitOverflow(toolbarSpecs(actions), max);
  const visible = Arr.take(actions, Arr.length(split.visible));
  const overflow = Arr.drop(actions, Arr.length(split.visible));
  return {
    visible,
    overflow,
    slots: Arr.length(visible) + (Arr.length(overflow) > 0 ? 1 : 0),
  };
};

/** Whether a slot cannot take the tab stop: a disabled action, or no slot. */
export const slotDisabled = (strip: ToolbarStrip, slot: number): boolean => {
  const overflowSlot = strip.slots - 1;
  if (Arr.length(strip.overflow) > 0 && slot === overflowSlot) return false;
  return strip.visible[slot]?.disabled === true;
};

/** The slot that holds the strip's single tab stop. */
export const initialTabStop = (strip: ToolbarStrip): Option.Option<number> =>
  initialRoving(strip.slots, (slot) => slotDisabled(strip, slot));

/** The slot an arrow key moves the tab stop to. */
export const moveTabStop = (
  strip: ToolbarStrip,
  current: number,
  delta: 1 | -1,
): Option.Option<number> =>
  moveRoving(current, strip.slots, delta, (slot) => slotDisabled(strip, slot));

/** The label of the slot the tab stop sits on, or the overflow trigger's. */
export const tabStopLabel = (
  strip: ToolbarStrip,
  tabStop: Option.Option<number>,
): string =>
  Option.match(tabStop, {
    onNone: () => "no action can take the focus",
    onSome: (slot) => {
      const overflowSlot = strip.slots - 1;
      if (Arr.length(strip.overflow) > 0 && slot === overflowSlot)
        return "More actions";
      return strip.visible[slot]?.label ?? "no action can take the focus";
    },
  });

/** What the drawing reports under the strip. */
export const toolbarReadout = (
  strip: ToolbarStrip,
  tabStop: Option.Option<number>,
): string =>
  `${Arr.length(strip.visible)} of ${Arr.length(strip.visible) + Arr.length(strip.overflow)} in the strip · the tab stop is on ${tabStopLabel(strip, tabStop)}`;

/** The drawing itself: the strip, its roving tab stop and its overflow menu. */
export interface ToolbarFrameProps {
  readonly actions: ReadonlyArray<ToolbarAction>;
  readonly max: number;
  readonly tabStop: Option.Option<number>;
  readonly overflowOpen: boolean;
  /** Reports the slot that holds the tab stop. */
  readonly onTabStopChange: (slot: Option.Option<number>) => void;
  readonly onOverflowOpenChange: (open: boolean) => void;
  /** Reports the action a reader chose. */
  readonly onAction: (id: string) => void;
}

/** The strip, the overflow menu and the readout. */
export function ToolbarFrame({
  actions,
  max,
  tabStop,
  overflowOpen,
  onTabStopChange,
  onOverflowOpenChange,
  onAction,
}: ToolbarFrameProps) {
  const strip = toolbarStrip(actions, max);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const key = event.key;
    if (key !== "ArrowLeft" && key !== "ArrowRight") return;
    event.preventDefault();
    const next = moveTabStop(
      strip,
      Option.getOrElse(tabStop, () => 0),
      key === "ArrowRight" ? 1 : -1,
    );
    onTabStopChange(next);
    Option.match(next, {
      onNone: () => undefined,
      onSome: (slot) => refs.current[slot]?.focus(),
    });
  };

  return (
    <div className="gx-shell-demo">
      <div
        aria-label="Document"
        className="gx-shell-toolbar"
        onKeyDown={handleKeyDown}
        role="toolbar"
      >
        {Arr.map(strip.visible, (action, index) => {
          const groupBefore =
            index === 0
              ? false
              : (actions[index - 1]?.group ?? undefined) !==
                (action.group ?? undefined);
          return (
            <span className="gx-shell-slot" key={action.id}>
              {groupBefore ? (
                <span aria-hidden="true" className="gx-shell-separator" />
              ) : null}
              <button
                aria-disabled={action.disabled === true}
                aria-label={action.label}
                className="gx-shell-action"
                data-action={action.id}
                data-disabled={action.disabled === true ? "true" : "false"}
                data-tab-stop={
                  Option.contains(tabStop, index) ? "true" : "false"
                }
                onClick={() => {
                  if (action.disabled === true) return;
                  onAction(action.id);
                }}
                onKeyDown={(event) => {
                  if (action.disabled === true) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onAction(action.id);
                  }
                }}
                ref={(element) => {
                  refs.current[index] = element;
                }}
                tabIndex={Option.contains(tabStop, index) ? 0 : -1}
                type="button"
              >
                {action.label}
              </button>
            </span>
          );
        })}
        {Arr.length(strip.overflow) > 0 ? (
          <span className="gx-shell-slot">
            <button
              aria-expanded={overflowOpen}
              aria-haspopup="menu"
              aria-label="More actions"
              className="gx-shell-action gx-shell-overflow"
              data-action="overflow"
              data-tab-stop={
                Option.contains(tabStop, strip.slots - 1) ? "true" : "false"
              }
              onClick={() => onOverflowOpenChange(!overflowOpen)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOverflowOpenChange(!overflowOpen);
                }
              }}
              ref={(element) => {
                refs.current[strip.slots - 1] = element;
              }}
              tabIndex={Option.contains(tabStop, strip.slots - 1) ? 0 : -1}
              type="button"
            >
              <BrowserIcon name="ellipsis" />
            </button>
          </span>
        ) : null}
      </div>
      {overflowOpen && Arr.length(strip.overflow) > 0 ? (
        <div aria-label="More actions" className="gx-shell-menu" role="menu">
          {Arr.map(strip.overflow, (action) => (
            <button
              aria-disabled={action.disabled === true}
              className="gx-shell-menu-item"
              data-action={action.id}
              key={action.id}
              onClick={() => {
                if (action.disabled === true) return;
                onAction(action.id);
                onOverflowOpenChange(false);
              }}
              role="menuitem"
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
      <p className="gx-shell-readout">{toolbarReadout(strip, tabStop)}</p>
    </div>
  );
}

/** The page's preview: the strip, its slots and the action a reader chose. */
export function ToolbarDemo() {
  const [max, setMax] = useState(TOOLBAR_MAX);
  const [tabStop, setTabStop] = useState<Option.Option<number>>(() =>
    initialTabStop(toolbarStrip(TOOLBAR_ACTIONS, TOOLBAR_MAX)),
  );
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [chosen, setChosen] = useState<Option.Option<string>>(Option.none());

  return (
    <div className="gx-shell-demo">
      <ToolbarFrame
        actions={TOOLBAR_ACTIONS}
        max={max}
        onAction={(id) => setChosen(Option.some(id))}
        onOverflowOpenChange={setOverflowOpen}
        onTabStopChange={setTabStop}
        overflowOpen={overflowOpen}
        tabStop={tabStop}
      />
      <div className="gx-shell-actions">
        <div aria-label="Visible slots" className="gx-shell-group" role="group">
          {TOOLBAR_SLOTS.map((slots) => (
            <button
              aria-pressed={slots === max}
              className="gx-shell-choice"
              key={slots}
              onClick={() => {
                setMax(slots);
                setOverflowOpen(false);
                setTabStop(
                  initialTabStop(toolbarStrip(TOOLBAR_ACTIONS, slots)),
                );
              }}
              type="button"
            >
              {slots}
            </button>
          ))}
        </div>
        <span className="gx-shell-hint">
          {Option.match(chosen, {
            onNone: () => "",
            onSome: (id) => `reported “${id}”`,
          })}
        </span>
      </div>
    </div>
  );
}

export const toolbarDemoSource = `import { Toolbar, type ToolbarAction } from "@gpuixui/shell";

const actions: ReadonlyArray<ToolbarAction> = [
  { id: "new", label: "New", group: "file" },
  { id: "open", label: "Open", group: "file", disabled: true },
  { id: "save", label: "Save", group: "file" },
  { id: "undo", label: "Undo", group: "edit" },
  { id: "redo", label: "Redo", group: "edit" },
  { id: "find", label: "Find", group: "find" },
];

export function DocumentToolbar() {
  return (
    <Toolbar
      label="Document"
      max={5}
      actions={actions}
      onAction={(id) => run(id)}
    />
  );
}`;
