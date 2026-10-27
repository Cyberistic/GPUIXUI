import {
  DOCS_NAV,
  SbDocBody,
  SbGroup,
  SbIcon,
  SbInset,
  SbInsetHeader,
  SbPanel,
  SbRow,
  SbShell,
  SbSub,
  SbSubRow,
} from "./sidebar-kit";

/**
 * Sidebar 14 — the docs table of contents on the right edge, with its toggle
 * moved into the page header's trailing corner.
 */
export const Sidebar14Render = () => (
  <SbShell>
    <SbInset
      header={
        <SbInsetHeader
          trail={["Build Your Application", "Data Fetching"]}
          trigger={false}
          trailing={
            <span className="gx-sb-trigger">
              <SbIcon name="panel-right" size={16} />
            </span>
          }
        />
      }
    >
      <SbDocBody />
    </SbInset>
    <SbPanel side="right" rail>
      <SbGroup label="Table of Contents">
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
  </SbShell>
);

export const sidebar14Source = `import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator, Sidebar, SidebarContent,
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarInset,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail,
  SidebarTrigger,
} from "@gpuixui/components";
import { Separator, Stack, Text } from "@gpuixui/primitives";

const NAV = [
  { label: "Getting Started", items: ["Installation", "Project Structure"] },
  {
    label: "Build Your Application",
    items: ["Routing", "Data Fetching", "Rendering", "Caching", "Styling"],
  },
  { label: "API Reference", items: ["Components", "Functions", "CLI"] },
  { label: "Architecture", items: ["Accessibility", "Turbopack"] },
  { label: "Community", items: ["Contribution Guide"] },
];

export function AppSidebar() {
  return (
    <Sidebar side="right">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Table of Contents</SidebarGroupLabel>
          <SidebarGroupContent>
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

export function Page() {
  return (
    <SidebarProvider>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
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
          <SidebarTrigger size="sm" style={{ marginLeft: "auto" }} />
        </header>
        <Stack direction="column" gap="md" style={{ padding: 16 }}>
          <Text role="h3">Data Fetching</Text>
          <Text role="body">
            Read data where it is rendered, and stream the shell while the slow
            part of the page resolves.
          </Text>
        </Stack>
      </SidebarInset>
      <AppSidebar />
    </SidebarProvider>
  );
}`;
