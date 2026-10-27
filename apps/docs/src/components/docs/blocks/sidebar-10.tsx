import {
  POPOVER_ACTIONS,
  SbFocusBody,
  SbIcon,
  SbInset,
  SbInsetHeader,
  SbShell,
  SbWorkspacePanel,
} from "./sidebar-kit";

/**
 * Sidebar 10 — the workspace panel on the left, and shadcn's header popover
 * open on the right: four groups of actions, drawn as a second sidebar.
 */
export const Sidebar10Render = () => (
  <SbShell height="tall">
    <SbWorkspacePanel />
    <SbInset
      header={
        <SbInsetHeader
          border={false}
          height={56}
          trail={["Project Management & Task Tracking"]}
          trailing={
            <div className="gx-sb-actions">
              <span className="gx-sb-note">Edit Oct 08</span>
              <span className="gx-sb-iconbtn">
                <SbIcon name="star" size={14} />
              </span>
              <span className="gx-sb-iconbtn" data-open="">
                <SbIcon name="ellipsis" size={14} />
              </span>
              <div className="gx-sb-pop gx-sb-pop--actions">
                <p className="gx-sb-pop-title">Page</p>
                {POPOVER_ACTIONS.flatMap((group, index) => (
                  <div className="gx-sb-pop-group" key={index}>
                    {group.map((action) => (
                      <span className="gx-sb-pop-row" key={action.label}>
                        <SbIcon name={action.icon} size={14} />
                        {action.label}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          }
        />
      }
    >
      <SbFocusBody />
    </SbInset>
  </SbShell>
);

export const sidebar10Source = `import { Icon } from "@gpuixui/icons";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,
  Popover, PopoverContent, PopoverTrigger, Sidebar, SidebarContent,
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarRail,
} from "@gpuixui/components";
import { Button, Stack, Text } from "@gpuixui/primitives";

const ACTIONS = [
  ["Customize Page", "Turn into wiki"],
  ["Copy Link", "Duplicate", "Move to", "Move to Trash"],
  ["Undo", "View analytics", "Version History", "Show delete pages", "Notifications"],
  ["Import", "Export"],
];

const FAVORITES = ["Project Management", "Family Recipes", "Fitness Tracker"];

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
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton label="Home" isActive>
                <Icon name="home" size="sm" />
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton label="Inbox">
                <Icon name="mail" size="sm" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Favorites</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {FAVORITES.map((favorite) => (
                <SidebarMenuItem key={favorite}>
                  <SidebarMenuButton label={favorite} />
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

function PageActions() {
  return (
    <Stack direction="row" gap="sm" align="center">
      <Text role="caption" tone="muted">Edit Oct 08</Text>
      <Button label="Star" square size="sm" variant="ghost">
        <Icon name="star" size="sm" />
      </Button>
      <Popover defaultOpen>
        <PopoverTrigger label="Page actions" square size="sm" variant="ghost">
          <Icon name="ellipsis" size="sm" />
        </PopoverTrigger>
        <PopoverContent align="end">
          <Sidebar collapsible="none">
            <SidebarContent>
              {ACTIONS.map((group, index) => (
                <SidebarGroup key={index}>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.map((label) => (
                        <SidebarMenuItem key={label}>
                          <SidebarMenuButton label={label} />
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
          </Sidebar>
        </PopoverContent>
      </Popover>
    </Stack>
  );
}

export function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Project Management & Task Tracking</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div style={{ padding: 12 }}>
            <PageActions />
          </div>
        </header>
        <Stack direction="column" gap="md" style={{ padding: 40 }}>
          <Text role="h3">Project Management & Task Tracking</Text>
          <Text role="body">
            One board for the brief, the design references and the release.
          </Text>
        </Stack>
      </SidebarInset>
    </SidebarProvider>
  );
}`;
