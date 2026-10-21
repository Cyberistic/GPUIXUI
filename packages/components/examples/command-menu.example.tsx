/**
 * Command menu example: a ⌘K-style palette over three groups, with recents.
 *
 * The palette is controlled; the button below stands in for the application
 * shortcut, which belongs to the app — the component binds no global keys. The
 * app owns the recent ids, because only the app knows what a use is.
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
  const [recents, setRecents] = useState<ReadonlyArray<string>>([]);

  /** The app records a use; the palette itself keeps no history. */
  const perform =
    (id: string, label: string): (() => void) =>
    () => {
      setRan(label);
      setRecents((current) =>
        [id, ...current.filter((entry) => entry !== id)].slice(0, 3),
      );
    };

  const actions: ReadonlyArray<CommandAction> = [
    {
      id: "go-components",
      label: "Go to Components",
      group: "Navigation",
      shortcut: "⌘1",
      perform: perform("go-components", "Go to Components"),
    },
    {
      id: "go-tokens",
      label: "Go to Tokens",
      group: "Navigation",
      shortcut: "⌘2",
      perform: perform("go-tokens", "Go to Tokens"),
    },
    {
      id: "new-file",
      label: "New file",
      group: "File",
      shortcut: "⌘N",
      perform: perform("new-file", "New file"),
    },
    {
      id: "save",
      label: "Save",
      group: "File",
      shortcut: "⌘S",
      perform: perform("save", "Save"),
    },
    {
      id: "toggle-sidebar",
      label: "Toggle sidebar",
      group: "View",
      perform: perform("toggle-sidebar", "Toggle sidebar"),
    },
    {
      id: "zoom-reset",
      label: "Reset zoom",
      group: "View",
      disabled: true,
      perform: perform("zoom-reset", "Reset zoom"),
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
          Try “op”, then ↑ and Enter. Reopen it: the last commands you ran are
          under “Recent”.
        </text>
      </div>
      <CommandMenu
        open={open}
        onOpenChange={setOpen}
        actions={actions}
        recents={recents}
      >
        <CommandMenuInput />
        <CommandMenuList />
        <CommandMenuEmpty />
      </CommandMenu>
    </Card>
  );
};
