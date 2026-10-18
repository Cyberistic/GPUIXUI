/**
 * Command menu example: a ⌘K-style palette over three groups.
 *
 * The palette is controlled; the button below stands in for the application
 * shortcut, which belongs to the app — the component binds no global keys.
 */

import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import {
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
  type CommandAction,
} from "../src/command-menu.js";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

/** Three groups of commands, with display-only shortcuts. */
export const CommandMenuExample = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [ran, setRan] = useState("none");

  const perform =
    (label: string): (() => void) =>
    () =>
      setRan(label);

  const actions: ReadonlyArray<CommandAction> = [
    {
      id: "go-components",
      label: "Go to Components",
      group: "Navigation",
      shortcut: "⌘1",
      perform: perform("Go to Components"),
    },
    {
      id: "go-tokens",
      label: "Go to Tokens",
      group: "Navigation",
      shortcut: "⌘2",
      perform: perform("Go to Tokens"),
    },
    {
      id: "new-file",
      label: "New file",
      group: "File",
      shortcut: "⌘N",
      perform: perform("New file"),
    },
    {
      id: "save",
      label: "Save",
      group: "File",
      shortcut: "⌘S",
      perform: perform("Save"),
    },
    {
      id: "toggle-sidebar",
      label: "Toggle sidebar",
      group: "View",
      perform: perform("Toggle sidebar"),
    },
    {
      id: "zoom-reset",
      label: "Reset zoom",
      group: "View",
      disabled: true,
      perform: perform("Reset zoom"),
    },
  ];

  return (
    <Card style={{ maxWidth: 460 }}>
      <CardHeader>
        <CardTitle>Command palette</CardTitle>
        <CardDescription>Last command: {ran}</CardDescription>
      </CardHeader>
      <div
        style={{
          padding: theme.spacing.lg,
          paddingTop: 0,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
        }}
      >
        <Button onClick={() => setOpen(true)}>Open command menu</Button>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Try “op”, then ↑ and Enter.
        </text>
      </div>
      <CommandMenu open={open} onOpenChange={setOpen} actions={actions}>
        <CommandMenuInput />
        <CommandMenuList />
        <CommandMenuEmpty />
      </CommandMenu>
    </Card>
  );
};
