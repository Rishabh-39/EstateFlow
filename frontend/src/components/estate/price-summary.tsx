import { fmtDate, inr } from "@/lib/estate/pricing";
import type { Quote } from "@/lib/estate/types";

export function PriceSummary({ q, compact }: { q: Quote; compact?: boolean }) {
  const n = q.nights.length;
  const rates = [...new Set(q.nights.map((x) => x.gstRate))];
  return (
    <dl className="space-y-2 text-sm">
      {!compact &&
        q.nights.map((night) => (
          <div key={night.date} className="flex justify-between text-muted-foreground">
            <dt>{fmtDate(night.date, { weekday: "short", day: "numeric", month: "short" })}</dt>
            <dd className="tabular-nums">{inr(night.rate)}</dd>
          </div>
        ))}
      <div className="flex justify-between border-t border-border pt-2">
        <dt>{n ? `${n} night${n !== 1 ? "s" : ""}` : "Room charges"}</dt>
        <dd className="tabular-nums">{inr(q.subtotal)}</dd>
      </div>
      {q.discount > 0 && (
        <div className="flex justify-between text-success">
          <dt>Promo {q.promoApplied}</dt>
          <dd className="tabular-nums">−{inr(q.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt>GST {rates.length ? `(${rates.map((r) => `${(r * 100).toFixed(0)}%`).join(" / ")})` : "(included in total where applicable)"}</dt>
        <dd className="tabular-nums">{inr(q.gst)}</dd>
      </div>
      <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
        <dt>Total payable</dt>
        <dd className="tabular-nums">{inr(q.total)}</dd>
      </div>
    </dl>
  );
}
