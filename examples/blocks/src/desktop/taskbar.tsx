/** @jsxImportSource @gpuix/react */
/**
 * The taskbar. Luna: a blue bar, the green Start button, a button per window,
 * the lighter tray with its clock. Aero: a dark glass bar, the round orb, the
 * windows as squares of glass, a two-line clock. The Start button wears the Gon
 * mark — no operating system's logo.
 */
import type { StyleDesc } from "@gpuix/react";
import { Icon, type IconName } from "@gpuixui/icons";
import * as Arr from "effect/Array";
import { fileURLToPath } from "node:url";
import { LUNA_TITLE, LUNA_UI } from "./chrome.js";
import { clock, titles, type DesktopLook, type WindowId } from "./data.js";
import { gradient } from "./wallpaper.js";

export const MARK = fileURLToPath(new URL("./gon.png", import.meta.url));

/** The bar's height per look. */
export const taskbarHeight: Readonly<Record<DesktopLook, number>> = {
  luna: 30,
  aero: 40,
};

const row: StyleDesc = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
};

export interface TaskbarProps {
  readonly look: DesktopLook;
  readonly width: number;
  readonly windows: ReadonlyArray<readonly [WindowId, IconName]>;
  readonly active: WindowId | undefined;
  readonly menuOpen: boolean;
  readonly onStart: () => void;
  readonly onWindow: (id: WindowId) => void;
}

const Luna = ({
  width,
  windows,
  active,
  menuOpen,
  onStart,
  onWindow,
}: TaskbarProps) => (
  <div
    style={{
      ...row,
      width,
      height: 30,
      background: gradient(180, "#3C81F3", "#1F55D2"),
    }}
  >
    <div
      testId="start"
      onClick={onStart}
      style={{
        ...row,
        gap: 5,
        height: 30,
        paddingLeft: 8,
        paddingRight: 18,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        background: menuOpen
          ? gradient(180, "#2C7D2C", "#3E9C3E")
          : gradient(180, "#4FB34F", "#2D8A2D"),
      }}
    >
      <img src={MARK} objectFit="contain" style={{ width: 20, height: 20 }} />
      <text
        style={{
          fontFamily: LUNA_TITLE,
          fontSize: 17,
          fontWeight: 700,
          color: "#FFFFFF",
        }}
      >
        start
      </text>
    </div>
    <div style={{ ...row, flexGrow: 1, gap: 3, paddingLeft: 8 }}>
      {Arr.map(windows, ([id, icon]) => (
        <div
          key={id}
          testId={`task-${id}`}
          onClick={() => onWindow(id)}
          style={{
            ...row,
            gap: 5,
            width: 168,
            height: 24,
            paddingLeft: 7,
            borderRadius: 3,
            background:
              id === active
                ? gradient(180, "#1A4CB5", "#1E57C9")
                : gradient(180, "#4E93F8", "#2E6BE0"),
          }}
        >
          <Icon name={icon} size={14} color="#FFFFFF" />
          <text style={{ fontFamily: LUNA_UI, fontSize: 11, color: "#FFFFFF" }}>
            {titles[id]}
          </text>
        </div>
      ))}
    </div>
    <div
      style={{
        ...row,
        gap: 8,
        height: 30,
        paddingLeft: 12,
        paddingRight: 12,
        borderLeftWidth: 1,
        borderColor: "#0F3F9E",
        background: gradient(180, "#16A0F2", "#0E7FDB"),
      }}
    >
      <Icon name="volume-2" size={14} color="#FFFFFF" />
      <Icon name="shield" size={14} color="#FFFFFF" />
      <text style={{ fontFamily: LUNA_UI, fontSize: 11, color: "#FFFFFF" }}>
        {clock.time}
      </text>
    </div>
  </div>
);

const Aero = ({
  width,
  windows,
  active,
  menuOpen,
  onStart,
  onWindow,
}: TaskbarProps) => (
  <div
    style={{
      ...row,
      width,
      height: 40,
      gap: 4,
      background: "#16253ACC",
      borderTopWidth: 1,
      borderColor: "#FFFFFF40",
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height: 18,
        background: gradient(180, "#FFFFFF30", "#FFFFFF08"),
      }}
    />
    <div
      testId="start"
      onClick={onStart}
      style={{
        ...row,
        justifyContent: "center",
        width: 38,
        height: 38,
        marginLeft: 6,
        marginRight: 6,
        borderRadius: 19,
        borderWidth: 1,
        borderColor: "#BFE3FFAA",
        background: menuOpen
          ? gradient(180, "#5FB6FF", "#1A64C8")
          : gradient(180, "#3E8EE6", "#0E3F91"),
        boxShadow: [
          {
            offsetX: 0,
            offsetY: 0,
            blurRadius: 10,
            spreadRadius: 0,
            color: "#6FC3FF88",
          },
        ],
      }}
    >
      <img src={MARK} objectFit="contain" style={{ width: 24, height: 24 }} />
    </div>
    {Arr.map(windows, ([id, icon]) => (
      <div
        key={id}
        testId={`task-${id}`}
        onClick={() => onWindow(id)}
        style={{
          ...row,
          justifyContent: "center",
          width: 58,
          height: 38,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: id === active ? "#FFFFFF88" : "#FFFFFF33",
          background:
            id === active
              ? gradient(180, "#FFFFFF55", "#FFFFFF18")
              : gradient(180, "#FFFFFF26", "#FFFFFF08"),
        }}
      >
        <Icon name={icon} size={22} color="#FFFFFF" />
      </div>
    ))}
    <div style={{ flexGrow: 1 }} />
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingRight: 14,
      }}
    >
      <text style={{ fontSize: 11, color: "#FFFFFF" }}>{clock.time}</text>
      <text style={{ fontSize: 11, color: "#FFFFFF" }}>{clock.date}</text>
    </div>
  </div>
);

export const Taskbar = (props: TaskbarProps) =>
  props.look === "luna" ? <Luna {...props} /> : <Aero {...props} />;
