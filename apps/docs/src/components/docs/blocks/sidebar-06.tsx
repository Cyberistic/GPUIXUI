import {
  DOCS_NAV,
  SbBrand,
  SbDocBody,
  SbDots,
  SbGroup,
  SbIcon,
  SbInset,
  SbInsetHeader,
  SbPanel,
  SbRow,
  SbShell,
} from "./sidebar-kit";

/**
 * Sidebar 06 — the docs sections as dropdown menus on each row, over the
 * newsletter card shadcn puts in the footer. The first menu is drawn open so
 * the block reads without a press.
 */
const FIRST_MENU = DOCS_NAV[0]?.items ?? [];

export const Sidebar06Render = () => (
  <SbShell
    overlay={
      <div className="gx-sb-pop gx-sb-pop--panel">
        {FIRST_MENU.map((item) => (
          <span className="gx-sb-pop-row" key={item}>
            {item}
          </span>
        ))}
      </div>
    }
  >
    <SbPanel
      className="gx-sb-panel--docs"
      header={<SbBrand detail="v1.0.0" name="Documentation" />}
      footer={
        <div className="gx-sb-news">
          <p className="gx-sb-news-title">Subscribe to our newsletter</p>
          <p className="gx-sb-note">
            Opt-in to receive updates and news about the sidebar.
          </p>
          <span className="gx-sb-field">
            <SbIcon name="mail" size={13} />
            <span>Email</span>
          </span>
          <span className="gx-sb-news-button">Subscribe</span>
        </div>
      }
      rail
    >
      <SbGroup>
        {DOCS_NAV.map((group) => (
          <SbRow key={group.label} label={group.label} trailing={<SbDots />} />
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

export const sidebar06Source = `import { Icon } from "@gpuixui/icons";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator, DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger, Sidebar, SidebarContent,
  SidebarFooter, SidebarGroup, SidebarHeader, SidebarInset, SidebarInput,
  SidebarMenu, SidebarMenuItem, SidebarProvider, SidebarRail,
  SidebarTrigger,
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
          <Text role="caption" tone="muted">v1.0.0</Text>
        </Stack>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV.map((group) => (
              <DropdownMenu key={group.label}>
                <SidebarMenuItem>
                  <DropdownMenuTrigger
                    label={group.label}
                    leading={<Icon name="file" size="sm" />}
                    trailing={<Icon name="ellipsis" size="sm" />}
                    variant="ghost"
                  />
                  <DropdownMenuContent align="start" side="right">
                    {group.items.map((item) => (
                      <DropdownMenuItem key={item}>{item}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </SidebarMenuItem>
              </DropdownMenu>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Stack direction="column" gap="sm">
          <Text role="label">Subscribe to our newsletter</Text>
          <Text role="caption" tone="muted">
            Opt-in to receive updates and news about the sidebar.
          </Text>
          <SidebarInput placeholder="Email" />
          <Text role="label">Subscribe</Text>
        </Stack>
      </SidebarFooter>
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
