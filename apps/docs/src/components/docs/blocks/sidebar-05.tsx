import {
  DOCS_NAV,
  SbBrand,
  SbDisclosure,
  SbDocBody,
  SbGroup,
  SbInset,
  SbInsetHeader,
  SbPanel,
  SbSearch,
  SbShell,
  SbSubRow,
} from "./sidebar-kit";

/**
 * Sidebar 05 — one docs group whose parent rows open their submenu in place;
 * the second section is open on landing, the rest wait behind a plus.
 */
export const Sidebar05Render = () => (
  <SbShell>
    <SbPanel
      className="gx-sb-panel--docs"
      header={
        <>
          <SbBrand detail="v1.0.0" name="Documentation" />
          <SbSearch />
        </>
      }
      rail
    >
      <SbGroup>
        {DOCS_NAV.map((group, index) => (
          <SbDisclosure
            defaultOpen={index === 1}
            indicator="plus"
            key={group.label}
            label={group.label}
          >
            {group.items.map((item) => (
              <SbSubRow
                active={item === "Data Fetching"}
                key={item}
                label={item}
              />
            ))}
          </SbDisclosure>
        ))}
      </SbGroup>
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

export const sidebar05Source = `import { Icon } from "@gpuixui/icons";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator, Collapsible, CollapsibleContent,
  CollapsibleTrigger, Sidebar, SidebarContent, SidebarGroup, SidebarHeader,
  SidebarInset, SidebarInput, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton,
  SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarTrigger,
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
          <Text role="caption" tone="muted">v1.0.0</Text>
        </Stack>
        <SidebarInput placeholder="Search the docs..." />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV.map((group, index) => (
              <Collapsible defaultOpen={index === 1} key={group.label}>
                <SidebarMenuItem>
                  <CollapsibleTrigger>
                    <SidebarMenuButton
                      label={group.label}
                      trailing={
                        <Icon
                          name={index === 1 ? "minus" : "plus"}
                          size="sm"
                        />
                      }
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
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
