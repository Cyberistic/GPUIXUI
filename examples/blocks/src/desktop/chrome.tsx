/**
 * A window in its era's chrome. Luna: a glossy blue title bar with rounded top
 * corners, white-ringed caption buttons and the red close, a blue frame. Aero:
 * a translucent frame with a sheen (the runtime has no per-element blur, so the
 * glass is a translucent fill over the wallpaper), caption buttons hanging from
 * the top edge, the red close widest. Gloss is stacked two-stop layers.
 */
import type { StyleDesc } from "@gpuix/react";
import { Icon, type IconName } from "@gpuixui/icons";
import * as Arr from "effect/Array";
import type { ReactNode } from "react";
import type { DesktopLook } from "./data.js";
import { gradient } from "./wallpaper.js";

/** Luna's title type: Trebuchet MS bold, as the era drew it. */
export const LUNA_TITLE = "Trebuchet MS";
/** Luna's UI type. */
export const LUNA_UI = "Tahoma";

const row: StyleDesc = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
};

export interface EraWindowProps {
  readonly look: DesktopLook;
  readonly title: string;
  readonly icon: IconName;
  readonly active: boolean;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly testId?: string;
  readonly onPress?: () => void;
  readonly children: ReactNode;
}

const lunaCaption = (mark: string, close: boolean, active: boolean) => (
  <div
    key={mark}
    style={{
      ...row,
      justifyContent: "center",
      width: 21,
      height: 21,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: "#FFFFFF",
      background: close
        ? gradient(
            180,
            active ? "#E9896B" : "#D9A99A",
            active ? "#C23B12" : "#B9806E",
          )
        : gradient(
            180,
            active ? "#4C8CF7" : "#9DB6EC",
            active ? "#1A56D6" : "#7E98DA",
          ),
    }}
  >
    <text
      style={{
        fontFamily: LUNA_UI,
        fontSize: 13,
        fontWeight: 700,
        color: "#FFFFFF",
      }}
    >
      {mark}
    </text>
  </div>
);

const LunaWindow = ({
  title,
  icon,
  active,
  width,
  height,
  onPress,
  children,
}: EraWindowProps) => (
  <div style={{ width, height, display: "flex", flexDirection: "column" }}>
    <div
      onMouseDown={onPress}
      style={{
        height: 30,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        overflow: "hidden",
        background: gradient(
          180,
          active ? "#0A5FE8" : "#7E9BE0",
          active ? "#0442C4" : "#9AB0E6",
        ),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          height: 11,
          background: gradient(
            180,
            active ? "#5FA6FFCC" : "#C9D6F4AA",
            "#5FA6FF00",
          ),
        }}
      />
      <div
        style={{ ...row, height: 30, paddingLeft: 6, paddingRight: 5, gap: 5 }}
      >
        <Icon name={icon} size={16} color="#FFFFFF" />
        <text
          style={{
            flexGrow: 1,
            fontFamily: LUNA_TITLE,
            fontSize: 13,
            fontWeight: 700,
            color: active ? "#FFFFFF" : "#DCE4F7",
          }}
        >
          {title}
        </text>
        <div style={{ ...row, gap: 2 }}>
          {Arr.map(
            [
              ["–", false],
              ["□", false],
              ["✕", true],
            ] as const,
            ([mark, close]) => lunaCaption(mark, close, active),
          )}
        </div>
      </div>
    </div>
    <div
      style={{
        flexGrow: 1,
        display: "flex",
        minHeight: 0,
        borderLeftWidth: 3,
        borderRightWidth: 3,
        borderBottomWidth: 3,
        borderColor: active ? "#0645CF" : "#8EA4DE",
      }}
    >
      {children}
    </div>
  </div>
);

const aeroCaption = (mark: string, close: boolean, active: boolean) => (
  <div
    key={mark}
    style={{
      ...row,
      justifyContent: "center",
      width: close ? 44 : 26,
      height: 19,
      borderBottomLeftRadius: mark === "–" ? 4 : 0,
      borderBottomRightRadius: close ? 4 : 0,
      borderWidth: 1,
      borderColor: "#2C3E57AA",
      background: close
        ? gradient(
            180,
            active ? "#E79B88" : "#D9C6C2",
            active ? "#C4381D" : "#B8A39E",
          )
        : gradient(180, "#F4F8FDDD", "#C3D5EAAA"),
    }}
  >
    <text
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: close ? "#FFFFFF" : "#2B3D55",
      }}
    >
      {mark}
    </text>
  </div>
);

const AeroWindow = ({
  title,
  icon,
  active,
  width,
  height,
  onPress,
  children,
}: EraWindowProps) => (
  <div
    onMouseDown={onPress}
    style={{
      width,
      height,
      display: "flex",
      flexDirection: "column",
      borderRadius: 7,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "#1A2638CC",
      background: active ? "#8DB6E38C" : "#B9CCE08C",
      boxShadow: [
        {
          offsetX: 0,
          offsetY: 8,
          blurRadius: 24,
          spreadRadius: 0,
          color: "#00000055",
        },
      ],
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        height: 46,
        background: gradient(180, "#FFFFFF8C", "#FFFFFF00"),
      }}
    />
    <div style={{ ...row, height: 30, paddingLeft: 9, gap: 7 }}>
      <Icon name={icon} size={16} color="#1E395B" />
      <text style={{ flexGrow: 1, fontSize: 12, color: "#10233F" }}>
        {title}
      </text>
      <div style={{ ...row, alignSelf: "flex-start", marginRight: 6 }}>
        {Arr.map(
          [
            ["–", false],
            ["□", false],
            ["✕", true],
          ] as const,
          ([mark, close]) => aeroCaption(mark, close, active),
        )}
      </div>
    </div>
    <div
      style={{
        flexGrow: 1,
        display: "flex",
        minHeight: 0,
        marginLeft: 8,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#5F7591",
      }}
    >
      {children}
    </div>
  </div>
);

/** A window placed at (`x`, `y`) on the desktop. A press on its painted
 * chrome raises it: a press stops at the first element that paints a fill. */
export const EraWindow = (props: EraWindowProps) => (
  <div
    testId={props.testId}
    style={{ position: "absolute", left: props.x, top: props.y }}
  >
    {props.look === "luna" ? (
      <LunaWindow {...props} />
    ) : (
      <AeroWindow {...props} />
    )}
  </div>
);
