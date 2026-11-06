import { Badge } from "@gpuixui/components/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@gpuixui/components/sidebar";
import {
  ToastProvider,
  ToastViewport,
  useToast,
} from "@gpuixui/components/toast";
import { Icon } from "@gpuixui/icons";
import { Button, Separator, Stack, Text } from "@gpuixui/primitives";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { deploys, sections } from "./data.js";

const Deploys = () => {
  const theme = useTheme();
  const toast = useToast();
  return (
    <Stack
      direction="column"
      gap="md"
      style={{ flexGrow: 1, padding: theme.spacing.xl }}
    >
      <Stack direction="row" align="center" justify="between">
        <Stack direction="row" align="center" gap="sm">
          <SidebarTrigger />
          <Text role="h3">Deploys</Text>
        </Stack>
        <Button
          testId="deploy"
          variant="primary"
          onActivate={() => {
            toast.push({
              title: "Deploying to Greed Island",
              description: "Killua's build, 14 files",
              tone: "info",
            });
            toast.push({
              title: "Greed Island is live",
              description: "Every check passed",
              tone: "success",
            });
          }}
        >
          Deploy
        </Button>
      </Stack>
      <Separator orientation="horizontal" />
      {Arr.map(deploys, (deploy) => (
        <Stack
          key={deploy.id}
          direction="row"
          align="center"
          gap="md"
          style={{
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.sm,
          }}
        >
          <Stack direction="column" gap="2xs" style={{ flexGrow: 1 }}>
            <Text role="label">{deploy.target}</Text>
            <Text role="caption" tone="muted">
              {`${deploy.by} · ${deploy.when}`}
            </Text>
          </Stack>
          <Badge variant={deploy.ok ? "success" : "danger"}>
            {deploy.ok ? "Live" : "Failed"}
          </Badge>
        </Stack>
      ))}
    </Stack>
  );
};

export const Console = () => {
  const theme = useTheme();
  return (
    <ToastProvider>
      {}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: theme.colors.background,
        }}
      >
        <SidebarProvider collapsible="icon">
          <Sidebar>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Hunter Association</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {Arr.map(sections, ([icon, name]) => (
                      <SidebarMenuItem key={name}>
                        <SidebarMenuButton
                          label={name}
                          tooltip={name}
                          isActive={name === "Deploys"}
                        >
                          <Icon
                            name={icon}
                            size={theme.iconSize.sm}
                            color={theme.colors.foreground}
                          />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <Deploys />
          </SidebarInset>
        </SidebarProvider>
        <ToastViewport />
      </div>
    </ToastProvider>
  );
};
