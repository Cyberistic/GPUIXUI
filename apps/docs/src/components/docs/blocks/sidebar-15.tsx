import {
  SbCalendarPanel,
  SbFocusBody,
  SbInset,
  SbInsetHeader,
  SbShell,
  SbWorkspacePanel,
} from "./sidebar-kit";

/**
 * Sidebar 15 — both ends: the workspace and its favorites on the left, the
 * open project in the middle and the calendar on the right.
 */
export const Sidebar15Render = () => (
  <SbShell height="tall">
    <SbWorkspacePanel />
    <SbInset
      header={
        <SbInsetHeader
          border={false}
          height={56}
          trail={["Project Management & Task Tracking"]}
        />
      }
    >
      <SbFocusBody />
    </SbInset>
    <SbCalendarPanel
      className="gx-sb-panel--calendar"
      collapse="none"
      side="right"
    />
  </SbShell>
);

export const sidebar15Source = `import { Icon } from "@gpuixui/icons";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,
  DatePicker, DatePickerCalendar, Sidebar, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger,
  SidebarUserMenu,
} from "@gpuixui/components";
import { Separator, Stack, Text } from "@gpuixui/primitives";

const CALENDARS = [
  { name: "My Calendars", items: ["Personal", "Work", "Family"] },
  { name: "Favorites", items: ["Holidays", "Birthdays"] },
  { name: "Other", items: ["Travel", "Reminders", "Deadlines"] },
];

export function LeftSidebar() {
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
              <SidebarMenuItem>
                <SidebarMenuButton label="Project Management" />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton label="Family Recipes" />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

export function RightSidebar() {
  return (
    <Sidebar collapsible="none" side="right">
      <SidebarHeader>
        <SidebarUserMenu user={{ name: "Ada Lovelace", email: "ada@acme.com" }} />
      </SidebarHeader>
      <SidebarContent>
        <DatePicker defaultValue="2024-10-12" today="2024-10-12">
          <DatePickerCalendar label="October 2024" />
        </DatePicker>
        <SidebarSeparator />
        {CALENDARS.map((calendar) => (
          <SidebarGroup key={calendar.name}>
            <SidebarGroupLabel>{calendar.name}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {calendar.items.map((item) => (
                  <SidebarMenuItem key={item}>
                    <SidebarMenuButton label={item} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton label="New Calendar">
              <Icon name="plus" size="sm" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function Page() {
  return (
    <SidebarProvider>
      <LeftSidebar />
      <SidebarInset>
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Project Management & Task Tracking</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <Stack direction="column" gap="md" style={{ padding: 16 }}>
          <Text role="h3">Project Management & Task Tracking</Text>
          <Text role="body">
            One board for the brief, the design references and the release.
          </Text>
        </Stack>
      </SidebarInset>
      <RightSidebar />
    </SidebarProvider>
  );
}`;
