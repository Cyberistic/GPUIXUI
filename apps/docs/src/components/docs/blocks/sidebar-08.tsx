import {
  SbAppPanel,
  SbDocBody,
  SbInset,
  SbInsetHeader,
  SbShell,
} from "./sidebar-kit";

/**
 * Sidebar 08 — shadcn's inset workspace: the panel floats on the card surface,
 * the content sits in a rounded sheet beside it, and Support/Feedback are
 * pinned to the bottom of the panel.
 */
export const Sidebar08Render = () => (
  <SbShell height="tall" variant="inset">
    <SbAppPanel />
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

export const sidebar08Source = `import { Icon } from "@gpuixui/icons";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator, Collapsible, CollapsibleContent,
  CollapsibleTrigger, Sidebar, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton,
  SidebarMenuSubItem, SidebarProvider, SidebarTrigger, SidebarUserMenu,
} from "@gpuixui/components";
import { Separator, Stack, Text } from "@gpuixui/primitives";

const PLATFORM = [
  {
    label: "Playground",
    icon: "terminal",
    items: ["History", "Starred", "Settings"],
    active: true,
  },
  { label: "Models", icon: "bot", items: ["Genesis", "Explorer", "Quantum"] },
  {
    label: "Documentation",
    icon: "file-text",
    items: ["Introduction", "Get Started", "Tutorials", "Changelog"],
  },
  {
    label: "Settings",
    icon: "settings",
    items: ["General", "Team", "Billing", "Limits"],
  },
];

const PROJECTS = [
  { label: "Design Engineering", icon: "folder" },
  { label: "Sales & Marketing", icon: "table" },
  { label: "Travel", icon: "grid" },
];

const SECONDARY = [
  { label: "Support", icon: "help" },
  { label: "Feedback", icon: "mail" },
];

export function AppSidebar() {
  return (
    <Sidebar variant="inset">
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
                  <SidebarMenuButton
                    isActive={item.active}
                    label={item.label}
                    tooltip={item.label}
                  >
                    <Icon name={item.icon} size="sm" />
                  </SidebarMenuButton>
                  {item.items.length === 0 ? null : (
                    <>
                      <CollapsibleTrigger>
                        <SidebarMenuAction label="Toggle">
                          <Icon name="chevron-right" size="sm" />
                        </SidebarMenuAction>
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
                    </>
                  )}
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarMenu>
            {PROJECTS.map((project) => (
              <SidebarMenuItem key={project.label}>
                <SidebarMenuButton label={project.label}>
                  <Icon name={project.icon} size="sm" />
                </SidebarMenuButton>
                <SidebarMenuAction label="More" showOnHover>
                  <Icon name="ellipsis" size="sm" />
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup style={{ marginTop: "auto" }}>
          <SidebarGroupContent>
            <SidebarMenu>
              {SECONDARY.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton label={item.label} size="sm">
                    <Icon name={item.icon} size="sm" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
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
    <SidebarProvider variant="inset">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
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
          </div>
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
