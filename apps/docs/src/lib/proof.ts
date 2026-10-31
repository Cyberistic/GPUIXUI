/**
 * The landing's measured numbers (plan 730), decoded.
 *
 * `proof.json` is written by `nub run --filter @gpuixui/blocks bench` on a named
 * machine; nothing here is typed by hand. A file that lost a field fails the
 * build here rather than printing `undefined` on the landing.
 */
import { Schema } from "effect";
import raw from "./proof.json";

/** One bench run's results. */
export class Proof extends Schema.Class<Proof>("Proof")({
  measuredAt: Schema.String,
  machine: Schema.String,
  os: Schema.String,
  runtime: Schema.String,
  runs: Schema.Number,
  coldStartMs: Schema.Number,
  idleRssMb: Schema.Number,
  installMb: Schema.Number,
}) {}

/** Decode a bench result; throws at build time on a malformed file. */
export const decodeProof = Schema.decodeUnknownSync(Proof);

/** The numbers the landing prints. */
export const proof: Proof = decodeProof(raw);
