import { resolveIcon } from "./iconMap";

/**
 * Renders a lucide-react icon by string name (as stored in our data model),
 * falling back to a sensible default if the name doesn't resolve.
 */
export function IconFor({
  name,
  size = 18,
  color,
  fallback = "Circle",
}: {
  name: string;
  size?: number;
  color?: string;
  fallback?: string;
}) {
  const Cmp = resolveIcon(name, fallback);
  return <Cmp size={size} color={color} />;
}
