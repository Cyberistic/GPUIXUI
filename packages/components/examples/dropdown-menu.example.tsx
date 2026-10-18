/**
 * Dropdown menu example: a file row with a small actions menu.
 *
 * The menu is uncontrolled — it remembers whether it is open — while the
 * "Show hidden" checkbox and the "Sort by" radio group are app state, because
 * the row behind the menu shows the effect. A menu action is an ordinary
 * callback: the component does not own what "Delete" means. Keyboard opens
 * (`Enter`, `ArrowDown`, `ArrowUp`) land on the first/last action.
 */

import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../src/dropdown-menu.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

/** One file row, with a destructive action and a persistent setting. */
export const DropdownMenuExample = () => {
  const theme = useTheme();
  const [showHidden, setShowHidden] = useState(false);
  const [sort, setSort] = useState("name");
  const [lastAction, setLastAction] = useState("none");

  return (
    <Card style={{ maxWidth: 420 }}>
      <CardHeader>
        <CardTitle>notes.md</CardTitle>
        <CardDescription>
          Last action: {lastAction} · hidden files{" "}
          {showHidden ? "shown" : "hidden"} · sorted by {sort}
        </CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: theme.spacing.lg,
          paddingTop: 0,
          gap: theme.spacing.md,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.mutedForeground,
          }}
        >
          Edited 2 minutes ago
        </text>
        <DropdownMenu>
          <DropdownMenuTrigger size="sm">Actions</DropdownMenuTrigger>
          <DropdownMenuContent label="File actions">
            <DropdownMenuItem onSelect={() => setLastAction("Rename")}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled
              onSelect={() => setLastAction("Duplicate")}
            >
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={showHidden}
              onCheckedChange={setShowHidden}
            >
              Show hidden files
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              label="Sort by"
              value={sort}
              onValueChange={setSort}
            >
              <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="modified">
                Modified
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="size">Size</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
              <DropdownMenuSubContent label="Share">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent label="More">
                    <DropdownMenuItem
                      onSelect={() => setLastAction("Share → Copy as Markdown")}
                    >
                      Copy as Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setLastAction("Share → Copy as HTML")}
                    >
                      Copy as HTML
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onSelect={() => setLastAction("Copy link")}>
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setLastAction("Email a link")}
                >
                  Email a link
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              tone="destructive"
              onSelect={() => setLastAction("Delete")}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};
