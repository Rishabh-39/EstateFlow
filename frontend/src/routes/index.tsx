import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Coffee, MessageCircle, Mountain, Trees } from "lucide-react";
import { toast } from "sonner";
import heroImg from "@/assets/hero-estate.jpg";
import lawnImg from "@/assets/event-lawn.jpg";
import { RoomCard } from "@/components/estate/room-card";
import { PageShell } from "@/components/estate/site-chrome";
import { StaySearch } from "@/components/estate/stay-search";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EstateFlow — Where every stay becomes a story" },
      { name: "description", content: "Rooms, villas and celebrations on a working coffee estate in Chikkamagaluru, Karnataka." },
      { property: "og:title", content: "EstateFlow — Where every stay becomes a story" },
      { property: "og:description", content: "Rooms, villas and celebrations on a working coffee estate in Chikkamagaluru." },
    ],
  }),
  component: Home,
});

const HIGHLIGHTS = [
  { icon: Coffee, title: "Estate coffee", body: "Walk the arabica rows at harvest and taste the season's roast at the curing house." },
  { icon: Mountain, title: "Mist-line trails", body: "Guided dawn walks towards the Baba Budangiri ridge, right from your door." },
  { icon: Trees, title: "Shade-grown forest", body: "Silver oak, pepper vines and birdsong across the plantation's canopy." },
];

function Home() {
  const rooms=useQuery({queryKey:["rooms"],queryFn:()=>api.listRooms()});
  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-5 pt-8 md:px-8 md:pt-14">
        <div className="grid items-end gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <div className="fade-up pb-2">
            <p className="eyebrow mb-6">Chikkamagaluru · Karnataka</p>
            <h1 className="display-xl text-primary">
              Where every stay becomes a <em className="font-light not-italic text-coffee">story.</em>
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">Escape into the quiet beauty of Chikkamagaluru.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/stays">Explore rooms <ArrowRight /></Link></Button>
              <Button size="lg" variant="quiet" onClick={() => window.location.assign("/events#guest-enquiry")}>
                <MessageCircle /> Plan with AI
              </Button>
            </div>
          </div>
          <div className="relative">
            <img src={heroImg} alt="Stone and timber villas above a misty coffee estate at dawn" width={1600} height={1104} className="aspect-[4/5] w-full rounded-4xl object-cover sm:aspect-[4/3] lg:aspect-[4/5]" />
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-background/92 p-4 shadow-float backdrop-blur sm:left-auto sm:w-64">
              <p className="eyebrow">The estate</p>
              <p className="mt-1 text-sm">64 rooms and 12 villas at our Chikkamagaluru coffee-estate resort.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-5 md:mt-14 md:px-8">
        <StaySearch />
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-5 md:px-8">
        <div className="mb-10 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow mb-3">Stay</p>
            <h2 className="text-4xl font-light md:text-5xl">Rooms & villas</h2>
          </div>
          <Link to="/stays" className="text-sm font-medium text-primary hover:underline">See all stays →</Link>
        </div>
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {(rooms.data??[]).slice(0,3).map(r=><RoomCard key={r.id} room={r}/>)}
        </div>
      </section>

      <section className="mx-auto mt-28 max-w-7xl px-5 md:px-8">
        <div className="grid gap-10 border-y border-border py-14 md:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title}>
              <h.icon className="size-5 text-coffee" />
              <h3 className="mt-4 text-xl font-medium">{h.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-28 max-w-7xl px-5 md:px-8">
        <div className="relative overflow-hidden rounded-4xl">
          <img src={lawnImg} alt="Candlelit wedding tables on the estate lawn at dusk" loading="lazy" width={1408} height={1008} className="h-[520px] w-full object-cover" />
          <div className="absolute inset-y-4 left-4 right-4 flex flex-col justify-end rounded-3xl bg-background p-8 sm:right-auto sm:w-[420px] md:inset-y-8 md:left-8 md:p-10">
            <p className="eyebrow mb-4">Weddings & events</p>
            <h2 className="text-3xl font-light leading-tight md:text-4xl">Celebrate what matters, beautifully.</h2>
            <p className="mt-4 text-sm text-muted-foreground">Lawn ceremonies, estate dinners and offsites — planned with a team that checks every room, table and parking space before we say yes.</p>
            <Button asChild className="mt-6 self-start"><Link to="/events">Plan an event <ArrowRight /></Link></Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
