import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-estate.jpg";
import { PageShell } from "@/components/estate/site-chrome";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/experiences")({
  head: () => ({
    meta: [
      { title: "Experiences — EstateFlow" },
      { name: "description", content: "Coffee walks, mist-line trails and estate dining in Chikkamagaluru." },
      { property: "og:title", content: "Experiences — EstateFlow" },
      { property: "og:description", content: "Coffee walks, trails and estate dining." },
    ],
  }),
  component: () => (
    <PageShell>
      <section className="mx-auto max-w-7xl px-5 pt-10 md:px-8">
        <p className="eyebrow mb-4">Experiences</p>
        <h1 className="display-xl max-w-4xl text-primary">Slow days among the coffee.</h1>
        <img src={heroImg} alt="Misty coffee estate" className="mt-10 aspect-[16/7] w-full rounded-4xl object-cover" />
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {[
            ["Bean to cup", "Follow a harvest from the arabica rows to the curing house, then cup the season's roast."],
            ["Dawn ridge walk", "A guided climb through shade forest to watch mist lift off the Western Ghats."],
            ["Estate table", "Malnad-style dinners cooked with pepper, cardamom and produce from the estate garden."],
          ].map(([t, b]) => (
            <div key={t}><h2 className="text-2xl font-light">{t}</h2><p className="mt-2 text-sm text-muted-foreground">{b}</p></div>
          ))}
        </div>
        <Button asChild className="mt-12"><Link to="/stays">Plan your stay</Link></Button>
      </section>
    </PageShell>
  ),
});
