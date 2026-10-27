import {
  SbCalendarPanel,
  SbInset,
  SbInsetHeader,
  SbMonthBody,
  SbShell,
} from "./sidebar-kit";

/**
 * Sidebar 12 — the calendar panel: the account, a month grid, the calendar
 * lists and New Calendar in the footer, beside the month's page.
 */
export const Sidebar12Render = () => (
  <SbShell height="tall">
    <SbCalendarPanel className="gx-sb-panel--docs" rail />
    <SbInset header={<SbInsetHeader trail={["October 2024"]} />}>
      <SbMonthBody />
    </SbInset>
  </SbShell>
);

export const sidebar12Source = `import { Icon } from "@gpuixui/icons";
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

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarUserMenu user={{ name: "Ada Lovelace", email: "ada@acme.com" }} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <DatePicker defaultValue="2024-10-12" today="2024-10-12">
              <DatePickerCalendar label="October 2024" />
            </DatePicker>
          </SidebarGroupContent>
        </SidebarGroup>
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
                <BreadcrumbPage>October 2024</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <Stack direction="column" gap="md" style={{ padding: 16 }}>
          <Text role="h3">October 2024</Text>
          <Text role="body">
            Four events this month: the design review, the 1.0.1 release, the
            team dinner and the retro.
          </Text>
        </Stack>
      </SidebarInset>
    </SidebarProvider>
  );
}`;
