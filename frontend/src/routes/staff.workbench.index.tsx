import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CardSkeletons } from "@/components/estate/states";
import { StatusChip } from "@/components/estate/status-chip";
import { fmtDate } from "@/lib/estate/pricing";
import { api } from "@/services/api";

export const Route = createFileRoute("/staff/workbench/")({ component: List });

function List() {
  const q = useQuery({ queryKey: ["enquiries"], queryFn: () => api.listEnquiries() });
  const events = (q.data ?? []).filter((e) => e.requirements);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light">Resource planning</h1>
      {q.isPending ? <CardSkeletons n={3} /> : (
        <div className="panel divide-y divide-border">
          {events.map((e) => (
            <Link key={e.id} to="/staff/workbench/$enquiryId" params={{ enquiryId: e.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 hover:bg-muted">
              <div className="min-w-0"><p className="truncate font-medium">{e.subject}</p><p className="text-xs text-muted-foreground">{e.id} · {e.requirements!.guests ?? "?"} guests · {e.requirements!.startDate ? fmtDate(e.requirements!.startDate) : "date missing"}</p></div>
              <StatusChip tone={e.status === "Approved" ? "success" : "neutral"}>{e.status}</StatusChip>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
