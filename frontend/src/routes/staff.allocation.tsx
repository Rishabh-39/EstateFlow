import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Minus, Plus, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CardSkeletons, EmptyState, Notice } from "@/components/estate/states";
import { StatusChip } from "@/components/estate/status-chip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/estate/pricing";
import { STAFF_ROLES, totalStaff, type AllocationStatus, type StaffAllocation, type StaffCounts } from "@/lib/estate/staffing";
import type { Enquiry } from "@/lib/estate/types";
import { cn } from "@/lib/utils";
import { api, listEnquiriesPaged } from "@/services/api";

export const Route = createFileRoute("/staff/allocation")({ component: AllocationPage });

const tone = (s: AllocationStatus) =>
  s === "Approved" ? "success" : s === "Pending GM" ? "warning" : s === "Changes requested" ? "danger" : s === "Sent to client" ? "brand" : "neutral";

function AllocationPage() {
  const [page, setPage] = useState(1);
  // Backend filters event categories BEFORE paging, so each page contains up to
  // ten actual event enquiries. This is not limited to the legacy 100-row list.
  const q = useQuery({ queryKey: ["allocation-enquiries-paged", page], queryFn: () => listEnquiriesPaged(page, null, "", undefined, "all", true) });
  const allocs = useQuery({ queryKey: ["allocations"], queryFn: () => api.listAllocations() });
  const events = q.data?.items ?? [];
  const pages = q.data?.pages ?? 1;
  const actualPage = q.data?.page ?? page;
  const [sel, setSel] = useState<string | null>(null);
  const current = events.find((e) => e.id === sel) ?? events[0];
  const statusOf = (id: string) => allocs.data?.find((a) => a.enquiryId === id)?.status ?? "Draft";

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-light">Staff allocation</h1><p className="text-sm text-muted-foreground">Propose a role-based team, obtain GM review, then share the approved plan. Staff counts are a plan, not verified shift assignments or a resource reservation.</p></div>
      {q.isPending ? <CardSkeletons n={3} /> : q.isError ? <Notice tone="danger" title="Unable to load event enquiries">{(q.error as Error).message}</Notice> : events.length === 0 ? <EmptyState title="No events to staff" /> : (
        <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-6 lg:h-[min(760px,calc(100dvh-3rem))] lg:min-h-0 lg:self-start" aria-label="Event allocation list">
            <ul key={actualPage} aria-label="Event enquiries, scroll independently" className="panel min-h-0 max-h-[55dvh] divide-y divide-border overflow-y-auto overscroll-contain lg:max-h-none lg:flex-1">
            {events.map((e) => (
              <li key={e.id}>
                <button onClick={() => setSel(e.id)} aria-current={current?.id === e.id} className={cn("w-full space-y-1 p-4 text-left hover:bg-muted", current?.id === e.id && "bg-accent")}>
                  <p className="truncate text-sm font-medium">{e.subject}</p>
                  <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{e.id}</span><StatusChip tone={tone(statusOf(e.id))}>{statusOf(e.id)}</StatusChip></div>
                </button>
              </li>
            ))}
            </ul>
            <nav aria-label="Staff allocation pagination" className="flex shrink-0 items-center justify-between gap-2 px-1 text-sm">
              <Button variant="quiet" size="sm" disabled={actualPage <= 1} onClick={() => { setSel(null); setPage(actualPage - 1); }}>← Prev</Button>
              <span className="text-center text-xs text-muted-foreground">Page {actualPage} of {pages} · {q.data?.total ?? 0} events · 10 per page</span>
              <Button variant="quiet" size="sm" disabled={actualPage >= pages} onClick={() => { setSel(null); setPage(actualPage + 1); }}>Next →</Button>
            </nav>
          </div>
          {current && <div className="h-fit min-w-0 self-start"><Editor key={current.id} e={current} /></div>}
        </div>
      )}
    </div>
  );
}

function Editor({ e }: { e: Enquiry }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["allocation", e.id], queryFn: () => api.getAllocation(e.id) });
  if (q.isError) return <Notice tone="danger" title="Unable to load staffing plan">{(q.error as Error).message}</Notice>;
  if (q.isPending || !q.data) return <CardSkeletons n={1} />;
  return <Form e={e} a={q.data} onChange={() => { qc.invalidateQueries({ queryKey: ["allocation", e.id] }); qc.invalidateQueries({ queryKey: ["allocations"] }); }} />;
}

function Form({ e, a, onChange }: { e: Enquiry; a: StaffAllocation; onChange: () => void }) {
  const [counts, setCounts] = useState<StaffCounts>(a.counts);
  const [notes, setNotes] = useState(a.notes);
  const locked = a.status === "Pending GM" || a.status === "Sent to client";
  const dirty = JSON.stringify(counts) !== JSON.stringify(a.counts) || notes !== a.notes;

  const save = useMutation({ mutationFn: () => api.saveAllocation(e.id, counts, notes), onSuccess: () => { toast.success("Plan saved"); onChange(); } });
  const submit = useMutation({
    // A suggested plan is not persisted yet. Always save before transitioning it;
    // otherwise POST /transition correctly returns HTTP 409.
    mutationFn: async () => { await api.saveAllocation(e.id, counts, notes); return api.moveAllocation(e.id, "Pending GM", "staff"); },
    onSuccess: () => { toast.success("Sent to the General Manager for approval"); onChange(); },
  });
  const share = useMutation({ mutationFn: () => api.moveAllocation(e.id, "Sent to client", "staff"), onSuccess: () => { toast.success("Marked as sent to the client"); onChange(); } });

  const summary = `Dear ${e.from},\n\nHere is the team we have planned for your event${e.requirements?.startDate ? ` on ${fmtDate(e.requirements.startDate)}` : ""}:\n${STAFF_ROLES.filter((r) => counts[r.key] > 0).map((r) => `• ${r.label}: ${counts[r.key]}`).join("\n")}\nTotal: ${totalStaff(counts)} team members.\n\nWarm regards,\nEstateFlow`;

  return (
    <div className="panel fade-up h-fit min-w-0 self-start space-y-6 p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="eyebrow">{e.id} · {e.from}</p><h2 className="mt-1 text-2xl font-light">{e.subject}</h2><p className="text-sm text-muted-foreground">{e.requirements?.guests ?? "?"} guests · {e.requirements?.rooms ?? "?"} rooms · {e.requirements?.parking ?? "?"} cars</p></div>
        <StatusChip tone={tone(a.status)} dot>{a.status}</StatusChip>
      </div>

      {a.status === "Changes requested" && <Notice tone="danger" title="The GM asked for changes">{a.gmNote || "Adjust the plan and send it again."}</Notice>}
      {a.status === "Pending GM" && <Notice tone="info" title="Waiting for General Manager approval">Editing is locked until the GM responds.</Notice>}
      {a.status === "Approved" && <Notice tone="success" title="Approved by the General Manager">{a.gmNote || "You can now send this plan to the client."}</Notice>}

      <div className="grid gap-3 sm:grid-cols-2">
        {STAFF_ROLES.map((r) => (
          <div key={r.key} className="flex items-center justify-between rounded-xl border border-border p-3">
            <span className="text-sm">{r.label}</span>
            <div className="flex items-center gap-2">
              <Button size="icon-sm" variant="ghost" aria-label={`Fewer ${r.label}`} disabled={locked || counts[r.key] === 0} onClick={() => setCounts({ ...counts, [r.key]: counts[r.key] - 1 })}><Minus /></Button>
              <input aria-label={r.label} type="number" min={0} disabled={locked} value={counts[r.key]} onChange={(ev) => setCounts({ ...counts, [r.key]: Math.max(0, Number(ev.target.value) || 0) })} className="h-8 w-14 rounded-md border border-input bg-card text-center text-sm" />
              <Button size="icon-sm" variant="ghost" aria-label={`More ${r.label}`} disabled={locked} onClick={() => setCounts({ ...counts, [r.key]: counts[r.key] + 1 })}><Plus /></Button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm"><span className="font-medium">{totalStaff(counts)}</span> team members proposed <span className="text-muted-foreground">· Suggested automatically from guest, room and parking requirements; adjust before GM review. Not individual shift assignments.</span></p>
      <Textarea aria-label="Notes for the GM" placeholder="Notes for the General Manager (e.g. personal assistant requested)" rows={3} disabled={locked} value={notes} onChange={(ev) => setNotes(ev.target.value)} className="rounded-xl" />

      {submit.isError && <Notice tone="danger" title="Unable to send to GM">{(submit.error as Error).message}</Notice>}
      {save.isError && <Notice tone="danger" title="Unable to save plan">{(save.error as Error).message}</Notice>}
      {share.isError && <Notice tone="danger" title="Unable to mark plan shared">{(share.error as Error).message}</Notice>}
      <div className="flex flex-wrap gap-2">
        {!locked && <Button variant="quiet" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>Save plan</Button>}
        {(a.status === "Draft" || a.status === "Changes requested") && <Button onClick={() => submit.mutate()} disabled={submit.isPending}><Send /> Send to GM for approval</Button>}
        {a.status === "Approved" && !dirty && (
          <>
            <Button asChild variant="quiet"><a href={`https://wa.me/?text=${encodeURIComponent(summary)}`} target="_blank" rel="noreferrer">WhatsApp to client</a></Button>
            {e.email && <Button asChild variant="quiet"><a href={`mailto:${e.email}?subject=${encodeURIComponent("Your event team")}&body=${encodeURIComponent(summary)}`}><Mail /> Email to client</a></Button>}
            <Button onClick={() => share.mutate()} disabled={share.isPending}>Mark as sent to client</Button>
          </>
        )}
        {a.status === "Approved" && dirty && <p className="text-sm text-warning">Changing an approved plan sends it back to draft — save and resubmit to the GM.</p>}
      </div>
    </div>
  );
}
