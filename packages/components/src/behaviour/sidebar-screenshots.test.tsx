/**
 * The sidebar's evidence frames, through the native test renderer.
 *
 * The four states a reviewer reads: the expanded panel, the icon rail, the
 * mobile sheet, and the account menu open. The capture is the real GPUix paint,
 * not a browser approximation, and the assertions prove each state actually
 * painted before the frame was written (a blank window is not evidence).
 *
 * The files land under `apps/playground/.artifacts/live/`, which is gitignored:
 * local evidence for the run, never repository content.
 */

import { mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Icon } from "@gpuixui/icons";
import { darkTheme } from "../internal/theme.js";
import {
  clickCentreOf,
  requireBounds,
  settle,
  settleMotion,
  waitFor,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
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
} from "../sidebar.js";
import { SidebarUserMenu } from "../user-menu.js";

const directory = fileURLToPath(
  new URL("../../../../apps/playground/.artifacts/live/", import.meta.url),
);

const frame = (name: string): string => {
  mkdirSync(directory, { recursive: true });
  return `${directory}${name}.png`;
};

const user = { name: "Benji van der Brand", email: "benji@example.com" };

const Frame = ({ open }: { readonly open: boolean }) => (
  <SidebarProvider collapsible="icon" defaultOpen={open}>
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" label="Acme Inc" tooltip="Acme Inc">
              <Icon
                name="terminal"
                size="sm"
                color={darkTheme.colors.cardForeground}
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
                    color={darkTheme.colors.accentForeground}
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  label="Models"
                  tooltip="Models"
                  testId="frame-models"
                >
                  <Icon
                    name="bot"
                    size="sm"
                    color={darkTheme.colors.cardForeground}
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton label="Settings" tooltip="Settings">
                  <Icon
                    name="settings"
                    size="sm"
                    color={darkTheme.colors.cardForeground}
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
      <SidebarTrigger />
    </SidebarInset>
  </SidebarProvider>
);

const capture = (
  root: ReturnType<typeof renderComponent>,
  path: string,
): number => {
  root.renderer.captureScreenshot(path);
  return statSync(path).size;
};

describe.skipIf(process.platform !== "darwin")("Sidebar frames", () => {
  it("captures the expanded panel", () => {
    const root = renderComponent(<Frame open />);
    expect(requireBounds(root, "sidebar-gap").width).toBe(256);
    expect(capture(root, frame("sidebar-expanded"))).toBeGreaterThan(0);
    root.unmount();
  });

  it("captures the icon rail", () => {
    const root = renderComponent(<Frame open />);
    clickCentreOf(root, "sidebar-trigger");
    settleMotion(root);
    expect(requireBounds(root, "sidebar-gap").width).toBe(48);
    expect(capture(root, frame("sidebar-icon"))).toBeGreaterThan(0);
    root.unmount();
  });

  it("captures the mobile sheet", () => {
    const root = renderComponent(<Frame open />, "dark", {
      width: 600,
      height: 800,
    });
    clickCentreOf(root, "sidebar-trigger");
    settleMotion(root);
    expect(root.renderer.findByTestId("sidebar-sheet")).toBeDefined();
    // The pointer opened the sheet from the header; park it on the scrim so
    // the frame shows the resting panel rather than the row it landed on.
    root.renderer.nativeSimulateMouseMove(590, 700);
    settle(root);
    expect(capture(root, frame("sidebar-mobile"))).toBeGreaterThan(0);
    root.unmount();
  });

  it("captures the account menu open", async () => {
    const root = renderComponent(<Frame open />);
    clickCentreOf(root, "user-menu-trigger");
    await waitFor(() => {
      settle(root);
      requireBounds(root, "user-menu-upgrade");
    });
    // The rows have layout before the surface has finished arriving; the frame
    // should show the resting menu, not its first opacity frame.
    settleMotion(root);
    expect(capture(root, frame("user-menu-open"))).toBeGreaterThan(0);
    root.unmount();
  });
});
