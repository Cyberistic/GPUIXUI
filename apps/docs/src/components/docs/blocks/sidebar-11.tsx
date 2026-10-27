import {
  CHANGES,
  SbDisclosure,
  SbDocBody,
  SbGroup,
  SbInset,
  SbInsetHeader,
  SbPanel,
  SbRow,
  SbShell,
} from "./sidebar-kit";

/**
 * Sidebar 11 — the file-tree panel: three changed files with their state, then
 * the repository, its UI folder open on the active `button.tsx`.
 */
export const Sidebar11Render = () => (
  <SbShell>
    <SbPanel className="gx-sb-panel--docs" rail>
      <SbGroup label="Changes">
        {CHANGES.map((change) => (
          <SbRow
            badge={change.state}
            icon="file"
            key={change.file}
            label={change.file}
          />
        ))}
      </SbGroup>
      <SbGroup label="Files">
        <SbDisclosure defaultOpen icon="folder" label="components">
          <SbDisclosure defaultOpen icon="folder" label="ui">
            <SbRow active icon="file" label="button.tsx" />
            <SbRow icon="file" label="card.tsx" />
          </SbDisclosure>
          <SbRow icon="file" label="header.tsx" />
          <SbRow icon="file" label="footer.tsx" />
        </SbDisclosure>
        <SbDisclosure icon="folder" label="app" />
        <SbDisclosure icon="folder" label="lib" />
        <SbDisclosure icon="folder" label="public" />
        <SbRow icon="file" label=".eslintrc.json" />
        <SbRow icon="file" label=".gitignore" />
        <SbRow icon="file" label="next.config.js" />
        <SbRow icon="file" label="tailwind.config.js" />
        <SbRow icon="file" label="package.json" />
        <SbRow icon="file" label="README.md" />
      </SbGroup>
    </SbPanel>
    <SbInset
      header={<SbInsetHeader trail={["components", "ui", "button.tsx"]} />}
    >
      <SbDocBody />
    </SbInset>
  </SbShell>
);

export const sidebar11Source = `import { Icon } from "@gpuixui/icons";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator, Collapsible, CollapsibleContent,
  CollapsibleTrigger, Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarInset, SidebarMenu,
  SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarProvider, SidebarRail, SidebarTrigger,
} from "@gpuixui/components";
import { Separator, Stack, Text } from "@gpuixui/primitives";

const CHANGES = [
  { file: "README.md", state: "M" },
  { file: "api/hello/route.ts", state: "U" },
  { file: "app/layout.tsx", state: "M" },
];

type TreeItem = string | TreeItem[];

const TREE: TreeItem[] = [
  ["app", ["api", ["hello", ["route.ts"]], "page.tsx", "layout.tsx"]],
  ["components", ["ui", "button.tsx", "card.tsx"], "header.tsx", "footer.tsx"],
  ["lib", ["util.ts"]],
  ["public", "favicon.ico", "vercel.svg"],
  ".eslintrc.json",
  ".gitignore",
  "next.config.js",
  "package.json",
  "README.md",
];

function Tree({ item }: { item: TreeItem }) {
  const [name, ...children] = Array.isArray(item) ? item : [item];
  if (children.length === 0) {
    return (
      <SidebarMenuButton isActive={name === "button.tsx"} label={String(name)}>
        <Icon name="file" size="sm" />
      </SidebarMenuButton>
    );
  }
  return (
    <SidebarMenuItem>
      <Collapsible defaultOpen={name === "components" || name === "ui"}>
        <CollapsibleTrigger>
          <SidebarMenuButton label={String(name)}>
            <Icon name="folder" size="sm" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {children.map((child, index) => (
              <Tree item={child} key={index} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Changes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {CHANGES.map((change) => (
                <SidebarMenuItem key={change.file}>
                  <SidebarMenuButton label={change.file}>
                    <Icon name="file" size="sm" />
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{change.state}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TREE.map((item, index) => (
                <Tree item={item} key={index} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
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
                <BreadcrumbLink href="#">components</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">ui</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>button.tsx</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <Stack direction="column" gap="md" style={{ padding: 16 }}>
          <Text role="h3">button.tsx</Text>
          <Text role="body">
            The shared row action: Enter or Space activates, a disabled row
            stops, and the focus ring is the control's own.
          </Text>
        </Stack>
      </SidebarInset>
    </SidebarProvider>
  );
}`;
