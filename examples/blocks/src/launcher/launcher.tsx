/**
 * Launcher — the ⌘K command HUD (plan 729): a large search field, grouped
 * results with their shortcuts, and an action footer, on the `hud` material.
 *
 * It is a centred panel in the window until plan 706 (overlay windows) gives
 * the runtime a borderless floating window.
 */
import { Icon } from "@gpuixui/icons";
import { Input, Stack, Text } from "@gpuixui/primitives";
import { materialFill } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import type { KeyEvent } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { results, type Result } from "./data.js";
import { moveHighlight, rank } from "./logic.js";

// TODO: a borderless floating window once plan 706 (overlay windows) lands.
export const Launcher = ({
  onRun = () => undefined,
}: {
  readonly onRun?: (result: Result) => void;
}) => {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(0);
  const shown = rank(results, query);

  const onKeyDown = (event: KeyEvent) => {
    const key = event.key ?? "";
    if (key === "down" || key === "up")
      setAt(moveHighlight(shown.length, at, key === "down" ? 1 : -1));
    if (key === "enter") Option.map(Arr.get(shown, at), onRun);
  };

  return (
    <div
      testId="launcher-scene"
      style={{
        display: "flex",
        flexGrow: 1,
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.muted,
      }}
    >
      <div
        testId="launcher"
        onKeyDown={onKeyDown}
        style={{
          display: "flex",
          flexDirection: "column",
          width: 680,
          height: 420,
          borderRadius: 14,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          backgroundColor: materialFill(theme, "hud"),
          overflow: "hidden",
        }}
      >
        <Input
          label="Search"
          testId="launcher-query"
          autoFocus
          placeholder="Search for apps and commands"
          value={query}
          onValueChange={(next) => {
            setQuery(next);
            setAt(0);
          }}
          style={{
            height: 52,
            fontSize: 20,
            borderWidth: 0,
            backgroundColor: undefined,
          }}
        />
        <Stack direction="column" style={{ flexGrow: 1, padding: 8 }}>
          {Arr.map(shown, (result, index) => (
            <div
              key={result.id}
              testId={`result-${result.id}`}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                height: 32,
                paddingLeft: 10,
                paddingRight: 10,
                borderRadius: theme.radius.sm,
                ...(index === at
                  ? { backgroundColor: theme.colors.primary }
                  : {}),
              }}
            >
              <Icon
                name={result.icon}
                size={theme.iconSize.md}
                color={
                  index === at
                    ? theme.colors.primaryForeground
                    : theme.colors.primary
                }
              />
              <Text
                style={{
                  flexGrow: 1,
                  color:
                    index === at
                      ? theme.colors.primaryForeground
                      : theme.colors.foreground,
                }}
              >
                {result.title}
              </Text>
              <Text
                style={{
                  color:
                    index === at
                      ? theme.colors.primaryForeground
                      : theme.colors.mutedForeground,
                }}
              >
                {result.shortcut ?? result.group}
              </Text>
            </div>
          ))}
        </Stack>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: 16,
            height: 36,
            paddingRight: 14,
            alignItems: "center",
            borderTopWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        >
          <Text tone="muted">↵ Open</Text>
          <Text tone="muted">⌘↵ Actions</Text>
        </div>
      </div>
    </div>
  );
};
