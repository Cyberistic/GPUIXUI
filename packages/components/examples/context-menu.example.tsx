/**
 * Context menu example: a project row whose right click offers actions.
 *
 * The menu owns only the open state and the pointer point; what "Delete" means
 * is the app's, reported through `onSelect`.
 */

import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../src/context-menu.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

/** A project row with a right-click menu. */
export const ContextMenuExample = () => {
  const theme = useTheme();
  const [lastAction, setLastAction] = useState("none");

  return (
    <Card style={{ maxWidth: 460 }}>
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <CardDescription>
          Right-click the row · last action: {lastAction}
        </CardDescription>
      </CardHeader>
      <div style={{ padding: theme.spacing.lg, paddingTop: 0 }}>
        <ContextMenu>
          <ContextMenuTrigger
            testId="project-row"
            style={{ gap: theme.spacing.xs }}
          >
            <text
              style={{
                ...textStyle(theme, "label"),
                color: theme.colors.foreground,
              }}
            >
              GPUIXUI
            </text>
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.mutedForeground,
              }}
            >
              12 components · right-click for actions
            </text>
          </ContextMenuTrigger>
          <ContextMenuContent label="Project actions">
            <ContextMenuLabel>Project</ContextMenuLabel>
            <ContextMenuItem onSelect={() => setLastAction("Open")}>
              Open
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => setLastAction("Copy path")}>
              Copy path
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
              <ContextMenuSubContent label="Share">
                <ContextMenuItem
                  onSelect={() => setLastAction("Share → Copy link")}
                >
                  Copy link
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={() => setLastAction("Share → Email")}
                >
                  Email
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem
              tone="destructive"
              onSelect={() => setLastAction("Delete")}
            >
              Delete…
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </Card>
  );
};
