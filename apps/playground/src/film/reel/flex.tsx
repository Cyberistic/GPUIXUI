/** @jsxImportSource @gpuix/react */
import { Avatar } from "@gpuixui/components/avatar";
import { AvatarGroup } from "@gpuixui/components/avatar-group";
import { Badge } from "@gpuixui/components/badge";
import { Card } from "@gpuixui/components/card";
import { InsetGroup, InsetGroupRow } from "@gpuixui/components/inset-group";
import { Progress } from "@gpuixui/components/progress";
import { SegmentedControl } from "@gpuixui/components/segmented-control";
import { Slider, Switch } from "@gpuixui/primitives";
import { Button } from "@gpuixui/primitives/button";
import type { ReactNode } from "react";
import { at, col, H, MUTED, PointerAt, Root, row, T, W } from "./kit.js";
import { ease, sp, track } from "./motion.js";
import {
  bungeeGum,
  electric,
  enScan,
  glow,
  godspeed,
  ShaderLayer,
  singularity,
  waterRipple,
  zetsu,
} from "@gpuixui/fx/shader-layer";

const noop = (): void => undefined;
const PARTY = [
  { name: "Gon", color: "#34d399" },
  { name: "Killua", color: "#54b3fd" },
  { name: "Kurapika", color: "#ffb547" },
  { name: "Leorio", color: "#7c5cff" },
];
const TYPES = ["Enhancer", "Transmuter", "Emitter"].map((name) => ({
  value: name,
  label: name,
}));
const MAIN = { x: 332, y: 28, w: 296, h: 484 };

const EIGHTH = 1 / 3;
const wave = (t: number, rate: number, phase: number) =>
  50 + 42 * Math.sin(t * rate + phase);
export const LicensePanel = ({ t = 0 }: { readonly t?: number }): ReactNode => (
  <div style={{ ...at(0, 0, W, H), backgroundColor: "#0b0b0d" }}>
    <Card
      style={{
        ...at(28, 28, 280, 484),
        ...col(14),
        padding: 22,
        borderRadius: 18,
      }}
    >
      <div style={row(12)}>
        <Avatar name="Gon" size="lg" color="#34d399" />
        <div style={col(4)}>
          <T s="Gon Freecss" size={17} weight={600} />
          <T s="Rookie, Whale Island" size={12.5} color={MUTED} />
        </div>
      </div>
      <div style={row(8)}>
        <Badge variant="info" size="sm">
          Licensed
        </Badge>
        <Badge variant="neutral" size="sm">
          Enhancer
        </Badge>
      </div>
      {[
        ["Aura", t === 0 ? 82 : wave(t, 3.1, 0)],
        ["Control", t === 0 ? 46 : wave(t, 4.3, 1.4)],
        ["Luck", t === 0 ? 94 : wave(t, 2.3, 2.6)],
      ].map(([name, value]) => (
        <div key={name} style={col(6)}>
          <T s={String(name)} size={12.5} color={MUTED} />
          <Progress value={Number(value)} />
        </div>
      ))}
      <div style={{ flexGrow: 1 }} />
      <T s="Party" size={12.5} color={MUTED} />
      <AvatarGroup members={PARTY} size="md" />
    </Card>
    <Card
      style={{
        ...at(MAIN.x, MAIN.y, MAIN.w, MAIN.h),
        ...col(14),
        padding: 22,
        borderRadius: 18,
      }}
    >
      <T s="Hunter License" size={22} weight={600} />
      <T
        s="No. 405 · valid worldwide. Do not lose it. Do not sell it."
        size={13}
        color={MUTED}
      />
      <SegmentedControl
        label="Nen type"
        value={TYPES[Math.trunc(t / EIGHTH / 2) % TYPES.length]!.value}
        onValueChange={noop}
        items={TYPES}
      />
      <InsetGroup title="Nen" titleTone="muted">
        <InsetGroupRow
          label="Ten"
          control={
            <Switch checked={Math.trunc(t / EIGHTH) % 3 !== 1} label="Ten" />
          }
        />
        <InsetGroupRow
          label="Zetsu"
          control={
            <Switch checked={Math.trunc(t / EIGHTH) % 4 === 2} label="Zetsu" />
          }
        />
        <InsetGroupRow
          label="Ren"
          control={
            <Switch checked={Math.trunc(t / EIGHTH) % 2 === 0} label="Ren" />
          }
        />
      </InsetGroup>
      <Slider label="Aura output" value={t === 0 ? 64 : wave(t, 2.7, 0.7)} />
      <div style={{ flexGrow: 1 }} />
      <Button variant="primary" style={{ width: "100%", height: 42 }}>
        Enter Greed Island
      </Button>
    </Card>
    <Card
      style={{
        ...at(652, 28, 280, 484),
        ...col(12),
        padding: 22,
        borderRadius: 18,
      }}
    >
      <T s="Bounties" size={17} weight={600} />
      {[
        [
          "Phantom Troupe",
          t > 0.7 ? "Cleared" : "Open",
          t > 0.7 ? "success" : "danger",
        ],
        ["Greed Island", "Cleared", "success"],
        [
          "Chimera Ants",
          t > 1.7 ? "Cleared" : "Open",
          t > 1.7 ? "success" : "danger",
        ],
        ["Heavens Arena", "Floor 200", "neutral"],
        ["Yorknew Auction", "Sold out", "neutral"],
      ].map(([name, state, variant]) => (
        <div
          key={name}
          style={{ ...row(), justifyContent: "space-between", height: 34 }}
        >
          <T s={String(name)} size={13.5} />
          <Badge variant={variant as "neutral"} size="sm">
            {state}
          </Badge>
        </div>
      ))}
      <div style={{ flexGrow: 1 }} />
      <T
        s="Hunter exam #287 opens in 3 days. Bring a fishing rod."
        size={13}
        color={MUTED}
      />
      <Button variant="secondary" style={{ width: "100%", height: 38 }}>
        Register
      </Button>
    </Card>
  </div>
);

const box = { x: 0, y: 0, w: W, h: H };
const BEAT = 2 / 3;
const CUTS = [
  ["Water Divination", 4],
  ["Bungee Gum", 2],
  ["En", 1],
  ["Godspeed", 2],
  ["Nanika", 1],
  ["Zetsu", 2],
] as const;
const DROPS = [
  [480, 300],
  [168, 150],
  [790, 400],
  [480, 110],
  [150, 420],
  [800, 130],
  [320, 300],
  [640, 300],
] as const;
const GUM_FROM = [
  [480, 468],
  [120, 470],
] as const;
const cutAt = (t: number) => {
  let start = 0;
  for (const [name, beats] of CUTS) {
    if (t < start + beats * BEAT || name === "Zetsu")
      return { name, age: t - start };
    start += beats * BEAT;
  }
  return { name: "Zetsu" as const, age: 0 };
};
export const Flex = ({ t }: { t: number }): ReactNode => {
  const { name, age } = cutAt(t);
  const rect = { x: MAIN.x, y: MAIN.y, w: MAIN.w, h: MAIN.h };
  const beat = age % BEAT;
  const from = GUM_FROM[Math.min(1, Math.trunc(age / BEAT))]!;
  const gum = track(beat, 0, [
    [0.03, 1, sp(0.32, 0)],
    [0.44, 0, sp(0.22, 0.55)],
  ]);
  const level = H + 30 - (H - 90) * ease(age, 0, 2.4);
  return (
    <Root fill="#0b0b0d">
      <LicensePanel t={t + 1e-3} />
      {name === "Water Divination" ? (
        <ShaderLayer
          fx={waterRipple({
            box,
            time: t,
            drops: DROPS.map(([x, y], i) => ({
              age: age - 0.02 - i * EIGHTH,
              x,
              y,
            })),
            level,
            swell: 9 + 12 * ease(age, 0, 1.6),
          })}
        />
      ) : null}
      {name === "Bungee Gum" ? (
        <ShaderLayer
          fx={bungeeGum({
            box,
            time: t,
            from,
            pull: [(from[0] > 300 ? -300 : 420) * gum, -320 * gum],
          })}
        />
      ) : null}
      {name === "En" ? (
        <ShaderLayer
          fx={enScan({
            box,
            time: t,
            center: [480, 270],
            radius: 40 + 900 * ease(age, 0, 0.6),
          })}
        />
      ) : null}
      {name === "Godspeed" ? (
        <ShaderLayer
          fx={godspeed({
            box,
            time: t,
            amount: Math.max(0.15, 1 - beat * 0.9),
          })}
        />
      ) : null}
      {name === "Nanika" ? (
        <ShaderLayer
          fx={singularity({
            box,
            time: t,
            center: [480, 270],
            pull: ease(age, 0, 0.5) * 1.1,
          })}
        />
      ) : null}
      {name === "Zetsu" ? (
        <ShaderLayer
          fx={zetsu({
            box,
            time: t,
            center: [480, 270],
            wipe: -0.2 + 1.55 * ease(age, 0.1, 1.1),
          })}
        />
      ) : null}
      {name === "Godspeed" ? <ElectricAt rect={rect} t={t} /> : null}
      {name === "Water Divination" ? (
        <PointerAt
          t={age}
          start={[620, 500]}
          path={DROPS.map(([x, y], i) => [i * EIGHTH - 0.2, x, y] as const)}
          taps={DROPS.map((_, i) => i * EIGHTH)}
        />
      ) : null}
      {name === "Bungee Gum" ? (
        <PointerAt
          t={beat}
          start={[from[0], from[1]]}
          path={[
            [0.03, from[0] + (from[0] > 300 ? -300 : 420), from[1] - 320],
            [0.44, from[0], from[1] - 240],
          ]}
          taps={[0]}
        />
      ) : null}
      {name === "Zetsu" && age > 1.1 ? null : (
        <div style={{ ...at(50, 352, 240), ...row() }}>
          <T
            s={name}
            size={28}
            weight={600}
            style={{ whiteSpace: "nowrap" }}
            a={name === "Zetsu" ? 1 - ease(age, 0.7, 0.3) : 1}
          />
        </div>
      )}
    </Root>
  );
};
const ElectricAt = ({
  rect,
  t,
}: {
  rect: { x: number; y: number; w: number; h: number };
  t: number;
}): ReactNode => (
  <>
    <ShaderLayer
      fx={glow({
        rect,
        radius: 18,
        time: t,
        style: 1,
        color: 0x54b3fd,
        intensity: 1.3,
        size: 24,
      })}
    />
    <ShaderLayer
      fx={electric({
        rect,
        radius: 18,
        time: t,
        charged: false,
        color: 0x54b3fd,
        intensity: 1.3,
        amplitude: 7,
      })}
    />
  </>
);
