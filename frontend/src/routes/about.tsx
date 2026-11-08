import { createFileRoute, Link } from "@tanstack/react-router";
import plantationImg from "@/assets/room-plantation.jpg";
import { PageShell } from "@/components/estate/site-chrome";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About the estate — EstateFlow" },
      { name: "description", content: "A working coffee estate with 64 rooms and 12 villas in Chikkamagaluru, Karnataka." },
      { property: "og:title", content: "About the estate — EstateFlow" },
      { property: "og:description", content: "A working coffee estate resort in Chikkamagaluru." },
    ],
  }),
  component: () => (
    <PageShell>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pt-10 md:px-8 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-4">About</p>
          <h1 className="display-xl text-primary">A working estate, opened to guests.</h1>
          <p className="mt-6 max-w-md text-muted-foreground">64 rooms and 12 villas sit among the coffee, cared for by a team of 140 from the surrounding villages. We grow, roast and pour our own coffee.</p>
          <Button asChild className="mt-8"><Link to="/stays">See the rooms</Link></Button>
        </div>
        <img src={plantationImg} alt="Plantation room opening to the coffee rows" className="aspect-[4/5] w-full rounded-4xl object-cover" />
      </section>
    </PageShell>
  ),
});
