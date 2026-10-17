/**
 * List example: recent files with a controlled single selection.
 *
 * The list is **controlled** here (`value` + `onValueChange`) because the panel
 * header shows the selection: the app owns the value, the list renders it. Drop
 * the pair and the list keeps its own state instead.
 */

import * as Arr from "effect/Array";
import { useState } from "react";
import { Badge, type BadgeVariant } from "../src/badge.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import {
  List,
  ListItem,
  ListItemDescription,
  ListItemTitle,
} from "../src/list.js";

/** One file in the panel. */
const files: ReadonlyArray<{
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly glyph: string;
  readonly state: string;
  readonly tone: BadgeVariant;
  readonly locked?: true;
}> = [
  {
    id: "readme",
    name: "README.md",
    path: "~/GPUIXUI",
    glyph: "MD",
    state: "Edited",
    tone: "warning",
  },
  {
    id: "list",
    name: "list.tsx",
    path: "packages/components/src",
    glyph: "TS",
    state: "New",
    tone: "info",
  },
  {
    id: "plan",
    name: "PLAN.md",
    path: "~/GPUIXUI",
    glyph: "MD",
    state: "Clean",
    tone: "success",
  },
  {
    id: "lockfile",
    name: "nub.lock",
    path: "~/GPUIXUI",
    glyph: "LK",
    state: "Generated",
    tone: "neutral",
    locked: true,
  },
];

/** The recent-files panel, with the selection shown in the header. */
export const ListExample = () => {
  const theme = useTheme();
  const [selected, setSelected] = useState("readme");

  return (
    <Card style={{ maxWidth: 480 }}>
      <CardHeader>
        <CardTitle>Recent files</CardTitle>
        <CardDescription>Selected: {selected}</CardDescription>
      </CardHeader>
      <List
        testId="recent-files"
        selectionMode="single"
        value={selected}
        onValueChange={setSelected}
        style={{ padding: theme.spacing.md, paddingTop: 0 }}
      >
        {Arr.map(files, (file) => (
          <ListItem
            key={file.id}
            value={file.id}
            disabled={file.locked === true}
            leading={
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {file.glyph}
              </text>
            }
            trailing={
              <Badge variant={file.tone} size="sm">
                {file.state}
              </Badge>
            }
          >
            <ListItemTitle>{file.name}</ListItemTitle>
            <ListItemDescription>{file.path}</ListItemDescription>
          </ListItem>
        ))}
      </List>
    </Card>
  );
};
