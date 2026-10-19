/** @jsxImportSource @gpuix/react */
/**
 * The project-browser pattern, as a live scene (plan 575).
 *
 * A real `SearchInput` filters a real `List`; a no-match query paints the real
 * `EmptyState`; opening the match shows its detail. The composition owns the
 * query, the selection and the opened row — the components own the field, the
 * roving focus and the clear control.
 *
 * It is a list, not a table: `@gpuixui/data-grid` is planned, and a docs-owned
 * grid would be the placeholder the mission forbids. The page says so.
 *
 * The gesture is two-phase: type `atlas` (the list filters to one row and the
 * count changes), then click that row (the detail appears). The smoke asserts
 * both halves, so a filter that does nothing and a row that cannot open each
 * fail by name.
 */
import { Badge, type BadgeVariant } from "@gpuixui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gpuixui/components/card";
import { EmptyState } from "@gpuixui/components/empty-state";
import {
  List,
  ListItem,
  ListItemDescription,
  ListItemTitle,
} from "@gpuixui/components/list";
import { SearchInput } from "@gpuixui/components/search-input";
import { Button, Stack, Text } from "@gpuixui/primitives";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState, type ReactElement } from "react";
import {
  filterProjects,
  type SearchableProject,
} from "./project-browser-logic";

interface Project extends SearchableProject {
  readonly id: string;
  readonly status: string;
  readonly tone: BadgeVariant;
}

const PROJECTS: ReadonlyArray<Project> = [
  {
    id: "atlas",
    name: "Atlas",
    description: "Design tokens and the component library",
    status: "Needs attention",
    tone: "warning",
  },
  {
    id: "beacon",
    name: "Beacon",
    description: "Release automation and smoke reports",
    status: "On track",
    tone: "success",
  },
  {
    id: "cinder",
    name: "Cinder",
    description: "Desktop editor shell",
    status: "Needs attention",
    tone: "warning",
  },
  {
    id: "delta",
    name: "Delta",
    description: "Documentation site and previews",
    status: "On track",
    tone: "success",
  },
  {
    id: "ember",
    name: "Ember",
    description: "Archive of the first prototype",
    status: "Archived",
    tone: "neutral",
  },
  {
    id: "fjord",
    name: "Fjord",
    description: "Workspace layout experiments",
    status: "On track",
    tone: "success",
  },
];

/** One searchable project card; the scene the preview document mounts. */
export const ProjectBrowser = (): ReactElement => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("atlas");
  const [opened, setOpened] = useState<Option.Option<Project>>(Option.none());
  const matches = filterProjects(PROJECTS, query);
  const count =
    matches.length === PROJECTS.length
      ? `${PROJECTS.length} projects`
      : `${matches.length} of ${PROJECTS.length} projects`;

  const open = (value: string): void => {
    setOpened(Arr.findFirst(PROJECTS, (project) => project.id === value));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <CardDescription>
          {count} · search by name or description
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SearchInput
          testId="scene-project-search"
          value={query}
          onValueChange={setQuery}
          onClear={() => setQuery("")}
          placeholder="Filter projects…"
        />
        {matches.length === 0 ? (
          <EmptyState
            title="No projects match"
            description={`Nothing matches “${query}”.`}
            action={
              <Button
                variant="outline"
                testId="scene-project-clear"
                onActivate={() => setQuery("")}
              >
                Clear search
              </Button>
            }
          />
        ) : (
          <List
            testId="scene-project-list"
            selectionMode="single"
            value={selected}
            onValueChange={setSelected}
            onActivate={open}
          >
            {Arr.map(matches, (project) => (
              <ListItem
                key={project.id}
                value={project.id}
                textValue={project.name}
                trailing={
                  <Badge variant={project.tone} size="sm">
                    {project.status}
                  </Badge>
                }
              >
                <ListItemTitle>{project.name}</ListItemTitle>
                <ListItemDescription>{project.description}</ListItemDescription>
              </ListItem>
            ))}
          </List>
        )}
        {Option.match(opened, {
          onNone: () => null,
          onSome: (project) => (
            <Stack direction="column" gap="2xs">
              <Text role="label">{project.name}</Text>
              <Text testId="scene-project-status" role="caption" tone="muted">
                Opened from the project list.
              </Text>
            </Stack>
          ),
        })}
      </CardContent>
    </Card>
  );
};
