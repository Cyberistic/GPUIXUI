/** @jsxImportSource @gpuix/react */
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
              value={sort}
              onValueChange={setSort}
              label="Sort by"
            >
              <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="date">
                Date modified
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="size">Size</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
              <DropdownMenuSubContent label="Share">
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
