/** @jsxImportSource @gpuix/react */
import { Button } from "@gpuixui/primitives/button";
import * as Arr from "effect/Array";
import { Match } from "effect";
import { useMemo, useState } from "react";
import { AdvancedFilter } from "../src/surfaces/advanced-filter.js";
import { KeyValue } from "../src/surfaces/key-value.js";
import {
  emptyTree,
  filterByTree,
  type FilterTree,
} from "../src/surfaces/logic.js";
import { PropertyPanel } from "../src/surfaces/property-panel.js";
import { StatCard } from "../src/surfaces/stat-card.js";
import { DataToolbar } from "../src/surfaces/toolbar.js";
import { textStyle, useTheme } from "../src/theme.js";

interface Shape {
  readonly id: string;
  readonly name: string;
  readonly status: "tracked" | "ignored";
  readonly size: number;
}

const shapes: ReadonlyArray<Shape> = [
  { id: "shape-1", name: "readme.md", status: "tracked", size: 120 },
  { id: "shape-2", name: "main.ts", status: "tracked", size: 2048 },
  { id: "shape-3", name: "notes.txt", status: "ignored", size: 90 },
  { id: "shape-4", name: "logo.svg", status: "ignored", size: 640 },
];

const FIELDS = [
  { field: "name", label: "Name" },
  { field: "status", label: "Status" },
  { field: "size", label: "Size" },
] as const;

const valueOf = (row: Shape, field: string): string | number =>
  Match.value(field).pipe(
    Match.when("name", () => row.name),
    Match.when("status", () => row.status),
    Match.when("size", () => row.size),
    Match.orElse(() => ""),
  );

const matchesQuery = (row: Shape, query: string): boolean =>
  query.trim().length === 0 ||
  `${row.name} ${row.status} ${row.size}`
    .toLowerCase()
    .includes(query.trim().toLowerCase());

export const SurfacesExample = () => {
  const theme = useTheme();
  const [width, setWidth] = useState(120);
  const [height, setHeight] = useState(80);
  const [name, setName] = useState("readme.md");
  const [query, setQuery] = useState("");
  const [tree, setTree] = useState<FilterTree>(emptyTree);

  const kept = useMemo(
    () =>
      Arr.filter(filterByTree(shapes, tree, valueOf), (row) =>
        matchesQuery(row, query),
      ),
    [tree, query],
  );

  const area = width * height;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
        width: 720,
      }}
    >
      <DataToolbar
        testId="toolbar"
        search={{
          value: query,
          onValueChange: setQuery,
          placeholder: "Search shapes",
        }}
      >
        <Button
          variant="secondary"
          size="sm"
          onActivate={() => setWidth(240)}
          testId="toolbar-wide"
        >
          Wide
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onActivate={() => setWidth(120)}
          testId="toolbar-reset"
        >
          Reset size
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onActivate={() => setHeight(160)}
          testId="toolbar-tall"
        >
          Tall
        </Button>
      </DataToolbar>

      <div
        style={{ display: "flex", flexDirection: "row", gap: theme.spacing.sm }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
            flexGrow: 1,
          }}
        >
          <StatCard
            label="Area"
            value={`${area}`}
            unit="px²"
            testId="area-card"
          />
          <KeyValue
            testId="shape"
            entries={[
              { key: "name", label: "Name", value: name },
              { key: "width", label: "Width", value: `${width}` },
              { key: "height", label: "Height", value: `${height}` },
            ]}
          />
        </div>
        <PropertyPanel
          title="Properties"
          testId="properties"
          rows={[
            {
              kind: "readonly",
              key: "status",
              label: "Status",
              value: "tracked",
            },
            {
              kind: "editable",
              key: "name",
              label: "Name",
              value: name,
              onChange: setName,
            },
          ]}
        />
      </div>

      <AdvancedFilter
        fields={FIELDS}
        tree={tree}
        onChange={setTree}
        testId="filter"
      />

      <div testId="readout" style={textStyle(theme, "body")}>
        {`${kept.length} of ${shapes.length} shapes · ${area} px² · ${name}`}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {Arr.map(kept, (row) => (
          <div
            key={row.id}
            testId={`row-${row.id}`}
            style={textStyle(theme, "body")}
          >
            {`${row.name} · ${row.status} · ${row.size}`}
          </div>
        ))}
      </div>
    </div>
  );
};
