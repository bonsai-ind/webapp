// The persistent SOS floating button — pinned above the bottom nav on every
// authenticated screen. One tap opens the Emergency screen.
export function SosButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Emergency SOS"
      className="fixed right-4 bottom-[calc(66px+env(safe-area-inset-bottom))] z-40 grid size-14 place-items-center rounded-full bg-alert font-extrabold text-[15px] tracking-wide text-white shadow-lg ring-4 ring-alert/25 transition-transform active:scale-95"
    >
      SOS
    </button>
  );
}
