/**
 * SourceList: the sidebar's list of places, as AppKit draws it.
 *
 * Sections of 28-point rows, each a 16-point icon, a label and a trailing count,
 * inset from the sidebar's edges with rounded corners. Three AppKit habits the
 * web sidebar does not have:
 *
 * - **no hover wash** — a Mac sidebar highlights a row when it is chosen, not
 *   when the pointer crosses it;
 * - the chosen row is **emphasized** (the accent fill, `primaryForeground` ink)
 *   only while the list holds focus, and a quiet `active` wash otherwise — so
 *   the emphasized row is also the list's visible focus;
 * - the list is **one tab stop** (the chosen row) and ↑/↓/Home/End move the
 *   choice, stopping at either end.
 */

import {
  useGpuix,
  type KeyEvent,
  type Props,
  type PublicInstance,
} from "@gpuix/react";
import { Icon, type IconName } from "@gpuixui/icons";
import { isPlainKey } from "@gpuixui/primitives";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useEffect, useRef, useState } from "react";
import { textStyle, useTheme } from "../theme.js";
import { moveSelection, type SourceListKey } from "./logic.js";

/** The row height AppKit's medium sidebar uses. */
export const SOURCE_ROW_HEIGHT = 28;

/** One place in the list. */
export interface SourceListItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
  /** A trailing count, such as unread items. */
  readonly count?: number;
}

/** A titled group of places. */
export interface SourceListSection {
  readonly id: string;
  /** The section's header; omitted for a list's leading, untitled group. */
  readonly title?: string;
  readonly items: ReadonlyArray<SourceListItem>;
}

/** {@link SourceList} props. */
export interface SourceListProps extends Omit<Props, "children"> {
  /** The list's accessible name. */
  readonly label: string;
  readonly sections: ReadonlyArray<SourceListSection>;
  /** The chosen place's id. */
  readonly value: string;
  readonly onValueChange: (id: string) => void;
}

const keyOf = (event: KeyEvent): Option.Option<SourceListKey> => {
  const key = event.key ?? "";
  return isPlainKey(event.modifiers) &&
    (key === "up" || key === "down" || key === "home" || key === "end")
    ? Option.some(key)
    : Option.none();
};

/** The sidebar's source list. */
export const SourceList = ({
  label,
  sections,
  value,
  onValueChange,
  style,
  ...rest
}: SourceListProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [focused, setFocused] = useState(false);
  const rows = useRef(new Map<string, PublicInstance>());
  const ids = Arr.flatMap(sections, (section) =>
    Arr.map(section.items, (item) => item.id),
  );

  // The tab stop moves with the choice; focus follows once the new stop has
  // rendered, or the runtime focuses the row that is leaving it.
  const follow = useRef(false);

  useEffect(() => {
    if (!follow.current) return;
    follow.current = false;
    const row = rows.current.get(value);
    if (row !== undefined) renderer?.focusElement?.(row.id);
  }, [value, renderer]);

  const choose = (id: string): void => {
    follow.current = true;
    onValueChange(id);
  };

  const onKeyDown = (event: KeyEvent): void =>
    Option.match(
      Option.flatMap(keyOf(event), (key) => moveSelection(ids, value, key)),
      { onNone: () => undefined, onSome: choose },
    );

  return (
    <div
      role="listbox"
      aria-label={label}
      {...rest}
      onKeyDown={onKeyDown}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        paddingLeft: 10,
        paddingRight: 10,
        ...style,
      }}
    >
      {Arr.map(sections, (section) => (
        <div
          key={section.id}
          style={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {section.title === undefined ? null : (
            <text
              style={{
                ...textStyle(theme, "caption"),
                fontWeight: 600,
                color: theme.colors.mutedForeground,
                paddingLeft: 8,
                paddingTop: 8,
                paddingBottom: 2,
              }}
            >
              {section.title}
            </text>
          )}
          {Arr.map(section.items, (item) => {
            const chosen = item.id === value;
            const emphasized = chosen && focused;
            const ink = emphasized
              ? theme.colors.primaryForeground
              : theme.colors.foreground;
            return (
              <div
                key={item.id}
                role="option"
                aria-selected={chosen}
                tabIndex={chosen ? 0 : -1}
                testId={`source-${item.id}`}
                ref={(instance: PublicInstance | null) => {
                  if (instance === null) rows.current.delete(item.id);
                  else rows.current.set(item.id, instance);
                }}
                onClick={() => choose(item.id)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  height: SOURCE_ROW_HEIGHT,
                  paddingLeft: 8,
                  paddingRight: 8,
                  borderRadius: theme.radius.sm,
                  keyboardFocusDim: false,
                  ...(chosen
                    ? {
                        backgroundColor: emphasized
                          ? theme.colors.primary
                          : theme.colors.active,
                      }
                    : {}),
                }}
              >
                {item.icon === undefined ? null : (
                  <Icon
                    name={item.icon}
                    size={theme.iconSize.md}
                    color={emphasized ? ink : theme.colors.primary}
                  />
                )}
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: ink,
                    flexGrow: 1,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.label}
                </text>
                {item.count === undefined ? null : (
                  <text
                    style={{
                      ...textStyle(theme, "caption"),
                      color: emphasized ? ink : theme.colors.mutedForeground,
                    }}
                  >
                    {String(item.count)}
                  </text>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
