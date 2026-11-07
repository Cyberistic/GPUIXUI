/** @jsxImportSource @gpuix/react */
import { createTestRoot } from "@gpuix/react/testing";
import { mkdirSync, readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { H, W } from "./kit.js";
import { Diff, Hello, Launcher, Op1, Settings, Table } from "./scenes-b.js";
import { Ask, Deploy, Fire, Keys, Library, Logo, NowPlaying, Pricing, Today } from "./scenes-a.js";

const SCENES: Record<string, (t: number) => ReactNode> = {
  fire: (t) => <Fire t={t} />, pricing: (t) => <Pricing t={t} />, ask: (t) => <Ask t={t} />, library: (t) => <Library t={t} />, keys: (t) => <Keys t={t} />,
  today: (t) => <Today t={t} />, nowplaying: (t) => <NowPlaying t={t} />, deploy: (t) => <Deploy t={t} />, logo: (t) => <Logo t={t} card={false} />, card: (t) => <Logo t={t} card />,
  hello: (t) => <Hello t={t} />, settings: (t) => <Settings t={t} />, diff: (t) => <Diff t={t} />, table: (t) => <Table t={t} />, op1: (t) => <Op1 t={t} />, launcher: (t) => <Launcher t={t} />,
};
const [scene, seconds, out, assets] = process.argv.slice(2) as [string, string, string, string];
const view = SCENES[scene];
if (view === undefined) throw new Error(`no scene ${scene}`);
mkdirSync(out, { recursive: true });
const root = createTestRoot({ width: W, height: H });
const { render, renderer } = root;
for (const font of ["Inter-Regular.ttf", "Inter-Medium.ttf", "Inter-SemiBold.ttf", "IBMPlexMono-Regular.ttf"]) renderer.registerFont(readFileSync(`${assets}/${font}`));
render(view(0));
renderer.flush();
const origin = renderer.clockPause();
const frames = Math.round(Number(seconds) * 60);
for (let i = 0; i < frames; i++) {
  renderer.clockSet(origin + (i * 1000) / 60);
  render(view(i / 60));
  renderer.flush();
  renderer.captureScreenshot(`${out}/${String(i).padStart(4, "0")}.png`);
}
root.unmount();
