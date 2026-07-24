import * as Icons from "lucide-react";

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
  fallback?: keyof typeof Icons;
}) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[name]
    ?? (Icons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[fallback];
  return <Cmp size={size} color={color} />;
}
