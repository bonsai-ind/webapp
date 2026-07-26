import { useEffect } from "react";
import type { Session } from "../session/session";
import { DayStripChart } from "../ui/DayStripChart";
import { clockLabel, hoursLabel } from "./useInsights";
import { useReport } from "./useReport";
import type { ReportEvent } from "./useReport";

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function EventList({ title, events }: { title: string; events: ReportEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div className="mt-3">
      <h3 className="text-[13px] font-bold text-ink">{title}</h3>
      <ul className="mt-1 flex flex-col gap-1">
        {events.map((ev, i) => (
          <li key={i} className="text-[12px] text-ink-2">
            {when(ev.at)} — <span className="font-semibold">{ev.kind}</span>
            {ev.detail ? ` · ${ev.detail}` : ""}
            {ev.endedAt ? ` (until ${when(ev.endedAt)})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ReportOverlay: the printable pediatrician report — graphic 14-day sleep grid
// first (pediatric sleep guidance prefers graphic diaries over tables), then a
// BEARS-mapped summary, cry/colic, safety events, growth and room temperature.
// Print via the browser (Cmd/Ctrl-P or the button) → PDF.
export function ReportOverlay({
  session,
  babyId,
  onClose,
}: {
  session: Session;
  babyId?: string;
  onClose: () => void;
}) {
  const { report, isLoading } = useReport(session, babyId);

  // While mounted, mark the body so print CSS can hide the app chrome behind us.
  useEffect(() => {
    document.body.classList.add("print-mode");
    return () => document.body.classList.remove("print-mode");
  }, []);

  return (
    <div className="print-report fixed inset-0 z-20 flex flex-col bg-bg pt-[env(safe-area-inset-top)]">
      <header className="no-print flex items-center gap-3 px-[18px] py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-9 place-items-center rounded-full bg-surface text-[18px] text-ink-2"
        >
          ✕
        </button>
        <h1 className="flex-1 text-[19px] font-extrabold text-ink">Doctor report</h1>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white"
        >
          Print / Save PDF
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-[18px] pb-10">
        {isLoading && <p className="py-8 text-center text-[13px] text-ink-3">Preparing report…</p>}
        {report && (
          <div className="mx-auto flex max-w-[640px] flex-col gap-[16px]">
            {/* Header block. */}
            <section className="rounded-card border border-line bg-surface p-[18px]">
              <h2 className="text-[19px] font-extrabold text-ink">{report.baby.name}</h2>
              <p className="mt-1 text-[12.5px] text-ink-2">
                {report.baby.dateOfBirth && <>Born {report.baby.dateOfBirth} · </>}
                {report.baby.sex && <>{report.baby.sex} · </>}
                {report.baby.chronologicalAge && <>Age {report.baby.chronologicalAge}</>}
                {report.baby.correctedAge && (
                  <>
                    {" "}
                    · corrected {report.baby.correctedAge} ({report.baby.gestationalAgeWeeks} wk gestation)
                  </>
                )}
              </p>
              <p className="mt-1 text-[12px] text-ink-3">
                Last {report.rangeDays} days · generated {when(report.generatedAt)}
                {report.baby.pediatricianName && <> · for {report.baby.pediatricianName}</>}
              </p>
              {(report.baby.allergies || report.baby.bloodType) && (
                <p className="mt-1 text-[12px] text-ink-2">
                  {report.baby.bloodType && <>Blood type {report.baby.bloodType} · </>}
                  {report.baby.allergies && <>Allergies: {report.baby.allergies}</>}
                </p>
              )}
            </section>

            {/* 14-day graphic sleep grid. */}
            <section className="rounded-card border border-line bg-surface p-[18px]">
              <p className="label">Sleep diary — {report.rangeDays} days</p>
              <div className="mt-2">
                <DayStripChart strips={report.strips} />
              </div>
            </section>

            {/* BEARS-mapped summary table. */}
            <section className="rounded-card border border-line bg-surface p-[18px]">
              <p className="label">Sleep summary</p>
              <table className="mt-2 w-full text-[12.5px]">
                <tbody>
                  {[
                    ["Avg total sleep / 24h", `${hoursLabel(report.sleep.avgTotalMin)} (typical ${report.sleep.typicalTotal.minH}–${report.sleep.typicalTotal.maxH}h, ${report.sleep.typicalTotal.source})`],
                    ["Night / naps", `${hoursLabel(report.sleep.avgNightMin)} / ${hoursLabel(report.sleep.avgNapMin)} (${report.sleep.naps.avgPerDay} naps/day)`],
                    ["Bedtime (± variability)", `${clockLabel(report.sleep.bedtime.meanMinuteOfDay)} ± ${report.sleep.bedtime.sdMin}m`],
                    ["Morning wake", clockLabel(report.sleep.wakeTime.meanMinuteOfDay)],
                    ["Sleep-onset latency", report.sleep.onsetLatency.coveragePct > 0 ? `${report.sleep.onsetLatency.avgMin}m (recorded on ${report.sleep.onsetLatency.coveragePct}% of episodes)` : "not recorded"],
                    ["Night wakings", `${report.sleep.nightWakings.avgPerNight}/night`],
                    ["Longest stretch", hoursLabel(report.sleep.longestStretchMin)],
                    ["Sleep efficiency", report.sleep.efficiencyPct > 0 ? `${report.sleep.efficiencyPct}%` : "—"],
                  ].map(([k, v]) => (
                    <tr key={k as string} className="border-t border-line/60 first:border-t-0">
                      <td className="py-1.5 pr-3 text-ink-2">{k}</td>
                      <td className="py-1.5 font-semibold text-ink">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Crying & colic. */}
            <section className="rounded-card border border-line bg-surface p-[18px]">
              <p className="label">Crying</p>
              <p className="mt-1.5 text-[12.5px] text-ink">
                {report.cries.avgPerDay} episodes/day · {hoursLabel(report.cries.totalMin)} total ·
                settles in ~{report.cries.avgSettleMin}m.{" "}
                {report.cries.wesselFlagged
                  ? "Meets the Wessel (rule-of-three) colic pattern this week."
                  : "Does not meet the Wessel colic criteria."}
              </p>
              {Object.keys(report.cries.byType).length > 0 && (
                <p className="mt-1 text-[12px] text-ink-2">
                  By likely cause:{" "}
                  {Object.entries(report.cries.byType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => `${k} ×${v}`)
                    .join(", ")}
                </p>
              )}
            </section>

            {/* Safety & emergency events. */}
            {(report.safety.sos.length > 0 ||
              report.safety.distress.length > 0 ||
              report.safety.positionAlerts.length > 0) && (
              <section className="rounded-card border border-line bg-surface p-[18px]">
                <p className="label">Safety & emergency events</p>
                <EventList title="SOS calls" events={report.safety.sos} />
                <EventList title="Distress episodes" events={report.safety.distress} />
                <EventList title="Position alerts" events={report.safety.positionAlerts} />
              </section>
            )}

            {/* Growth table. */}
            {report.growth.length > 0 && (
              <section className="rounded-card border border-line bg-surface p-[18px]">
                <p className="label">Growth (WHO percentiles{report.baby.correctedAge ? ", corrected age" : ""})</p>
                <table className="mt-2 w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-ink-3">
                      <th className="py-1 font-medium">Date</th>
                      <th className="py-1 font-medium">Weight</th>
                      <th className="py-1 font-medium">Length</th>
                      <th className="py-1 font-medium">Head</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.growth.map((row) => (
                      <tr key={row.takenAt} className="border-t border-line/60">
                        <td className="py-1.5 text-ink-2">{row.takenAt}</td>
                        <td className="py-1.5 text-ink">
                          {row.weightKg != null ? `${row.weightKg} kg` : "—"}
                          {row.weightPct != null && <span className="text-ink-3"> · P{Math.round(row.weightPct)}</span>}
                        </td>
                        <td className="py-1.5 text-ink">
                          {row.lengthCm != null ? `${row.lengthCm} cm` : "—"}
                          {row.lengthPct != null && <span className="text-ink-3"> · P{Math.round(row.lengthPct)}</span>}
                        </td>
                        <td className="py-1.5 text-ink">
                          {row.headCm != null ? `${row.headCm} cm` : "—"}
                          {row.headPct != null && <span className="text-ink-3"> · P{Math.round(row.headPct)}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Room temperature. */}
            {report.temperature.sampleCount > 0 && (
              <section className="rounded-card border border-line bg-surface p-[18px]">
                <p className="label">Room temperature</p>
                <p className="mt-1.5 text-[12.5px] text-ink">
                  {report.temperature.roomMinC}–{report.temperature.roomMaxC}°C (avg{" "}
                  {report.temperature.roomAvgC}°C) across {report.temperature.sampleCount} readings.
                </p>
                <EventList title="Temperature alerts" events={report.temperature.alerts} />
              </section>
            )}

            <p className="text-[10.5px] leading-relaxed text-ink-3">
              {report.disclaimer} Generated by Bonsai from monitor + caregiver logs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
