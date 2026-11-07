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

export interface ToolbarAction {
  readonly id: string;
  readonly label: string;

  readonly group?: string;
  readonly disabled?: boolean;
}

export interface ToolbarMode {
  readonly id: string;
  readonly label: string;
}

export const TOOLBAR_ACTIONS: ReadonlyArray<ToolbarAction> = [
  { id: "new", label: "New", group: "file" },
  { id: "open", label: "Open", group: "file", disabled: true },
  { id: "save", label: "Save", group: "file" },
  { id: "undo", label: "Undo", group: "edit" },
  { id: "redo", label: "Redo", group: "edit" },
  { id: "find", label: "Find", group: "find" },
];

export const TOOLBAR_MODES: ReadonlyArray<ToolbarMode> = [
  { id: "edit", label: "Edit" },
  { id: "preview", label: "Preview" },
];

export const TOOLBAR_SLOTS: ReadonlyArray<number> = [3, 4, 5, 6];

export const TOOLBAR_MAX = 5;

export const toolbarSpecs = (
  actions: ReadonlyArray<ToolbarAction>,
): ReadonlyArray<ToolbarItemSpec> =>
  Arr.map(actions, (action) => ({
    id: action.id,
    disabled: action.disabled === true,
  }));

export interface ToolbarStrip {
  readonly visible: ReadonlyArray<ToolbarAction>;

  readonly overflow: ReadonlyArray<ToolbarAction>;

  readonly slots: number;
}

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

export const slotDisabled = (strip: ToolbarStrip, slot: number): boolean => {
  const overflowSlot = strip.slots - 1;
  if (Arr.length(strip.overflow) > 0 && slot === overflowSlot) return false;
  return strip.visible[slot]?.disabled === true;
};

export const initialTabStop = (strip: ToolbarStrip): Option.Option<number> =>
  initialRoving(strip.slots, (slot) => slotDisabled(strip, slot));

export const moveTabStop = (
  strip: ToolbarStrip,
  current: number,
  delta: 1 | -1,
): Option.Option<number> =>
  moveRoving(current, strip.slots, delta, (slot) => slotDisabled(strip, slot));

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

export const toolbarReadout = (
  strip: ToolbarStrip,
  tabStop: Option.Option<number>,
): string =>
  `${Arr.length(strip.visible)} of ${Arr.length(strip.visible) + Arr.length(strip.overflow)} in the strip · the tab stop is on ${tabStopLabel(strip, tabStop)}`;

export interface ToolbarFrameProps {
  readonly actions: ReadonlyArray<ToolbarAction>;
  readonly max: number;
  readonly tabStop: Option.Option<number>;
  readonly overflowOpen: boolean;

  readonly modes?: ReadonlyArray<ToolbarMode>;

  readonly mode?: string;

  readonly onTabStopChange: (slot: Option.Option<number>) => void;
  readonly onOverflowOpenChange: (open: boolean) => void;

  readonly onAction: (id: string) => void;

  readonly onModeChange?: (id: string) => void;
}

export function ToolbarFrame({
  actions,
  max,
  tabStop,
  overflowOpen,
  modes = [],
  mode,
  onTabStopChange,
  onOverflowOpenChange,
  onAction,
  onModeChange,
}: ToolbarFrameProps) {
  const strip = toolbarStrip(actions, max);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const key = event.key;
    if (key !== "ArrowLeft" && key !== "ArrowRight") return;

    const target = event.target as HTMLElement;
    if (target.closest(".gx-tgroup") !== null) return;
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
    <div className="gx-shell-demo gx-toolbar-demo">
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
                className="gx-btn gx-btn-ghost gx-btn-sm"
                data-action={action.id}
                data-disabled={action.disabled === true ? "true" : "false"}
                data-tab-stop={
                  Option.contains(tabStop, index) ? "true" : "false"
                }
                onClick={() => {
                  if (action.disabled === true) return;
                  onAction(action.id);
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

        <span className="gx-shell-spacer" />

        {modes.length === 0 ? null : (
          <span aria-hidden="true" className="gx-shell-separator" />
        )}
        {modes.length === 0 ? null : (
          <div aria-label="View" className="gx-tgroup" role="group">
            {modes.map((candidate) => (
              <button
                aria-label={candidate.label}
                aria-pressed={candidate.id === mode}
                className="gx-btn gx-btn-ghost gx-btn-sm gx-toggle"
                data-mode={candidate.id}
                data-pressed={candidate.id === mode ? "" : undefined}
                key={candidate.id}
                onClick={() => onModeChange?.(candidate.id)}
                type="button"
              >
                {candidate.label}
              </button>
            ))}
          </div>
        )}

        {Arr.length(strip.overflow) === 0 ? null : (
          <>
            <span aria-hidden="true" className="gx-shell-separator" />
            <button
              aria-expanded={overflowOpen}
              aria-haspopup="menu"
              aria-label="More actions"
              className="gx-btn gx-btn-ghost gx-btn-sm gx-btn-square"
              data-action="overflow"
              data-tab-stop={
                Option.contains(tabStop, strip.slots - 1) ? "true" : "false"
              }
              onClick={() => onOverflowOpenChange(!overflowOpen)}
              ref={(element) => {
                refs.current[strip.slots - 1] = element;
              }}
              tabIndex={Option.contains(tabStop, strip.slots - 1) ? 0 : -1}
              type="button"
            >
              <BrowserIcon name="ellipsis" />
            </button>
          </>
        )}
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

export function ToolbarDemo() {
  const [max, setMax] = useState(TOOLBAR_MAX);
  const [tabStop, setTabStop] = useState<Option.Option<number>>(() =>
    initialTabStop(toolbarStrip(TOOLBAR_ACTIONS, TOOLBAR_MAX)),
  );
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [chosen, setChosen] = useState<Option.Option<string>>(Option.none());
  const [mode, setMode] = useState(TOOLBAR_MODES[0]?.id ?? "");

  return (
    <div className="gx-shell-demo gx-toolbar-demo">
      <ToolbarFrame
        actions={TOOLBAR_ACTIONS}
        max={max}
        mode={mode}
        modes={TOOLBAR_MODES}
        onAction={(id) => setChosen(Option.some(id))}
        onModeChange={setMode}
        onOverflowOpenChange={setOverflowOpen}
        onTabStopChange={setTabStop}
        overflowOpen={overflowOpen}
        tabStop={tabStop}
      />
      <div className="gx-shell-actions">
        <div aria-label="Visible slots" className="gx-tgroup" role="group">
          {TOOLBAR_SLOTS.map((slots) => (
            <button
              aria-label={`${slots} slots`}
              aria-pressed={slots === max}
              className="gx-btn gx-btn-ghost gx-btn-sm gx-toggle"
              data-pressed={slots === max ? "" : undefined}
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

export const toolbarDemoSource = `import { Toolbar, type ToolbarAction, type ToolbarMode } from "@gpuixui/shell";

const actions: ReadonlyArray<ToolbarAction> = [
  { id: "new", label: "New", group: "file" },
  { id: "open", label: "Open", group: "file", disabled: true },
  { id: "save", label: "Save", group: "file" },
  { id: "undo", label: "Undo", group: "edit" },
  { id: "redo", label: "Redo", group: "edit" },
  { id: "find", label: "Find", group: "find" },
];

const modes: ReadonlyArray<ToolbarMode> = [
  { id: "edit", label: "Edit" },
  { id: "preview", label: "Preview" },
];

export function DocumentToolbar() {
  const [mode, setMode] = useState(() => modes[0]?.id ?? "");
  return (
    <Toolbar
      label="Document"
      max={5}
      actions={actions}
      modes={modes}
      onModeChange={(mode) => setMode(mode)}
      onAction={(id) => run(id)}
    />
  );
}`;
