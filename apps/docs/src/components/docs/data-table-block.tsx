import { TableWorkflow } from "./table-demo";

export const DataTableRender = () => (
  <div className="gx-dt">
    <header className="gx-dt-head">
      <div>
        <h3 className="gx-dt-title">Deploys</h3>
        <p className="gx-dt-desc">
          Every deploy across the fleet, filtered and ready to roll back.
        </p>
      </div>
      <div className="gx-dt-actions">
        <button className="gx-btn gx-btn-outline gx-btn-sm" type="button">
          Export
        </button>
        <button className="gx-btn gx-btn-primary gx-btn-sm" type="button">
          New deploy
        </button>
      </div>
    </header>
    <TableWorkflow />
  </div>
);

export const dataTableBlockSource = `import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableSortHeader,
  useTable,
  type GridColumn,
} from "@gpuixui/data";
import { Button, Checkbox, Input, Stack } from "@gpuixui/primitives";

type Deploy = {
  id: string;
  service: string;
  environment: string;
  status: string;
  duration: number;
};

const COLUMNS: ReadonlyArray<GridColumn<Deploy>> = [
  { id: "service", valueOf: (row) => row.service },
  { id: "environment", valueOf: (row) => row.environment },
  { id: "status", valueOf: (row) => row.status },
  { id: "duration", valueOf: (row) => row.duration },
];

export function DeploysPage({ deploys }: { deploys: ReadonlyArray<Deploy> }) {
  const [query, setQuery] = useState("");
  const table = useTable({
    rows: deploys,
    keyOf: (row) => row.id,
    columns: COLUMNS,
  });

  return (
    <Stack direction="column" gap="md" style={{ width: 980 }}>
      <Stack direction="row" justify="between" align="center">
        <Input
          aria-label="Filter deploys"
          placeholder="Filter services..."
          value={query}
          onValueChange={setQuery}
          style={{ width: 260 }}
        />
        <Button variant="primary">New deploy</Button>
      </Stack>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell width={40}>
              <Checkbox
                checked={table.allSelected}
                label="Select all rows"
                onCheckedChange={() => table.selectAllRows()}
              />
            </TableHeaderCell>
            <TableSortHeader
              field="service"
              label="Service"
              sort={table.sort}
              order={table.sortOrder}
              onSortPress={table.pressSort}
              width={200}
            />
            <TableSortHeader
              field="environment"
              label="Environment"
              sort={table.sort}
              order={table.sortOrder}
              onSortPress={table.pressSort}
              width={160}
            />
            <TableSortHeader
              field="status"
              label="Status"
              sort={table.sort}
              order={table.sortOrder}
              onSortPress={table.pressSort}
              width={120}
            />
            <TableSortHeader
              field="duration"
              align="right"
              label="Duration"
              sort={table.sort}
              order={table.sortOrder}
              onSortPress={table.pressSort}
              width={110}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row) => (
            <TableRow key={row.id} selected={table.isSelected(row.id)}>
              <TableCell width={40}>
                <Checkbox
                  checked={table.isSelected(row.id)}
                  label={"Select " + row.email}
                  onCheckedChange={() => table.toggleSelection(row.id)}
                />
              </TableCell>
              <TableCell>{row.service}</TableCell>
              <TableCell>{row.environment}</TableCell>
              <TableCell>{row.status}</TableCell>
              <TableCell align="right">{row.duration}s</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}`;
