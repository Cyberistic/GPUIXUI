/** @jsxImportSource @gpuix/react */
/**
 * macOS — a whole desktop in the current Mac look: the wallpaper drawn from
 * gradients, the menu bar with its menus, the dock's apps, and a floating
 * window layer the caller fills with real `@gpuixui` windows.
 *
 * The chrome is drawn in the look's own values; the app name in the bar and the
 * menus come from `data.ts`. Nothing here is an OS asset: the mark is the Gon
 * mark the rest of the library wears.
 */
import type { StyleDesc } from "@gpuix/react";
import { Icon } from "@gpuixui/icons";
import {
  extendTheme,
  lightTheme,
  platformTheme,
  type Theme,
} from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { fileURLToPath } from "node:url";
import { useState, type ReactNode } from "react";
import { BAR_HEIGHT, DOCK, dock, menus } from "./data.js";
import { focusedApp, nextMenu } from "./logic.js";

const MARK = fileURLToPath(new URL("../desktop/gon.png", import.meta.url));

const row: StyleDesc = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
};

const fill = (style: StyleDesc): StyleDesc => ({
  position: "absolute",
  ...style,
});

/** A two-stop linear gradient, `angle` in CSS degrees (180 runs top to bottom). */
const gradient = (
  angle: number,
  from: string,
  to: string,
): StyleDesc["background"] => ({
  type: "linear-gradient",
  angle,
  stops: [
    { color: from, position: 0 },
    { color: to, position: 1 },
  ],
});

/** A disc of `size` centred at (`x`, `y`) — the wallpaper's only shape. */
const disc = (
  x: number,
  y: number,
  size: number,
  background: StyleDesc["background"],
): StyleDesc =>
  fill({
    left: x - size / 2,
    top: y - size / 2,
    width: size,
    height: size,
    borderRadius: size / 2,
    background,
  });

/** The ground: a violet field with three soft blooms of light. */
const Wallpaper = ({ width, height }: { width: number; height: number }) => (
  <div style={fill({ left: 0, top: 0, width, height, overflow: "hidden" })}>
    <div
      style={fill({
        left: 0,
        top: 0,
        width,
        height,
        background: gradient(160, "#2B1B57", "#6E3FA8"),
      })}
    />
    <div
      style={disc(width * 0.82, height * 0.16, width * 0.95, {
        type: "linear-gradient",
        angle: 180,
        stops: [
          { color: "#C084FC3D", position: 0 },
          { color: "#C084FC00", position: 1 },
        ],
      })}
    />
    <div
      style={disc(width * 0.12, height * 0.92, width * 0.8, {
        type: "linear-gradient",
        angle: 0,
        stops: [
          { color: "#3B82F63D", position: 0 },
          { color: "#3B82F600", position: 1 },
        ],
      })}
    />
    <div
      style={disc(width * 0.52, height * 0.52, width * 0.34, {
        type: "linear-gradient",
        angle: 135,
        stops: [
          { color: "#FFFFFF24", position: 0 },
          { color: "#FFFFFF00", position: 1 },
        ],
      })}
    />
  </div>
);

const INK = "#F4F1FF";
const DIM = "#F4F1FFB8";

/** A menu bar item's panel, painted under its title. */
const MenuPanel = ({
  title,
  items,
  left,
  onClose,
}: {
  readonly title: string;
  readonly items: ReadonlyArray<string>;
  readonly left: number;
  readonly onClose: () => void;
}) => (
  <div
    style={{
      position: "absolute",
      left,
      top: BAR_HEIGHT,
      width: 240,
      paddingTop: 6,
      paddingBottom: 6,
      borderRadius: 10,
      backgroundColor: "#FFFFFFEE",
      borderWidth: 1,
      borderColor: "#00000014",
      boxShadow: {
        offsetX: 0,
        offsetY: 18,
        blurRadius: 40,
        spreadRadius: -12,
        color: "#1A1030A6",
      },
    }}
  >
    <text
      style={{
        paddingLeft: 14,
        paddingRight: 14,
        paddingBottom: 4,
        fontSize: 11,
        lineHeight: 16,
        fontWeight: 600,
        color: "#6B6B76",
      }}
    >
      {title}
    </text>
    {Arr.map(items, (item, i) => (
      <div
        key={item}
        testId={`menu-item-${i}`}
        onClick={onClose}
        style={{
          ...row,
          height: 26,
          paddingLeft: 14,
          paddingRight: 14,
          fontSize: 13,
          color: "#1D1D1F",
        }}
      >
        <text style={{ fontSize: 13, lineHeight: 26, color: "#1D1D1F" }}>
          {item}
        </text>
      </div>
    ))}
  </div>
);

/** Each menu title owns a fixed slot, so the bar and its panel cannot drift. */
const SLOT = 74;
const FIRST_SLOT = 78;
const slotOf = (index: number): number => FIRST_SLOT + index * SLOT;

const MenuBar = ({
  width,
  app,
  open,
  onMenu,
}: {
  readonly width: number;
  readonly app: string;
  readonly open: string | undefined;
  readonly onMenu: (title: string) => void;
}) => {
  const titles = menus;
  const activeAt = Arr.findFirstIndex(titles, (menu) => menu.title === open);
  return (
    <>
      <div
        style={{
          ...row,
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height: BAR_HEIGHT,
          paddingLeft: 14,
          paddingRight: 14,
          gap: 18,
          backgroundColor: "#FFFFFF1F",
        }}
      >
        <img src={MARK} alt="" style={{ width: 14, height: 14 }} />
        <text style={{ fontSize: 13, fontWeight: 700, color: INK }}>{app}</text>
        {Arr.map(titles, (menu, i) => (
          <div
            key={menu.title}
            testId={`menu-${menu.title}`}
            onClick={() => onMenu(menu.title)}
            style={{
              ...row,
              position: "absolute",
              left: slotOf(i),
              height: BAR_HEIGHT,
            }}
          >
            <text style={{ fontSize: 13, color: INK }}>{menu.title}</text>
          </div>
        ))}
        <div style={{ flexGrow: 1, flexBasis: 0 }} />
        <Icon name="search" size={13} color={INK} />
        <div
          style={{
            width: 22,
            height: 11,
            borderRadius: 3,
            borderWidth: 1,
            borderColor: DIM,
            padding: 1.5,
          }}
        >
          <div
            style={{
              width: 16,
              height: 8,
              borderRadius: 1.5,
              backgroundColor: INK,
            }}
          />
        </div>
        <text style={{ fontSize: 13, color: INK }}>Tue 9:41 AM</text>
      </div>
      {Option.match(
        Option.flatMap(activeAt, (index) => Arr.get(titles, index)),
        {
          onNone: () => null,
          onSome: (menu) => (
            <MenuPanel
              title={menu.title}
              items={menu.items}
              left={slotOf(Option.getOrElse(activeAt, () => 0)) - 8}
              onClose={() => onMenu(menu.title)}
            />
          ),
        },
      )}
    </>
  );
};

const Dock = ({
  width,
  focused,
  onApp,
}: {
  readonly width: number;
  readonly focused: string;
  readonly onApp: (label: string) => void;
}) => {
  const span = dock.length * DOCK.tile + (dock.length - 1) * DOCK.gap;
  return (
    <div
      style={{
        ...row,
        position: "absolute",
        left: (width - span) / 2 - DOCK.pad,
        bottom: DOCK.bottom,
        gap: DOCK.gap,
        padding: DOCK.pad,
        borderRadius: 20,
        backgroundColor: "#FFFFFF2E",
        borderWidth: 1,
        borderColor: "#FFFFFF3D",
      }}
    >
      {Arr.map(dock, (app) => (
        <div
          key={app.label}
          testId={`dock-${app.label}`}
          onClick={() => onApp(app.label)}
          style={{
            position: "relative",
            width: DOCK.tile,
            height: DOCK.tile,
            borderRadius: 12,
            backgroundColor: app.label === focused ? "#FFFFFF52" : "#FFFFFF26",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ pointerEvents: "none" }}>
            <Icon name={app.icon} size={24} color={INK} />
          </div>
          <div
            style={{
              position: "absolute",
              left: DOCK.tile / 2 - 2,
              top: DOCK.tile - 6,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: app.running ? INK : "#FFFFFF00",
              pointerEvents: "none",
            }}
          />
        </div>
      ))}
    </div>
  );
};

export interface MacosDesktopProps {
  /** The floating window layer: real windows, placed by the caller. */
  readonly children?: ReactNode;
  readonly width?: number;
  readonly height?: number;
}

const Screen = ({
  children,
  width,
  height,
}: Required<Pick<MacosDesktopProps, "width" | "height">> &
  Pick<MacosDesktopProps, "children">) => {
  const [open, setOpen] = useState<string | undefined>(undefined);
  const [app, setApp] = useState("Finder");
  return (
    <div
      testId="macos-desktop"
      style={{ position: "relative", width, height, overflow: "hidden" }}
    >
      <Wallpaper width={width} height={height} />
      <MenuBar
        width={width}
        app={app}
        open={open}
        onMenu={(title) => setOpen((current) => nextMenu(current, title))}
      />
      <div
        testId="desktop-backdrop"
        onClick={() => setOpen(undefined)}
        style={fill({
          left: 0,
          top: BAR_HEIGHT,
          width,
          height: height - BAR_HEIGHT - 84,
        })}
      >
        {children}
      </div>
      <Dock
        width={width}
        focused={app}
        onApp={(label) => setApp((current) => focusedApp(current, label))}
      />
    </div>
  );
};

/** The desktop, wearing the platform look a Mac app runs in. */
export const MacosDesktop = ({
  children,
  width = 1280,
  height = 800,
}: MacosDesktopProps) => {
  // Opaque: the offscreen renderer has no window server, so a vibrant sidebar
  // would paint flat grey instead of the wallpaper through it.
  const theme: Theme = extendTheme(platformTheme(lightTheme, "darwin"), {
    window: "opaque",
  });
  return (
    <ThemeProvider theme={theme}>
      <Screen width={width} height={height}>
        {children}
      </Screen>
    </ThemeProvider>
  );
};
