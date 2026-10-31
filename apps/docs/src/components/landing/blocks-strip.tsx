/**
 * The blocks strip (plan 727): whole windows composed from the library, each a
 * link to its page. The tiles are the Blocks index's own images; every block
 * also opens as a native window with one command.
 */
export const landingBlocks = [
  { slug: "pipeline", title: "Pipeline" },
  { slug: "desktop", title: "Desktop" },
  { slug: "kanban", title: "Kanban" },
  { slug: "email-inbox", title: "Inbox" },
  { slug: "settings", title: "Settings" },
  { slug: "license", title: "Hunter License" },
] as const;

export function BlocksStrip() {
  return (
    <section className="landing-section" id="blocks">
      <p className="landing-kicker">Blocks</p>
      <h2 className="landing-h2">Whole apps, ready to copy.</h2>
      <p className="landing-lead">
        Each block is a compiled window you own. Open one natively with{" "}
        <code>nub run --filter @gpuixui/blocks dev -- pipeline</code>.
      </p>
      <div className="landing-blocks">
        {landingBlocks.map((block) => (
          <a
            className="landing-block"
            href={`/blocks/${block.slug}`}
            key={block.slug}
          >
            <img
              alt={`${block.title} block`}
              loading="lazy"
              src={`/blocks/${block.slug}.webp`}
            />
            <span>{block.title}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
