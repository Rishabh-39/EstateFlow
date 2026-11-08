import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import lawnImg from "@/assets/event-lawn.jpg";
import { PageShell } from "@/components/estate/site-chrome";
import { AiConcierge } from "@/components/estate/ai-concierge";
import { Notice } from "@/components/estate/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api, type EventEnquiryInput } from "@/services/api";
import { venueOnTypeChange } from "@/lib/estate/venue-utils";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Weddings & events — EstateFlow" },
      { name: "description", content: "Lawn weddings, celebrations and corporate offsites on a Chikkamagaluru coffee estate." },
      { property: "og:title", content: "Weddings & events — EstateFlow" },
      { property: "og:description", content: "Celebrate what matters, beautifully." },
    ],
  }),
  component: Events,
});

const TYPES = ["Wedding", "Corporate offsite", "Other events"] as const;
const empty: EventEnquiryInput = { type: "Wedding", eventName:"", customEventName:"", eventDescription:"", startDate: "", endDate: "", guests: 100, rooms: 20, venue: "Wedding lawn", dining: "All meals", parking: 30, notes: "", name: "", email: "", phone: "" };

function Events() {
  const [f, setF] = useState(empty);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const submit = useMutation({ mutationFn: () => api.submitEventEnquiry(f) });
  const set = <K extends keyof EventEnquiryInput>(k: K, v: EventEnquiryInput[K]) => setF({ ...f, [k]: v });

  const check = (s: number) => {
    const e: string[] = [];
    if (s === 0 && (!f.startDate || !f.endDate || f.endDate < f.startDate)) e.push("Choose a valid date range.");
    if (s === 0 && f.type === "Other events" && (!f.eventName || f.eventName.trim().length < 2)) e.push("Select the event name.");
    if(s === 0 && f.type === "Other events" && f.eventName === "Other (specify)" && (!f.customEventName || f.customEventName.trim().length < 2)) e.push("Enter the name of your event.");
    if (s === 0 && f.guests < 1) e.push("Enter a guest count.");
    if (s === 2) {
      if (f.name.trim().length < 2) e.push("Enter your name.");
      if (!/^\S+@\S+\.\S+$/.test(f.email)) e.push("Enter a valid email.");
      const phone = f.phone.trim();
      const digits = phone.replace(/\D/g, "");
      if (!phone || !/^\+?[0-9\s().-]+$/.test(phone) || digits.length < 10 || digits.length > 15) {
        e.push("Enter a valid phone number (10–15 digits).");
      }
    }
    setErrors(e);
    return e.length === 0;
  };

  return (
    <PageShell>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 pt-10 md:px-8 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-4">Weddings & events</p>
          <h1 className="display-xl text-primary">Celebrate what matters, beautifully.</h1>
          <p className="mt-6 max-w-md text-muted-foreground">Wedding lawns, dining and focused offsites. Our team checks rooms, lawn, dining, parking and staff before confirming anything.</p>
          <img src={lawnImg} alt="Estate lawn set for a wedding dinner" loading="lazy" className="mt-10 aspect-[4/3] w-full rounded-4xl object-cover" />
        </div>

        <div className="flex flex-col gap-6 self-start">
        <div className="panel p-6 shadow-soft md:p-8">
          {submit.isSuccess ? (
            <div className="fade-up space-y-4 py-6 text-center" role="status">
              <CheckCircle2 className="mx-auto size-10 text-success" />
              <h2 className="text-3xl font-light">Enquiry received</h2>
              <p className="text-muted-foreground">Reference <strong>{submit.data.reference}</strong>. Our staff will review the enquiry; reply timing is not guaranteed. Nothing is reserved until the team confirms.</p>
              <Button asChild variant="quiet"><Link to="/">Back to home</Link></Button>
            </div>
          ) : (
            <form noValidate onSubmit={(e) => { e.preventDefault(); if (step < 2) { if (check(step)) setStep(step + 1); } else if (check(2)) submit.mutate(); }} className="space-y-5">
              <p className="eyebrow">Step {step + 1} of 3</p>
              {errors.length > 0 && <Notice tone="danger" title="Please check your details">{errors.join(" ")}</Notice>}
              {step === 0 && (
                <div className="fade-up space-y-5">
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Event type">
                    {TYPES.map((t) => (
                      <button type="button" key={t} role="radio" aria-checked={f.type === t} onClick={() => setF((prev) => ({ ...prev, type: t, venue: venueOnTypeChange(prev.type,prev.venue,t) }))} className={cn("rounded-full border px-4 py-2 text-sm", f.type === t ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{t}</button>
                    ))}
                  </div>
                  {f.type === "Other events" && <div className="space-y-3">
                    <div className="space-y-1.5"><Label htmlFor="event-name">Event name</Label>
                      <select id="event-name" value={f.eventName ?? ""} onChange={e=>set("eventName",e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
                        <option value="">Choose an event</option>
                        {["Birthday","Party","Anniversary","Reunion","Engagement","Other (specify)"].map(n=><option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    {f.eventName === "Other (specify)" && <div className="space-y-1.5"><Label htmlFor="custom-event-name">Name of your event</Label><Input id="custom-event-name" value={f.customEventName??""} onChange={e=>set("customEventName",e.target.value)} placeholder="e.g. Family gathering" /></div>}
                    <div className="space-y-1.5"><Label htmlFor="event-description">Tell us about the event</Label><Textarea id="event-description" value={f.eventDescription??""} onChange={e=>set("eventDescription",e.target.value)} placeholder="Celebration type, activities, setup or special requests…" className="rounded-xl" /></div>
                  </div>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5"><Label htmlFor="sd">From</Label><Input id="sd" type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} className="h-11 rounded-xl" /></div>
                    <div className="space-y-1.5"><Label htmlFor="ed">To</Label><Input id="ed" type="date" value={f.endDate} onChange={(e) => set("endDate", e.target.value)} className="h-11 rounded-xl" /></div>
                    <div className="space-y-1.5"><Label htmlFor="g">Guests</Label><Input id="g" type="number" min={1} value={f.guests} onChange={(e) => set("guests", Number(e.target.value))} className="h-11 rounded-xl" /></div>
                    <div className="space-y-1.5"><Label htmlFor="r">Rooms needed</Label><Input id="r" type="number" min={0} value={f.rooms} onChange={(e) => set("rooms", Number(e.target.value))} className="h-11 rounded-xl" /></div>
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="fade-up grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label htmlFor="v">Venue</Label>
                    <select id="v" value={f.venue} onChange={(e) => set("venue", e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
                      {["Wedding lawn", "Conference hall", "Plantation pavilion", "Not sure yet"].map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">Venue requests other than the lawn require staff verification; selection does not guarantee availability.</p>
                  </div>
                  <div className="space-y-1.5"><Label htmlFor="d">Dining</Label>
                    <select id="d" value={f.dining} onChange={(e) => set("dining", e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
                      {["All meals", "Main event dinner only", "Lunch only", "Not required"].map((o) => <option key={o}>{o}</option>)}
                    </select></div>
                  <div className="space-y-1.5"><Label htmlFor="p">Parking spaces</Label><Input id="p" type="number" min={0} value={f.parking} onChange={(e) => set("parking", Number(e.target.value))} className="h-11 rounded-xl" /></div>
                  <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="n">Anything else?</Label><Textarea id="n" value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Décor, music, budget, accessibility…" className="rounded-xl" /></div>
                </div>
              )}
              {step === 2 && (
                <div className="fade-up grid gap-4">
                  <div className="space-y-1.5"><Label htmlFor="nm">Your name</Label><Input id="nm" value={f.name} onChange={(e) => set("name", e.target.value)} className="h-11 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label htmlFor="em">Email</Label><Input id="em" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className="h-11 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label htmlFor="ph">Phone</Label><Input id="ph" type="tel" inputMode="tel" autoComplete="tel" required aria-required="true" value={f.phone} onChange={(e) => set("phone", e.target.value)} className="h-11 rounded-xl" /></div>
                </div>
              )}
              {submit.isError && <Notice tone="danger" title="We couldn't send your enquiry">Please try again.</Notice>}
              <div className="flex gap-3">
                {step > 0 && <Button type="button" variant="quiet" onClick={() => setStep(step - 1)}>Back</Button>}
                <Button type="submit" disabled={submit.isPending}>{step < 2 ? "Continue" : submit.isPending ? "Sending…" : "Submit enquiry"}</Button>
              </div>
            </form>
          )}
        </div>
        <div id="guest-enquiry"><AiConcierge /></div>
        </div>
      </section>
    </PageShell>
  );
}
