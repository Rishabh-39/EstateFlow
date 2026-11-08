import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Printer } from "lucide-react";
import { PriceSummary } from "@/components/estate/price-summary";
import { PageShell } from "@/components/estate/site-chrome";
import { EmptyState } from "@/components/estate/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtDate } from "@/lib/estate/pricing";
import { api, cancelBooking } from "@/services/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Notice } from "@/components/estate/states";

export const Route = createFileRoute("/booking/$reference")({
  head: () => ({
    meta: [
      { title: "Booking confirmed — EstateFlow" },
      { name: "description", content: "View the status of your saved EstateFlow booking." },
      { property: "og:title", content: "Booking confirmed — EstateFlow" },
      { property: "og:description", content: "Review the status of your EstateFlow booking." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Confirmation,
});

function Confirmation() {
  const { reference } = Route.useParams();
  const qc=useQueryClient();
  const cancel=useMutation({mutationFn:async()=>{if(!b.data?.id)throw Error("Booking ID missing");return cancelBooking(b.data.id);},onSuccess:()=>qc.invalidateQueries({queryKey:["booking",reference]})});
  const b = useQuery({ queryKey: ["booking", reference], queryFn: () => api.getBooking(reference) });

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-5 pt-14 md:px-8">
        {b.isPending ? (
          <Skeleton className="h-96 w-full rounded-3xl" />
        ) : !b.data ? (
          <EmptyState title="We couldn't find that booking" body="Sign in using the same guest account used for this booking. No confirmation email is sent by this prototype." action={<Button asChild><Link to="/stays">Browse stays</Link></Button>} />
        ) : (
          <div className="fade-up">
            {b.data.status==="CANCELLED"&&<Notice tone="warning" title="Booking cancelled">Room nights have been released. No real refund is processed by this demo.</Notice>}
            {b.data.status!=="CANCELLED"&&<CheckCircle2 className="size-10 text-success" />}
            <p className="eyebrow mt-6">{b.data.status==="CANCELLED"?"Booking cancelled":"Booking confirmed"} · {b.data.reference}</p>
            <h1 className="mt-3 text-5xl font-light">{b.data.status==="CANCELLED"?"Your stay has been cancelled.":`See you in the hills, ${b.data.guestName.split(" ")[0]}.`}</h1>
            <p className="mt-4 text-muted-foreground">This is a simulated payment confirmation. No real charge has been made and no confirmation email is sent.</p>
            <div className="panel mt-10 grid gap-8 p-6 md:grid-cols-2 md:p-8">
              <dl className="space-y-4 text-sm">
                <div><dt className="eyebrow">Stay</dt><dd className="mt-1 text-lg">{b.data.roomName}</dd></div>
                <div><dt className="eyebrow">Dates</dt><dd className="mt-1">{fmtDate(b.data.checkIn, { weekday: "short", day: "numeric", month: "long" })} → {fmtDate(b.data.checkOut, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</dd></div>
                <div><dt className="eyebrow">Guests</dt><dd className="mt-1">{b.data.guests}</dd></div>
                <div><dt className="eyebrow">Check-in policy</dt><dd className="mt-1">Confirm arrival and departure times with reservations.</dd></div>
              </dl>
              <PriceSummary q={b.data.quote} compact />
            </div>
            <div className="mt-8 flex flex-wrap gap-3 print:hidden">
              <Button onClick={() => window.print()}><Printer /> Print or save as PDF</Button>
              {b.data.status!=="CANCELLED"&&b.data.id&&<Button variant="quiet" disabled={cancel.isPending} onClick={()=>{if(window.confirm("Cancel this booking and release the room nights? No real refund will be made."))cancel.mutate();}}>Cancel booking</Button>}
              {cancel.isError&&<Notice tone="danger" title="Cancellation not completed">{(cancel.error as Error).message}</Notice>}
              <Button asChild variant="quiet"><Link to="/">Back to home</Link></Button>
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
