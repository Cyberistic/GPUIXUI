/** @jsxImportSource @gpuix/react */
/**
 * Disclosure example: an inspector's two sections, the second folded.
 */

import { Disclosure } from "../src/disclosure.js";

/** An inspector with Details open and Activity folded. */
export const DisclosureExample = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 260 }}>
    <Disclosure title="Details">
      <text>Owner · Killua Zoldyck</text>
      <text>Due · 14 November</text>
    </Disclosure>
    <Disclosure title="Activity" defaultOpen={false}>
      <text>Gon moved this to Review</text>
    </Disclosure>
  </div>
);
