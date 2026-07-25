import type { ReactNode } from "react";

// Shared console card: mono uppercase eyebrow + content column (DESIGN.md §3).
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-[18px]">
      <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.13em] text-ink-3">{title}</h2>
      {children}
    </section>
  );
}
