import { useState } from "react";

// A content/product image that hides itself if the URL fails to load (same
// resilience idiom as BabyAvatar). Under a future strict CSP, img-src must
// allow-list the content/product image hosts.
export function ContentImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      loading="lazy"
      className={className ?? "h-40 w-full rounded-[12px] object-cover"}
    />
  );
}
