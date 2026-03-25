import { Info } from "lucide-react";

export function HoverHint({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <span
      className={`hover-hint ${className}`.trim()}
      title={text}
      aria-label={text}
      role="note"
      tabIndex={0}
    >
      <Info className="h-3.5 w-3.5" />
    </span>
  );
}
