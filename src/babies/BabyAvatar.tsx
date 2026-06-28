import { useEffect, useState } from "react";

// BabyAvatar is the visual rendering of a baby's avatar slot, used in the
// AppHeader top-left and in the baby-switcher dropdown rows. The empty state is
// the same purple gradient circle (DESIGN.md §4) with the baby's first initial
// centered on it; when avatarUrl is set we render an <img> on top of that base.
// An onError on the <img> falls back to the initial so a broken host or 404 is
// indistinguishable from "no URL set" — same forgiving empty state for both.
//
// Note: if/when a strict CSP ships (webapp/FRONTEND.md §XSS), the host(s)
// avatarUrl points at must be allow-listed under img-src. Seed fixtures
// currently use api.dicebear.com.

export function BabyAvatar({
  name,
  avatarUrl,
  size = 44,
}: {
  name: string;
  avatarUrl?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  // Reset failed flag when the source URL changes — a fresh URL deserves a
  // fresh load attempt rather than inheriting the previous baby's failure.
  useEffect(() => {
    setFailed(false);
  }, [avatarUrl]);

  const showImg = !!avatarUrl && !failed;
  const initial = (name.trim().charAt(0) || "?").toUpperCase();

  return (
    <span
      className="relative inline-block shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary-soft to-[#D9D2FB]"
      style={{ width: size, height: size }}
    >
      {showImg ? (
        <img
          src={avatarUrl}
          alt={name}
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center font-semibold text-primary"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {initial}
        </span>
      )}
    </span>
  );
}
