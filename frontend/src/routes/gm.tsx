import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getStaff, setStaff, type StaffUser } from "@/lib/estate/staff-session";

export const Route = createFileRoute("/gm")({
  head: () => ({ meta: [{ title: "General Manager — EstateFlow" }, { name: "robots", content: "noindex" }] }),
  component: GmLayout,
});

function GmLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<StaffUser | null>(null);
  useEffect(() => {
    const u = getStaff();
    if (!u || u.role !== "gm") navigate({ to: "/gm/login" });
    else setUser(u);
  }, [navigate]);
  if (!user) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Checking access…</div>;

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 bg-sidebar px-4 py-3 text-sidebar-foreground md:px-8">
        <Link to="/" className="font-display text-base font-semibold text-sidebar-primary">EstateFlow</Link>
        <span className="flex items-center gap-1.5 text-sm"><ShieldCheck className="size-4" /> GM desk</span>
        <span className="ml-auto hidden text-xs text-sidebar-foreground/70 sm:inline">{user.name}</span>
        <button onClick={() => { setStaff(null); navigate({ to: "/gm/login" }); }} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-sidebar-accent"><LogOut className="size-4" /> Sign out</button>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-8"><Outlet /></main>
    </div>
  );
}
