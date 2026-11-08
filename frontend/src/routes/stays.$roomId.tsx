import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BedDouble, Check, Maximize, Users } from "lucide-react";
import { useState } from "react";
import { PriceSummary } from "@/components/estate/price-summary";
import { PageShell } from "@/components/estate/site-chrome";
import { ErrorState, Notice } from "@/components/estate/states";
import { StatusChip } from "@/components/estate/status-chip";
import { GuestStepper, defaultDates } from "@/components/estate/stay-search";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, fmtDate, inr } from "@/lib/estate/pricing";
import { cn } from "@/lib/utils";
import { api, liveQuote } from "@/services/api";

type Search = { checkIn?: string; checkOut?: string; guests?: number };

export const Route = createFileRoute("/stays/$roomId")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    checkIn: typeof s.checkIn === "string" ? s.checkIn : undefined,
    checkOut: typeof s.checkOut === "string" ? s.checkOut : undefined,
    guests: s.guests ? Number(s.guests) : undefined,
  }),
  head: ({ params }) => {
    const title = "Stay details — EstateFlow";
    const desc = "Live room details, rates and availability from EstateFlow.";
    return { meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }] };
  },
  component: RoomDetail,
});

function RoomDetail() {
  const { roomId } = Route.useParams();
  const s = Route.useSearch();
  const navigate = useNavigate();
  const d = defaultDates();
  const [checkIn, setCheckIn] = useState(s.checkIn ?? d.checkIn);
  const [checkOut, setCheckOut] = useState(s.checkOut ?? d.checkOut);
  const [guests, setGuests] = useState(s.guests ?? 2);
  const [planId, setPlanId] = useState("standard");
  const [active, setActive] = useState(0);

  const room = useQuery({ queryKey: ["room", roomId], queryFn: () => api.getRoom(roomId) });
  const rate = useQuery({queryKey:["live-quote",roomId,checkIn,checkOut,guests],queryFn:()=>liveQuote(roomId,checkIn,checkOut,guests),enabled:checkOut>checkIn&&!!room.data&&guests<=room.data.maxGuests});
  const avail = useQuery({
    queryKey: ["avail", roomId, checkIn, checkOut],
    queryFn: () => api.checkAvailability(roomId, checkIn, checkOut),
    enabled: checkOut > checkIn,
  });

  if (room.isPending)
    return (
      <PageShell>
        <div className="mx-auto max-w-7xl space-y-6 px-5 pt-10 md:px-8">
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="aspect-[16/8] w-full rounded-4xl" />
        </div>
      </PageShell>
    );
  if (room.isError) return <PageShell><div className="mx-auto max-w-xl px-5 pt-16"><ErrorState onRetry={() => room.refetch()} /></div></PageShell>;
  if (!room.data)
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-5 pt-16 text-center">
          <h1 className="text-3xl font-light">This stay isn't available</h1>
          <Button asChild className="mt-6"><Link to="/stays">Browse all stays</Link></Button>
        </div>
      </PageShell>
    );

  const r = room.data;
  const validDates = checkOut > checkIn;
  const q = validDates ? rate.data : null;
  const tooMany = guests > r.maxGuests;
  const soldOut = avail.data && !avail.data.available;
  const canBook = validDates && !tooMany && avail.data?.available;

  const go = () =>
    navigate({ to: "/book/$roomId", params: { roomId: r.id }, search: { checkIn, checkOut, guests, plan: planId } });

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-5 pt-8 md:px-8">
        <Link to="/stays" search={{ checkIn, checkOut, guests }} className="text-sm text-muted-foreground hover:text-foreground">← All stays</Link>
        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow mb-2">{r.category}</p>
            <h1 className="text-5xl font-light md:text-6xl">{r.name}</h1>
          </div>
          <p className="text-muted-foreground md:max-w-xs md:text-right">{r.summary}</p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-[2fr_1fr]">
          <img src={r.gallery[active]} alt={`${r.name} view ${active + 1}`} width={1200} height={900} className="fade-up aspect-[4/3] w-full rounded-4xl object-cover md:aspect-[16/10]" key={active} />
          <div className="grid grid-cols-3 gap-3 md:grid-cols-1">
            {r.gallery.map((src, i) => (
              <button key={i} onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={active === i} className={cn("overflow-hidden rounded-2xl ring-offset-2 ring-offset-background transition", active === i ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100")}>
                <img src={src} alt="" loading="lazy" className="aspect-[4/3] h-full w-full object-cover md:aspect-auto" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_400px]">
          <div className="space-y-10">
            <div className="flex flex-wrap gap-6 text-sm">
              <span className="flex items-center gap-2"><Users className="size-4 text-coffee" /> Up to {r.maxGuests} guests</span>
              <span className="flex items-center gap-2"><BedDouble className="size-4 text-coffee" /> Room configuration confirmed by reservations</span>
            </div>
            <p className="max-w-2xl text-lg leading-relaxed">{r.description}</p>
            <div>
              <h2 className="mb-4 text-2xl font-light">Amenities</h2>
              {r.amenities.length===0&&<p className="text-sm text-muted-foreground">Please confirm individual room amenities and bedding with reservations. Seed data only includes occupancy and description.</p>}
              <ul className="grid gap-3 sm:grid-cols-2">
                {r.amenities.map((a) => <li key={a} className="flex items-center gap-2 text-sm"><Check className="size-4 text-success" /> {a}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="mb-4 text-2xl font-light">Rate plans</h2>
              <div className="space-y-3" role="radiogroup" aria-label="Rate plan">
                {r.ratePlans.map((p) => (
                  <label key={p.id} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors", planId === p.id ? "border-primary bg-card" : "border-border hover:border-primary/40")}>
                    <input type="radio" name="plan" checked={planId === p.id} onChange={() => setPlanId(p.id)} className="mt-1 accent-primary" />
                    <span className="flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2 font-medium">
                        {p.name}
                        <span className="tabular-nums">{inr(Math.round(r.baseRate * p.modifier))}<span className="font-normal text-muted-foreground"> / night</span></span>
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">{p.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-2xl font-light">Cancellation policy</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">In this mock-payment MVP, eligible bookings may be cancelled before the check-in date (India time). No real payment or refund is processed. Rates and GST are defined by the resort administrator.</p>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="panel space-y-5 p-6 shadow-soft">
              <div className="grid grid-cols-2 gap-2">
                <label className="rounded-xl border border-border p-3">
                  <span className="eyebrow block">Check-in</span>
                  <input type="date" value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(addDays(e.target.value, 1)); }} className="w-full bg-transparent text-sm outline-none" />
                </label>
                <label className="rounded-xl border border-border p-3">
                  <span className="eyebrow block">Check-out</span>
                  <input type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
                </label>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <span className="eyebrow">Guests</span>
                <GuestStepper value={guests} onChange={setGuests} max={r.maxGuests} />
              </div>

              {tooMany && <Notice title={`This ${r.category.toLowerCase()} sleeps up to ${r.maxGuests}.`}>Choose a larger villa or reduce guests.</Notice>}
              {!validDates && <Notice tone="danger" title="Check-out must be after check-in." />}
              {avail.isFetching && <p className="text-sm text-muted-foreground" aria-live="polite">Checking availability…</p>}
              {avail.isError && <Notice tone="danger" title="Couldn't check availability.">Please try again in a moment.</Notice>}
              {soldOut && !avail.isFetching && <Notice tone="danger" title="Unavailable for the full stay">No remaining direct website allotment or physical room across the selected dates. Try another stay or dates.</Notice>}
              {avail.data?.available && !avail.isFetching && !tooMany && <StatusChip tone="success" dot>Available for your dates</StatusChip>}

              {rate.isError&&<Notice tone="danger" title="Unable to calculate server price">{(rate.error as Error).message}</Notice>}
              {q && <PriceSummary q={q} compact />}
              <Button size="lg" className="w-full" disabled={!canBook || avail.isFetching || !q || rate.isFetching} onClick={go}>
                {soldOut ? "Unavailable" : "Reserve"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">You won't be charged yet.</p>
            </div>
          </aside>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-5 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0 text-sm">
          {q ? <p className="font-semibold tabular-nums">{inr(q.total)} <span className="font-normal text-muted-foreground">total</span></p> : <p>Select dates</p>}
          <p className="truncate text-xs text-muted-foreground">{fmtDate(checkIn)} – {fmtDate(checkOut)} · {guests} guests</p>
        </div>
        <Button disabled={!canBook || avail.isFetching || !q || rate.isFetching} onClick={go}>{soldOut ? "Unavailable" : "Reserve"}</Button>
      </div>
    </PageShell>
  );
}
