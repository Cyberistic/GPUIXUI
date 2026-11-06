import {
  useGpuix,
  type KeyEvent,
  type Props,
  type PublicInstance,
} from "@gpuix/react";
import { Icon, type IconName } from "@gpuixui/icons";
import { isPlainKey, useTypeAhead } from "@gpuixui/primitives";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useEffect, useRef, useState } from "react";
import { textStyle, useTheme } from "../theme.js";
import { moveSelection, visibleIds, type SourceListKey } from "./logic.js";

export const SOURCE_ROW_HEIGHT = 28;

export interface SourceListItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;

  readonly count?: number;
}

export interface SourceListSection {
  readonly id: string;

  readonly title?: string;

  readonly collapsible?: boolean;

  readonly defaultCollapsed?: boolean;
  readonly items: ReadonlyArray<SourceListItem>;
}

export interface SourceListProps extends Omit<Props, "children"> {
  readonly label: string;
  readonly sections: ReadonlyArray<SourceListSection>;

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
  const [folded, setFolded] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        Arr.map(
          Arr.filter(
            sections,
            (section) =>
              section.collapsible === true && section.defaultCollapsed === true,
          ),
          (section) => section.id,
        ),
      ),
  );
  const ids = visibleIds(sections, folded);
  const labels = new Map(
    Arr.flatMap(sections, (section) =>
      Arr.map(section.items, (item) => [item.id, item.label] as const),
    ),
  );
  const typeAhead = useTypeAhead(
    Arr.map(ids, (id) => ({ value: id, label: labels.get(id) ?? "" })),
    () => false,
  );

  const stop = Arr.contains(ids, value) ? Option.some(value) : Arr.head(ids);
  const toggle = (id: string): void =>
    setFolded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

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
      Option.orElse(
        Option.flatMap(keyOf(event), (key) => moveSelection(ids, value, key)),
        () =>
          isPlainKey(event.modifiers)
            ? Option.flatMap(
                typeAhead(
                  Option.getOrElse(
                    Arr.findFirstIndex(ids, (id) => id === value),
                    () => -1,
                  ),
                  event.key ?? "",
                ),
                (index) => Arr.get(ids, index),
              )
            : Option.none(),
      ),
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
            <div
              {...(section.collapsible === true
                ? {
                    role: "button",
                    "aria-expanded": !folded.has(section.id),
                    testId: `source-section-${section.id}`,
                    onClick: () => toggle(section.id),
                  }
                : {})}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                paddingLeft: 8,
                paddingRight: 8,
                paddingTop: 8,
                paddingBottom: 2,
              }}
            >
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  fontWeight: 600,
                  color: theme.colors.mutedForeground,
                  flexGrow: 1,
                }}
              >
                {section.title}
              </text>
              {section.collapsible === true ? (
                <Icon
                  name={
                    folded.has(section.id) ? "chevron-right" : "chevron-down"
                  }
                  size={theme.iconSize.sm}
                  color={theme.colors.mutedForeground}
                />
              ) : null}
            </div>
          )}
          {Arr.map(folded.has(section.id) ? [] : section.items, (item) => {
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
                tabIndex={Option.contains(stop, item.id) ? 0 : -1}
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
