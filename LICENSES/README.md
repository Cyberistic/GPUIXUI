# LICENSES/ — licences and attribution

The release inventory. `README.md`'s "Built on" table credits every project the
library stands on; the records here verify each one's licence, record where it
was read from, and say whether we ship, derive from, or only reference it. The
records render on `/docs/license`, so a file added here appears on the site
with no docs change.

## Mapping

| `LICENSES/` file | `README.md` "Built on" row | Licence | Relationship |
| ---------------- | -------------------------- | ------- | ------------ |
| `shadcn-ui.md` | shadcn/ui | MIT | derive — class recipes reused verbatim, docs anatomy |
| `base-ui.md` | Base UI | MIT | reference-only — behaviour and parts model |
| `tailwind.md` | Tailwind | MIT | reference-only — utility syntax and recipe model |
| `react.md` | React | MIT | dependency — the runtime surface (JSX, hooks) |
| `gpuix.md` | GPUix | Apache-2.0 | dependency — the native renderer |
| `open-gpui.md` | open-gpui | Apache-2.0 | ship — spring/sequence physics ported |
| `gpui-motion.md` | gpui-motion | MIT | derive — motion API surface as a spec |
| `tanstack.md` | TanStack | MIT | dependency — headless cores adopted |
| `panelui.md` | PanelUI | none (documentation) | reference-only — no public source repository |
| `base-gpui.md` | *(design reference, not in the table)* | MIT | reference-only — compound-part contract |
| `lucide.md` | *(icons, not in the table)* | ISC + MIT | ship — icon geometry |

## How a record is written

- The licence is read from the licence file in the clone, at the commit or tag
  the record names — never from a README badge.
- A record we ship or derive from carries the full licence text; a reference or
  dependency record names what we take and states that no code was copied.
- Notices a redistribution must carry live in `packages/motion/NOTICE`, beside
  the port.

## Non-negotiables

- **Do not copy logos or trademarks** into the new identity.
- **Do not reuse source** unless the licence permits it *and* the notice is
  preserved and recorded.
- **Verify the licence by reading the file in the clone** at the commit the
  record names. A README badge is not evidence.
- A package that cannot be licensed compatibly is not a dependency — replace it
  or reimplement it.

## Status

Every source named in the "Built on" table has a record with its verified
licence. The aggregate tables `inventory.md` and `provenance.md` are not
written yet, so `/docs/license` still names them in its footer; they are a
separate, follow-up artefact over these records.
