import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Users } from "lucide-react";
import { inr } from "@/lib/estate/pricing";
import type { Room } from "@/lib/estate/types";
import { StatusChip } from "./status-chip";

export function RoomCard({
  room,
  search,
  availability,
}: {
  room: Room;
  search?: { checkIn: string; checkOut: string; guests: number };
  availability?: "available" | "soldout" | "checking" | "toosmall";
}) {
  return (
    <article className="group">
      <Link to="/stays/$roomId" params={{ roomId: room.id }} search={search} className="block">
        <div className="relative overflow-hidden rounded-3xl bg-muted">
          <img src={room.image} alt={room.name} loading="lazy" width={1200} height={900} className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.14em]">
            {room.category}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-medium">{room.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="size-3.5" /> Up to {room.maxGuests} guests
            </p>
          </div>
          <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
        <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">{room.summary}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            <span className="text-lg font-semibold">{room.baseRate>0?inr(room.baseRate):"Check rate"}</span>
            <span className="text-muted-foreground"> / night from</span>
          </p>
          {availability === "available" && <StatusChip tone="success" dot>Available</StatusChip>}
          {availability === "soldout" && <StatusChip tone="danger" dot>Sold out for dates</StatusChip>}
          {availability === "toosmall" && <StatusChip tone="warning" dot>Too few beds</StatusChip>}
          {availability === "checking" && <StatusChip>Checking…</StatusChip>}
        </div>
        <span className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 group-hover:underline">View details</span>
      </Link>
    </article>
  );
}
