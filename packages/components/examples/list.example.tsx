/**
 * List example: a recent-files panel with single selection, and a reviewers
 * panel with multiple selection.
 *
 * Both lists are **controlled** (`value` + `onValueChange`) because the header
 * shows the selection: the app owns the value, the list renders it. Drop the
 * pair and the list keeps its own state instead. The reviewers list also shows
 * the multiple-selection keys, including `Cmd`/`Ctrl`+A for every enabled row.
 * Typing a name jumps to that row because every row carries its `textValue`.
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

/** The team members the multiple-selection panel assigns. */
const reviewers: ReadonlyArray<{
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly away?: true;
}> = [
  { id: "ada", name: "Ada Lovelace", role: "Maintainer" },
  { id: "grace", name: "Grace Hopper", role: "Reviewer" },
  { id: "alan", name: "Alan Turing", role: "Reviewer", away: true },
  { id: "edsger", name: "Edsger Dijkstra", role: "Reviewer" },
];

/** The panels: single selection for files, multiple selection for reviewers. */
export const ListExample = () => {
  const theme = useTheme();
  const [selected, setSelected] = useState("readme");
  const [opened, setOpened] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<ReadonlyArray<string>>([
    "ada",
    "grace",
  ]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.xl,
        maxWidth: 480,
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Recent files</CardTitle>
          <CardDescription>
            Selected: {selected}
            {opened === null ? "" : ` · Opened: ${opened}`}
          </CardDescription>
        </CardHeader>
        <List
          testId="recent-files"
          selectionMode="single"
          value={selected}
          onValueChange={setSelected}
          onActivate={(value) => setOpened(value)}
          style={{ padding: theme.spacing.md, paddingTop: 0 }}
        >
          {Arr.map(files, (file) => (
            <ListItem
              key={file.id}
              value={file.id}
              textValue={file.name}
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

      <Card>
        <CardHeader>
          <CardTitle>Reviewers</CardTitle>
          <CardDescription>
            {assigned.length} of {reviewers.length} assigned — Cmd+A selects all
          </CardDescription>
        </CardHeader>
        <List
          testId="reviewers"
          selectionMode="multiple"
          value={assigned}
          onValueChange={setAssigned}
          style={{ padding: theme.spacing.md, paddingTop: 0 }}
        >
          {Arr.map(reviewers, (reviewer) => (
            <ListItem
              key={reviewer.id}
              value={reviewer.id}
              textValue={reviewer.name}
              disabled={reviewer.away === true}
            >
              <ListItemTitle>{reviewer.name}</ListItemTitle>
              <ListItemDescription>{reviewer.role}</ListItemDescription>
            </ListItem>
          ))}
        </List>
      </Card>
    </div>
  );
};
