/** @jsxImportSource @gpuix/react */
import { Avatar } from "@gpuixui/components/avatar";
import { Badge } from "@gpuixui/components/badge";
import { Card } from "@gpuixui/components/card";
import { Disclosure } from "@gpuixui/components/disclosure";
import { InsetGroup, InsetGroupRow } from "@gpuixui/components/inset-group";
import { SearchInput } from "@gpuixui/components/search-input";
import { SegmentedControl } from "@gpuixui/components/segmented-control";
import { Select, Stack, Text } from "@gpuixui/primitives";
import { SourceList, Window, WindowToolbar } from "@gpuixui/shell";
import type { PlatformName } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import {
  projects,
  stages,
  viewer,
  work,
  type Stage,
  type WorkItem,
} from "./data.js";
import {
  inScope,
  itemsIn,
  stageCounts,
  type Scope,
  type SortKey,
} from "./logic.js";

const isScope = (value: string): value is Scope =>
  value === "all" || value === "mine" || Arr.some(projects, (p) => p === value);

const isStage = (value: string): value is Stage =>
  Arr.some(stages, (stage) => stage === value);

const Row = ({
  item,
  chosen,
  onChoose,
}: {
  readonly item: WorkItem;
  readonly chosen: boolean;
  readonly onChoose: () => void;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={`work-${item.id}`}
      onClick={onChoose}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        height: 40,
        paddingLeft: theme.spacing.lg,
        paddingRight: theme.spacing.lg,
        borderBottomWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
        ...(chosen ? { backgroundColor: theme.colors.selected } : {}),
      }}
    >
      <Avatar name={item.owner} size="xs" />
      <Text style={{ flexGrow: 1 }}>{item.title}</Text>
      <Badge variant="outline">{item.project}</Badge>
      <Text tone="muted">{item.due.slice(5)}</Text>
    </div>
  );
};

const Board = ({
  items,
  onChoose,
}: {
  readonly items: ReadonlyArray<WorkItem>;
  readonly onChoose: (id: string) => void;
}) => {
  const theme = useTheme();
  return (
    <Stack
      direction="row"
      gap="md"
      style={{ padding: theme.spacing.lg, flexGrow: 1 }}
    >
      {Arr.map(stages, (stage) => (
        <Stack
          key={stage}
          direction="column"
          gap="sm"
          testId={`column-${stage}`}
          style={{ flexBasis: 0, flexGrow: 1 }}
        >
          <Text role="bodyStrong">{stage}</Text>
          {Arr.map(
            Arr.filter(items, (item) => item.stage === stage),
            (item) => (
              <Card
                key={item.id}
                testId={`card-${item.id}`}
                onClick={() => onChoose(item.id)}
                style={{ padding: theme.spacing.md, gap: 4 }}
              >
                <Text>{item.title}</Text>
                <Text tone="muted">{item.owner}</Text>
              </Card>
            ),
          )}
        </Stack>
      ))}
    </Stack>
  );
};

const Inspector = ({ item }: { readonly item: Option.Option<WorkItem> }) => {
  const theme = useTheme();
  return Option.match(item, {
    onNone: () => (
      <Text tone="muted" style={{ padding: theme.spacing.lg }}>
        Choose a piece of work
      </Text>
    ),
    onSome: (chosen) => (
      <Stack
        direction="column"
        gap="md"
        style={{ padding: theme.spacing.lg }}
        testId="inspector"
      >
        <Text role="bodyStrong" testId="inspector-title">
          {chosen.title}
        </Text>
        <Disclosure title="Details">
          <InsetGroup>
            <InsetGroupRow
              label="Owner"
              control={<Text>{chosen.owner}</Text>}
            />
            <InsetGroupRow label="Due" control={<Text>{chosen.due}</Text>} />
            <InsetGroupRow
              label="Estimate"
              control={<Text>{`${chosen.estimate} pt`}</Text>}
            />
          </InsetGroup>
        </Disclosure>
        <Disclosure title="Activity">
          {Arr.isReadonlyArrayNonEmpty(chosen.activity) ? (
            Arr.map(chosen.activity, (line) => (
              <Text key={line} tone="muted">
                {line}
              </Text>
            ))
          ) : (
            <Text tone="muted">No activity yet</Text>
          )}
        </Disclosure>
      </Stack>
    ),
  });
};

export const Pipeline = ({
  platform,
}: {
  readonly platform?: PlatformName;
}) => {
  const [scope, setScope] = useState<Scope>("all");
  const [stage, setStage] = useState<Stage>("Build");
  const [layout, setLayout] = useState("list");
  const [sort, setSort] = useState<SortKey>("due");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState("w5");

  const scoped = inScope(work, { scope, query }, viewer);
  const rows = itemsIn(work, { stage, scope, query, sort }, viewer);
  const count = (s: Scope) =>
    Arr.length(inScope(work, { scope: s, query: "" }, viewer));

  return (
    <Window
      testId="pipeline"
      {...(platform === undefined ? {} : { platform })}
      sidebar={
        <SourceList
          label="Views"
          value={scope}
          onValueChange={(next) => isScope(next) && setScope(next)}
          sections={[
            {
              id: "views",
              items: [
                {
                  id: "all",
                  label: "All work",
                  icon: "list",
                  count: count("all"),
                },
                {
                  id: "mine",
                  label: "Mine",
                  icon: "user",
                  count: count("mine"),
                },
              ],
            },
            {
              id: "projects",
              title: "Projects",
              collapsible: true,
              items: Arr.map(projects, (project) => ({
                id: project,
                label: project,
                icon: "folder" as const,
                count: count(project),
              })),
            },
          ]}
        />
      }
      toolbar={
        <WindowToolbar
          title="Releases"
          actions={
            <>
              <SegmentedControl
                label="Layout"
                value={layout}
                onValueChange={setLayout}
                style={{ width: 160 }}
                items={[
                  { value: "list", label: "List", icon: "list" },
                  { value: "board", label: "Board", icon: "grid" },
                ]}
              />
              <Select
                label="Sort"
                size="sm"
                value={sort}
                onValueChange={(next: string) =>
                  setSort(next === "title" ? "title" : "due")
                }
                options={[
                  { value: "due", label: "Due date" },
                  { value: "title", label: "Title" },
                ]}
              />
              <SearchInput
                value={query}
                onValueChange={setQuery}
                placeholder="Search"
                style={{ width: 180 }}
              />
            </>
          }
        />
      }
      inspector={
        <Inspector item={Arr.findFirst(work, (item) => item.id === chosen)} />
      }
    >
      {layout === "board" ? (
        <Board items={scoped} onChoose={setChosen} />
      ) : (
        <Stack direction="column" style={{ flexGrow: 1 }}>
          <div style={{ padding: 12 }}>
            <SegmentedControl
              label="Stage"
              testId="stages"
              value={stage}
              onValueChange={(next) => isStage(next) && setStage(next)}
              items={Arr.map(stageCounts(scoped), ([name, n]) => ({
                value: name,
                label: `${name} ${n}`,
              }))}
            />
          </div>
          {Arr.map(rows, (item) => (
            <Row
              key={item.id}
              item={item}
              chosen={item.id === chosen}
              onChoose={() => setChosen(item.id)}
            />
          ))}
        </Stack>
      )}
    </Window>
  );
};
