/** @jsxImportSource @gpuix/react */
/**
 * UserMenu: the account row shadcn puts in a sidebar footer.
 *
 * The trigger is an avatar, the reader's name and address, and a
 * account row; the menu repeats the identity under a label,
 * offers **Upgrade to Pro**, then Account / Billing / Notifications, and closes
 * with Log out behind separators. It is a standalone component — render it in a
 * toolbar or a header — and {@link SidebarUserMenu} is the same menu in the
 * panel's own list, where it collapses to its avatar with the panel.
 *
 * The trigger is the dropdown's own action (`DropdownMenuTrigger`), not a
 * `SidebarMenuButton`: the local DropdownMenu owns the element it anchors and
 * measures, so the row's look is carried by that action's style. A row composed
 * inside `SidebarMenu` therefore keeps the list semantics, and the menu keeps
 * one trigger.
 *
 * Every row is an ordinary action: the component owns no account state and
 * runs the callback the caller hands it, once, through the menu's own
 * activation and dismissal rules.
 */

import type { Props } from "@gpuix/react";
import type { FloatingAlign, FloatingSide } from "@gpuix/react/floating";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  cn,
  USER_MENU_EMAIL,
  USER_MENU_IDENTITY,
  USER_MENU_NAME,
} from "@gpuixui/tw";
import { Avatar } from "./avatar.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";
import { SidebarMenu, SidebarMenuItem, useSidebar } from "./sidebar.js";

/** The identity the trigger and the menu's label show. */
export interface UserMenuUser {
  readonly name: string;
  readonly email: string;
  /** An image path or URL. Without one the avatar paints the initials. */
  readonly avatar?: string;
}

/** What each row does. Every handler is optional; a row without one is inert. */
export interface UserMenuActions {
  readonly onUpgrade?: () => void;
  readonly onAccount?: () => void;
  readonly onBilling?: () => void;
  readonly onNotifications?: () => void;
  readonly onLogOut?: () => void;
}

/** {@link UserMenu} props. */
export interface UserMenuProps
  extends UserMenuActions, Omit<Props, "children"> {
  readonly user: UserMenuUser;
  /** Where the menu opens. Default `"bottom"`. */
  readonly side?: FloatingSide;
  /** Default `"end"`. */
  readonly align?: FloatingAlign;
  /**
   * Paint only the avatar, for an icon-collapsed sidebar. `SidebarUserMenu`
   * passes this from the sidebar's own state.
   */
  readonly collapsed?: boolean;
  /** A Tailwind class string, joined after the trigger's recipe. */
  readonly className?: string;
  /** The trigger's test id. Default `"user-menu-trigger"`. */
  readonly testId?: string;
  /** The menu surface's test id. Default `"user-menu-content"`. */
  readonly menuTestId?: string;
}

/** The trigger row: the avatar, and the name over the address. */
const IDENTITY_HEIGHT = 48;
const IDENTITY_HEIGHT_COLLAPSED = 32;
const MENU_WIDTH = 224;

/** The account row and its dropdown. */
export const UserMenu = ({
  user,
  onUpgrade,
  onAccount,
  onBilling,
  onNotifications,
  onLogOut,
  side = "bottom",
  align = "end",
  collapsed = false,
  className,
  testId = "user-menu-trigger",
  menuTestId = "user-menu-content",
  style,
  ...rest
}: UserMenuProps) => {
  const theme = useTheme();
  const avatar = (
    <Avatar
      name={user.name}
      src={user.avatar}
      size={collapsed ? "sm" : "md"}
      clickThrough
    />
  );
  const identity = (
    <div style={recipeStyle(USER_MENU_IDENTITY, theme)}>
      <text
        style={mergeStyles(recipeStyle(USER_MENU_NAME, theme), {
          color: theme.colors.cardForeground,
        })}
      >
        {user.name}
      </text>
      <text
        style={mergeStyles(recipeStyle(USER_MENU_EMAIL, theme), {
          color: theme.colors.mutedForeground,
        })}
      >
        {user.email}
      </text>
    </div>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        {...rest}
        variant="ghost"
        size="md"
        aria-label={`${user.name} account menu`}
        testId={testId}
        style={mergeStyles(
          {
            height: collapsed ? IDENTITY_HEIGHT_COLLAPSED : IDENTITY_HEIGHT,
            ...(collapsed
              ? { width: IDENTITY_HEIGHT_COLLAPSED, padding: 4 }
              : { paddingLeft: 8, paddingRight: 8 }),
            justifyContent: collapsed ? "center" : "flex-start",
            color: theme.colors.cardForeground,
            ...recipeStyle(cn(className), theme),
          },
          style,
        )}
      >
        {/*
          The avatar declares `clickThrough`: its disc paints a fill and would
          otherwise take the press on 0.11.0 instead of bubbling it to the
          action. This row only lays the identity out.
        */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          {avatar}
          {collapsed ? null : identity}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        label={`${user.name} account`}
        side={side}
        align={align}
        sideOffset={4}
        testId={menuTestId}
        style={{ width: MENU_WIDTH }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingLeft: 4,
            paddingRight: 4,
            paddingTop: 4,
            paddingBottom: 4,
          }}
        >
          {avatar}
          {identity}
        </div>
        {/* An item with no handler is a dead end, so it is not painted: the
            menu is the actions the caller actually wired. */}
        {onUpgrade === undefined ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                testId="user-menu-upgrade"
                onSelect={onUpgrade}
                leading={
                  <Icon
                    name="sparkles"
                    size="sm"
                    color={theme.colors.mutedForeground}
                  />
                }
              >
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        {onAccount === undefined &&
        onBilling === undefined &&
        onNotifications === undefined ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {onAccount === undefined ? null : (
                <DropdownMenuItem
                  testId="user-menu-account"
                  onSelect={onAccount}
                  leading={
                    <Icon
                      name="badge-check"
                      size="sm"
                      color={theme.colors.mutedForeground}
                    />
                  }
                >
                  Account
                </DropdownMenuItem>
              )}
              {onBilling === undefined ? null : (
                <DropdownMenuItem
                  testId="user-menu-billing"
                  onSelect={onBilling}
                  leading={
                    <Icon
                      name="credit-card"
                      size="sm"
                      color={theme.colors.mutedForeground}
                    />
                  }
                >
                  Billing
                </DropdownMenuItem>
              )}
              {onNotifications === undefined ? null : (
                <DropdownMenuItem
                  testId="user-menu-notifications"
                  onSelect={onNotifications}
                  leading={
                    <Icon
                      name="bell"
                      size="sm"
                      color={theme.colors.mutedForeground}
                    />
                  }
                >
                  Notifications
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </>
        )}
        {onLogOut === undefined ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              testId="user-menu-log-out"
              onSelect={onLogOut}
              leading={
                <Icon
                  name="log-out"
                  size="sm"
                  color={theme.colors.mutedForeground}
                />
              }
            >
              Log out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** {@link SidebarUserMenu} props: the same menu, in the panel's list. */
export type SidebarUserMenuProps = Omit<UserMenuProps, "collapsed">;

/**
 * The account row in a sidebar footer.
 *
 * It reads the panel's own collapse state, so the row shows only the avatar
 * when the panel is an icon rail, and opens to the right of the rail rather
 * than over it.
 */
export const SidebarUserMenu = (props: SidebarUserMenuProps) => {
  const { state, collapsible, isMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <UserMenu
          {...props}
          collapsed={state === "collapsed" && collapsible === "icon"}
          side={props.side ?? (isMobile ? "bottom" : "right")}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const userMenuMeta = {
  name: "User menu",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no aria-haspopup in 0.11.0: the trigger announces aria-expanded only",
    "the trigger is the local DropdownMenu's own action, because it owns the element it anchors and measures; a row composed inside SidebarMenu keeps the list semantics",
    "the avatar is painted from a path or URL; there is no image-loading or error state",
  ],
  docs: "docs/user-menu.mdx",
  example: "examples/user-menu.example.tsx",
  testFile: "src/behaviour/user-menu.test.tsx",
} as const;
