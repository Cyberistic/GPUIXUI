/** @jsxImportSource @gpuix/react */
import { SourceList, Window, WindowToolbar } from "@gpuixui/shell";
import { Stack, Text, TextArea } from "@gpuixui/primitives";
import type { PlatformName } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState } from "react";
import { folders, notes as seed, type Folder } from "./data.js";
import { editNote, excerpt, notesIn } from "./logic.js";

const isFolder = (value: string): value is Folder =>
  Arr.some(folders, (folder) => folder === value);

export const Notes = ({ platform }: { readonly platform?: PlatformName }) => {
  const theme = useTheme();
  const [all, setAll] = useState(seed);
  const [folder, setFolder] = useState<Folder>("All notes");
  const [open, setOpen] = useState("n1");
  const shown = notesIn(all, folder);
  const current = Arr.findFirst(all, (note) => note.id === open);

  return (
    <Window
      testId="notes"
      {...(platform === undefined ? {} : { platform })}
      sidebar={
        <SourceList
          label="Folders"
          value={folder}
          onValueChange={(next) => isFolder(next) && setFolder(next)}
          sections={[
            {
              id: "folders",
              items: Arr.map(folders, (name) => ({
                id: name,
                label: name,
                icon: "folder" as const,
                count: notesIn(all, name).length,
              })),
            },
          ]}
        />
      }
      toolbar={<WindowToolbar title={folder} />}
    >
      <Stack direction="row" style={{ flexGrow: 1, alignItems: "stretch" }}>
        <Stack
          direction="column"
          style={{
            width: 260,
            borderRightWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        >
          {Arr.map(shown, (note) => (
            <div
              key={note.id}
              testId={`note-${note.id}`}
              onClick={() => setOpen(note.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                height: 64,
                padding: theme.spacing.md,
                borderBottomWidth: theme.borderWidth.thin,
                borderColor: theme.colors.border,
                ...(note.id === open
                  ? { backgroundColor: theme.colors.selected }
                  : {}),
              }}
            >
              <Text role="bodyStrong">{note.title}</Text>
              <Text tone="muted" truncate testId={`excerpt-${note.id}`}>
                {excerpt(note.body)}
              </Text>
            </div>
          ))}
        </Stack>
        {current._tag === "Some" ? (
          <Stack
            direction="column"
            gap="sm"
            style={{ flexGrow: 1, padding: theme.spacing.lg }}
          >
            <Text role="h3">{current.value.title}</Text>
            <TextArea
              label="Note"
              testId="editor"
              value={current.value.body}
              onValueChange={(body) =>
                setAll(editNote(all, current.value.id, body))
              }
              minRows={24}
            />
          </Stack>
        ) : null}
      </Stack>
    </Window>
  );
};
