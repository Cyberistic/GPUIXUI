// Aggregate a V8 .cpuprofile into self time per function, so the SSR cost can be
// attributed without instrumenting the app. usage: node profile-summary.mjs <file>
import { readFileSync } from "node:fs";

const profile = JSON.parse(readFileSync(process.argv[2], "utf8"));
const { nodes, samples, timeDeltas } = profile;
const byId = new Map(nodes.map((node) => [node.id, node]));
const self = new Map();

samples.forEach((id, index) => {
  const node = byId.get(id);
  if (node === undefined) return;
  const frame = node.callFrame;
  const url = frame.url.split("/").slice(-2).join("/");
  const key = `${frame.functionName || "(anonymous)"} — ${url}:${frame.lineNumber}`;
  self.set(key, (self.get(key) ?? 0) + (timeDeltas[index] ?? 0) / 1000);
});

const total = [...self.values()].reduce((sum, ms) => sum + ms, 0);
console.log(`total ${total.toFixed(0)}ms`);
for (const [key, ms] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 30)) {
  console.log(`${ms.toFixed(1).padStart(8)}ms  ${((ms / total) * 100).toFixed(1).padStart(5)}%  ${key}`);
}
