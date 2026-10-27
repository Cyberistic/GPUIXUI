import {
  MAIL,
  SbInset,
  SbInsetHeader,
  SbMailBody,
  SbMark,
  SbPanel,
  SbRow,
  SbSearch,
  SbShell,
  SbSwitch,
} from "./sidebar-kit";
import type { SbIconName } from "./sidebar-kit";

/**
 * Sidebar 09 — the nested inbox: an icon rail for the folders, a second panel
 * for the message list, and the open thread beside them.
 */
const FOLDERS: ReadonlyArray<{
  readonly label: string;
  readonly icon: SbIconName;
}> = [
  { label: "Inbox", icon: "mail" },
  { label: "Drafts", icon: "file-text" },
  { label: "Sent", icon: "upload" },
  { label: "Junk", icon: "error" },
  { label: "Trash", icon: "trash" },
];

const first = MAIL[0];

export const Sidebar09Render = () => (
  <SbShell>
    <SbPanel header={<SbMark icon="terminal" />} size="rail">
      <div className="gx-sb-group">
        {FOLDERS.map((folder) => (
          <SbRow
            active={folder.label === "Inbox"}
            icon={folder.icon}
            iconOnly
            key={folder.label}
          />
        ))}
      </div>
      <div className="gx-sb-push gx-sb-rail-account">
        <span className="gx-sb-avatar">AL</span>
      </div>
    </SbPanel>
    <SbPanel
      className="gx-sb-panel--list"
      header={
        <div className="gx-sb-mail-head">
          <div className="gx-sb-mail-title">
            <span className="gx-sb-title">Inbox</span>
            <span className="gx-sb-unreads">
              Unreads
              <SbSwitch on />
            </span>
          </div>
          <SbSearch placeholder="Type to search..." />
        </div>
      }
      size="wide"
    >
      <SbMailBody />
    </SbPanel>
    <SbInset header={<SbInsetHeader trail={["All Inboxes", "Inbox"]} />}>
      <article className="gx-sb-read">
        <p className="gx-sb-eyebrow">Inbox · 09:34 AM</p>
        <h3 className="gx-sb-title">{first?.subject ?? "Meeting Tomorrow"}</h3>
        <div className="gx-sb-read-from">
          <span className="gx-sb-avatar">WS</span>
          <span className="gx-sb-account-text">
            <span className="gx-sb-account-name">
              {first?.sender ?? "William Smith"}
            </span>
            <span className="gx-sb-account-mail">williamsmith@example.com</span>
          </span>
          <span className="gx-sb-note">to Ada</span>
        </div>
        <p className="gx-sb-prose">
          Hi team, just a reminder about our meeting tomorrow at 10 AM. Please
          come prepared with your project updates.
        </p>
        <p className="gx-sb-prose">
          We will start with the release checklist, then walk the open design
          questions. If you cannot make it, send your notes before the call and
          we will read them in.
        </p>
        <div className="gx-sb-read-foot">
          <span className="gx-sb-read-reply">Reply</span>
          <span className="gx-sb-read-reply" data-quiet="true">
            Forward
          </span>
        </div>
      </article>
    </SbInset>
  </SbShell>
);

export const sidebar09Source = `import { Icon } from "@gpuixui/icons";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator, Sidebar, SidebarContent,
  SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader,
  SidebarInset, SidebarInput, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarUserMenu,
} from "@gpuixui/components";
import { Separator, Stack, Switch, Text } from "@gpuixui/primitives";

const FOLDERS = [
  { label: "Inbox", icon: "mail", active: true },
  { label: "Drafts", icon: "file-text" },
  { label: "Sent", icon: "upload" },
  { label: "Junk", icon: "error" },
  { label: "Trash", icon: "trash" },
];

const MAILS = [
  { name: "William Smith", subject: "Meeting Tomorrow", date: "09:34 AM" },
  { name: "Alice Smith", subject: "Re: Project Update", date: "Yesterday" },
  { name: "Bob Johnson", subject: "Weekend Plans", date: "2 days ago" },
  { name: "Emily Davis", subject: "Re: Question about Budget", date: "2 days ago" },
  { name: "Michael Wilson", subject: "Important Announcement", date: "1 week ago" },
];

export function InboxSidebars() {
  return (
    <SidebarProvider collapsible="icon" defaultOpen={false}>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton label="Acme Inc" tooltip="Acme Inc" size="lg">
                <Icon name="terminal" size="sm" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {FOLDERS.map((folder) => (
                  <SidebarMenuItem key={folder.label}>
                    <SidebarMenuButton
                      isActive={folder.active === true}
                      label={folder.label}
                      tooltip={folder.label}
                    >
                      <Icon name={folder.icon} size="sm" />
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
      <Sidebar collapsible="none">
        <SidebarHeader>
          <Stack direction="row" align="center" justify="between">
            <Text role="label">Inbox</Text>
            <Text role="caption" tone="muted">Unreads</Text>
            <Switch label="Unreads" defaultChecked />
          </Stack>
          <SidebarInput placeholder="Type to search..." />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              {MAILS.map((mail) => (
                <Stack key={mail.name} direction="column" gap="2xs" style={{ padding: 16 }}>
                  <Stack direction="row" justify="between">
                    <Text role="label">{mail.name}</Text>
                    <Text role="caption" tone="muted">{mail.date}</Text>
                  </Stack>
                  <Text role="bodyStrong">{mail.subject}</Text>
                </Stack>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
          <SidebarTrigger />
          <Separator orientation="vertical" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">All Inboxes</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Inbox</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <Stack direction="column" gap="md" style={{ padding: 16 }}>
          <Text role="h3">Meeting Tomorrow</Text>
          <Text role="body">
            Hi team, just a reminder about our meeting tomorrow at 10 AM.
            Please come prepared with your project updates.
          </Text>
        </Stack>
      </SidebarInset>
    </SidebarProvider>
  );
}`;
