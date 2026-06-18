import type { ReactNode } from "react";

export const inputClass =
  "h-11 rounded-[13px] border border-line-2 bg-surface px-3 text-[14px] text-ink outline-none transition-colors focus:border-primary";

export const primaryButtonClass =
  "h-12 rounded-[14px] bg-primary text-white font-semibold transition-opacity hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed";

export const secondaryButtonClass =
  "h-11 rounded-[14px] border border-line-2 bg-surface px-4 font-semibold text-ink-2 transition-colors hover:border-ink-3";

const labelTextClass =
  "font-mono text-[10px] font-medium tracking-[0.13em] uppercase text-ink-3";

export function Field({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelTextClass}>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-alert-soft px-3 py-2 text-[12.5px] font-medium text-alert">
      {children}
    </p>
  );
}

/** Centered single-column auth layout (sign-in, accept-invite). */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col justify-center px-[18px]">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-[25px] font-extrabold tracking-[-0.03em] text-ink">{title}</h1>
        {subtitle && <p className="mb-5 mt-1 text-[12.5px] text-ink-2">{subtitle}</p>}
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-[18px]">
          {children}
        </div>
      </div>
    </div>
  );
}
