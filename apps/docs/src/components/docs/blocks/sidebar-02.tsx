import {
  DOCS_COMMUNITY,
  DOCS_NAV,
  SbBrand,
  SbChevron,
  SbGroup,
  SbInset,
  SbInsetHeader,
  SbLongBody,
  SbPanel,
  SbRow,
  SbSearch,
  SbShell,
} from "./sidebar-kit";

/**
 * Sidebar 02 — the same docs nav with every section collapsible, and a page
 * long enough to scroll under a sticky header.
 */
const GROUPS = [...DOCS_NAV, DOCS_COMMUNITY];

export const Sidebar02Render = () => (
  <SbShell>
    <SbPanel
      className="gx-sb-panel--docs"
      header={
        <>
          <SbBrand detail="v1.0.1" name="Documentation" />
          <SbSearch />
        </>
      }
      rail
    >
      {GROUPS.map((group) => (
        <SbGroup
          key={group.label}
          label={group.label}
          trailing={<SbChevron open />}
        >
          {group.items.map((item) => (
            <SbRow active={item === "Data Fetching"} key={item} label={item} />
          ))}
        </SbGroup>
      ))}
    </SbPanel>
    <SbInset
      header={
        <SbInsetHeader trail={["Build Your Application", "Data Fetching"]} />
      }
    >
      <SbLongBody />
    </SbInset>
  </SbShell>
);

export const sidebar02Source = `import { Icon } from "@gpuixui/icons";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator, Collapsible, CollapsibleContent,
  CollapsibleTrigger, Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset,
  SidebarInput, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarRail, SidebarTrigger,
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
  { label: "Community", items: ["Contribution Guide"] },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <Stack direction="row" gap="sm" align="center">
          <Text role="label">Documentation</Text>
          <Text role="caption" tone="muted">v1.0.1</Text>
        </Stack>
        <SidebarInput placeholder="Search the docs..." />
      </SidebarHeader>
      <SidebarContent>
        {NAV.map((group) => (
          <Collapsible defaultOpen key={group.label}>
            <SidebarGroup>
              <CollapsibleTrigger>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <Icon name="chevron-right" size="sm" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item}>
                        <SidebarMenuButton
                          isActive={item === "Data Fetching"}
                          label={item}
                          tooltip={item}
                        />
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

export function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
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
          {NAV.flatMap((group) =>
            group.items.map((item) => (
              <Text key={item} role="body">{item}</Text>
            )),
          )}
        </Stack>
      </SidebarInset>
    </SidebarProvider>
  );
}`;
