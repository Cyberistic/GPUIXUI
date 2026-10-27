import { useEffect, useState } from "react";
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
export const Sidebar13Render = () => {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      <div className="gx-sb-scene">
        <div className="gx-sb-scene-page">
          <span className="gx-sb-scene-title">Settings</span>
          <span className="gx-sb-note">
            A modal surface, drawn over the page it was opened from.
          </span>
          <button
            className="gx-sb-scene-open"
            onClick={() => setOpen(true)}
            type="button"
          >
            Open settings
          </button>
        </div>
        {open ? (
          <>
            <button
              aria-label="Close settings"
              className="gx-sb-scrim gx-sb-scrim--scene"
              onClick={() => setOpen(false)}
              type="button"
            />
            <div
              aria-label="Settings"
              aria-modal="true"
              className="gx-sb-dialog"
              role="dialog"
            >
              <div className="gx-sb-dialog-main">
                <SbPanel className="gx-sb-panel--docs" collapse="none">
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
                    <button
                      aria-label="Close settings"
                      className="gx-sb-iconbtn"
                      onClick={() => setOpen(false)}
                      type="button"
                    >
                      <SbIcon name="x" size={14} />
                    </button>
                  </header>
                  <SbSettingsBody />
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
      <p className="gx-sb-caption">
        The dialog's section sidebar is <code>collapsible="none"</code>: it has
        no collapse trigger.
      </p>
    </>
  );
};

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
