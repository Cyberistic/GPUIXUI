/** @jsxImportSource @gpuix/react */
import { Icon } from "@gpuixui/icons";
import { Input, Separator, Stack, Text } from "@gpuixui/primitives";
import { materialFill, seriesColors } from "@gpuixui/tokens";
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
  const tiles = seriesColors(theme);

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
          width: 720,
          height: 500,
          borderRadius: theme.radius.xl,
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
          // The caret stands at the text's first pixel; a thin space keeps it off the S.
          placeholder={"\u2009Search for apps and commands"}
          value={query}
          onValueChange={(next) => {
            setQuery(next);
            setAt(0);
          }}
          style={{
            height: 60,
            fontSize: 22,
            paddingLeft: theme.spacing.lg,
            borderWidth: 0,
            backgroundColor: undefined,
          }}
        />
        <Separator orientation="horizontal" />
        <Stack
          direction="column"
          style={{
            flexGrow: 1,
            flexBasis: 0,
            minHeight: 0,
            overflow: "hidden",
            padding: theme.spacing.sm,
          }}
        >
          {Arr.map(shown, (result, index) => (
            <div
              key={result.id}
              style={{ display: "flex", flexDirection: "column" }}
            >
              {shown[index - 1]?.group === result.group ? null : (
                <Text
                  tone="muted"
                  role="caption"
                  style={{
                    paddingLeft: theme.spacing.sm,
                    paddingTop: theme.spacing.sm,
                    paddingBottom: theme.spacing.xs,
                  }}
                >
                  {result.group}
                </Text>
              )}
              <div
                testId={`result-${result.id}`}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.md,
                  height: 42,
                  paddingLeft: theme.spacing.sm,
                  paddingRight: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  ...(index === at
                    ? { backgroundColor: theme.colors.selected }
                    : {}),
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: theme.radius.md,
                    backgroundColor: tiles[index % tiles.length],
                  }}
                >
                  <Icon
                    name={result.icon}
                    size={theme.iconSize.md}
                    color={theme.colors.primaryForeground}
                  />
                </div>
                <Text role="bodyStrong">{result.title}</Text>
                <Text
                  tone="muted"
                  truncate
                  style={{ flexGrow: 1, flexBasis: 0 }}
                >
                  {result.subtitle}
                </Text>
                <Text tone="muted">{result.shortcut ?? result.group}</Text>
              </div>
            </div>
          ))}
        </Stack>
        <Separator orientation="horizontal" />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.lg,
            height: 40,
            paddingLeft: theme.spacing.lg,
            paddingRight: theme.spacing.lg,
          }}
        >
          <Text tone="muted" truncate style={{ flexGrow: 1, flexBasis: 0 }}>
            {Option.match(Arr.get(shown, at), {
              onNone: () => "No results",
              onSome: (result) => `Open ${result.title}`,
            })}
          </Text>
          <Text tone="muted">↵ Open</Text>
          <Text tone="muted">⌘K Actions</Text>
        </div>
      </div>
    </div>
  );
};
