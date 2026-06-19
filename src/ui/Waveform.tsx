// Animated waveform — flex row of rounded bars with a staggered `bob` scaleY
// keyframe when `animate` is true. Respects prefers-reduced-motion via the CSS
// @media wrapper on the keyframe caller.
export function Waveform({
  bars = 8,
  animate = false,
  color = "currentColor",
}: {
  bars?: number;
  animate?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-end gap-[3px]" aria-hidden="true" style={{ height: 20 }}>
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          // animate-bob triggers @keyframes bob under prefers-reduced-motion:
          // no-preference only (defined in index.css).
          className={`w-[3px] rounded-full origin-bottom${animate ? " animate-bob" : ""}`}
          style={{
            height: "100%",
            background: color,
            animationDelay: animate ? `${i * 0.07}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
