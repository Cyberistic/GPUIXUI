import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OVERRIDE = "NAPI_RS_NATIVE_LIBRARY_PATH";

const binary = fileURLToPath(
  new URL(
    `../dist/gpuixui-native.${process.platform}-${process.arch}.node`,
    import.meta.url,
  ),
);

export const hasShaderBinary: boolean = existsSync(binary);

// Every napi-rs package reads this variable, so it must not outlive this load.
if (hasShaderBinary && process.env[OVERRIDE] === undefined) {
  process.env[OVERRIDE] = binary;
  await import("@gpuix/native");
  delete process.env[OVERRIDE];
}
