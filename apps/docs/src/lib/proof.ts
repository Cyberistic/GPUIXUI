import { Schema } from "effect";
import raw from "./proof.json";

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

export const decodeProof = Schema.decodeUnknownSync(Proof);

export const proof: Proof = decodeProof(raw);
