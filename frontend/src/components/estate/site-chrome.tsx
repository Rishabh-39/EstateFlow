import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Logo({ className, invert }: { className?: string; invert?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-display text-lg font-semibold tracking-tight", invert ? "text-primary-foreground" : "text-primary", className)}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <path d="M12 2c4 3 6 6.5 6 10.5S15.3 20 12 22c-3.3-2-6-5.5-6-9.5S8 5 12 2Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 5v15" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      EstateFlow
    </Link>
  );
}

const NAV = [
  { to: "/stays", label: "Stays" },
  { to: "/events", label: "Weddings & Events" },
  { to: "/experiences", label: "Experiences" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader({ overlay }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className={cn("z-40 w-full", overlay ? "absolute inset-x-0 top-0" : "sticky top-0 border-b border-border/70 bg-background/90 backdrop-blur")}>
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 md:grid-cols-[auto_1fr_auto] md:px-8">
        <Logo />
        <nav aria-label="Main" className="hidden justify-center gap-8 md:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm text-foreground/75 transition-colors hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/stays">Book your stay</Link>
          </Button>
          <Button variant="quiet" size="icon" className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile" className="fade-up mx-5 mb-3 rounded-2xl border border-border bg-card p-3 shadow-float md:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-base hover:bg-muted">
              {n.label}
            </Link>
          ))}
          <Button asChild className="mt-2 w-full">
            <Link to="/stays" onClick={() => setOpen(false)}>Book your stay</Link>
          </Button>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-[1.5fr_1fr_1fr] md:px-8">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">A coffee-estate retreat in the hills of Chikkamagaluru, Karnataka.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="eyebrow">Visit</p>
          <Link to="/stays" className="block hover:text-primary">Stays</Link>
          <Link to="/events" className="block hover:text-primary">Weddings & Events</Link>
          <Link to="/experiences" className="block hover:text-primary">Experiences</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="eyebrow">Team</p>
          <Link to="/staff/login" className="block hover:text-primary">Staff sign-in</Link>
          <Link to="/about" className="block hover:text-primary">About the estate</Link>
        </div>
      </div>
      <p className="mx-auto max-w-7xl px-5 pb-8 text-xs text-muted-foreground md:px-8">
        Design prototype — rates, availability and payments are simulated.
      </p>
    </footer>
  );
}

export function PageShell({ children, overlay }: { children: React.ReactNode; overlay?: boolean }) {
  return (
    <div className="min-h-screen">
      <SiteHeader overlay={overlay} />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
