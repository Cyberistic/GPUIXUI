/** @jsxImportSource @gpuix/react */
import { Icon } from "@gpuixui/icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  SidebarUserMenu,
  useTheme,
} from "../src/index.js";
import { textStyle } from "../src/internal/theme.js";

const user = {
  name: "Benji van der Brand",
  email: "benji@example.com",
};

export const SidebarExample = () => {
  const theme = useTheme();
  return (
    <SidebarProvider collapsible="icon" style={{ height: 480 }}>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                label="Acme Inc"
                tooltip="Acme Inc"
                testId="sidebar-example-team"
              >
                <Icon
                  name="terminal"
                  size="sm"
                  color={theme.colors.cardForeground}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive
                    label="Playground"
                    tooltip="Playground"
                  >
                    <Icon
                      name="terminal"
                      size="sm"
                      color={theme.colors.accentForeground}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton label="Models" tooltip="Models">
                    <Icon
                      name="bot"
                      size="sm"
                      color={theme.colors.cardForeground}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    label="Documentation"
                    tooltip="Documentation"
                  >
                    <Icon
                      name="file-text"
                      size="sm"
                      color={theme.colors.cardForeground}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton label="Settings" tooltip="Settings">
                    <Icon
                      name="settings"
                      size="sm"
                      color={theme.colors.cardForeground}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarUserMenu user={user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            padding: 8,
          }}
        >
          <SidebarTrigger />
          <text style={mergeText(theme)}>Data fetching</text>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

const mergeText = (theme: ReturnType<typeof useTheme>) => ({
  ...textStyle(theme, "bodyStrong"),
  color: theme.colors.foreground,
});
