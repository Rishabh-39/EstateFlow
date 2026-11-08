import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Undo2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StaffCountsView } from "@/components/estate/staff-counts";
import { CardSkeletons, EmptyState } from "@/components/estate/states";
import { StatusChip } from "@/components/estate/status-chip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { StaffAllocation } from "@/lib/estate/staffing";
import type { Enquiry } from "@/lib/estate/types";
import { api, listGmEscalations, listRecentGmDecisions, gmReviewEscalation, listGmEventApprovals, gmEventDecision, type PendingEventApproval, type GmEscalation } from "@/services/api";

export const Route = createFileRoute("/gm/")({ component: GmDashboard });

const LEVELS = ["High", "Normal", "Low"] as const;

function GmDashboard() {
  const enq = useQuery({ queryKey: ["enquiries"], queryFn: () => api.listEnquiries() });
  const alloc = useQuery({ queryKey: ["allocations"], queryFn: () => api.listAllocations() });
  const byId = new Map((enq.data ?? []).map((e) => [e.id, e]));
  const pending = (alloc.data ?? []).filter((a) => a.status === "Pending GM");
  const escalations = useQuery({queryKey:['gm-escalations'],queryFn:listGmEscalations,refetchInterval:10000});
  const history = useQuery({queryKey:['gm-escalations-recent'],queryFn:listRecentGmDecisions,refetchInterval:15000});
  const escalated = escalations.data??[];

  return (
    <div className="space-y-10">
      <div><h1 className="text-3xl font-light">General Manager desk</h1><p className="text-sm text-muted-foreground">Escalations by priority and staffing plans awaiting your approval.</p></div>

      <section className="space-y-4">
        <h2 className="text-xl font-light">Escalated matters <span className="text-muted-foreground">({escalated.length})</span></h2>
        <p className="text-sm text-muted-foreground">Review the guest's issue and original message, write a decision, and send instructions back to reservations staff. This does not approve an event booking.</p>
        {escalations.isPending ? <CardSkeletons n={2}/> : escalations.isError ? <p className="panel p-4 text-destructive">Unable to load GM escalations: {(escalations.error as Error).message}</p> : escalated.length===0 ? <EmptyState title="Nothing escalated" body="New escalations will appear here."/> : (
          <ul className="panel divide-y divide-border">{escalated.map(e=><EscalationRow key={e.id} e={e}/>)}</ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-light">Recent GM decisions</h2>
        <p className="text-sm text-muted-foreground">Each recorded decision is delivered to the assigned staff member's inbox. Acknowledgement is tracked separately.</p>
        {history.isPending ? <CardSkeletons n={1}/> : history.isError ? <p className="text-sm text-destructive">Could not load review history</p> : !history.data?.length ? <EmptyState title="No decisions recorded yet"/> : (
          <div className="panel divide-y divide-border">{history.data.map(r=><div key={r.id} className="space-y-1 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>{r.public_ref} · {r.contact_name}</strong><StatusChip tone={r.decision==='RESOLUTION_APPROVED'?'success':'warning'}>{r.decision==='RESOLUTION_APPROVED'?'Resolution approved':'Staff action requested'}</StatusChip></div>
            <p className="whitespace-pre-wrap">{r.note}</p>
            <p className="text-xs text-muted-foreground">Sent in-app to {r.returned_to_staff||'staff'} · {r.staff_acknowledged_at?'Staff acknowledged':'Awaiting staff acknowledgement'}</p>
          </div>)}</div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-light">Event resource bundle approvals</h2>
        <EventBundles />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-light">Staffing plans to approve <span className="text-muted-foreground">({pending.length})</span></h2>
        {alloc.isPending ? <CardSkeletons n={1} /> : pending.length === 0 ? <EmptyState title="No plans waiting" /> : pending.map((a) => <PlanCard key={a.enquiryId} a={a} e={byId.get(a.enquiryId)} />)}
      </section>
    </div>
  );
}

function EscalationRow({e}:{e:GmEscalation}){
 const qc=useQueryClient();
 const [expanded,setExpanded]=useState(false);
 const [note,setNote]=useState('');
 const reason=typeof e.agent_flags?.operationsReason==='string' && e.agent_flags.operationsReason.trim()
   ? 'Unresolved feasibility after client contact: '+e.agent_flags.operationsReason
   : typeof e.agent_flags?.complaintReason==='string' && e.agent_flags.complaintReason.trim()
   ? e.agent_flags.complaintReason
   : e.agent_flags?.modelUncertain ? 'AI classification was marked uncertain. No staff-written escalation reason was saved; inspect the original enquiry and ask staff for clarification.'
   : e.agent_flags?.requiresClarification ? 'The AI flagged missing or uncertain enquiry details. No staff-written escalation reason was saved; verify those details before returning a decision.'
   : e.category==='COMPLAINT' ? 'This enquiry is classified as a complaint. No specific escalation reason was recorded; verify the original message before deciding.'
   : 'Escalation reason was not recorded. Review the original enquiry and ask staff for clarification if required.';
 const details=e.manual_extracted && Object.keys(e.manual_extracted).length ? e.manual_extracted : e.extracted;
 const reviewed=details && typeof details==='object' ? Object.entries(details).filter(([_,v])=>v!==null&&v!==undefined&&typeof v!=='object').slice(0,14) : [];
 const missing=details && typeof details==='object' && Array.isArray(details.missingFields)
  ? details.missingFields.filter((v):v is string=>typeof v==='string').slice(0,12) : [];
 const m=useMutation({mutationFn:(decision:'RESOLUTION_APPROVED'|'ACTION_REQUIRED')=>gmReviewEscalation(e.id,decision,note.trim()),onSuccess:(_,decision)=>{
  toast.success(decision==='RESOLUTION_APPROVED'?'GM resolution approved and sent to staff':'GM instructions sent to staff');
  qc.invalidateQueries({queryKey:['gm-escalations']});qc.invalidateQueries({queryKey:['gm-escalations-recent']});qc.invalidateQueries({queryKey:['enquiries']});qc.invalidateQueries({queryKey:['enquiries-paged']});
 },onError:err=>toast.error((err as Error).message)});
 const act=(decision:'RESOLUTION_APPROVED'|'ACTION_REQUIRED')=>{
  if(!window.confirm('Record this GM decision and return the enquiry to reservations staff? No event booking will be approved.'))return;
  m.mutate(decision);
 };
 return <li className="p-4 space-y-3">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0"><p className="eyebrow">{e.public_ref} · {e.category.replaceAll('_',' ')} · {e.source}</p><p className="font-medium">{e.contact_name}</p><p className="line-clamp-2 text-sm text-muted-foreground">{e.message}</p></div>
    <Button variant="quiet" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?<ChevronUp/>:<ChevronDown/>}{expanded?'Hide review':'Review issue'}</Button>
  </div>
  {expanded&&<div className="space-y-4 rounded-xl border border-border p-4">
    <div className="space-y-1"><h3 className="font-medium flex items-center gap-2"><AlertTriangle className="size-4"/>Why this reached the GM</h3><p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">{reason}</p></div>
    {Boolean(e.agent_flags?.semanticRequiresConfirmation?.length)&&<div className="space-y-1"><h3 className="font-medium">Questions flagged for staff confirmation</h3><ul className="list-inside list-disc text-sm text-muted-foreground">{e.agent_flags!.semanticRequiresConfirmation!.slice(0,8).map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
    <div><h3 className="font-medium">Original customer enquiry</h3><p className="mt-1 whitespace-pre-wrap text-sm">{e.message}</p></div>
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground"><span>Received: {new Date(e.created_at).toLocaleString('en-IN')}</span><span>Category: {e.category.replaceAll('_',' ')}</span><span>Customer: {e.contact_name}</span></div>
    {!!missing.length&&<div className="rounded-lg border border-border bg-muted/30 p-3 text-sm"><h3 className="font-medium">What staff may need to clarify</h3><p className="mt-1 text-muted-foreground">The enquiry currently lacks verified information for: {missing.join(', ')}. Ask staff to confirm these with the guest; this is not proof of a capacity problem.</p></div>}
    {!!reviewed.length&&<div><h3 className="font-medium">Recorded requirements (review before relying on them)</h3><dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{reviewed.map(([key,value])=><div key={key} className="rounded-lg border p-2 text-sm"><dt className="text-xs text-muted-foreground">{key.replace(/([A-Z])/g,' $1')}</dt><dd>{String(value)}</dd></div>)}</dl></div>}
    {e.latest_client_followup&&<div className="space-y-1"><h3 className="font-medium">Latest actual client discussion recorded by staff</h3><p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">{e.latest_client_followup.summary}</p><p className="text-xs text-muted-foreground">{e.latest_client_followup.channel} · {new Date(e.latest_client_followup.contactedAt).toLocaleString('en-IN')} · Staff-attested, external delivery not independently verified</p></div>}
    {e.draft_body&&<div><h3 className="font-medium">Current staff reply draft — not proof of delivery</h3><p className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{e.draft_body}</p></div>}
    <div className="space-y-2"><label htmlFor={'gm-note-'+e.id} className="text-sm font-medium">GM decision and instructions to staff (required)</label><Textarea id={'gm-note-'+e.id} aria-label="GM decision and instructions to staff" value={note} onChange={ev=>setNote(ev.target.value)} maxLength={2000} rows={4} placeholder="Explain what you verified, whether the complaint is resolved, and exactly what staff should do next."/><p className="text-xs text-muted-foreground">The note is saved to PostgreSQL and appears in the staff inbox. No email or WhatsApp message is sent automatically.</p></div>
    <div className="flex flex-wrap gap-2"><Button disabled={m.isPending||note.trim().length<10} onClick={()=>act('RESOLUTION_APPROVED')}><Check/> Approve resolution & notify staff</Button><Button variant="quiet" disabled={m.isPending||note.trim().length<10} onClick={()=>act('ACTION_REQUIRED')}><Undo2/> Return with instructions</Button></div>
    <p className="text-xs text-muted-foreground">These actions resolve or return the escalation only. Event resource reservations require separate GM approval.</p>
  </div>}
 </li>;
}

function PlanCard({ a, e }: { a: StaffAllocation; e?: Enquiry }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const m = useMutation({
    mutationFn: (to: "Approved" | "Changes requested") => api.moveAllocation(a.enquiryId, to, "gm", note),
    onSuccess: (r) => { toast.success(r.status === "Approved" ? "Staffing plan approved. Event reservation needs separate GM approval" : "Sent back for changes"); qc.invalidateQueries({ queryKey: ["allocations"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="panel space-y-4 p-5">
      <div><p className="eyebrow">{a.enquiryId} · {e?.from}</p><h3 className="text-lg font-light">{e?.subject ?? a.enquiryId}</h3>{e?.requirements && <p className="text-sm text-muted-foreground">{e.requirements.guests ?? "?"} guests · {e.requirements.rooms ?? "?"} rooms</p>}</div>
      <StaffCountsView counts={a.counts} />
      {a.notes && <p className="rounded-lg bg-muted p-3 text-sm">{a.notes}</p>}
      <Textarea aria-label="Note to staff" placeholder="Note to staff (optional)" rows={2} value={note} onChange={(ev) => setNote(ev.target.value)} className="rounded-xl" />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => m.mutate("Approved")} disabled={m.isPending}><Check /> Approve</Button>
        <Button variant="ghost" onClick={() => m.mutate("Changes requested")} disabled={m.isPending}><Undo2 /> Request changes</Button>
      </div>
    </div>
  );
}

/** Additional review section within the ORIGINAL Lovable GM Dashboard. */
function EventBundles(){
 const q=useQuery({queryKey:['gm-event-approvals'],queryFn:listGmEventApprovals,refetchInterval:15000});
 if(q.isPending)return <CardSkeletons n={1}/>;
 if(q.isError)return <div className="panel p-4 text-sm text-destructive">Unable to load event approvals: {(q.error as Error).message}</div>;
 if(!q.data?.length)return <EmptyState title="No event bundles awaiting GM approval"/>;
 return <div className="space-y-3">{q.data.map(item=><EventBundleCard key={item.event_id} item={item}/>)}</div>;
}
function EventBundleCard({item}:{item:PendingEventApproval}){
 const qc=useQueryClient();const [note,setNote]=useState('');
 const m=useMutation({mutationFn:(approve:boolean)=>gmEventDecision(item.event_id,approve,note),onSuccess:()=>{toast.success('GM decision recorded; availability rechecked atomically');qc.invalidateQueries({queryKey:['gm-event-approvals']});qc.invalidateQueries({queryKey:['enquiries']});},onError:e=>toast.error((e as Error).message)});
 return <article className="panel space-y-3 p-5">
  <div><p className="eyebrow">{item.public_ref} · {item.event_date}</p><h3 className="text-lg font-light">{item.title}</h3><p className="text-sm text-muted-foreground">{item.guests} guests · {item.rooms_required} rooms · {item.event_staff} staff · Requested by reservations team</p></div>
  <Textarea aria-label="GM event decision note" value={note} onChange={e=>setNote(e.target.value)} placeholder="Decision note (optional)" rows={2} />
  <p className="text-xs text-muted-foreground">Approval rechecks all rooms and resource slots in a PostgreSQL transaction. A competing reservation will block it.</p>
  <div className="flex gap-2"><Button disabled={m.isPending} onClick={()=>m.mutate(true)}><Check/> Approve and reserve</Button><Button variant="quiet" disabled={m.isPending} onClick={()=>m.mutate(false)}><Undo2/> Request changes</Button></div>
 </article>;
}
