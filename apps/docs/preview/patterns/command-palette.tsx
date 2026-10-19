/** @jsxImportSource @gpuix/react */
/**
 * The command-palette pattern, as a live scene (plan 522).
 *
 * The real `CommandMenu` opens from a control, so the smoke proves the open and
 * the run as gestures instead of a palette mounted open by a prop. Duplicate
 * adds a named copy through `uniqueProjectName`; the status line is the visible
 * result and starts empty.
 *
 * The app owns the ⌘K shortcut: `CommandMenu` documents that it binds none, and
 * the preview document's window handler belongs to the harness. The control
 * below reaches the same state.
 */
import {
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
  type CommandAction,
} from "@gpuixui/components/command-menu";
import { Button, Stack, Text } from "@gpuixui/primitives";
import { useState, type ReactElement } from "react";
import { uniqueProjectName } from "./command-palette-logic";

const BASE_PROJECT = "atlas";

const DUPLICATE_STATUS = "Duplicated the project into a new copy.";
const LINK_STATUS = "Copied the project link.";

export const CommandPalette = (): ReactElement => {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ReadonlyArray<string>>([
    BASE_PROJECT,
  ]);
  const [status, setStatus] = useState("");

  const actions: ReadonlyArray<CommandAction> = [
    {
      id: "duplicate",
      label: "Duplicate project",
      group: "Project",
      shortcut: "⌘D",
      perform: () => {
        const copy = uniqueProjectName(BASE_PROJECT, projects);
        setProjects([...projects, copy]);
        setStatus(DUPLICATE_STATUS);
      },
    },
    {
      id: "copy-link",
      label: "Copy project link",
      group: "Share",
      shortcut: "⌘L",
      perform: () => setStatus(LINK_STATUS),
    },
    {
      id: "delete",
      label: "Delete project",
      group: "Danger",
      disabled: true,
      perform: () => undefined,
    },
  ];

  return (
    <Stack direction="column" gap="lg">
      <Stack direction="column" gap="2xs">
        <Text role="h3">Projects</Text>
        <Text role="caption" tone="muted">
          The real `CommandMenu` on the GPUix renderer, opened the way a reader
          opens it.
        </Text>
      </Stack>
      <Stack direction="row" gap="sm" align="center">
        <Button testId="scene-palette-trigger" onActivate={() => setOpen(true)}>
          Commands
        </Button>
        <Text role="caption" tone="muted">
          ⌘K opens the same palette in an application.
        </Text>
      </Stack>
      <Stack direction="column" gap="2xs">
        {projects.map((project) => (
          <Text key={project} role="body">
            {project}
          </Text>
        ))}
      </Stack>
      {status === "" ? null : (
        <Text testId="scene-palette-status" role="body" tone="muted">
          {status}
        </Text>
      )}
      <CommandMenu open={open} onOpenChange={setOpen} actions={actions}>
        <CommandMenuInput />
        <CommandMenuList />
        <CommandMenuEmpty />
      </CommandMenu>
    </Stack>
  );
};
