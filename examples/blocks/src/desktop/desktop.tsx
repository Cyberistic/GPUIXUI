/** @jsxImportSource @gpuix/react */
/**
 * Desktop — a whole XP-era or Aero-era desktop: the wallpaper, shortcuts down
 * the left, two windows, the taskbar and the Start menu. The chrome is drawn in
 * the era's own values; everything inside the windows is the library, themed
 * with the `luna` or `aero` look (`retroTheme`) — the theming claim.
 *
 * Paint order is tree order and the runtime has no `zIndex`, so the windows
 * render back to front, then the taskbar, then the open Start menu.
 */
import type { StyleDesc } from "@gpuix/react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@gpuixui/components/tabs";
import { Icon, type IconName } from "@gpuixui/icons";
import { Button, Checkbox, Slider, Stack, Text } from "@gpuixui/primitives";
import { lightTheme, retroTheme, type Theme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState } from "react";
import { EraWindow, LUNA_UI } from "./chrome.js";
import {
  greedIsland,
  shortcuts,
  titles,
  user,
  type DesktopLook,
  type WindowId,
} from "./data.js";
import {
  active,
  closeMenu,
  raise,
  toggleMenu,
  type DesktopState,
} from "./logic.js";
import { StartMenu } from "./start-menu.js";
import { Taskbar, taskbarHeight } from "./taskbar.js";
import { gradient, Wallpaper } from "./wallpaper.js";

export { looks, type DesktopLook } from "./data.js";

const row: StyleDesc = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
};
const column: StyleDesc = { display: "flex", flexDirection: "column" };

const icons: Readonly<Record<WindowId, IconName>> = {
  explorer: "folder-open",
  license: "badge-check",
};

/** The look's theme for the windows' contents; Luna's UI face is Tahoma. */
export const desktopTheme = (look: DesktopLook): Theme => {
  const theme = retroTheme(lightTheme, look);
  return look === "luna"
    ? { ...theme, typography: { ...theme.typography, sans: LUNA_UI } }
    : theme;
};

const Shortcuts = ({ look }: { look: DesktopLook }) => (
  <div style={{ ...column, position: "absolute", left: 14, top: 14, gap: 18 }}>
    {Arr.map(shortcuts, (shortcut) => (
      <div
        key={shortcut.id}
        style={{ ...column, alignItems: "center", width: 84, gap: 5 }}
      >
        <div
          style={{
            ...row,
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: look === "luna" ? 6 : 8,
            backgroundColor: shortcut.tint,
          }}
        >
          <Icon name={shortcut.icon} size={26} color="#FFFFFF" />
        </div>
        <text
          style={{
            fontFamily: look === "luna" ? LUNA_UI : undefined,
            fontSize: 11,
            color: "#FFFFFF",
            textAlign: "center",
          }}
        >
          {shortcut.label}
        </text>
      </div>
    ))}
  </div>
);

/** Luna's blue task pane: two collapsible-looking groups of links. */
const TaskPane = () => (
  <div
    style={{
      ...column,
      width: 190,
      gap: 12,
      padding: 12,
      background: gradient(180, "#7BA2E7", "#6375D6"),
    }}
  >
    {Arr.map(
      [
        [
          "File and Folder Tasks",
          ["Make a new folder", "Share this folder", "Copy to Hunter License"],
        ],
        [
          "Other Places",
          ["Whale Island", "My Nen Notes", "Hunter Association"],
        ],
      ] as const,
      ([heading, links]) => (
        <div
          key={heading}
          style={{
            ...column,
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              ...row,
              height: 24,
              paddingLeft: 10,
              background: gradient(90, "#FFFFFF", "#C6D3F7"),
            }}
          >
            <text
              style={{
                fontFamily: LUNA_UI,
                fontSize: 11,
                fontWeight: 700,
                color: "#215DC6",
              }}
            >
              {heading}
            </text>
          </div>
          <div
            style={{
              ...column,
              gap: 6,
              padding: 10,
              backgroundColor: "#D6DFF7",
            }}
          >
            {Arr.map(links, (link) => (
              <text
                key={link}
                style={{ fontFamily: LUNA_UI, fontSize: 11, color: "#215DC6" }}
              >
                {link}
              </text>
            ))}
          </div>
        </div>
      ),
    )}
  </div>
);

/** Aero's navigation pane: favourites over places, on a pale blue column. */
const NavPane = ({ theme }: { theme: Theme }) => (
  <div
    style={{
      ...column,
      width: 170,
      gap: 4,
      padding: 10,
      borderRightWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: "#F1F6FB",
    }}
  >
    {Arr.map(
      [
        ["star", "Favorites", true],
        ["home", "Whale Island", false],
        ["download", "Downloads", false],
        ["folder", "Libraries", true],
        ["image", "Spell Cards", false],
        ["file-text", "Nen Notes", false],
      ] as const,
      ([icon, label, heading]) => (
        <div
          key={label}
          style={{
            ...row,
            gap: 6,
            paddingLeft: heading ? 0 : 14,
            paddingTop: heading ? 8 : 2,
          }}
        >
          <Icon name={icon} size={14} color={heading ? "#1E5AA8" : "#4A6077"} />
          <Text role={heading ? "label" : "caption"}>{label}</Text>
        </div>
      ),
    )}
  </div>
);

const Explorer = ({ look, theme }: { look: DesktopLook; theme: Theme }) => (
  <div
    style={{ ...column, flexGrow: 1, backgroundColor: theme.colors.background }}
  >
    <div
      style={{
        ...row,
        gap: 14,
        height: 22,
        paddingLeft: 8,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      {Arr.map(
        ["File", "Edit", "View", "Favorites", "Tools", "Help"],
        (item) => (
          <Text key={item} role="caption">
            {item}
          </Text>
        ),
      )}
    </div>
    <div style={{ ...row, alignItems: "stretch", flexGrow: 1, minHeight: 0 }}>
      {look === "luna" ? <TaskPane /> : <NavPane theme={theme} />}
      <div
        style={{
          ...row,
          flexWrap: "wrap",
          alignContent: "flex-start",
          gap: 18,
          flexGrow: 1,
          padding: 18,
          backgroundColor: theme.colors.card,
        }}
      >
        {Arr.map(greedIsland, (item) => (
          <div
            key={item.name}
            style={{ ...column, alignItems: "center", width: 92, gap: 6 }}
          >
            <Icon
              name={item.kind === "folder" ? "folder" : "file-text"}
              size={40}
              color={item.kind === "folder" ? "#E3A82B" : "#5A7EB8"}
            />
            <Text role="caption">{item.name}</Text>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const License = ({ theme }: { theme: Theme }) => (
  <div
    style={{
      ...column,
      flexGrow: 1,
      gap: 12,
      padding: 12,
      backgroundColor: theme.colors.background,
    }}
  >
    <Tabs defaultValue="general">
      <TabsList label="Hunter License">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="nen">Nen</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>
      <TabsContent value="general">
        <Stack direction="column" gap="md" style={{ paddingTop: 10 }}>
          <Text role="label">{`${user.name} — ${user.title}`}</Text>
          <Stack direction="row" gap="sm" align="center">
            <Checkbox testId="aura" label="Show my aura" defaultChecked />
            <Text role="body">Show my aura</Text>
          </Stack>
          <Stack direction="row" gap="sm" align="center">
            <Checkbox label="Allow Zetsu while idle" />
            <Text role="body">Allow Zetsu while idle</Text>
          </Stack>
          <Text role="caption" tone="muted">
            Aura output
          </Text>
          <Slider
            label="Aura output"
            step={10}
            defaultValue={70}
            style={{ width: 300 }}
          />
        </Stack>
      </TabsContent>
    </Tabs>
    <div style={{ flexGrow: 1 }} />
    <Stack direction="row" gap="sm" justify="end">
      <Button variant="primary">OK</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="secondary">Apply</Button>
    </Stack>
  </div>
);

/** Where each window opens and how big it is, per look. */
const frames: Readonly<
  Record<WindowId, readonly [number, number, number, number]>
> = {
  explorer: [130, 40, 720, 470],
  license: [560, 190, 420, 350],
};

export interface DesktopBlockProps {
  readonly look: DesktopLook;
  readonly width?: number;
  readonly height?: number;
}

/** The desktop, as a window's whole content. */
export const DesktopBlock = ({
  look,
  width = 1280,
  height = 800,
}: DesktopBlockProps) => {
  const theme = desktopTheme(look);
  const [state, setState] = useState<DesktopState>({
    order: ["explorer", "license"],
    menuOpen: false,
  });
  const front = active(state);
  const bar = taskbarHeight[look];
  return (
    <ThemeProvider theme={theme}>
      <div
        testId="desktop"
        style={{ position: "relative", width, height, overflow: "hidden" }}
      >
        <Wallpaper look={look} width={width} height={height} />
        {/* A press stops at the first element that paints a fill, so the catcher
            that closes the menu paints one: fully transparent, over the ground. */}
        <div
          testId="desktop-ground"
          onMouseDown={() => setState(closeMenu)}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width,
            height,
            backgroundColor: "#FFFFFF00",
          }}
        />
        <Shortcuts look={look} />
        {Arr.map(state.order, (id) => {
          const [x, y, w, h] = frames[id];
          return (
            <EraWindow
              key={id}
              testId={`window-${id}`}
              look={look}
              title={titles[id]}
              icon={icons[id]}
              active={id === front}
              x={x}
              y={y}
              width={w}
              height={h}
              onPress={() => setState((now) => raise(now, id))}
            >
              {id === "explorer" ? (
                <Explorer look={look} theme={theme} />
              ) : (
                <License theme={theme} />
              )}
            </EraWindow>
          );
        })}
        <div style={{ position: "absolute", left: 0, top: height - bar }}>
          <Taskbar
            look={look}
            width={width}
            windows={Arr.map(
              ["explorer", "license"] as const,
              (id) => [id, icons[id]] as const,
            )}
            active={front}
            menuOpen={state.menuOpen}
            onStart={() => setState(toggleMenu)}
            onWindow={(id) => setState((now) => raise(now, id))}
          />
        </div>
        {state.menuOpen ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: height - bar - (look === "luna" ? 432 : 470),
            }}
          >
            <StartMenu look={look} />
          </div>
        ) : null}
      </div>
    </ThemeProvider>
  );
};
