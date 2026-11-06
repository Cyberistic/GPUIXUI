import type { StyleDesc } from "@gpuix/react";
import { Avatar } from "@gpuixui/components/avatar";
import { Icon } from "@gpuixui/icons";
import * as Arr from "effect/Array";
import { LUNA_TITLE, LUNA_UI } from "./chrome.js";
import {
  pinned,
  places,
  recent,
  user,
  type DesktopLook,
  type Program,
} from "./data.js";
import { gradient } from "./wallpaper.js";

const row: StyleDesc = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
};
const column: StyleDesc = { display: "flex", flexDirection: "column" };

const tile = (program: Program, size: number) => (
  <div
    style={{
      ...row,
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: 4,
      backgroundColor: program.tint,
    }}
  >
    <Icon name={program.icon} size={size * 0.62} color="#FFFFFF" />
  </div>
);

const entry = (
  program: Program,
  font: string,
  ink: string,
  size: number,
  bold = false,
) => (
  <div
    key={program.label}
    style={{ ...row, gap: 8, paddingLeft: 8, paddingTop: 4, paddingBottom: 4 }}
  >
    {tile(program, size)}
    <div style={column}>
      <text
        style={{
          fontFamily: font,
          fontSize: 12,
          fontWeight: bold ? 700 : 400,
          color: ink,
        }}
      >
        {program.label}
      </text>
      {program.detail === undefined ? null : (
        <text style={{ fontFamily: font, fontSize: 11, color: "#6E7C8C" }}>
          {program.detail}
        </text>
      )}
    </div>
  </div>
);

const Luna = () => (
  <div
    testId="start-menu"
    style={{
      ...column,
      width: 390,
      borderTopLeftRadius: 7,
      borderTopRightRadius: 7,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        ...row,
        gap: 10,
        height: 62,
        paddingLeft: 10,
        background: gradient(180, "#1C6DD8", "#0D4AB4"),
      }}
    >
      <div style={{ borderWidth: 2, borderColor: "#FFFFFF", borderRadius: 4 }}>
        <Avatar name={user.name} size="lg" />
      </div>
      <text
        style={{
          fontFamily: LUNA_TITLE,
          fontSize: 15,
          fontWeight: 700,
          color: "#FFFFFF",
        }}
      >
        {user.name}
      </text>
    </div>
    <div style={{ ...row, alignItems: "stretch", height: 330 }}>
      <div
        style={{
          ...column,
          width: 200,
          paddingTop: 6,
          backgroundColor: "#FFFFFF",
        }}
      >
        {Arr.map(pinned, (program) =>
          entry(program, LUNA_UI, "#000000", 30, true),
        )}
        <div
          style={{
            height: 1,
            marginLeft: 8,
            marginRight: 8,
            marginTop: 4,
            marginBottom: 4,
            backgroundColor: "#D5D0BE",
          }}
        />
        {Arr.map(recent, (program) => entry(program, LUNA_UI, "#000000", 24))}
        <div style={{ flexGrow: 1 }} />
        <div
          style={{
            ...row,
            justifyContent: "center",
            gap: 6,
            height: 30,
            borderTopWidth: 1,
            borderColor: "#D5D0BE",
          }}
        >
          <text
            style={{
              fontFamily: LUNA_UI,
              fontSize: 12,
              fontWeight: 700,
              color: "#000000",
            }}
          >
            All Programs
          </text>
          <div
            style={{
              ...row,
              justifyContent: "center",
              width: 16,
              height: 16,
              borderRadius: 3,
              backgroundColor: "#3B9C3B",
            }}
          >
            <Icon name="chevron-right" size={12} color="#FFFFFF" />
          </div>
        </div>
      </div>
      <div
        style={{
          ...column,
          flexGrow: 1,
          paddingTop: 6,
          borderLeftWidth: 1,
          borderColor: "#95BDEE",
          backgroundColor: "#D3E5FA",
        }}
      >
        {Arr.map(places, (program) =>
          entry(program, LUNA_UI, "#0A246A", 22, true),
        )}
      </div>
    </div>
    <div
      style={{
        ...row,
        justifyContent: "flex-end",
        gap: 14,
        height: 40,
        paddingRight: 12,
        background: gradient(180, "#1C6DD8", "#0D4AB4"),
      }}
    >
      {Arr.map(
        [
          ["Log Off", "#E3A82B", "log-out"],
          ["Turn Off Computer", "#D6533A", "x"],
        ] as const,
        ([label, tint, icon]) => (
          <div key={label} style={{ ...row, gap: 5 }}>
            <div
              style={{
                ...row,
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: 4,
                backgroundColor: tint,
              }}
            >
              <Icon name={icon} size={14} color="#FFFFFF" />
            </div>
            <text
              style={{ fontFamily: LUNA_UI, fontSize: 11, color: "#FFFFFF" }}
            >
              {label}
            </text>
          </div>
        ),
      )}
    </div>
  </div>
);

const Aero = () => (
  <div
    testId="start-menu"
    style={{
      ...row,
      alignItems: "stretch",
      width: 400,
      height: 470,
      padding: 8,
      gap: 8,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: "#1A2638CC",
      background: "#20324CD9",
    }}
  >
    <div
      style={{
        ...column,
        width: 236,
        paddingTop: 6,
        borderRadius: 4,
        backgroundColor: "#FFFFFF",
      }}
    >
      {Arr.map([...pinned, ...recent], (program) =>
        entry(program, "", "#1E1E1E", 28),
      )}
      <div style={{ flexGrow: 1 }} />
      <div
        style={{
          ...row,
          gap: 6,
          height: 26,
          margin: 8,
          paddingLeft: 8,
          borderRadius: 3,
          borderWidth: 1,
          borderColor: "#A9B8C9",
        }}
      >
        <text style={{ flexGrow: 1, fontSize: 11, color: "#7A8796" }}>
          Search programs and files
        </text>
        <Icon name="search" size={13} color="#4A6077" />
      </div>
    </div>
    <div style={{ ...column, flexGrow: 1, paddingTop: 10, gap: 4 }}>
      <div style={{ ...row, justifyContent: "center", paddingBottom: 6 }}>
        <div
          style={{ borderWidth: 2, borderColor: "#FFFFFFAA", borderRadius: 6 }}
        >
          <Avatar name={user.name} size="lg" />
        </div>
      </div>
      {Arr.map(places, (program) => (
        <text
          key={program.label}
          style={{
            fontSize: 12,
            color: "#FFFFFF",
            paddingLeft: 10,
            paddingTop: 5,
            paddingBottom: 5,
          }}
        >
          {program.label}
        </text>
      ))}
      <div style={{ flexGrow: 1 }} />
      <div
        style={{
          ...row,
          justifyContent: "center",
          height: 26,
          marginLeft: 10,
          marginRight: 10,
          borderRadius: 3,
          borderWidth: 1,
          borderColor: "#FFFFFF66",
          background: gradient(180, "#E79B88", "#B7341B"),
        }}
      >
        <text style={{ fontSize: 11, color: "#FFFFFF" }}>Shut down</text>
      </div>
    </div>
  </div>
);

export const StartMenu = ({ look }: { look: DesktopLook }) =>
  look === "luna" ? <Luna /> : <Aero />;
