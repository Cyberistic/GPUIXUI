/**
 * Sidebar behaviour in the real GPUix renderer.
 *
 * The bugs these guard: a collapse that the content does not pay for (the gap
 * and the panel disagree), a persisted state that a remount forgets, a shortcut
 * the window never reaches, an icon tooltip that cannot open, and a mobile sheet
 * that lets Tab walk out or a scrim press through.
 */

import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import { Icon } from "@gpuixui/icons";
import { darkTheme } from "../internal/theme.js";
import {
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  pressKey,
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
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  type SidebarCollapsible,
  type SidebarVariant,
} from "../sidebar.js";
import { SidebarUserMenu } from "../user-menu.js";

const user = { name: "Benji van der Brand", email: "benji@example.com" };

/** The panel used by the geometry and keyboard cases. */
const Workspace = ({
  variant = "sidebar",
  collapsible = "icon",
  defaultOpen,
  onLogOut,
}: {
  readonly variant?: SidebarVariant;
  readonly collapsible?: SidebarCollapsible;
  readonly defaultOpen?: boolean;
  readonly onLogOut?: () => void;
}) => (
  <SidebarProvider
    variant={variant}
    collapsible={collapsible}
    defaultOpen={defaultOpen}
  >
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
                  testId="nav-playground"
                >
                  <Icon
                    name="terminal"
                    size="sm"
                    color={darkTheme.colors.accentForeground}
                  />
                </SidebarMenuButton>
                <SidebarMenuBadge>3</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  label="Models"
                  tooltip="Models"
                  testId="nav-models"
                >
                  <Icon
                    name="bot"
                    size="sm"
                    color={darkTheme.colors.cardForeground}
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  label="Settings"
                  tooltip="Settings"
                  testId="nav-settings"
                >
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
        <SidebarUserMenu user={user} onLogOut={onLogOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
    <SidebarInset>
      <SidebarTrigger />
    </SidebarInset>
  </SidebarProvider>
);

/** Whether `elementId` sits inside the subtree of `ancestorId`. */
const inside = (
  root: ReturnType<typeof renderComponent>,
  elementId: number,
  ancestorId: number,
): boolean => {
  let current: number | null | undefined = elementId;
  for (let depth = 0; depth < 20 && current != null; depth += 1) {
    if (current === ancestorId) return true;
    current = root.renderer.getElement(current)?.parentId;
  }
  return false;
};

describe("Sidebar", () => {
  it("pays the panel it loses with its gap", () => {
    const root = renderComponent(<Workspace defaultOpen />);
    expect(requireBounds(root, "sidebar-gap").width).toBe(256);
    expect(requireBounds(root, "sidebar").width).toBe(256);

    clickCentreOf(root, "sidebar-trigger");
    settleMotion(root);

    expect(requireBounds(root, "sidebar-gap").width).toBe(48);
    expect(requireBounds(root, "sidebar").width).toBe(48);
    root.unmount();
  });

  it("pays the floating variant's gutter when collapsed to icons", () => {
    const root = renderComponent(<Workspace variant="inset" defaultOpen />);
    expect(requireBounds(root, "sidebar-gap").width).toBe(256);

    clickCentreOf(root, "sidebar-trigger");
    settleMotion(root);

    expect(requireBounds(root, "sidebar-gap").width).toBe(64);
    expect(requireBounds(root, "sidebar-inset").width).toBeGreaterThan(0);
    root.unmount();
  });

  it("keeps a collapsed state across a remount", () => {
    const first = renderComponent(<Workspace defaultOpen />);
    expect(first.renderer.findByTestId("sidebar-gap")?.id).toBeDefined();
    clickCentreOf(first, "sidebar-trigger");
    settleMotion(first);
    expect(requireBounds(first, "sidebar-gap").width).toBe(48);
    first.unmount();

    const second = renderComponent(<Workspace />);
    expect(requireBounds(second, "sidebar-gap").width).toBe(48);
    second.unmount();
  });

  it("toggles from ⌘B wherever focus sits in the provider", () => {
    const root = renderComponent(<Workspace defaultOpen />);
    clickCentreOf(root, "nav-models");

    root.renderer.simulateKeystrokes("cmd-b");
    settleMotion(root);
    expect(requireBounds(root, "sidebar-gap").width).toBe(48);

    root.renderer.simulateKeystrokes("cmd-b");
    settleMotion(root);
    expect(requireBounds(root, "sidebar-gap").width).toBe(256);
    root.unmount();
  });

  it("shows the icon-mode tooltip and keeps the active row's accent", async () => {
    const root = renderComponent(<Workspace defaultOpen />);
    expect(
      root.renderer.findByTestId("nav-playground")?.style.backgroundColor,
    ).toBe(darkTheme.colors.accent);

    clickCentreOf(root, "sidebar-trigger");
    settleMotion(root);
    hoverCentreOf(root, "nav-models");
    settle(root);

    expect(root.renderer.findByTestId("nav-models-tip")).toBeDefined();
    expect(root.renderer.getAllText()).toContain("Models");
    // Only the hovered row's tip opens.
    expect(root.renderer.findByTestId("nav-settings-tip")).toBeUndefined();

    root.renderer.nativeSimulateMouseMove(1000, 700);
    await waitFor(() =>
      expect(root.renderer.findByTestId("nav-models-tip")).toBeUndefined(),
    );
    root.unmount();
  });

  it("paints the badge, action and submenu, and hides them in icon mode", () => {
    const root = renderComponent(
      <SidebarProvider collapsible="icon" defaultOpen>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton label="Models" testId="row-models" />
                    <SidebarMenuAction label="More" testId="row-action">
                      <Icon
                        name="ellipsis"
                        size="sm"
                        color={darkTheme.colors.cardForeground}
                      />
                    </SidebarMenuAction>
                    <SidebarMenuBadge testId="row-badge">12</SidebarMenuBadge>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          label="Genesis"
                          testId="sub-genesis"
                        />
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </SidebarMenu>
                <SidebarMenuSkeleton showIcon testId="loading-row" />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger />
        </SidebarInset>
      </SidebarProvider>,
    );

    expect(root.renderer.getAllText()).toContain("12");
    expect(requireBounds(root, "row-action").width).toBe(20);
    expect(requireBounds(root, "sub-genesis").width).toBeGreaterThan(0);
    expect(requireBounds(root, "loading-row").height).toBeGreaterThan(0);

    clickCentreOf(root, "sidebar-trigger");
    settleMotion(root);

    expect(root.renderer.findByTestId("row-action")?.style.display).toBe(
      "none",
    );
    expect(root.renderer.findByTestId("sub-genesis")?.style.display).toBe(
      "none",
    );
    // The badge is a paint-only slot: it leaves with the label it counts.
    expect(root.renderer.findByTestId("row-badge")?.style.display).toBe("none");
    root.unmount();
  });

  it("toggles from its rail", () => {
    const root = renderComponent(<Workspace defaultOpen />);
    clickCentreOf(root, "sidebar-rail");
    settleMotion(root);
    expect(requireBounds(root, "sidebar-gap").width).toBe(48);
    root.unmount();
  });

  it("opens the account menu from an icon rail", async () => {
    const root = renderComponent(<Workspace defaultOpen />);
    clickCentreOf(root, "sidebar-trigger");
    settleMotion(root);
    expect(requireBounds(root, "user-menu-trigger").width).toBe(32);

    clickCentreOf(root, "user-menu-trigger");
    await waitFor(() => {
      settle(root);
      requireBounds(root, "user-menu-upgrade");
    });
    expect(
      root.renderer.findByTestId("user-menu-trigger")?.customProps,
    ).toMatchObject({ "aria-expanded": true });
    root.unmount();
  });

  it("runs the user menu's action once and closes it", async () => {
    const onLogOut = vi.fn();
    const root = renderComponent(<Workspace defaultOpen onLogOut={onLogOut} />);

    clickCentreOf(root, "user-menu-trigger");
    // The anchored surface measures itself over a few paint rounds before its
    // rows have bounds; one round leaves the later rows unpainted.
    await waitFor(() => {
      settle(root);
      requireBounds(root, "user-menu-log-out");
    });
    clickCentreOf(root, "user-menu-log-out");
    settleMotion(root);

    expect(onLogOut).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(root.renderer.findByTestId("user-menu-content")).toBeUndefined(),
    );
    root.unmount();
  });
});

describe("Sidebar on a narrow window", () => {
  it("opens a focus-trapping sheet and closes it on a scrim press", async () => {
    const root = renderComponent(<Workspace />, "dark", {
      width: 600,
      height: 800,
    });
    expect(root.renderer.findByTestId("sidebar")).toBeUndefined();

    clickCentreOf(root, "sidebar-trigger");
    settleMotion(root);

    const sheet = root.renderer.findByTestId("sidebar-sheet");
    expect(sheet?.customProps).toMatchObject({
      role: "dialog",
      "aria-label": "Sidebar",
    });
    expect(focusedTestId(root)).toEqual(Option.some("sidebar-sheet"));

    // Walk past every control the sheet holds: the modal wraps at the end,
    // where an untrapped traversal would leave for the trigger behind it.
    for (let step = 0; step < 10; step += 1) {
      pressKey(root, "tab");
      const focused = root.renderer.getFocusedElementId();
      expect(focused, `tab ${step}`).not.toBeNull();
      expect(inside(root, focused ?? -1, sheet?.id ?? -1), `tab ${step}`).toBe(
        true,
      );
    }

    root.renderer.nativeSimulateClick(560, 400);
    await waitFor(() =>
      expect(root.renderer.findByTestId("sidebar-sheet")).toBeUndefined(),
    );
    root.unmount();
  });
});

describe("Sidebar widths", () => {
  it("paints the panel and the gap at the caller's width", () => {
    const page = renderComponent(
      <SidebarProvider width={304} defaultOpen>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton label="One">One</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>Content</SidebarInset>
      </SidebarProvider>,
    );

    settleMotion(page);
    expect(requireBounds(page, "sidebar").width).toBe(304);
    expect(requireBounds(page, "sidebar-gap").width).toBe(304);

    page.unmount();
  });
});
