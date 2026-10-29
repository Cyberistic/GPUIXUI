import {
  DOCS_NAV,
  SbBrand,
  SbDocBody,
  SbGroup,
  SbInset,
  SbInsetHeader,
  SbPanel,
  SbRow,
  SbSearch,
  SbShell,
} from "./sidebar-kit";

/**
 * Sidebar 01 — sectioned docs navigation, at `/blocks/sidebar-01`.
 *
 * shadcn's opening sidebar: a version switcher over a search field, four
 * labelled sections, and a breadcrumbed page beside it. The browser drawing and
 * the copyable recipe are two views of the same composition.
 */
export const Sidebar01Render = () => (
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
      {DOCS_NAV.map((group) => (
        <SbGroup key={group.label} label={group.label}>
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
      <SbDocBody />
    </SbInset>
  </SbShell>
);

export const sidebar01Source = `import { Icon } from "@gpuixui/icons";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator, Sidebar, SidebarContent,
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarInput, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
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
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
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
          </SidebarGroup>
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
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
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
