// A privacy-enhanced, responsive 16:9 video embed. Stores only a provider + id
// (never embed HTML). Under a future strict CSP, frame-src must allow
// youtube-nocookie.com and player.vimeo.com.
export function VideoEmbed({
  provider,
  videoId,
  title,
}: {
  provider?: string;
  videoId?: string;
  title: string;
}) {
  if (!videoId) return null;
  const src =
    provider === "vimeo"
      ? `https://player.vimeo.com/video/${videoId}`
      : `https://www.youtube-nocookie.com/embed/${videoId}`;
  return (
    <div
      className="relative w-full overflow-hidden rounded-[12px] bg-black"
      style={{ aspectRatio: "16 / 9" }}
      data-testid="video-embed"
    >
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
