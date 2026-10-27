import {
  MAIN_NAV,
  PROJECTS,
  SbAccount,
  SbBrand,
  SbChevron,
  SbDocBody,
  SbDots,
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
 * Sidebar 07 — a workspace nav that collapses to an icon rail: the team
 * switcher, Platform sections that open in place, Projects with row actions
 * and the account in the footer.
 */
const OPEN = "Playground";

export const Sidebar07Render = () => (
  <SbShell height="tall">
    <SbPanel
      header={<SbBrand detail="Enterprise" icon="terminal" name="Acme Inc" />}
      footer={<SbAccount />}
      rail
    >
      <SbGroup label="Platform">
        {MAIN_NAV.map((item) => (
          <div className="gx-sb-item" key={item.label}>
            <SbRow
              active={item.label === OPEN}
              icon={item.icon}
              label={item.label}
              trailing={<SbChevron open={item.label === OPEN} />}
            />
            {item.label === OPEN ? (
              <SbSub>
                {item.items.map((sub) => (
                  <SbSubRow key={sub} label={sub} />
                ))}
              </SbSub>
            ) : null}
          </div>
        ))}
      </SbGroup>
      <SbGroup label="Projects">
        {PROJECTS.map((project) => (
          <SbRow
            icon={project.icon}
            key={project.label}
            label={project.label}
            trailing={<SbDots />}
          />
        ))}
        <SbRow icon="ellipsis" label="More" />
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

export const sidebar07Source = `import { Icon } from "@gpuixui/icons";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator, Collapsible, CollapsibleContent,
  CollapsibleTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, Sidebar, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset,
  SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  SidebarProvider, SidebarRail, SidebarTrigger, SidebarUserMenu,
} from "@gpuixui/components";
import { Separator, Stack, Text } from "@gpuixui/primitives";

const TEAMS = [
  { name: "Acme Inc", plan: "Enterprise" },
  { name: "Acme Corp.", plan: "Startup" },
  { name: "Evil Corp.", plan: "Free" },
];

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

const PROJECTS = ["Design Engineering", "Sales & Marketing", "Travel"];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <DropdownMenu>
          <SidebarMenuItem>
            <DropdownMenuTrigger
              leading={<Icon name="terminal" size="sm" />}
              label="Acme Inc"
              trailing={<Icon name="chevrons-up-down" size="sm" />}
              variant="ghost"
            />
            <DropdownMenuContent align="start" side="right">
              {TEAMS.map((team) => (
                <DropdownMenuItem key={team.name}>{team.name}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </SidebarMenuItem>
        </DropdownMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {PLATFORM.map((item) => (
              <Collapsible defaultOpen={item.active} key={item.label}>
                <SidebarMenuItem>
                  <CollapsibleTrigger>
                    <SidebarMenuButton
                      isActive={item.active}
                      label={item.label}
                      tooltip={item.label}
                    >
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
            {PROJECTS.map((project) => (
              <SidebarMenuItem key={project}>
                <SidebarMenuButton label={project}>
                  <Icon name="folder" size="sm" />
                </SidebarMenuButton>
                <SidebarMenuAction label="More" showOnHover>
                  <Icon name="ellipsis" size="sm" />
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserMenu user={{ name: "Ada Lovelace", email: "ada@acme.com" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function Page() {
  return (
    <SidebarProvider collapsible="icon">
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
