import {
  SbAppPanel,
  SbCrumbs,
  SbDocBody,
  SbIcon,
  SbInset,
  SbSearch,
  SbShell,
} from "./sidebar-kit";

/**
 * Sidebar 16 — the sticky site header above both columns: the toggle, the
 * trail and a search field, with the workspace panel beneath it.
 */
export const Sidebar16Render = () => (
  <SbShell
    height="tall"
    top={
      <header className="gx-sb-site">
        <span className="gx-sb-trigger">
          <SbIcon name="panel-left" size={16} />
        </span>
        <span className="gx-sb-head-rule" />
        <SbCrumbs trail={["Build Your Application", "Data Fetching"]} />
        <div className="gx-sb-site-search">
          <SbSearch placeholder="Type to search..." />
        </div>
      </header>
    }
  >
    <SbAppPanel />
    <SbInset>
      <SbDocBody />
    </SbInset>
  </SbShell>
);

export const sidebar16Source = `import { Icon } from "@gpuixui/icons";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator, Collapsible, CollapsibleContent,
  CollapsibleTrigger, Sidebar, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarInput, SidebarMenu, SidebarMenuAction,
  SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton,
  SidebarMenuSubItem, SidebarProvider, SidebarTrigger, SidebarUserMenu,
} from "@gpuixui/components";
import { Separator, Stack, Text } from "@gpuixui/primitives";

const PLATFORM = [
  { label: "Playground", icon: "terminal", active: true, items: ["History", "Starred", "Settings"] },
  { label: "Models", icon: "bot", items: ["Genesis", "Explorer", "Quantum"] },
  { label: "Documentation", icon: "file-text", items: ["Introduction", "Get Started"] },
  { label: "Settings", icon: "settings", items: ["General", "Team", "Billing"] },
];

function SiteHeader() {
  return (
    <header className="sticky top-0 flex w-full items-center border-b bg-background">
      <div className="flex h-14 w-full items-center gap-2 px-4">
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
        <Stack direction="row" gap="sm" style={{ marginLeft: "auto" }}>
          <SidebarInput placeholder="Type to search..." />
        </Stack>
      </div>
    </header>
  );
}

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <Stack direction="row" gap="sm" align="center">
          <Text role="label">Acme Inc</Text>
          <Text role="caption" tone="muted">Enterprise</Text>
        </Stack>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {PLATFORM.map((item) => (
              <Collapsible defaultOpen={item.active} key={item.label}>
                <SidebarMenuItem>
                  <CollapsibleTrigger>
                    <SidebarMenuButton isActive={item.active} label={item.label}>
                      <Icon name={item.icon} size="sm" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((sub) => (
                        <SidebarMenuSubItem key={sub}>
                          <SidebarMenuSubButton label={sub} />
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton label="Design Engineering">
                <Icon name="folder" size="sm" />
              </SidebarMenuButton>
              <SidebarMenuAction label="More" showOnHover>
                <Icon name="ellipsis" size="sm" />
              </SidebarMenuAction>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserMenu user={{ name: "Ada Lovelace", email: "ada@acme.com" }} />
      </SidebarFooter>
    </Sidebar>
  );
}

export function Page() {
  return (
    <SidebarProvider>
      <Stack direction="column" fullHeight fullWidth>
        <SiteHeader />
        <Stack direction="row" grow>
          <AppSidebar />
          <SidebarInset>
            <Stack direction="column" gap="md" style={{ padding: 16 }}>
              <Text role="h3">Data Fetching</Text>
              <Text role="body">
                Read data where it is rendered, and stream the shell while the
                slow part of the page resolves.
              </Text>
            </Stack>
          </SidebarInset>
        </Stack>
      </Stack>
    </SidebarProvider>
  );
}`;
