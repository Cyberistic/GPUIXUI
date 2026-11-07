/** @jsxImportSource @gpuix/react */
import { Avatar } from "@gpuixui/components/avatar";
import { AvatarGroup } from "@gpuixui/components/avatar-group";
import { Badge } from "@gpuixui/components/badge";
import { Card } from "@gpuixui/components/card";
import { Knob } from "@gpuixui/components/knob";
import { Dialog, DialogContent, DialogTitle } from "@gpuixui/components/dialog";
import {
  Message,
  MessageContent,
  MessageHeader,
} from "@gpuixui/components/message";
import { Progress } from "@gpuixui/components/progress";
import { SegmentedControl } from "@gpuixui/components/segmented-control";
import { SearchInput } from "@gpuixui/components/search-input";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@gpuixui/components/sidebar";
import { Skeleton } from "@gpuixui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@gpuixui/components/tabs";
import { Table, TableBody, TableCell, TableRow } from "@gpuixui/data";
import { Select } from "@gpuixui/primitives";
import { Button } from "@gpuixui/primitives/button";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { ReactNode } from "react";
import {
  alpha,
  at,
  BG,
  center,
  col,
  Dot,
  FAINT,
  FxView,
  HAIR,
  H,
  MUTED,
  PointerAt,
  pressed,
  RawShader,
  REEL_THEME,
  Root,
  row,
  T,
  W,
} from "./kit.js";
import { ease, sp, track } from "./motion.js";
import {
  DISTORT,
  electric,
  FIRE_SHADER,
  FIRE_SIMULATION,
  firePlan,
  fluted,
  glow,
  lens,
  liquidMetal,
  mesh,
  MESH_PALETTES,
  plastic,
  pulse,
  shimmer,
  shockwave,
  sparkles,
} from "@gpuixui/fx/shader-layer";

const COLORS = [
  0xffffff, 0x4f8dff, 0x22d3ee, 0x7c5cff, 0x34d399, 0xffb547, 0xff5ca8,
  0xff4d4d, 0xff7a1a, 0xf1ece1, 0x2e3036, 0xe8552b, 0x3d6bff, 0x54b3fd,
] as const;
const hex = (i: number) => COLORS[i]!;
const noop = (): void => undefined;
const PAL: ReadonlyArray<readonly number[]> = [
  MESH_PALETTES.dusk!,
  MESH_PALETTES.lagoon!,
  MESH_PALETTES.orchid!,
  MESH_PALETTES.graphite!,
  [0x0d1b4c, 0x3d6bff, 0x9b5cff, 0x22d3ee, 0x101030],
  [0x2a0a12, 0xff4d4d, 0xffb547, 0x7a1640, 0xff7a1a],
  [0x062a24, 0x34d399, 0xd9f99d, 0x0f766e],
  [0x1a1033, 0xff5ca8, 0x7c5cff, 0xffd1e8, 0x2b1b5a],
];
const MeshBox = ({
  pal,
  speed,
  seed,
  drift,
  x,
  y,
  w,
  h,
  r,
  t,
}: {
  pal: number;
  speed: number;
  seed: number;
  drift: number;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  t: number;
}) => (
  <FxView
    fx={mesh({
      rect: { x, y, w, h },
      radius: r,
      time: t,
      colors: PAL[pal]!,
      speed,
      seed: seed + 1,
      drift,
    })}
  />
);

const TAP_FIRE = 0.95;
const WHO: Record<string, string> = {
  gon: "#34d399",
  killua: "#54b3fd",
  leorio: "#7c5cff",
};
const Msg = ({
  who,
  time,
  body,
}: {
  who: string;
  time: string;
  body: string;
}) => (
  <Message variant="assistant" author={who} timestamp={time}>
    <Avatar name={who} size="sm" color={WHO[who]} initials={false} />
    <MessageContent>
      <MessageHeader />
      <T s={body} size={13.5} color="#c9c9d0" />
    </MessageContent>
  </Message>
);
export const Fire = ({ t }: { t: number }): ReactNode => {
  const press = pressed(t, TAP_FIRE),
    blaze = ease(t, TAP_FIRE, 0.5);
  const card = { x: 220 + (W - 220 - 460) / 2, y: 250, w: 460, h: 220 };
  const plan = firePlan({
    rect: card,
    radius: 18,
    time: t,
    height: 64 + 70 * blaze,
    maxHeight: 134,
    intensity: 0.18 + 1.25 * blaze,
    smoke: 0.6,
    scale: 26,
    embers: 24,
  });
  const shrink = 0.07 * press;
  return (
    <Root fill={BG}>
      <div style={at(0, 0, 220, H)}>
        <SidebarProvider width={220}>
          <Sidebar>
            <SidebarHeader>
              <div
                style={{
                  ...row(10),
                  paddingLeft: 12,
                  paddingBottom: 8,
                  paddingTop: 14,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: "#ff7a1a",
                  }}
                />
                <T s="Whale Island" size={14} weight={600} />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {["general", "releases", "incidents", "design", "random"].map(
                  (name) => (
                    <SidebarMenuItem key={name}>
                      <SidebarMenuButton
                        label={`# ${name}`}
                        isActive={name === "releases"}
                      />
                    </SidebarMenuItem>
                  ),
                )}
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      </div>
      <div style={{ ...at(260, 40, W - 300), ...col(18) }}>
        <Msg
          who="gon"
          time="4:51 PM"
          body="all green on dev, release notes are in"
        />
        <Msg
          who="killua"
          time="4:55 PM"
          body="it's friday. it's 4:55. are we sure"
        />
        <Msg
          who="leorio"
          time="4:57 PM"
          body="gpui renders it at 120 Hz, what could go wrong"
        />
      </div>
      <FxView
        fx={glow({
          rect: card,
          radius: 18,
          time: t,
          color: hex(8),
          intensity: 0.25 + 0.9 * blaze,
          size: 30,
          style: 0,
        })}
      />
      <RawShader
        source={FIRE_SHADER}
        simulationSource={FIRE_SIMULATION}
        simulationGrid={plan.grid}
        simulationUniform={plan.uniform}
        time={t}
        params={plan.params}
        style={at(plan.box.x, plan.box.y, plan.box.w, plan.box.h)}
      />
      <Card
        variant="elevated"
        style={{
          ...at(card.x, card.y, card.w, card.h),
          ...col(10),
          padding: 24,
          borderRadius: 18,
          backgroundColor: "#1c1b1f",
        }}
      >
        <div style={{ ...row(10), justifyContent: "space-between" }}>
          <T s="Release" size={12} weight={600} color="#ff9a5a" />
          <T s="v2.0.0" size={12} weight={500} mono color={MUTED} />
        </div>
        <T s="Ship v2.0 to production" size={22} weight={600} />
        <T s="Friday · 4:58 PM · 214 files changed" size={13.5} color={MUTED} />
        <div style={{ flexGrow: 1 }} />
        <div style={{ ...row(10), justifyContent: "flex-end" }}>
          <Button
            variant="secondary"
            style={{ height: 38, borderRadius: 10, borderWidth: 0 }}
          >
            Not today
          </Button>
          <Button
            variant="primary"
            style={{
              height: 38 * (1 - shrink),
              borderRadius: 10,
              backgroundColor: "#ff5a1f",
              color: "#ffffff",
            }}
          >
            {t >= TAP_FIRE ? "Shipping…" : "Ship it"}
          </Button>
        </div>
      </Card>
      <PointerAt
        t={t}
        start={[700, 520]}
        path={[[0.25, card.x + 400, card.y + 182]]}
        taps={[TAP_FIRE]}
      />
    </Root>
  );
};

const HOVER_P = 0.55,
  TAP_P = 1.25;
const Feature = ({ s, on }: { s: string; on: boolean }) => (
  <div style={{ ...row(10), height: 17 }}>
    <div
      style={{
        ...center,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: on ? "#54b3fd2e" : "#ffffff0f",
      }}
    >
      <Dot color={on ? "#54b3fd" : "#5f5f68"} size={6} />
    </div>
    <T s={s} size={13.5} color="#c9c9d0" />
  </div>
);
const Plan = ({
  x,
  y,
  name,
  price,
  blurb,
  feats,
  cta,
  pro,
  press,
}: {
  x: number;
  y: number;
  name: string;
  price: string;
  blurb: string;
  feats: readonly string[];
  cta: string;
  pro?: boolean;
  press: number;
}) => (
  <Card
    style={{
      ...at(x, y, 268, 318),
      ...col(8),
      padding: 24,
      borderRadius: 20,
      backgroundColor: pro ? "#16181f" : "#121215",
      borderColor: pro ? "#54b3fd59" : HAIR,
    }}
  >
    <div style={{ ...row(), justifyContent: "space-between" }}>
      <T s={name} size={15} weight={600} />
      {pro ? (
        <Badge variant="info" size="sm">
          Popular
        </Badge>
      ) : null}
    </div>
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 4,
        marginTop: 6,
      }}
    >
      <T s={price} size={40} weight={600} />
      <T
        s="/mo"
        size={14}
        weight={500}
        color={MUTED}
        style={{ marginBottom: 8 }}
      />
    </div>
    <T s={blurb} size={13} color={MUTED} style={{ marginBottom: 10 }} />
    {feats.map((f, i) => (
      <Feature key={f} s={f} on={pro === true || i < 2} />
    ))}
    <div style={{ flexGrow: 1 }} />
    <Button
      variant={pro ? "primary" : "secondary"}
      style={{
        width: "100%",
        height: 40 * (1 - 0.06 * press),
        borderRadius: 11,
        borderWidth: 0,
        ...(pro ? { backgroundColor: "#eef4ff", color: "#0e1320" } : {}),
      }}
    >
      {cta}
    </Button>
  </Card>
);
export const Pricing = ({ t }: { t: number }): ReactNode => {
  const hover = ease(t, HOVER_P, 0.35),
    hit = ease(t, TAP_P, 0.08),
    press = pressed(t, TAP_P);
  const x0 = (W - 3 * 268 - 2 * 22) / 2,
    y0 = 176,
    px = x0 + 268 + 22;
  const lift = track(t, 0, [[HOVER_P, 1, sp(0.45, 0.3)]]);
  const py = y0 - 8 * lift;
  const rect = { x: px, y: py, w: 268, h: 318 };
  return (
    <Root fill="#0a0a0c">
      <div style={{ ...at(0, 54, W), ...col(10), alignItems: "center" }}>
        <T s="LICENSE" size={12} weight={600} color="#54b3fd" />
        <T s="Plans for every Hunter" size={32} weight={600} />
        <T
          s="Start free. Upgrade when your party needs more."
          size={15}
          color={MUTED}
        />
      </div>
      <Plan
        x={x0}
        y={y0}
        name="Rookie"
        price="$0"
        blurb="For Whale Island and side quests."
        feats={[
          "One project",
          "Preview deploys",
          "Community support",
          "Analytics",
        ]}
        cta="Get started"
        press={0}
      />
      <Plan
        x={px + 290}
        y={y0}
        name="Triple Star"
        price="$60"
        blurb="For parties exploring together."
        feats={[
          "Unlimited projects",
          "SSO and audit log",
          "Analytics",
          "Priority support",
        ]}
        cta="Contact us"
        press={0}
      />
      <FxView
        fx={glow({
          rect,
          radius: 20,
          time: t,
          style: 1,
          color: hex(13),
          intensity: 0.35 + 0.5 * hover + 0.8 * hit,
          size: 22,
        })}
      />
      <Plan
        x={px}
        y={py}
        name="Licensed"
        price="$20"
        blurb="For apps people use every day."
        feats={[
          "Unlimited projects",
          "Custom domains",
          "Team analytics",
          "Priority builds",
        ]}
        cta="Upgrade"
        pro
        press={press}
      />
      <FxView
        fx={electric({
          rect,
          radius: 20,
          time: t,
          charged: t < TAP_P,
          color: hex(13),
          intensity: 0.5 + 0.7 * hover + 0.4 * hit,
          amplitude: t >= TAP_P ? 6 : undefined,
        })}
      />
      <FxView
        fx={sparkles({
          rect: { x: px + 24, y: py + 254, w: 220, h: 40 },
          radius: 11,
          time: t,
          burst: TAP_P + 0.05,
          count: 14,
          size: 10,
          color: hex(13),
        })}
      />
      <PointerAt
        t={t}
        start={[960, 560]}
        path={[
          [0.12, px + 180, py + 140],
          [0.75, px + 140, y0 + 272],
        ]}
        taps={[TAP_P]}
      />
    </Root>
  );
};

const PROMPT = "make the settings page feel alive",
  SEND = 1.55;
const Chip = ({ s, a }: { s: string; a: number }) => (
  <Button
    variant="ghost"
    style={{
      height: 32,
      paddingLeft: 14,
      paddingRight: 14,
      borderRadius: 16,
      backgroundColor: alpha("#ffffff", 0.05 * a),
      borderWidth: 1,
      borderColor: alpha("#ffffff", 0.08 * a),
    }}
  >
    <T s={s} size={13} weight={500} color={MUTED} a={a} />
  </Button>
);
export const Ask = ({ t }: { t: number }): ReactNode => {
  const n = Math.min(PROMPT.length, Math.max(0, Math.trunc((t - 0.3) * 30)));
  const sent = t >= SEND,
    press = pressed(t, SEND);
  const flare = sent ? 1.6 * Math.exp(-(t - SEND) * 2.2) : 0;
  const drop = track(t, 0, [[SEND + 0.08, 1, sp(0.6, 0.12)]]);
  const cw = 640,
    ch = 128,
    cx = (W - cw) / 2,
    cy = 214 + 168 * drop;
  const caret = Math.trunc(t * 2) % 2 === 0 || n < PROMPT.length;
  const greet = 1 - ease(t, SEND, 0.25);
  const k = track(t, 0, [[SEND + 0.12, 1, sp(0.45, 0.25)]]),
    r = ease(t, SEND + 0.4, 0.3);
  const rect = { x: cx, y: cy, w: cw, h: ch };
  return (
    <Root fill="#09090b">
      <div
        style={{
          ...at(0, 150 - 20 * (1 - greet), W),
          ...col(),
          alignItems: "center",
        }}
      >
        <T s="What should we build?" size={30} weight={600} a={greet} />
      </div>
      <div
        style={{
          ...at(0, 214 + ch + 22, W),
          ...row(10),
          justifyContent: "center",
        }}
      >
        <Chip s="A springy toggle" a={greet} />
        <Chip s="Liquid metal button" a={greet} />
        <Chip s="Glass sidebar" a={greet} />
      </div>
      <FxView
        fx={glow({
          rect,
          radius: 24,
          time: t,
          style: 2,
          color: hex(3),
          intensity: 1 + flare,
          size: 22,
          auraSpeed: 0.35,
        })}
      />
      <Card
        style={{
          ...at(cx, cy, cw, ch),
          ...col(),
          padding: 20,
          borderRadius: 24,
          backgroundColor: "#131317",
          borderColor: "#ffffff1a",
        }}
      >
        <div style={row(1)}>
          {n === 0 && !sent ? (
            <T s="Ask anything…" size={17} color={FAINT} />
          ) : (
            <T s={sent ? "" : PROMPT.slice(0, n)} size={17} />
          )}
          <div
            style={{
              width: 2,
              height: 22,
              borderRadius: 1,
              backgroundColor: caret ? "#9fd4ff" : "#9fd4ff00",
            }}
          />
        </div>
        <div style={{ flexGrow: 1 }} />
        <div style={row(8)}>
          <Button
            variant="ghost"
            size="sm"
            style={{
              height: 30,
              paddingLeft: 12,
              paddingRight: 12,
              borderRadius: 15,
              backgroundColor: "#ffffff0f",
            }}
          >
            <div style={row(6)}>
              <Dot color="#54b3fd" size={6} />
              <T s="Build" size={12.5} weight={500} color="#c9c9d0" />
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={{
              height: 30,
              paddingLeft: 12,
              paddingRight: 12,
              borderRadius: 15,
              backgroundColor: "#ffffff0f",
            }}
          >
            <T s="opus" size={12.5} weight={500} color="#c9c9d0" />
          </Button>
          <div style={{ flexGrow: 1 }} />
          <Button
            variant="primary"
            label="Send"
            style={{
              width: 36 * (1 - 0.12 * press),
              height: 36 * (1 - 0.12 * press),
              minWidth: 0,
              paddingLeft: 0,
              paddingRight: 0,
              borderRadius: 18,
              backgroundColor: n > 0 ? "#f4f6fb" : "#ffffff26",
            }}
          >
            <T s="↑" size={18} weight={600} color={n > 0 ? "#0b0b0d" : MUTED} />
          </Button>
        </div>
      </Card>
      {sent ? (
        <>
          <div
            style={{
              ...at(0, 58 + 14 * (1 - k), W - 160),
              ...row(),
              justifyContent: "flex-end",
            }}
          >
            <Card
              variant="plain"
              style={{
                ...center,
                height: 42,
                paddingLeft: 16,
                paddingRight: 16,
                borderRadius: 16,
                backgroundColor: alpha("#1f2633", Math.min(1, k)),
              }}
            >
              <T s={PROMPT} size={15} color="#e6ecf7" a={Math.min(1, k)} />
            </Card>
          </div>
          <div style={{ ...at(160, 132, 640), ...col(12) }}>
            <div style={row(10)}>
              <div style={{ position: "relative", width: 10, height: 10 }}>
                <FxView
                  fx={pulse({
                    rect: { x: 0, y: 0, w: 10, h: 10 },
                    radius: 5,
                    time: t,
                    style: 1,
                    color: hex(13),
                    period: 1.2,
                    reach: 10,
                    opacity: r,
                  })}
                />
                <Dot
                  color="#54b3fd"
                  size={10 * r}
                  style={at(5 - 5 * r, 5 - 5 * r)}
                />
              </div>
              <T s="Thinking" size={14} weight={500} color={MUTED} a={r} />
            </div>
            {[600, 540, 580, 360].map((w, i) => {
              const k2 = ease(t, SEND + 0.55 + i * 0.12, 0.25),
                ww = w * (0.6 + 0.4 * k2);
              return (
                <div
                  key={w}
                  style={{ position: "relative", width: ww, height: 12 }}
                >
                  <Skeleton
                    animate={false}
                    width={ww}
                    height={12}
                    radius="full"
                    style={{ backgroundColor: alpha("#ffffff", 0.07 * k2) }}
                  />
                  <FxView
                    fx={shimmer({
                      rect: { x: 0, y: 0, w: ww, h: 12 },
                      radius: 6,
                      time: t,
                      intensity: 0.35 * k2,
                      period: 1.3,
                      band: 60,
                    })}
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : null}
      <PointerAt
        t={t}
        start={[760, 470]}
        path={[
          [0.9, cx + cw - 38, 214 + ch - 38],
          [SEND + 0.25, 860, 520],
        ]}
        taps={[SEND]}
      />
    </Root>
  );
};

const TAPS = [
  [0.5, 2, 1],
  [1.1667, 0, 2],
  [1.8333, 4, 0],
] as const;
export const Library = ({ t }: { t: number }): ReactNode => {
  const cols = 5,
    rows = 3,
    gx = 28,
    gy = 92,
    gap = 10;
  const tw = (W - 2 * gx - gap * (cols - 1)) / cols,
    th = (H - gy - 24 - gap * (rows - 1)) / rows;
  const sel = track(t, 3, [[0.25, 2, sp(0.45, 0.25)]]);
  const seg = ["Years", "Months", "Days", "All Cards"];
  const centre = (c: number, r: number) =>
    [gx + c * (tw + gap) + tw / 2, gy + r * (th + gap) + th / 2] as const;
  const full = { x: 0, y: 0, w: W, h: H };
  return (
    <Root fill="#08080a">
      <div
        style={{
          ...at(gx, 28, W - 2 * gx),
          ...row(),
          justifyContent: "space-between",
        }}
      >
        <div style={col(3)}>
          <T s="Book" size={24} weight={600} />
          <T s="100 designated slots · 3 binders" size={13} color={MUTED} />
        </div>
        <SegmentedControl
          style={{ width: 376 }}
          size="md"
          label="Range"
          onValueChange={noop}
          value={seg[Math.round(sel)]!}
          items={seg.map((name) => ({ value: name, label: name }))}
        />
      </div>
      {Array.from({ length: rows * cols }, (_, i) => {
        const c = i % cols,
          r = Math.trunc(i / cols);
        const press = Math.max(
          0,
          ...TAPS.filter(([, x, y]) => x === c && y === r).map(([tp]) =>
            pressed(t, tp),
          ),
        );
        const s = 1 - 0.06 * press,
          w = tw * s,
          h = th * s;
        return (
          <MeshBox
            key={i}
            pal={i % 8}
            speed={0.5}
            seed={i}
            drift={0.25}
            x={gx + c * (tw + gap) + (tw - w) / 2}
            y={gy + r * (th + gap) + (th - h) / 2}
            w={w}
            h={h}
            r={12}
            t={t}
          />
        );
      })}
      {TAPS.map(([tp, c, r]) => (
        <FxView
          key={tp}
          fx={shockwave({
            rect: full,
            time: t,
            at: centre(c, r),
            t0: tp + 0.03,
            reach: 1100,
            width: 90,
            amount: 22,
            chroma: 0.6,
            duration: 1.1,
          })}
        />
      ))}
      <PointerAt
        t={t}
        start={[700, 500]}
        path={TAPS.map(([tp, c, r]) => [tp - 0.42, ...centre(c, r)] as const)}
        taps={TAPS.map(([tp]) => tp)}
      />
    </Root>
  );
};

const EIGHTH = 60 / 90 / 2;
const KEYS: ReadonlyArray<readonly [number, string]> = [
  [10, "A"],
  [9, "B"],
  [9, "C"],
  [9, "D"],
  [10, "E"],
  [12, "F"],
  [99, "G"],
  [10, "H"],
  [11, "KICK"],
  [10, "I"],
  [9, "J"],
  [10, "K"],
  [12, "SNR"],
  [9, "L"],
  [99, "M"],
  [11, "FX"],
];
const LIGHT = [0, 9, 9, 9, 0, 12, 0, 0, 11, 0, 9, 0, 12, 9, 0, 11];
const hits = (n: number) => {
  const m = ((n % 16) + 16) % 16,
    v: number[] = [];
  if ([0, 3, 5, 8, 11, 13].includes(m)) v.push(8);
  if (m % 4 === 2) v.push(12);
  v.push(m % 2 === 0 ? 2 : 1);
  if (m === 7 || m === 15) v.push(6);
  if (m === 14) v.push(14);
  if (m === 10) v.push(5);
  if (m === 6) v.push(13);
  return v;
};
const pressOf = (t: number, key: number) => {
  const now = Math.floor(t / EIGHTH);
  let p = 0;
  for (let n = now - 3; n <= now; n++)
    if (n >= 0 && hits(n).includes(key))
      p = Math.max(p, pressed(t, n * EIGHTH));
  return p;
};
export const Keys = ({ t }: { t: number }): ReactNode => {
  const bw = 864,
    bh = 384,
    bx = (W - bw) / 2,
    by = (H - bh) / 2 + 4,
    key = 86,
    gap = 12,
    kx0 = bx + (bw - 8 * key - 7 * gap) / 2,
    ky0 = by + 152;
  return (
    <Root fill="#101012">
      <Card
        style={{
          ...at(bx, by, bw, bh),
          padding: 0,
          borderRadius: 30,
          backgroundColor: "#1c1b20",
          borderWidth: 1,
          borderColor: "#ffffff14",
          boxShadow: {
            offsetX: 0,
            offsetY: 30,
            blurRadius: 70,
            spreadRadius: 0,
            color: "#00000099",
          },
        }}
      />
      <Card
        style={{
          ...at(kx0, by + 38, 230, 70),
          ...col(4),
          justifyContent: "center",
          padding: 0,
          paddingLeft: 16,
          paddingRight: 16,
          borderRadius: 12,
          backgroundColor: "#050506",
          borderWidth: 1,
          borderColor: "#ffffff0d",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <T s="90" size={30} mono weight={500} color="#5df2a8" />
          <T
            s="BPM"
            size={13}
            mono
            weight={500}
            color="#5df2a8"
            style={{ marginBottom: 5 }}
          />
        </div>
        <T
          s={`pattern A · bar ${12 + Math.trunc(t / (EIGHTH * 8))}`}
          size={11}
          mono
          weight={500}
          color="#3c9b6c"
        />
      </Card>
      <div
        style={{
          ...at(bx + bw - (kx0 - bx) - 120, by + 44, 120),
          ...col(8),
          alignItems: "flex-end",
        }}
      >
        <T s="PAD-16" size={13} weight={600} color="#8a8a93" />
        <div style={row(6)}>
          <Dot color="#ff4d4d" size={7} />
          <T s="REC" size={11} weight={600} color="#8a8a93" />
        </div>
      </div>
      {[0, 1, 2, 3].map((i) => {
        const kx = kx0 + 280 + i * 70,
          ky = by + 46,
          turn =
            50 + (Math.sin(t * 0.9 + i * 1.3) * 2.2 * 100) / (1.5 * Math.PI);
        return (
          <div key={i}>
            <FxView
              fx={plastic({
                rect: { x: kx, y: ky, w: 54, h: 54 },
                radius: 27,
                time: t,
                color: hex(10),
                roughness: 0.35,
                dome: 0.7,
                bevel: 10,
              })}
            />
            <Knob
              label={`Macro ${i + 1}`}
              size={54}
              step={0.01}
              value={turn}
              indicatorColor="#f1ece1"
              style={{ ...at(kx, ky), backgroundColor: "transparent" }}
            />
          </div>
        );
      })}
      {KEYS.map(([c, label], i) => {
        const cx = i % 8,
          cy = Math.trunc(i / 8),
          p = pressOf(t, i);
        const x = kx0 + cx * (key + gap),
          base = ky0 + cy * (key + gap),
          y = base + 3 * p,
          size = key * (1 - 0.04 * p),
          off = (key - size) / 2;
        const rect = { x: x + off, y: y + off, w: size, h: size };
        const dark = c === 10;
        return (
          <div key={i}>
            <div
              style={{
                ...at(x, base + 5, key, key),
                borderRadius: 14,
                backgroundColor: "#00000073",
              }}
            />
            {p > 0.002 ? (
              <FxView
                fx={glow({
                  rect,
                  radius: 14,
                  time: t,
                  color: hex(LIGHT[i]!),
                  intensity: 1.4 * p,
                  size: 16,
                })}
              />
            ) : null}
            <FxView
              fx={
                c === 99
                  ? liquidMetal({
                      rect,
                      radius: 14,
                      time: t,
                      flow: 0.6 * 1.4,
                      anchor: 1,
                    })
                  : plastic({
                      rect,
                      radius: 14,
                      time: t,
                      color: hex(c),
                      roughness: 0.22,
                      dome: 0.35,
                      bevel: 7,
                    })
              }
            />
            <Button
              variant="ghost"
              label={label}
              style={{
                ...at(rect.x, rect.y, rect.w, rect.h),
                minWidth: 0,
                padding: 0,
                borderWidth: 0,
                borderRadius: 14,
                backgroundColor: "transparent",
              }}
            >
              <T
                s={label}
                size={11.5}
                weight={600}
                color={dark ? "#b9b9c2" : "#2a2a2e"}
                a={0.85}
                style={at(10, 8)}
              />
            </Button>
          </div>
        );
      })}
    </Root>
  );
};

const STORIES: ReadonlyArray<readonly [string, string, number]> = [
  ["Whale Island after rain", "Photo essay · 12 min", 1],
  ["Inside the Heavens Arena", "Sport · 6 min", 7],
  ["York New night markets", "Travel · 9 min", 5],
  ["The boat to Zaban", "Photo essay · 8 min", 4],
  ["Paper, cards and Greed", "Craft · 5 min", 2],
  ["Cold coast of Meteor", "Travel · 11 min", 6],
];
const BARE_CARD = {
  padding: 0,
  borderWidth: 0,
  backgroundColor: "transparent",
};
const Story = ({
  title,
  meta,
  pal,
  seed,
  x,
  y,
  w,
  h,
  t,
}: {
  title: string;
  meta: string;
  pal: number;
  seed: number;
  x: number;
  y: number;
  w: number;
  h: number;
  t: number;
}) => (
  <Card style={{ ...at(x, y, w, h + 60), ...BARE_CARD }}>
    <MeshBox
      pal={pal}
      speed={0.5}
      seed={seed}
      drift={0.25}
      x={0}
      y={0}
      w={w}
      h={h}
      r={18}
      t={t}
    />
    <T s={title} size={17} weight={600} style={at(0, h + 10)} />
    <T s={meta} size={13} color={MUTED} style={at(0, h + 36)} />
  </Card>
);
const BAR_BUTTON = {
  minWidth: 0,
  padding: 0,
  borderWidth: 0,
  backgroundColor: "transparent",
};
export const Today = ({ t }: { t: number }): ReactNode => {
  const scroll = 50 * t + track(t, 0, [[0.9, 260, sp(1.1, 0)]]);
  const bw = 400,
    bh = 64,
    bx = (W - bw) / 2,
    by = H - bh - 26,
    slot = bw / 4;
  const sel = track(t + 0.3, 0, [
    [0.55, 2, sp(0.7, 0.28)],
    [1.75, 1, sp(0.6, 0.3)],
  ]);
  const sx = bx + slot * (sel + 0.5);
  const tabs = ["Today", "Search", "Saved", "Profile"];
  const y0 = 6 - scroll,
    heroY = y0 + 78,
    w3 = (W - 80 - 40) / 3;
  return (
    <Root fill={BG}>
      <div style={{ ...at(40, y0), ...col(4) }}>
        <T s="Today" size={30} weight={600} />
        <T s="Friday, November 6" size={14} weight={500} color={MUTED} />
      </div>
      <Story
        title="Nen, light and the long weekend"
        meta="Featured · 14 min"
        pal={0}
        seed={1}
        x={40}
        y={heroY}
        w={W - 80}
        h={300}
        t={t}
      />
      {STORIES.map(([title, meta, pal], i) => {
        const c = i % 3,
          r = Math.trunc(i / 3),
          x = 40 + c * (w3 + 20),
          y = heroY + 382 + r * (180 + 75);
        return (
          <Story
            key={title}
            title={title}
            meta={meta}
            pal={pal}
            seed={10 + c + pal}
            x={x}
            y={y}
            w={w3}
            h={180}
            t={t}
          />
        );
      })}
      <FxView
        fx={lens({
          rect: { x: bx, y: by, w: bw, h: bh },
          radius: bh / 2,
          time: t,
          second: { x: sx, y: by + bh / 2, r: 42 },
          frost: 0.2,
          bevel: 16,
          depth: 20,
          dispersion: 0.18,
          magnification: 1.06,
          unionK: 26,
        })}
      />
      <FxView
        fx={lens({
          rect: { x: bx + bw + 16, y: by, w: bh, h: bh },
          radius: bh / 2,
          time: t,
          frost: 0.25,
          bevel: 16,
          depth: 20,
          dispersion: 0.18,
          magnification: 1.06,
        })}
      />
      {tabs.map((name, i) => (
        <Button
          key={name}
          variant="ghost"
          label={name}
          style={{ ...at(bx + slot * i, by, slot, bh), ...BAR_BUTTON }}
        >
          <T
            s={name}
            size={13.5}
            weight={600}
            color={Math.abs(sel - i) < 0.5 ? "#ffffff" : "#d8d8de"}
          />
        </Button>
      ))}
      <Button
        variant="ghost"
        label="New"
        style={{ ...at(bx + bw + 16, by, bh, bh), ...BAR_BUTTON }}
      >
        <T s="+" size={26} color="#ffffff" />
      </Button>
    </Root>
  );
};

const GLASS_THEME = {
  ...REEL_THEME,
  colors: { ...REEL_THEME.colors, muted: "#ffffff40", primary: "#ffffff" },
};
const QUEUE: ReadonlyArray<readonly [string, string, string, number]> = [
  ["Water Divination 101", "Wing & Zushi", "41:12", 7],
  ["Why Hisoka Waits", "Heavens Arena Talk", "58:02", 1],
  ["Gyo, In Theory", "Nen Basics", "32:57", 5],
  ["Speedrunning Greed Island", "Card Talk", "1:03:18", 4],
  ["The Zoldyck Budget", "Family Business", "47:06", 6],
];
export const NowPlaying = ({ t }: { t: number }): ReactNode => {
  const x = track(t, W + 10, [[0.35, 548, sp(0.95, 0.12)]]),
    gw = W - 548,
    head = ease(t, 0.95, 0.4),
    progress = 0.38 + 0.02 * t;
  return (
    <Root fill="#120a1e">
      <MeshBox
        pal={7}
        speed={0.55}
        seed={3}
        drift={0.22}
        x={0}
        y={0}
        w={W}
        h={H}
        r={0}
        t={t}
      />
      <div
        style={{
          ...at(40, 400, W - 40, 80),
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 4,
        }}
      >
        {Array.from({ length: 112 }, (_, i) => {
          const h =
            10 +
            34 *
              (0.5 + 0.5 * Math.sin(i * 0.37 + t * 5.1)) *
              (0.55 + 0.45 * Math.abs(Math.sin(i * 0.11 - t * 2.3)));
          return (
            <div
              key={i}
              style={{
                width: 4,
                height: h,
                borderRadius: 2,
                flexShrink: 0,
                backgroundColor: alpha("#ffffff", i < 44 ? 0.85 : 0.5),
              }}
            />
          );
        })}
      </div>
      <div style={{ ...at(48, 120), ...col(6) }}>
        <T s="NOW PLAYING" size={12} weight={600} color="#ffffff" a={0.75} />
        <T
          s="Nen Radio"
          size={128}
          weight={600}
          color="#ffffff"
          style={{ whiteSpace: "nowrap" }}
        />
        <T
          s="Episode 148 · The Chimera Ant Debrief"
          size={20}
          weight={500}
          color="#ffffff"
          a={0.8}
        />
      </div>
      <div style={{ ...at(48, 496, 470), ...row(12) }}>
        <T s="12:42" size={12} mono weight={500} color="#ffffff" />
        <div style={{ width: 380 }}>
          <ThemeProvider theme={GLASS_THEME}>
            <Progress value={progress * 100} />
          </ThemeProvider>
        </div>
        <T s="48:58" size={12} mono weight={500} color="#ffffff" />
      </div>
      {x < W ? (
        <FxView
          fx={fluted({
            rect: { x, y: 0, w: gw + 10, h: H },
            time: t,
            rib: 18,
            refraction: 16,
            frost: 0.12,
            dispersion: 0.3,
          })}
        />
      ) : null}
      <div style={{ ...at(x, 0, 1, H), backgroundColor: "#ffffff59" }} />
      <div
        style={{
          ...at(x + 34, 54 + 10 * (1 - head), gw - 68),
          ...row(),
          justifyContent: "space-between",
        }}
      >
        <T s="Up next" size={22} weight={600} color="#ffffff" a={head} />
        <T
          s="Auto-play"
          size={13}
          weight={500}
          color="#ffffff"
          a={0.7 * head}
        />
      </div>
      {QUEUE.map(([name, show, dur, pal], i) => {
        const k = track(t, 0, [[1.05 + i * 0.07, 1, sp(0.5, 0.2)]]),
          a = Math.min(1, Math.max(0, k)),
          size = 48 * a,
          y = 95 + i * 72;
        return (
          <div
            key={name}
            style={{ ...at(x + 34 + 24 * (1 - k), y, gw - 68, 68), ...row(14) }}
          >
            <div
              style={{
                position: "relative",
                width: size,
                height: size,
                flexShrink: 0,
              }}
            >
              {a > 0.01 ? (
                <MeshBox
                  pal={pal}
                  speed={0.4}
                  seed={i + 5}
                  drift={0}
                  x={0}
                  y={0}
                  w={size}
                  h={size}
                  r={10}
                  t={t}
                />
              ) : null}
            </div>
            <div style={{ ...col(4), flexGrow: 1 }}>
              <T s={name} size={15} weight={600} color="#ffffff" a={a} />
              <T s={show} size={13} color="#ffffff" a={0.7 * a} />
            </div>
            <T
              s={dur}
              size={12}
              mono
              weight={500}
              color="#ffffff"
              a={0.8 * a}
            />
          </div>
        );
      })}
    </Root>
  );
};

const TAP_D = 0.7,
  CONFIRM = 1.6,
  DISMISS = 2.3,
  INSERT = 2.4,
  READY = 3.4;
const ROWS: ReadonlyArray<readonly [string, string, string, string, string]> = [
  [
    "film: the opening burns from a moving front",
    "f6d096b",
    "38s",
    "12m",
    "#7c5cff",
  ],
  [
    "native: paint_shader keeps state between frames",
    "4112cac",
    "41s",
    "1h",
    "#ff7a1a",
  ],
  ["fx: rune's fire runs on gpui", "bac9e90", "40s", "2h", "#34d399"],
  ["tokens: paste any tweakcn theme", "c83aa06", "44s", "3h", "#54b3fd"],
  [
    "fx: frosted glass reads a blurred backdrop",
    "9e1d4b2",
    "39s",
    "5h",
    "#ff5ca8",
  ],
];
const Status = ({
  label,
  color,
  pulsing,
  t,
}: {
  label: string;
  color: string;
  pulsing?: number;
  t: number;
}) => (
  <div style={row(9)}>
    <div style={{ position: "relative", width: 8, height: 8 }}>
      {pulsing === undefined ? null : (
        <FxView
          fx={pulse({
            rect: { x: 0, y: 0, w: 8, h: 8 },
            radius: 4,
            time: t,
            style: 1,
            color: hex(pulsing),
            period: 1.2,
            reach: 9,
          })}
        />
      )}
      <Dot color={color} size={8} style={at(0, 0)} />
    </div>
    <T s={label} size={13} weight={500} />
  </div>
);
const ListRow = ({
  msg,
  sha,
  dur,
  ago,
  who,
  status,
  extra,
}: {
  msg: string;
  sha: string;
  dur: string;
  ago: string;
  who: string;
  status: ReactNode;
  extra?: ReactNode;
}) => (
  <TableRow style={{ height: 62, flexShrink: 0 }}>
    <TableCell width={118}>{status}</TableCell>
    <TableCell>
      <div style={col(5)}>
        <T s={msg} size={13.5} weight={500} />
        <div style={row(8)}>
          <Badge variant="neutral" size="sm">
            dev
          </Badge>
          <T s={sha} size={11} mono weight={500} color={FAINT} />
        </div>
        {extra}
      </div>
    </TableCell>
    <TableCell width={60}>
      <T s={dur} size={13} color={MUTED} />
    </TableCell>
    <TableCell width={54}>
      <T s={ago} size={13} color={MUTED} />
    </TableCell>
    <TableCell width={48}>
      <Avatar name={msg} size="sm" color={who} initials={false} />
    </TableCell>
  </TableRow>
);
const SHEET_Y = 158;
const DeployPointer = ({ t }: { t: number }) => (
  <PointerAt
    t={t}
    start={[560, 420]}
    path={[
      [0.12, 861, 33],
      [1, 500, 333],
    ]}
    taps={[TAP_D, CONFIRM]}
  />
);
const ThemedTable = ({
  height,
  children,
}: {
  height: number;
  children: ReactNode;
}) => (
  <Table>
    <TableBody height={height}>{children}</TableBody>
  </Table>
);
const Backdrop = ({ amount }: { amount: number }) =>
  amount <= 0.002 ? null : (
    <FxView
      fx={{
        source:
          DISTORT.replace(
            "fn shade(p: vec2f) -> vec4f {",
            "fn shade_unused(p: vec2f) -> vec4f {",
          ) + BLUR,
        box: { x: 0, y: 0, w: W, h: H },
        time: 0,
        readsBackdrop: true,
        params: [amount, 0.68 * amount],
      }}
    />
  );
const BLUR = `
fn shade(p: vec2f) -> vec4f {
  let radius = frame.params[0].x * 14.0;
  var acc = vec3f(0.0);
  for (var k = 0u; k < 64u; k++) {
    let f = (f32(k) + 0.5) / 64.0; let a = f32(k) * 2.39996 + fract(52.9829189 * fract(dot(floor(p * frame.scale), vec2f(0.06711056, 0.00583715)))) * 6.2831853;
    acc += backdrop_at(p + vec2f(cos(a), sin(a)) * sqrt(f) * radius).rgb;
  }
  return vec4f(acc / 64.0 * (1.0 - frame.params[0].y * 0.6), 1.0);
}`;
export const Deploy = ({ t }: { t: number }): ReactNode => {
  const hover = track(t, 0, [[0.5, 1, sp(0.35, 0.3)]]),
    press = pressed(t, TAP_D);
  const scale = 1 + 0.05 * hover - 0.08 * press,
    flow = 1 + 1.2 * (t > TAP_D ? Math.exp(-(t - TAP_D) * 1.5) : 0);
  const grow = track(t, 0, [[INSERT, 1, sp(0.5, 0.18)]]),
    ready = t >= READY;
  const b = { w: 132 * scale, h: 40 * scale },
    bx = 960 - 24 - 66 - b.w / 2,
    by = 32 - b.h / 2;
  const progress = ease(t, INSERT + 0.1, READY - INSERT - 0.15),
    fade = 1 - ease(t, READY, 0.3);
  const dim = ease(t, TAP_D + 0.05, 0.3) * (1 - ease(t, DISMISS, 0.3));
  const sheet = t >= TAP_D + 0.05 && t < DISMISS,
    press2 = pressed(t, CONFIRM),
    flow2 = 1 + 1.8 * (t > CONFIRM ? Math.exp(-(t - CONFIRM) * 1.6) : 0);
  const big = { w: 372 * (1 - 0.06 * press2), h: 58 * (1 - 0.06 * press2) };
  const tabs = [
    "Overview",
    "Deployments",
    "Analytics",
    "Logs",
    "Storage",
    "Settings",
  ];
  return (
    <Root fill={BG}>
      <div
        style={{
          ...at(0, 0, W, 64),
          ...row(12),
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        <Avatar
          name="Hunter Association"
          size="sm"
          color="#3d8bfd"
          initials={false}
        />
        <T s="hunter-association" size={14} weight={500} color={MUTED} />
        <T s="/" size={14} color={FAINT} />
        <T s="gpuixui" size={14} weight={600} />
        <div style={{ ...center, height: 26 }}>
          <Badge variant="success" size="sm">
            Production
          </Badge>
        </div>
        <div style={{ flexGrow: 1 }} />
        <AvatarGroup
          size="sm"
          members={[
            { name: "Gon", color: "#ff7a1a", initials: false },
            { name: "Killua", color: "#7c5cff", initials: false },
            { name: "Kurapika", color: "#34d399", initials: false },
          ]}
        />
        <div style={{ width: 142 }} />
      </div>
      <FxView
        fx={glow({
          rect: { x: bx, y: by, w: b.w, h: b.h },
          radius: 20,
          time: t,
          color: hex(0),
          intensity: 0.22 * hover,
          size: 12,
        })}
      />
      <FxView
        fx={liquidMetal({
          rect: { x: bx, y: by, w: b.w, h: b.h },
          radius: b.h / 2,
          time: t,
          scale: 360,
          flow: 0.12 * flow,
          speed: 0.6,
          dome: 0.8,
          contrast: 0.85,
          bevel: 12,
          angle: 0.45,
        })}
      />
      <div style={{ ...at(bx, by, b.w, b.h), ...center }}>
        <T s="Deploy" size={15} weight={600} color="#0e0f12" />
      </div>
      <div style={{ ...at(0, 106, W, 1), backgroundColor: HAIR }} />
      <div style={{ ...at(24, 64, W - 48, 42) }}>
        <Tabs value="Deployments" onValueChange={noop}>
          <TabsList label="Project" variant="line">
            {tabs.map((name) => (
              <TabsTrigger key={name} value={name}>
                {name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div
        style={{ ...at(32, 133, W - 64), ...row(10), alignItems: "flex-end" }}
      >
        <div style={{ ...col(6), flexGrow: 1 }}>
          <T s="Deployments" size={26} weight={600} />
          <T
            s="Every push to dev ships to production."
            size={13.5}
            color={MUTED}
          />
        </div>
        <div style={{ width: 230 }}>
          <SearchInput placeholder="Search deployments…" />
        </div>
        <div style={{ width: 170 }}>
          <Select
            label="Environment"
            value="all"
            fullWidth
            options={[{ value: "all", label: "All environments" }]}
          />
        </div>
      </div>
      <Card
        style={{
          ...at(32, 208, W - 64),
          overflow: "hidden",
          padding: 0,
          borderRadius: 14,
        }}
      >
        <ThemedTable height={ROWS.length * 62 + 62 * Math.max(0, grow)}>
          {grow > 0.001 ? (
            <div
              style={{
                width: "100%",
                height: 62 * Math.max(0, grow),
                overflow: "hidden",
                flexShrink: 0,
                backgroundColor: alpha(
                  "#ffffff",
                  0.025 + 0.03 * (1 - ease(t, READY, 0.8)),
                ),
              }}
            >
              <ListRow
                msg="README: a 30 second showcase, cut from real renders"
                sha="ba5b054"
                dur={ready ? "1m 39s" : "…"}
                ago="now"
                who="#54b3fd"
                status={
                  <Status
                    label={ready ? "Ready" : "Building"}
                    color={ready ? "#34d399" : "#ffb547"}
                    pulsing={ready ? 4 : 5}
                    t={t}
                  />
                }
                extra={
                  <div style={{ width: 260 }}>
                    <Progress
                      value={progress * 100}
                      style={{ height: 3, opacity: fade }}
                    />
                  </div>
                }
              />
            </div>
          ) : null}
          {ROWS.map(([msg, sha, dur, ago, who]) => (
            <ListRow
              key={sha}
              msg={msg}
              sha={sha}
              dur={dur}
              ago={ago}
              who={who}
              status={<Status label="Ready" color="#34d399" t={t} />}
            />
          ))}
        </ThemedTable>
      </Card>
      <Backdrop amount={dim} />
      <Dialog open={sheet} onOpenChange={noop}>
        <DialogContent
          label="Deploy to production"
          size="sm"
          showClose={false}
          style={{
            width: 432,
            padding: 30,
            borderRadius: 24,
            overflow: "visible",
            ...col(8),
          }}
        >
          <div style={row(10)}>
            <Dot color="#34d399" size={8} />
            <T s="Production" size={12.5} weight={600} color="#6ee7b7" />
          </div>
          <DialogTitle style={{ fontSize: 21, fontWeight: 600 }}>
            Deploy GPUIxUI to production?
          </DialogTitle>
          <div style={row(8)}>
            <T s="dev" size={12} mono weight={500} color={MUTED} />
            <T s="·" size={12} color={FAINT} />
            <T s="ba5b054" size={12} mono weight={500} color={MUTED} />
            <T s="·" size={12} color={FAINT} />
            <T s="README: a 30 second showcase" size={12} color={MUTED} />
          </div>
          <div style={{ height: 18 }} />
          <div style={{ position: "relative", width: 372, height: 58 }}>
            <FxView
              fx={liquidMetal({
                rect: {
                  x: (372 - big.w) / 2,
                  y: (58 - big.h) / 2,
                  w: big.w,
                  h: big.h,
                },
                radius: big.h / 2,
                time: t,
                scale: 360,
                flow: 0.12 * flow2,
                speed: 0.6,
                dome: 0.8,
                contrast: 0.85,
                bevel: 12,
                angle: 0.45,
              })}
            />
            <div
              style={{
                ...at((372 - big.w) / 2, (58 - big.h) / 2, big.w, big.h),
                ...center,
              }}
            >
              <T s="Deploy" size={18} weight={600} color="#0e0f12" />
            </div>
            <FxView
              fx={sparkles({
                rect: {
                  x: (372 - big.w) / 2,
                  y: (58 - big.h) / 2,
                  w: big.w,
                  h: big.h,
                },
                radius: big.h / 2,
                time: t,
                burst: CONFIRM + 0.06,
                count: 14,
                size: 11,
                color: hex(0),
              })}
            />
          </div>
          <div style={at(-264, -SHEET_Y, W, H)}>
            <DeployPointer t={t} />
          </div>
        </DialogContent>
      </Dialog>
      {sheet ? null : <DeployPointer t={t} />}
    </Root>
  );
};

const GLYPHS: Record<string, string> = {
  G: ".#####.|##...##|##.....|##.....|##.....|##..###|##...##|##...##|##...##|##...##|.#####.",
  P: "######.|##...##|##...##|##...##|##...##|######.|##.....|##.....|##.....|##.....|##.....",
  U: "##...##|##...##|##...##|##...##|##...##|##...##|##...##|##...##|##...##|#######|.#####.",
  I: "##|##|##|##|##|##|##|##|##|##|##",
  x: ".......|.......|.......|.......|##...##|.##.##.|..###..|..###..|.##.##.|##...##|##...##",
};
const WORD = ["G", "P", "U", "I", "x", "U", "I"] as const;
const CELLS = (() => {
  const out: Array<readonly [number, number, number]> = [];
  let at0 = 0;
  WORD.forEach((g, gi) => {
    const rows = GLYPHS[g]!.split("|");
    rows.forEach((r, y) =>
      [...r].forEach((ch, x) => {
        if (ch === "#") out.push([x + at0, y, gi]);
      }),
    );
    at0 += rows[0]!.length + 1;
  });
  return { cells: out, width: at0 - 1 };
})();
export const Logo = ({ t, card }: { t: number; card: boolean }): ReactNode => {
  const cell = card ? 15 : 19,
    tile = cell - 1,
    totalW = CELLS.width * cell,
    totalH = 11 * cell;
  const zoom = card ? 1 : 1 + 0.05 * ease(t, 0, 4);
  const ox = (W - totalW * zoom) / 2,
    oy = card ? 150 : (H - totalH * zoom) / 2;
  const a = ease(t, 0.9, 0.6);
  return (
    <Root fill="#000000">
      {CELLS.cells.map(([x, y, g]) => {
        const delay = 0.08 + g * 0.07 + x * 0.0075 + y * 0.018;
        const k = track(t, 0, [[delay, 1, sp(0.55, 0.38)]]),
          size = tile * zoom * Math.max(0, k);
        if (size < 0.5) return null;
        const cx = ox + (x + 0.5) * cell * zoom,
          cy = oy + (y + 0.5) * cell * zoom;
        return (
          <FxView
            key={`${x}_${y}`}
            fx={liquidMetal({
              rect: { x: cx - size / 2, y: cy - size / 2, w: size, h: size },
              radius: 2.5 * zoom * k,
              time: t,
              light: 0xd6e8ff,
              iridescence: 0.3,
              scale: 240,
              bevel: 3.5,
              dome: 0.2,
              contrast: 1.15,
              flow: 0.6 * 1.25,
            })}
          />
        );
      })}
      {card ? (
        <div
          style={{
            ...at(0, oy + totalH + 46 - 8 * a, W),
            ...col(10),
            alignItems: "center",
          }}
        >
          <T
            s="gpuixui.sudokw.com"
            size={24}
            mono
            weight={500}
            color="#d4d8e2"
            a={a}
          />
          <T
            s="available through the shadcn registry"
            size={16}
            weight={500}
            color={MUTED}
            a={a}
          />
        </div>
      ) : null}
    </Root>
  );
};
