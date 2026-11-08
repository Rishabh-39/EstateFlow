import { useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addDays } from "@/lib/estate/pricing";
import { cn } from "@/lib/utils";

export const defaultDates = () => {
  const today = new Date().toISOString().slice(0, 10);
  const checkIn = addDays(today, 14);
  return { checkIn, checkOut: addDays(checkIn, 2) };
};

export function GuestStepper({ value, onChange, max = 6 }: { value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="quiet" size="icon" className="size-8" aria-label="Fewer guests" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <Minus />
      </Button>
      <span className="w-6 text-center tabular-nums" aria-live="polite">{value}</span>
      <Button type="button" variant="quiet" size="icon" className="size-8" aria-label="More guests" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus />
      </Button>
    </div>
  );
}

export function StaySearch({
  initial,
  className,
  onSearch,
}: {
  initial?: { checkIn: string; checkOut: string; guests: number };
  className?: string;
  onSearch?: (v: { checkIn: string; checkOut: string; guests: number }) => void;
}) {
  const navigate = useNavigate();
  const d = defaultDates();
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? d.checkIn);
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? d.checkOut);
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const invalid = checkOut <= checkIn;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (invalid) return;
        const v = { checkIn, checkOut, guests };
        if (onSearch) onSearch(v);
        else navigate({ to: "/stays", search: v });
      }}
      className={cn("grid gap-1 rounded-3xl border border-border bg-card p-2 shadow-float sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center sm:rounded-full", className)}
    >
      <label className="rounded-2xl px-4 py-2 sm:rounded-full hover:bg-muted">
        <span className="eyebrow block">Check-in</span>
        <input type="date" min={today} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(addDays(e.target.value, 1)); }} className="w-full bg-transparent text-sm outline-none" />
      </label>
      <label className="rounded-2xl px-4 py-2 sm:rounded-full hover:bg-muted">
        <span className="eyebrow block">Check-out</span>
        <input type="date" min={addDays(checkIn, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} aria-invalid={invalid} className="w-full bg-transparent text-sm outline-none" />
      </label>
      <div className="flex items-center justify-between gap-4 rounded-2xl px-4 py-2 sm:rounded-full">
        <span className="eyebrow">Guests</span>
        <GuestStepper value={guests} onChange={setGuests} />
      </div>
      <Button type="submit" size="lg" disabled={invalid} className="w-full sm:w-auto">
        <Search /> Search stays
      </Button>
      {invalid && <p role="alert" className="px-4 pb-2 text-xs text-destructive sm:col-span-4">Check-out must be after check-in.</p>}
    </form>
  );
}
