/** @jsxImportSource @gpuix/react */
import { Badge } from "@gpuixui/components/badge";
import { Avatar } from "@gpuixui/components/avatar";
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
} from "@gpuixui/components/sidebar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@gpuixui/components/tabs";
import {
  AreaChart,
  DonutChart,
  FunnelChart,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableViewport,
  TreemapChart,
} from "@gpuixui/data";
import { Icon, type IconName } from "@gpuixui/icons";
import {
  Button,
  Checkbox,
  Input,
  Stack,
  Text,
  ToggleGroup,
} from "@gpuixui/primitives";
import { seriesColors } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState, type ReactNode } from "react";
import {
  devices,
  documents,
  funnel,
  navigation,
  ranges,
  sources,
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

const ChartCard = ({
  title,
  note,
  children,
}: {
  readonly title: string;
  readonly note: string;
  readonly children: ReactNode;
}) => {
  const theme = useTheme();
  return (
    <Card
      variant="outline"
      style={{
        flexGrow: 1,
        flexBasis: 0,
        minWidth: 0,
        padding: theme.spacing.xl,
      }}
    >
      <Stack direction="column" gap="md">
        <Stack direction="column" gap="2xs">
          <Text role="h3">{title}</Text>
          <Text tone="muted">{note}</Text>
        </Stack>
        <Stack direction="row" justify="center">
          {children}
        </Stack>
      </Stack>
    </Card>
  );
};

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
    <SidebarProvider defaultOpen width={264}>
      <Sidebar>
        <SidebarHeader>
          <Stack direction="column" gap="md">
            <Stack
              direction="row"
              align="center"
              gap="md"
              testId="workspace"
              style={{ padding: theme.spacing.xs }}
            >
              <div
                style={{
                  display: "flex",
                  width: 34,
                  height: 34,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.primary,
                }}
              >
                <Icon
                  name="grid"
                  size={18}
                  color={theme.colors.primaryForeground}
                />
              </div>
              <Stack direction="column" style={{ flexGrow: 1 }}>
                <Text role="bodyStrong">Documents</Text>
                <Text role="caption" tone="muted">
                  v1.0.1
                </Text>
              </Stack>
              <Icon
                name="chevrons-up-down"
                size={15}
                color={theme.colors.mutedForeground}
              />
            </Stack>
            <Input
              label="Search"
              placeholder="Search the docs..."
              testId="dashboard-search"
            />
          </Stack>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Stack
            direction="row"
            align="center"
            gap="md"
            testId="account"
            style={{ padding: theme.spacing.xs }}
          >
            <Avatar name="Ada Lovelace" />
            <Stack
              direction="column"
              style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
            >
              <Text role="bodyStrong" truncate>
                Ada Lovelace
              </Text>
              <Text role="caption" tone="muted" truncate>
                ada@acme.com
              </Text>
            </Stack>
            <Icon
              name="chevrons-up-down"
              size={15}
              color={theme.colors.mutedForeground}
            />
          </Stack>
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
            gap="md"
            style={{
              height: 58,
              flexShrink: 0,
              paddingLeft: theme.spacing.xl,
              paddingRight: theme.spacing.xl,
              borderBottomWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
            }}
          >
            <Icon name="panel-left" size={17} color={theme.colors.foreground} />
            <div
              style={{
                width: theme.borderWidth.thin,
                height: 18,
                backgroundColor: theme.colors.border,
              }}
            />
            <Text tone="muted">Documents</Text>
            <Text tone="muted">/</Text>
            <Text>Dashboard</Text>
          </Stack>
          <Stack
            direction="column"
            gap="lg"
            style={{
              flexGrow: 1,
              padding: theme.spacing.xl,
              minHeight: 0,
              overflowY: "scroll",
            }}
          >
            <Stack direction="row" gap="lg" style={{ flexShrink: 0 }}>
              {Arr.map(tiles, (tile) => (
                <Card
                  key={tile.label}
                  variant="outline"
                  style={{
                    flexGrow: 1,
                    flexBasis: 0,
                    minWidth: 0,
                    padding: theme.spacing.xl,
                  }}
                >
                  <Stack direction="column" gap="xs">
                    <Text tone="muted">{tile.label}</Text>
                    <Stack direction="row" align="center" justify="between">
                      <Text role="h1" testId={`kpi-${tile.label}`}>
                        {tile.value}
                      </Text>
                      <Badge
                        variant={
                          tile.direction === "down" ? "outline" : "success"
                        }
                        size="sm"
                      >
                        {`${movement(tile.direction)} ${tile.change}`}
                      </Badge>
                    </Stack>
                    <Text role="bodyStrong">{tile.line}</Text>
                    <Text tone="muted">{tile.note}</Text>
                  </Stack>
                </Card>
              ))}
            </Stack>
            <Card
              variant="outline"
              style={{ flexShrink: 0, padding: theme.spacing.xl }}
            >
              <Stack direction="column" gap="lg">
                <Stack direction="row" align="start" justify="between">
                  <Stack direction="column" gap="2xs">
                    <Text role="h3">Traffic</Text>
                    <Text tone="muted" testId="visitors-total">
                      {`${data.total} total · ${data.change} · ${
                        ranges.find((entry) => entry.value === range)?.label ??
                        ""
                      }`}
                    </Text>
                  </Stack>
                  <ToggleGroup
                    type="single"
                    label="Range"
                    value={range}
                    onValueChange={(next) =>
                      isRange(next) ? setRange(next) : undefined
                    }
                    options={ranges}
                    itemTestId={(value) => `range-${value}`}
                  />
                </Stack>
                <AreaChart
                  aria-label="Traffic"
                  series={[
                    { key: "mobile", label: "Mobile", values: data.mobile },
                    { key: "desktop", label: "Desktop", values: data.values },
                  ]}
                  labels={data.labels}
                  colors={[seriesColors(theme)[1], seriesColors(theme)[0]]}
                  stacked
                  axis={false}
                  width={1040}
                  height={250}
                  testId="visitors-chart"
                />
              </Stack>
            </Card>
            <Stack direction="row" gap="lg" style={{ flexShrink: 0 }}>
              <ChartCard title="Sources" note="Where the traffic came from">
                <TreemapChart
                  aria-label="Sources"
                  nodes={sources}
                  size={200}
                  legend={false}
                />
              </ChartCard>
              <ChartCard title="Funnel" note="Visits through to paid">
                <FunnelChart
                  aria-label="Funnel"
                  labels={funnel.labels}
                  stages={funnel.stages}
                  series={[]}
                  width={290}
                  height={200}
                />
              </ChartCard>
              <ChartCard title="Devices" note="The mix of readers">
                <DonutChart
                  aria-label="Devices"
                  data={devices}
                  size={200}
                  legend={false}
                />
              </ChartCard>
            </Stack>
            <Card
              variant="outline"
              style={{ flexShrink: 0, height: 380, paddingBottom: 0 }}
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
            <Stack
              direction="row"
              align="center"
              justify="between"
              style={{ flexShrink: 0 }}
            >
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
