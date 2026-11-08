import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { CalendarRange, Users, Download, Inbox, LogOut, Network } from "lucide-react";
import { useEffect, useState } from "react";
import { getStaff, setStaff, type StaffUser } from "@/lib/estate/staff-session";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Operations — EstateFlow" }, { name: "robots", content: "noindex" }] }),
  component: StaffLayout,
});

const NAV = [
  { to: "/staff/inbox", label: "Enquiry inbox", icon: Inbox },
  { to: "/staff/rates", label: "Rates & inventory", icon: CalendarRange },
  { to: "/staff/workbench", label: "Resource planning", icon: Network },
  { to: "/staff/allocation", label: "Staff allocation", icon: Users },
  { to: "/staff/export", label: "Booking export", icon: Download },
] as const;

function StaffLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<StaffUser | null | undefined>(undefined);
  useEffect(() => {
    const u = getStaff();
    if (!u) navigate({ to: "/staff/login" });
    else if (u.role === "gm") navigate({ to: "/gm" });
    else setUser(u);
  }, [navigate]);
  if (!user) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Checking access…</div>;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="flex items-center gap-2 overflow-x-auto bg-sidebar px-3 py-3 text-sidebar-foreground md:sticky md:top-0 md:h-screen md:flex-col md:items-stretch md:gap-1 md:px-4 md:py-6">
        <Link to="/" className="mr-2 shrink-0 px-2 font-display text-base font-semibold text-sidebar-primary md:mb-8">EstateFlow</Link>
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
            <n.icon className="size-4" /> <span className="hidden sm:inline">{n.label}</span>
          </Link>
        ))}
        <div className="ml-auto shrink-0 md:ml-0 md:mt-auto">
          <p className="hidden px-3 text-xs text-sidebar-foreground/70 md:block">{user.name}</p>
          <button onClick={() => { setStaff(null); navigate({ to: "/staff/login" }); }} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
            <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}
