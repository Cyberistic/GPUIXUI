/** @jsxImportSource @gpuix/react */
/**
 * Dashboard — the report screen: a workspace sidebar, four KPI tiles, the
 * visitors chart with its range control, and the document table.
 *
 * The block is shadcn's `dashboard-01` rebuilt from GPUIxUI parts: the
 * sidebar is `Sidebar`/`SidebarMenu*`, the KPI tiles are `Card`, the chart is
 * `LineChart` (its own area wash), the report is `Tabs` over `Table`, and every
 * pill is `Badge`. Range, tab and selection are real state, so the screen can be
 * driven in the renderer rather than painted.
 */
import { Badge } from "@gpuixui/components/badge";
import { Card } from "@gpuixui/components/card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@gpuixui/components/sidebar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@gpuixui/components/tabs";
import {
  LineChart,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableViewport,
} from "@gpuixui/data";
import { Icon, type IconName } from "@gpuixui/icons";
import {
  Button,
  Checkbox,
  Stack,
  Text,
  ToggleGroup,
} from "@gpuixui/primitives";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState } from "react";
import {
  documents,
  navigation,
  ranges,
  tabs,
  tiles,
  visitors,
  type Range,
  type Row,
  type Tab,
} from "./data.js";
import {
  everyRow,
  isRange,
  isTab,
  movement,
  rowsOf,
  toggleRow,
} from "./logic.js";

/** The sidebar row: an icon, a name, and the current destination's wash. */
const NavRow = ({
  icon,
  label,
  active,
  onSelect,
}: {
  readonly icon: IconName;
  readonly label: string;
  readonly active?: boolean;
  readonly onSelect?: () => void;
}) => {
  const theme = useTheme();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active === true}
        label={label}
        testId={`nav-${label}`}
        onClick={onSelect}
      >
        <Icon name={icon} size={16} color={theme.colors.mutedForeground} />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

/** The report: a tab strip, the card's two toolbars, and the rows. */
const Report = ({
  tab,
  onTab,
  selected,
  onSelect,
  onSelectAll,
}: {
  readonly tab: Tab;
  readonly onTab: (next: string) => void;
  readonly selected: ReadonlyArray<string>;
  readonly onSelect: (header: string) => void;
  readonly onSelectAll: (list: ReadonlyArray<Row>) => void;
}) => {
  const theme = useTheme();
  const list = rowsOf(tab);
  const all = everyRow(selected, list);
  const columns: ReadonlyArray<{
    readonly label: string;
    readonly width?: number;
    readonly align?: "left" | "right";
  }> = [
    { label: "Header" },
    { label: "Section Type", width: 150 },
    { label: "Status", width: 130 },
    { label: "Target", width: 80, align: "right" },
    { label: "Limit", width: 80, align: "right" },
    { label: "Reviewer", width: 150 },
  ];
  return (
    <Tabs value={tab} onValueChange={onTab}>
      <Stack direction="row" align="center" justify="between">
        <TabsList label="Report sections">
          {Arr.map(tabs, (entry) => (
            <TabsTrigger
              key={entry.value}
              value={entry.value}
              testId={`tab-${entry.value}`}
            >
              {entry.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <Stack direction="row" align="center" gap="sm">
          <Button
            variant="outline"
            size="sm"
            leading={
              <Icon name="sliders-horizontal" color={theme.colors.foreground} />
            }
          >
            Customize Columns
          </Button>
          <Button
            variant="outline"
            size="sm"
            leading={<Icon name="plus" color={theme.colors.foreground} />}
          >
            Add Section
          </Button>
        </Stack>
      </Stack>
      <TabsContent value={tab}>
        <Table aria-label="Documents" height={300} style={{ borderWidth: 0 }}>
          <TableViewport>
            <TableHeader>
              <TableRow>
                <TableHeaderCell width={40}>
                  <Checkbox
                    label="Select every row"
                    checked={all}
                    onCheckedChange={() => onSelectAll(list)}
                    testId="select-all"
                  />
                </TableHeaderCell>
                {Arr.map(columns, (column) => (
                  <TableHeaderCell
                    key={column.label}
                    width={column.width}
                    align={column.align}
                  >
                    {column.label}
                  </TableHeaderCell>
                ))}
                <TableHeaderCell width={40} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Arr.map(list, (row) => (
                <TableRow
                  key={row.header}
                  selected={Arr.contains(selected, row.header)}
                >
                  <TableCell width={40}>
                    <Checkbox
                      label={row.header}
                      checked={Arr.contains(selected, row.header)}
                      onCheckedChange={() => onSelect(row.header)}
                      testId={`select-${row.header}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Text role="body" tone="default">
                      {row.header}
                    </Text>
                  </TableCell>
                  <TableCell width={150}>
                    <Text role="caption" tone="muted">
                      {row.section}
                    </Text>
                  </TableCell>
                  <TableCell width={130}>
                    <Badge
                      variant={row.status === "Done" ? "success" : "outline"}
                      size="sm"
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell width={80} align="right">
                    <Text role="caption" tone="default">
                      {String(row.target)}
                    </Text>
                  </TableCell>
                  <TableCell width={80} align="right">
                    <Text role="caption" tone="default">
                      {String(row.limit)}
                    </Text>
                  </TableCell>
                  <TableCell width={150}>
                    <Text role="caption" tone="muted">
                      {row.reviewer}
                    </Text>
                  </TableCell>
                  <TableCell width={40} align="right">
                    <Icon
                      name="ellipsis-vertical"
                      size={14}
                      color={theme.colors.mutedForeground}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableViewport>
        </Table>
      </TabsContent>
    </Tabs>
  );
};

/** The block, as a window's whole content. */
export const Dashboard = () => {
  const theme = useTheme();
  const [range, setRange] = useState<Range>("3m");
  const [tab, setTab] = useState<Tab>("outline");
  const [selected, setSelected] = useState<ReadonlyArray<string>>([]);
  const [active, setActive] = useState("Dashboard");
  const data = visitors[range];
  return (
    <SidebarProvider defaultOpen width={252}>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton label="Acme Inc." testId="workspace">
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: theme.radius.full,
                    borderWidth: theme.borderWidth.strong,
                    borderColor: theme.colors.borderStrong,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text role="caption" tone="default">
                    A
                  </Text>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Button
                fullWidth
                leading={
                  <Icon name="plus" color={theme.colors.primaryForeground} />
                }
                trailing={
                  <Icon
                    name="chevrons-up-down"
                    size={14}
                    color={theme.colors.primaryForeground}
                  />
                }
              >
                Quick Create
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {Arr.map(navigation, (entry) => (
                  <NavRow
                    key={entry.label}
                    icon={entry.icon}
                    label={entry.label}
                    active={active === entry.label}
                    onSelect={() => setActive(entry.label)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Documents</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {Arr.map(documents, (entry) => (
                  <NavRow
                    key={entry.label}
                    icon={entry.icon}
                    label={entry.label}
                    active={active === entry.label}
                    onSelect={() => setActive(entry.label)}
                  />
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton label="More" testId="nav-more">
                    <Icon
                      name="ellipsis"
                      size={16}
                      color={theme.colors.mutedForeground}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {Arr.map(
              [
                { icon: "settings", label: "Settings" },
                { icon: "help", label: "Get Help" },
                { icon: "search", label: "Search" },
              ] as const,
              (entry) => (
                <NavRow
                  key={entry.label}
                  icon={entry.icon}
                  label={entry.label}
                />
              ),
            )}
          </SidebarMenu>
          <SidebarSeparator />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton label="shadcn" testId="account">
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: theme.radius.full,
                    backgroundColor: theme.colors.muted,
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon
                    name="user"
                    size={15}
                    color={theme.colors.mutedForeground}
                  />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Stack
          direction="column"
          testId="dashboard"
          style={{
            flexGrow: 1,
            width: "100%",
            height: "100%",
            backgroundColor: theme.colors.background,
          }}
        >
          <Stack
            direction="row"
            align="center"
            justify="between"
            style={{
              height: 54,
              paddingLeft: theme.spacing.xl,
              paddingRight: theme.spacing.xl,
            }}
          >
            <Stack direction="row" align="center" gap="sm">
              <Icon
                name="folder"
                size={16}
                color={theme.colors.mutedForeground}
              />
              <Text role="body" tone="default">
                Documents
              </Text>
            </Stack>
            <Stack direction="row" align="center" gap="2xs">
              <Text role="caption" tone="muted">
                GitHub
              </Text>
              <Icon
                name="external-link"
                size={14}
                color={theme.colors.mutedForeground}
              />
            </Stack>
          </Stack>
          <div
            style={{
              height: theme.borderWidth.thin,
              backgroundColor: theme.colors.border,
            }}
          />
          <Stack
            direction="column"
            gap="lg"
            style={{ flexGrow: 1, padding: theme.spacing.xl, minHeight: 0 }}
          >
            <Stack direction="row" gap="md">
              {Arr.map(tiles, (tile) => (
                <Card
                  key={tile.label}
                  variant="outline"
                  style={{
                    flexGrow: 1,
                    flexBasis: 0,
                    minWidth: 0,
                    padding: theme.spacing.lg,
                  }}
                >
                  <Stack direction="column" gap="2xs">
                    <Stack direction="row" align="center" justify="between">
                      <Text role="caption" tone="muted">
                        {tile.label}
                      </Text>
                      <Badge variant="outline" size="sm">
                        {`${movement(tile.direction)} ${tile.change}`}
                      </Badge>
                    </Stack>
                    <Text role="display" testId={`kpi-${tile.label}`}>
                      {tile.value}
                    </Text>
                    <Text role="bodyStrong" tone="default">
                      {tile.line}
                    </Text>
                    <Text role="caption" tone="muted">
                      {tile.note}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </Stack>
            <Card variant="outline">
              <Stack direction="column" gap="sm">
                <Stack direction="row" align="start" justify="between">
                  <Stack direction="column" gap="2xs">
                    <Text role="h3" tone="default">
                      Total Visitors
                    </Text>
                    <Text role="caption" tone="muted" testId="visitors-total">
                      {`${data.total} total · ${data.change} · ${
                        ranges.find((entry) => entry.value === range)?.label ??
                        ""
                      }`}
                    </Text>
                  </Stack>
                  <ToggleGroup
                    type="single"
                    size="sm"
                    label="Range"
                    value={range}
                    onValueChange={(next) =>
                      isRange(next) ? setRange(next) : undefined
                    }
                    options={ranges}
                    itemTestId={(value) => `range-${value}`}
                  />
                </Stack>
                <LineChart
                  series={[
                    { key: "visitors", label: "Visitors", values: data.values },
                  ]}
                  labels={data.labels}
                  width={1024}
                  height={168}
                  testId="visitors-chart"
                />
              </Stack>
            </Card>
            <Card
              variant="outline"
              style={{ flexGrow: 1, minHeight: 0, paddingBottom: 0 }}
            >
              <Report
                tab={tab}
                onTab={(next) => (isTab(next) ? setTab(next) : undefined)}
                selected={selected}
                onSelect={(header) =>
                  setSelected((current) => toggleRow(current, header))
                }
                onSelectAll={(list) =>
                  setSelected((current) =>
                    everyRow(current, list)
                      ? []
                      : Arr.map(list, (row) => row.header),
                  )
                }
              />
            </Card>
            <Stack direction="row" align="center" justify="between">
              <Text role="caption" tone="muted">
                {`${String(selected.length)} of ${String(
                  Arr.length(
                    Arr.flatten(Arr.map(tabs, (entry) => rowsOf(entry.value))),
                  ),
                )} rows chosen`}
              </Text>
              <Text role="caption" tone="muted">
                Updated 4 minutes ago
              </Text>
            </Stack>
          </Stack>
        </Stack>
      </SidebarInset>
    </SidebarProvider>
  );
};
