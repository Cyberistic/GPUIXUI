/** @jsxImportSource @gpuix/react */
/**
 * Vault — a linked-notes app: the folders in a source list, a reading pane whose
 * `[[links]]` open notes, and the graph and backlinks of the open note.
 */
import { SourceList, Window, WindowToolbar } from "@gpuixui/shell";
import { Stack, Text } from "@gpuixui/primitives";
import type { PlatformName } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { vaultNotes, type VaultNote } from "./data.js";
import { backlinks, edges, linksFrom, spans } from "./logic.js";

const GRAPH = { width: 280, height: 240, node: 14, focus: 22 };

const titleOf = (id: string): string =>
  Option.match(
    Arr.findFirst(vaultNotes, (note) => note.id === id),
    { onNone: () => id, onSome: (note) => note.title },
  );

const pointOf = (note: VaultNote) => ({
  x: note.at[0] * GRAPH.width,
  y: note.at[1] * GRAPH.height,
});

const edgeMarkup = (): string => {
  const point = (id: string) =>
    Arr.findFirst(vaultNotes, (note) => note.id === id).pipe(
      Option.map(pointOf),
      Option.toArray,
    );
  const lines = Arr.flatMap(edges(vaultNotes), ([from, to]) =>
    Arr.flatMap(point(from), (a) =>
      Arr.map(
        point(to),
        (b) =>
          `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#000" stroke-width="1"/>`,
      ),
    ),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRAPH.width} ${GRAPH.height}">${lines.join("")}</svg>`;
};

const Graph = ({
  open,
  onOpen,
}: {
  readonly open: VaultNote;
  readonly onOpen: (id: string) => void;
}) => {
  const theme = useTheme();
  const linked = linksFrom(open);
  return (
    <div
      testId="vault-graph"
      style={{
        position: "relative",
        width: GRAPH.width,
        height: GRAPH.height,
      }}
    >
      <svg
        source={edgeMarkup()}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: GRAPH.width,
          height: GRAPH.height,
          color: theme.colors.border,
        }}
      />
      {Arr.map(vaultNotes, (note) => {
        const { x, y } = pointOf(note);
        const focused = note.id === open.id;
        const size = focused ? GRAPH.focus : GRAPH.node;
        return (
          <div
            key={note.id}
            testId={`graph-${note.id}`}
            onClick={() => onOpen(note.id)}
            style={{
              position: "absolute",
              left: x - 50,
              top: y - size / 2,
              width: 100,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: theme.spacing.xs,
            }}
          >
            <div
              style={{
                pointerEvents: "none",
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor:
                  focused || Arr.contains(linked, note.id)
                    ? theme.colors.primary
                    : theme.colors.mutedForeground,
              }}
            />
            <Text role="caption" tone={focused ? "default" : "muted"}>
              {note.title}
            </Text>
          </div>
        );
      })}
    </div>
  );
};

export const Vault = ({ platform }: { readonly platform?: PlatformName }) => {
  const theme = useTheme();
  const [openId, setOpenId] = useState("nen");
  const open = Arr.findFirst(vaultNotes, (note) => note.id === openId).pipe(
    Option.getOrElse(() => vaultNotes[0]!),
  );
  const folders = Arr.dedupe(Arr.map(vaultNotes, (note) => note.folder));

  return (
    <Window
      testId="vault"
      {...(platform === undefined ? {} : { platform })}
      sidebar={
        <SourceList
          label="Vault"
          value={openId}
          onValueChange={setOpenId}
          sections={Arr.map(folders, (folder) => ({
            id: folder,
            label: folder,
            items: Arr.map(
              Arr.filter(vaultNotes, (note) => note.folder === folder),
              (note) => ({
                id: note.id,
                label: note.title,
                icon: "file-text" as const,
              }),
            ),
          }))}
        />
      }
      toolbar={<WindowToolbar title={open.title} />}
    >
      <Stack direction="row" style={{ flexGrow: 1, alignItems: "stretch" }}>
        <Stack
          direction="column"
          gap="lg"
          style={{ flexGrow: 1, flexBasis: 0, padding: theme.spacing.xl }}
        >
          <Text role="h1" testId="vault-title">
            {open.title}
          </Text>
          {Arr.map(open.body, (paragraph) => (
            <div
              key={paragraph}
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                columnGap: 4,
              }}
            >
              {Arr.flatMap(spans(paragraph), (span, index) =>
                span._tag === "Link"
                  ? [
                      <div
                        key={index}
                        testId={`link-${span.id}`}
                        onClick={() => setOpenId(span.id)}
                      >
                        <Text style={{ color: theme.colors.primary }}>
                          {titleOf(span.id)}
                        </Text>
                      </div>,
                    ]
                  : Arr.map(
                      Arr.filter(span.text.split(" "), (word) => word !== ""),
                      (word, wordIndex) => (
                        <Text key={`${index}-${wordIndex}`}>{word}</Text>
                      ),
                    ),
              )}
            </div>
          ))}
        </Stack>
        <Stack
          direction="column"
          gap="md"
          style={{
            width: GRAPH.width + 2 * theme.spacing.lg,
            padding: theme.spacing.lg,
            borderLeftWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        >
          <Text role="bodyStrong">Graph</Text>
          <Graph open={open} onOpen={setOpenId} />
          <Text role="bodyStrong">Backlinks</Text>
          {Arr.map(backlinks(vaultNotes, open.id), (note) => (
            <div
              key={note.id}
              testId={`backlink-${note.id}`}
              onClick={() => setOpenId(note.id)}
            >
              <Text tone="muted">{note.title}</Text>
            </div>
          ))}
        </Stack>
      </Stack>
    </Window>
  );
};
