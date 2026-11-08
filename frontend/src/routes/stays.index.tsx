import { useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { RoomCard } from "@/components/estate/room-card";
import { PageShell } from "@/components/estate/site-chrome";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/estate/states";
import { StaySearch, defaultDates } from "@/components/estate/stay-search";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/estate/pricing";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";

type Search = { checkIn?: string; checkOut?: string; guests?: number };

export const Route = createFileRoute("/stays/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    checkIn: typeof s.checkIn === "string" ? s.checkIn : undefined,
    checkOut: typeof s.checkOut === "string" ? s.checkOut : undefined,
    guests: s.guests ? Number(s.guests) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Rooms & villas — EstateFlow" },
      { name: "description", content: "Browse plantation rooms, valley suites and private pool villas with live availability." },
      { property: "og:title", content: "Rooms & villas — EstateFlow" },
      { property: "og:description", content: "Browse rooms and villas on a Chikkamagaluru coffee estate." },
    ],
  }),
  component: Stays,
});

const FILTERS = ["All", "Room", "Villa"] as const;

function Stays() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/stays/" });
  const d = defaultDates();
  const search = { checkIn: s.checkIn ?? d.checkIn, checkOut: s.checkOut ?? d.checkOut, guests: s.guests ?? 2 };
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const rooms = useQuery({ queryKey: ["rooms"], queryFn: () => api.listRooms() });
  const avail = useQueries({
    queries: (rooms.data ?? []).map((r) => ({
      queryKey: ["avail", r.id, search.checkIn, search.checkOut],
      queryFn: () => api.checkAvailability(r.id, search.checkIn, search.checkOut),
    })),
  });

  const list = (rooms.data ?? [])
    .map((room, i) => {
      const a = avail[i]?.data;
      const state = room.maxGuests < search.guests ? "toosmall" : !a ? "checking" : a.available ? "available" : "soldout";
      return { room, state } as const;
    })
    .filter((x) => filter === "All" || x.room.category === filter)
    .filter((x) => !onlyAvailable || x.state === "available");

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-5 pt-10 md:px-8">
        <p className="eyebrow mb-3">{fmtDate(search.checkIn)} – {fmtDate(search.checkOut)} · {search.guests} guests</p>
        <h1 className="text-5xl font-light md:text-6xl">Find your stay</h1>
        <StaySearch key={JSON.stringify(search)} initial={search} className="mt-8" onSearch={(v) => navigate({ search: v })} />

        <div className="mt-10 flex flex-wrap items-center gap-2" role="group" aria-label="Filter stays">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={cn("rounded-full border px-4 py-1.5 text-sm transition-colors", filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40")}>
              {f === "All" ? "All stays" : `${f}s`}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} className="size-4 accent-primary" />
            Only show available
          </label>
        </div>

        <div className="mt-8">
          {rooms.isPending ? (
            <CardSkeletons />
          ) : rooms.isError ? (
            <ErrorState onRetry={() => rooms.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState
              title="No stays match these dates"
              body="Every matching room is sold out or too small for your party. Try different dates or fewer guests."
              action={<Button variant="quiet" onClick={() => { setOnlyAvailable(false); setFilter("All"); }}>Clear filters</Button>}
            />
          ) : (
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {list.map(({ room, state }) => <RoomCard key={room.id} room={room} search={search} availability={state} />)}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
