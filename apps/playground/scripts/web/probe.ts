// Usage: nub scripts/web/probe.mjs <wasm dir> <out dir>, after bundling with scripts/web/bundle.mjs.
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findChrome,
  openChrome,
} from "../../../docs/scripts/chrome-session.ts";

const [wasmDir, out] = process.argv.slice(2) as [string, string];
const bundle = resolve(dirname(fileURLToPath(import.meta.url)), "bundle.js");
const headers = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};
const types: Record<string, string> = {
  ".js": "text/javascript",
  ".wasm": "application/wasm",
};
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000"><script>
if(new URLSearchParams(location.search).has("webgl"))Object.defineProperty(navigator,"gpu",{value:undefined});
const log=[];for(const k of["error","warn"]){const o=console[k];console[k]=(...a)=>{log.push(k+": "+a.map(String).join(" ").slice(0,300));o(...a)}}
addEventListener("error",e=>log.push("uncaught: "+e.message));addEventListener("unhandledrejection",e=>log.push("rejected: "+String(e.reason).slice(0,300)));
globalThis.probeLog=log;
</script><script type="module" src="/bundle.js"></script>`;
const server = createServer(async (request, response) => {
  const path = new URL(request.url ?? "/", "http://probe").pathname;
  try {
    if (path === "/")
      return void response
        .writeHead(200, { "content-type": "text/html", ...headers })
        .end(html);
    const file =
      path === "/bundle.js"
        ? bundle
        : resolve(wasmDir, path.replace("/wasm/", ""));
    const body = await readFile(file);
    response
      .writeHead(200, {
        "content-type": types[extname(file)] ?? "application/octet-stream",
        ...headers,
      })
      .end(body);
  } catch {
    response.writeHead(404, headers).end();
  }
});
await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
const { port } = server.address() as { port: number };
const chrome = findChrome(undefined, process.env);
if (chrome === undefined) throw new Error("no chrome");
await mkdir(out, { recursive: true });
const cases = [
  ["fire-webgpu", "scene=fire"],
  ["water-webgpu", "t=0.5"],
  ["nanika-webgpu", "t=3.6"],
  ["water-webgl", "t=0.5&webgl"],
  ["fire-webgl", "scene=fire&webgl"],
] as const;
for (const [name, query] of cases) {
  const { page, close } = await openChrome(
    chrome,
    `http://127.0.0.1:${port}/?${query}`,
    1000,
    620,
  );
  await new Promise((done) => setTimeout(done, 12000));
  const before = Number(await page.text(`String(globalThis.probeFrames)`));
  await new Promise((done) => setTimeout(done, 3000));
  const after = Number(await page.text(`String(globalThis.probeFrames)`));
  await writeFile(`${out}/${name}.png`, await page.capture());
  const log = await page.text(`JSON.stringify(probeLog.slice(0,6))`);
  process.stdout.write(
    `${name} ${JSON.stringify({ fps: (after - before) / 3 })} ${log}\n`,
  );
  if (log.includes("error:") || after === before) process.exitCode = 1;
  await close();
}
server.close();
process.exit();
