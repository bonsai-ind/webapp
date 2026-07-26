import { useState } from "react";
import type { Session } from "../session/session";
import { downloadFile } from "../api/download";

// ReportView: the two report actions — CSV download (summary + full event log)
// and the printable report page (print → PDF from the browser).
export function ReportView({
  session,
  babyId,
  babyName,
  onOpenReport,
}: {
  session: Session;
  babyId?: string;
  babyName?: string;
  onOpenReport: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);

  const download = async () => {
    if (!babyId) return;
    setDownloading(true);
    setError(false);
    try {
      const name = (babyName ?? "baby").toLowerCase().replace(/\s+/g, "-");
      const date = new Date().toISOString().slice(0, 10);
      await downloadFile(session, `/babies/${babyId}/report.csv?days=14`, `bonsai-report-${name}-${date}.csv`);
    } catch {
      setError(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <section className="rounded-card border border-line bg-surface p-[18px]">
        <p className="label">Pediatrician report</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
          A 14-day summary built for a checkup: the graphic sleep diary pediatric guidance prefers,
          sleep stats vs. age norms, a cry log with the colic (rule-of-three) check, safety and SOS
          events, WHO growth percentiles{" "}
          <span className="whitespace-nowrap">(corrected age for preterm)</span>, and room temperature.
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onOpenReport}
            className="w-full rounded-full bg-primary py-3 text-[14px] font-bold text-white"
          >
            Open printable report
          </button>
          <button
            type="button"
            onClick={() => void download()}
            disabled={downloading || !babyId}
            className="w-full rounded-full border border-line bg-surface py-3 text-[14px] font-bold text-ink disabled:opacity-50"
          >
            {downloading ? "Preparing CSV…" : "Download CSV"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-[12px] text-alert">Download failed — check the connection and try again.</p>
        )}
      </section>
      <p className="text-[10.5px] leading-relaxed text-ink-3">
        The printable report opens full-screen — use Print / Save PDF there to hand your pediatrician
        a copy. The CSV holds the same summary plus every raw event row for the period.
      </p>
    </div>
  );
}
