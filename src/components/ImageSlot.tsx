import Image from "next/image";
import type { CSSProperties } from "react";

type Shape = "rect" | "rounded" | "circle" | "pill";

type ImageSlotProps = {
  shape?: Shape;
  radius?: number;
  placeholder?: string;
  /** Optional real image. When omitted, the fillable placeholder is shown. */
  src?: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
};

function radiusFor(shape: Shape, radius: number): string {
  switch (shape) {
    case "circle":
      return "50%";
    case "pill":
      return "9999px";
    case "rect":
      return "0";
    default:
      return `${radius}px`;
  }
}

/**
 * Port of the design's <image-slot> custom element. In the prototype this was
 * a drag-to-fill placeholder; here it renders a Next.js <Image> when a `src`
 * is provided, otherwise the same empty-state placeholder (dashed ring +
 * caption) so layouts match the mockup pixel-for-pixel.
 */
export function ImageSlot({
  shape = "rounded",
  radius = 12,
  placeholder = "Drop an image",
  src,
  alt = "",
  className,
  style,
}: ImageSlotProps) {
  const br = radiusFor(shape, radius);
  const classes = ["image-slot", className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      style={{ borderRadius: br, position: "relative", overflow: "hidden", ...style }}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes="100vw" style={{ objectFit: "cover" }} />
      ) : (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: 12,
            textAlign: "center",
            color: "rgba(0,0,0,.5)",
            font: "500 12px/1.3 var(--font)",
            border: "1.5px dashed rgba(0,0,0,.18)",
            borderRadius: "inherit",
            boxSizing: "border-box",
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.45 }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          {placeholder ? <span style={{ maxWidth: "90%" }}>{placeholder}</span> : null}
        </span>
      )}
    </div>
  );
}
