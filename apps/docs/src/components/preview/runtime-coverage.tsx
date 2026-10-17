interface RuntimeCoverageProps {
  readonly testFile: string;
  readonly command: string;
}

/**
 * Tier V (plan 432): the component is driven by a real GPUix suite, but no
 * capture is published. It names both, and never turns coverage into a pass.
 */
export function RuntimeCoverage({ testFile, command }: RuntimeCoverageProps) {
  return (
    <p
      data-preview-tier="runtime"
      className="not-prose rounded-md border border-fd-border bg-fd-card px-3 py-2 text-sm"
    >
      Native coverage: <code>{testFile}</code> drives this component in the real
      GPUix renderer. Run <code>{command}</code>. No capture is published for
      this page yet.
    </p>
  );
}
