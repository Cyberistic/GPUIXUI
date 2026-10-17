/**
 * A pointer-captured tab strip, shared by the workspace probes.
 *
 * GPUI arms pointer capture on the pressed element for the left button, so a
 * drag that leaves a tab keeps sending `onMouseMove` to it. The strip therefore
 * decides a move from the horizontal delta alone — there is no hover during a
 * captured drag and no `position: fixed`, so a floating preview is not possible
 * (`drag-targets`, plan `162`). `onMove` fires once the delta crosses
 * `DROP_THRESHOLD` and clears the press, so one drag moves one tab.
 */
import { useState } from "react";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";

const DROP_THRESHOLD = 80;

/** A tab and the pane it lives in; `press` is the in-flight drag. */
export interface TabStripProps {
  /** Prefix for the generated `testId`s: `${testIdPrefix}${tabId}`. */
  readonly testIdPrefix: string;
  readonly pane: string;
  readonly tabs: ReadonlyArray<string>;
  readonly active: string;
  readonly onSelect: (id: string) => void;
  readonly onMove: (id: string, from: string) => void;
}

/** A horizontal strip of tabs that move between panes by drag. */
export const TabStrip = ({
  testIdPrefix,
  pane,
  tabs,
  active,
  onSelect,
  onMove,
}: TabStripProps) => {
  const theme = useTheme();
  const [press, setPress] = useState(
    Option.none<{ readonly id: string; readonly x: number }>(),
  );

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        backgroundColor: theme.colors.muted,
      }}
    >
      {tabs.map((id) => (
        <div
          key={id}
          testId={`${testIdPrefix}${id}`}
          tabIndex={0}
          role="tab"
          aria-selected={active === id}
          onClick={() => onSelect(id)}
          onMouseDown={(event) =>
            setPress(Option.some({ id, x: event.x ?? 0 }))
          }
          onMouseMove={(event) =>
            Option.match(press, {
              onNone: () => {},
              onSome: (start) => {
                const delta = (event.x ?? 0) - start.x;
                if (delta > DROP_THRESHOLD || delta < -DROP_THRESHOLD) {
                  onMove(start.id, pane);
                  setPress(Option.none());
                }
              },
            })
          }
          onMouseUp={() => setPress(Option.none())}
          style={{
            padding: 6,
            borderRadius: 4,
            cursor: "pointer",
            backgroundColor:
              active === id ? theme.colors.card : theme.colors.background,
            hover: { backgroundColor: theme.colors.card },
          }}
        >
          <text style={{ color: theme.colors.foreground }}>{id}</text>
        </div>
      ))}
      {tabs.length === 0 ? (
        <text style={{ color: theme.colors.placeholder }}>empty</text>
      ) : null}
    </div>
  );
};
