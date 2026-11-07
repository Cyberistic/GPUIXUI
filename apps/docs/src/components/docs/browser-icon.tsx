import { icons, type IconName } from "@gpuixui/icons";
import { galleryMarkup } from "@/lib/icon-gallery";

export const iconMarkup = (name: IconName): string =>
  galleryMarkup(icons[name]);

export function BrowserIcon({
  name,
  className,
}: {
  readonly name: IconName;
  readonly className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={className ?? "block size-4"}
      dangerouslySetInnerHTML={{ __html: iconMarkup(name) }}
    />
  );
}
