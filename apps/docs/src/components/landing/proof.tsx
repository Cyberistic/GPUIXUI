/**
 * The proof strip (plan 727): the numbers `nub run --filter @gpuixui/blocks
 * bench` measured, read from `proof.json` — never typed here — with the machine
 * and the caveat under them.
 */
import { proof } from "@/lib/proof";

export const proofFigures = [
  { label: "cold start", value: `${proof.coldStartMs} ms` },
  { label: "idle memory", value: `${proof.idleRssMb} MB` },
  { label: "native binding", value: `${proof.installMb} MB` },
] as const;

export function Proof() {
  return (
    <section className="landing-section landing-proof" id="proof">
      <ul className="landing-proof-figures">
        {proofFigures.map((figure) => (
          <li key={figure.label}>
            <strong>{figure.value}</strong>
            <span>{figure.label}</span>
          </li>
        ))}
      </ul>
      <p className="landing-proof-note">
        The pipeline block on a {proof.machine}, {proof.os}, median of{" "}
        {proof.runs} runs; run through <code>nub</code> from TypeScript source,
        so the loader is in the first two.
      </p>
    </section>
  );
}
