import {
  SETTINGS_NAV,
  SETTINGS_TRAIL,
  SbCrumbs,
  SbIcon,
  SbPanel,
  SbRow,
  SbSettingsBody,
} from "./sidebar-kit";

/**
 * Sidebar 13 — the settings dialog shadcn opens on mount: a sidebar of
 * sections inside a modal, and the selected section's settings beside it.
 */
export const Sidebar13Render = () => (
  <div className="gx-sb-scene">
    <div className="gx-sb-scene-page">
      <span className="gx-sb-scene-title">Settings</span>
      <span className="gx-sb-note">
        A modal surface, drawn over the page it was opened from.
      </span>
    </div>
    <div className="gx-sb-dialog">
      <div className="gx-sb-dialog-main">
        <SbPanel className="gx-sb-panel--docs">
          <div className="gx-sb-group">
            {SETTINGS_NAV.map((section) => (
              <SbRow
                active={section.label === "Messages & media"}
                icon={section.icon}
                key={section.label}
                label={section.label}
              />
            ))}
          </div>
        </SbPanel>
        <div className="gx-sb-dialog-body">
          <header className="gx-sb-dialog-head">
            <SbCrumbs trail={SETTINGS_TRAIL} />
            <span className="gx-sb-iconbtn">
              <SbIcon name="x" size={14} />
            </span>
          </header>
          <SbSettingsBody />
        </div>
      </div>
    </div>
  </div>
);

export const sidebar13Source = `import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator, Dialog, DialogClose,
  DialogContent, DialogTrigger, Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider,
} from "@gpuixui/components";
import { Icon } from "@gpuixui/icons";
import { Button, Stack, Text } from "@gpuixui/primitives";

const SECTIONS = [
  "Notifications", "Navigation", "Home", "Appearance", "Messages & media",
  "Language & region", "Accessibility", "Mark as read", "Audio & video",
  "Connected accounts", "Privacy & visibility", "Advanced",
];

export function SettingsDialog() {
  return (
    <Dialog defaultOpen>
      <DialogTrigger>
        <Button size="sm">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <SidebarProvider>
          <Sidebar collapsible="none">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {SECTIONS.map((section) => (
                      <SidebarMenuItem key={section}>
                        <SidebarMenuButton
                          isActive={section === "Messages & media"}
                          label={section}
                        />
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <Stack direction="column" grow>
            <header className="flex h-16 shrink-0 items-center gap-2 px-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Messages & media</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <DialogClose label="Close" square size="sm" variant="ghost">
                <Icon name="x" size="sm" />
              </DialogClose>
            </header>
            <Stack direction="column" gap="md" style={{ padding: 16 }}>
              <Text role="label">Who can send you notifications?</Text>
              <Text role="body">Everyone you follow, and no one else.</Text>
              <Text role="label">Read receipts</Text>
              <Text role="body">Show when you have read a direct message.</Text>
            </Stack>
          </Stack>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}`;
