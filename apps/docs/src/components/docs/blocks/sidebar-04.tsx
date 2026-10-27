import {
  DOCS_NAV,
  SbBrand,
  SbDocBody,
  SbGroup,
  SbInset,
  SbInsetHeader,
  SbPanel,
  SbRow,
  SbShell,
  SbSub,
  SbSubRow,
} from "./sidebar-kit";

/**
 * Sidebar 04 — block 03's always-open tree on shadcn's floating panel: a
 * rounded, lifted box with a gutter instead of an edge-to-edge rail.
 */
export const Sidebar04Render = () => (
  <SbShell variant="floating">
    <SbPanel
      className="gx-sb-panel--docs"
      header={<SbBrand detail="v1.0.0" name="Documentation" />}
    >
      <SbGroup>
        {DOCS_NAV.map((group) => (
          <div className="gx-sb-item" key={group.label}>
            <SbRow label={group.label} />
            <SbSub>
              {group.items.map((item) => (
                <SbSubRow
                  active={item === "Data Fetching"}
                  key={item}
                  label={item}
                />
              ))}
            </SbSub>
          </div>
        ))}
      </SbGroup>
    </SbPanel>
    <SbInset
      header={
        <SbInsetHeader
          border={false}
          trail={["Build Your Application", "Data Fetching"]}
        />
      }
    >
      <SbDocBody />
    </SbInset>
  </SbShell>
);

export const sidebar04Source = `import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator, Sidebar, SidebarContent,
  SidebarGroup, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton,
  SidebarMenuSubItem, SidebarProvider, SidebarTrigger,
} from "@gpuixui/components";
import { Separator, Stack, Text } from "@gpuixui/primitives";

const NAV = [
  { label: "Getting Started", items: ["Installation", "Project Structure"] },
  {
    label: "Build Your Application",
    items: [
      "Routing", "Data Fetching", "Rendering", "Caching", "Styling",
      "Optimizing", "Configuring", "Testing", "Authentication", "Deploying",
      "Upgrading", "Examples",
    ],
  },
  {
    label: "API Reference",
    items: [
      "Components", "File Conventions", "Functions", "next.config.js Options",
      "CLI", "Edge Runtime",
    ],
  },
  {
    label: "Architecture",
    items: [
      "Accessibility", "Fast Refresh", "Next.js Compiler",
      "Supported Browsers", "Turbopack",
    ],
  },
];

export function AppSidebar() {
  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <Stack direction="row" gap="sm" align="center">
          <Text role="label">Documentation</Text>
          <Text role="caption" tone="muted">v1.0.0</Text>
        </Stack>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV.map((group) => (
              <SidebarMenuItem key={group.label}>
                <SidebarMenuButton label={group.label} />
                <SidebarMenuSub>
                  {group.items.map((item) => (
                    <SidebarMenuSubItem key={item}>
                      <SidebarMenuSubButton
                        isActive={item === "Data Fetching"}
                        label={item}
                      />
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function Page() {
  return (
    <SidebarProvider variant="floating">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Build Your Application</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <Stack direction="column" gap="md" style={{ padding: 16 }}>
          <Text role="h3">Data Fetching</Text>
          <Text role="body">
            Read data where it is rendered, and stream the shell while the slow
            part of the page resolves.
          </Text>
        </Stack>
      </SidebarInset>
    </SidebarProvider>
  );
}`;
