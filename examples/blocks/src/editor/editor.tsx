/** @jsxImportSource @gpuix/react */
/**
 * Editor — a code editor in the Mac look: the explorer on the left, the open
 * file's code painted token by token in the centre, and a status bar under it.
 * Pressing a file opens it (the tab, the code and the status line change
 * together). Everything is a library component except the code paint itself.
 */
import { Match } from "effect";
import * as Option from "effect/Option";
import * as Arr from "effect/Array";
import { Icon } from "@gpuixui/icons";
import { Text } from "@gpuixui/primitives";
import { Window, WindowToolbar } from "@gpuixui/shell";
import { useTheme } from "@gpuixui/tokens/react";
import { useState } from "react";
import { files, tree } from "./data.js";
import { highlight, openFile, type Tone } from "./logic.js";

const GUTTER = 46;

export const Editor = ({
  platform,
}: {
  readonly platform?: "darwin" | "win32" | "linux";
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(files[0]?.name ?? "");
  const file = Option.getOrUndefined(openFile(files, open));

  const toneColour = (tone: Tone): string =>
    Match.value(tone).pipe(
      Match.when("keyword", () => "#A626A4"),
      Match.when("string", () => "#3F8F3F"),
      Match.when("comment", () => "#9AA0A6"),
      Match.when("fn", () => "#3B6FD4"),
      Match.when("punctuation", () => "#6B6B76"),
      Match.when("plain", () => theme.colors.foreground),
      Match.exhaustive,
    );

  const explorer = (
    <div
      style={{ display: "flex", flexDirection: "column", padding: 10, gap: 2 }}
    >
      <Text role="caption" tone="muted">
        EXPLORER
      </Text>
      {Arr.map(tree, (folder) => (
        <div
          key={folder.name}
          style={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingTop: 6,
              paddingBottom: 2,
            }}
          >
            <Icon
              name="chevron-down"
              size={12}
              color={theme.colors.mutedForeground}
            />
            <Text role="caption" tone="muted">
              {folder.name.toUpperCase()}
            </Text>
          </div>
          {Arr.map(folder.files, (name) => (
            <div
              key={name}
              testId={`file-${name}`}
              onClick={() => setOpen(name)}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                height: 26,
                paddingLeft: 14,
                paddingRight: 8,
                borderRadius: 6,
                backgroundColor:
                  name === file?.name
                    ? theme.colors.accent + "26"
                    : "#00000000",
              }}
            >
              <div style={{ pointerEvents: "none" }}>
                <Icon
                  name="file"
                  size={13}
                  color={
                    name === file?.name
                      ? theme.colors.accent
                      : theme.colors.mutedForeground
                  }
                />
              </div>
              <text
                style={{
                  fontSize: 13,
                  lineHeight: 18,
                  color: theme.colors.foreground,
                }}
              >
                {name}
              </text>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <Window
      testId="editor"
      {...(platform === undefined ? {} : { platform })}
      sidebar={explorer}
      sidebarWidth={220}
      toolbar={
        <WindowToolbar
          title={file?.name}
          leading={
            <Icon name="code" size={14} color={theme.colors.mutedForeground} />
          }
          actions={
            <Text role="caption" tone="muted">
              {file?.language}
            </Text>
          }
        />
      }
    >
      <div
        testId="editor-code"
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          backgroundColor: theme.colors.background,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            paddingTop: 10,
          }}
        >
          {Arr.map(file?.code ?? [], (line, index) => (
            <div
              key={index}
              style={{ display: "flex", flexDirection: "row", height: 21 }}
            >
              <text
                style={{
                  width: GUTTER,
                  textAlign: "right",
                  paddingRight: 12,
                  fontSize: 12,
                  lineHeight: 21,
                  color: theme.colors.mutedForeground,
                }}
              >
                {index + 1}
              </text>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {Arr.map(highlight(line), (token, at) => (
                  <text
                    key={at}
                    style={{
                      fontSize: 13,
                      lineHeight: 21,
                      fontFamily: "Menlo",
                      color: toneColour(token.tone),
                    }}
                  >
                    {token.text}
                  </text>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            height: 26,
            paddingLeft: 12,
            paddingRight: 12,
            borderTopWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Icon
              name="git-branch"
              size={12}
              color={theme.colors.mutedForeground}
            />
            <text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
              main
            </text>
          </div>
          <text
            testId="editor-status"
            style={{ fontSize: 11, color: theme.colors.mutedForeground }}
          >
            {`${file?.language ?? ""}  ·  Ln 1, Col 1  ·  Spaces: 2`}
          </text>
          <div style={{ flexGrow: 1, flexBasis: 0 }} />
          <text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
            {`${file?.code.length ?? 0} lines`}
          </text>
        </div>
      </div>
    </Window>
  );
};
