import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, Notice } from "@/components/estate/states";
import { StatusChip } from "@/components/estate/status-chip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, fmtDate } from "@/lib/estate/pricing";
import type { Alternative, EventRequirements, FeasibilityResult, ResourceCheck } from "@/lib/estate/types";
import { cn } from "@/lib/utils";
import { ClientAlternativesPanel } from "@/components/estate/client-alternatives-panel";
import { reviewMissing, isDayEvent, canSubmitReview } from "@/lib/estate/event-review";
import { api, evaluateEnquiry, selectEnquiryAlternative, listEventProposals, getEventReview, recordClientConfirmation, escalateEnquiryComplaint, type ApproveResult } from "@/services/api";

export const Route = createFileRoute("/staff/workbench/$enquiryId")({ component: Workbench });

const reviewedCategory = (r: EventRequirements | null | undefined) =>
  r?.eventType === 'Wedding' ? 'Wedding' : r?.eventType === 'Corporate offsite' ? 'Offsite' : r?.eventType === 'Celebration' ? 'Other events' : null;


const VERDICT = {
  FEASIBLE: { label: "Feasible", icon: CheckCircle2, cls: "bg-success-soft text-success border-success/30", body: "Every configured required resource has sufficient capacity for the modeled stay and event-day slots." },
  NOT_FEASIBLE: { label: "Not feasible", icon: XCircle, cls: "bg-danger-soft text-destructive border-destructive/30", body: "At least one resource is short on these dates." },
  NEEDS_REVIEW: { label: "Needs review", icon: HelpCircle, cls: "bg-warning-soft text-warning border-warning/30", body: "Required inventory or details are not verified. Ask staff to confirm missing information or configure the actual venue capacity." },
} as const;

function Workbench() {
  const { enquiryId } = Route.useParams();
  const qc = useQueryClient();
  const enq = useQuery({ queryKey: ["enquiry", enquiryId], queryFn: () => api.getEnquiry(enquiryId) });
  const eventState = useQuery({queryKey:["event-state",enquiryId],queryFn:async()=>{
    const list=await listEventProposals();return list.items.find(event=>event.enquiry_id===enquiryId)??null;
  }});
  const [req, setReq] = useState<EventRequirements | null>(null);
  const [selectedAlt, setSelectedAlt] = useState<string | null>(null);
  const [approval, setApproval] = useState<ApproveResult | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [confirmationChannel,setConfirmationChannel]=useState<'email'|'whatsapp'|'manual'>('email');
  const review=useQuery({queryKey:['event-review',eventState.data?.id],queryFn:()=>getEventReview(eventState.data!.id),enabled:Boolean(eventState.data?.id),refetchInterval:5000});
  const confirmClient=useMutation({mutationFn:()=>recordClientConfirmation(eventState.data!.id,confirmationChannel),onSuccess:()=>{toast.success('Staff-confirmed client handoff recorded');qc.invalidateQueries({queryKey:['event-review',eventState.data?.id]});qc.invalidateQueries({queryKey:['enquiries']});qc.invalidateQueries({queryKey:['enquiries-paged']});qc.invalidateQueries({queryKey:['enquiry',enquiryId]});}});
  const escalateComplaint=useMutation({mutationFn:(reason:string)=>escalateEnquiryComplaint(enquiryId,reason),onSuccess:()=>{toast.success('Complaint escalated separately to GM');qc.invalidateQueries({queryKey:['enquiries-paged']});qc.invalidateQueries({queryKey:['enquiry',enquiryId]});},onError:e=>toast.error((e as Error).message)});


  useEffect(() => { if (enq.data?.requirements && !req) setReq(enq.data.requirements); }, [enq.data, req]);

  const feas=useMutation({mutationFn:async(r:EventRequirements)=>{
    // Keep the reviewed event-staff request and the role planner in sync.
    const category=reviewedCategory(r);
    if(!category)throw new Error('Choose a reviewed event type before evaluation');
    const fields=reviewMissing(r);
    if(fields.length)throw new Error(`Complete staff review first: ${fields.join(', ')}`);
    await api.updateEnquiry(enquiryId,{category,requirements:r});
    return evaluateEnquiry(enquiryId,r);
  },onSuccess:(_data,submitted)=>{setLastSaved(JSON.stringify(submitted));qc.invalidateQueries({queryKey:['enquiry',enquiryId]});qc.invalidateQueries({queryKey:['enquiries-paged']});qc.invalidateQueries({queryKey:['event-state',enquiryId]});qc.invalidateQueries({queryKey:['allocations']});},onError:(error)=>toast.error((error as Error).message)});
  const altSelect=useMutation({mutationFn:(day:string)=>selectEnquiryAlternative(enquiryId,day),onSuccess:()=>{if(selectedAlt&&req){setReq({...req,startDate:selectedAlt});setSelectedAlt(null);feas.reset();}}});
  const saveCorrection=useMutation({mutationFn:(submitted:EventRequirements)=>api.updateEnquiry(enquiryId,{category:reviewedCategory(submitted)??undefined,requirements:submitted}),onSuccess:(saved,submitted)=>{setLastSaved(JSON.stringify(submitted));toast.success('Reviewed requirements and classification saved');qc.setQueryData(['enquiry',enquiryId], saved);qc.invalidateQueries({queryKey:['enquiries-paged']});},onError:(error)=>toast.error((error as Error).message)});

  const approve = useMutation({
    mutationFn: () => api.approveReservation(enquiryId, req!),
    onSuccess: (r) => { setApproval(r); qc.invalidateQueries({ queryKey: ["enquiries"] }); qc.invalidateQueries({queryKey:["event-review",eventState.data?.id]}); qc.invalidateQueries({queryKey:["event-state",enquiryId]}); },
  });

  if (enq.isPending) return <div className="space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64 rounded-2xl" /></div>;
  if (!enq.data || !enq.data.requirements) return <EmptyState title="No event requirements for this enquiry" action={<Button asChild variant="quiet"><Link to="/staff/inbox" search={{ enquiryId }}>Back to inbox</Link></Button>} />;
  const e = enq.data;
  const r = req ?? e.requirements!;
  const result = feas.data?.result;
  const alts = feas.data?.alternatives ?? [];
  const checking = feas.isPending;
  const committed = eventState.data?.status === "RESERVED" || review.data?.status === 'GM_APPROVED' || review.data?.status === 'CLIENT_CONFIRMED';
  const pendingGM=approval?.status==='pending'||review.data?.status==='PENDING_GM'||e.status==='Pending GM';
  const incomplete = reviewMissing(r);
  const typeSaved = reviewedCategory(r) === e.category;
  const hasLocalEdits = lastSaved !== null ? lastSaved !== JSON.stringify(r) : JSON.stringify(r) !== JSON.stringify(e.requirements);
  const readyToEvaluate = canSubmitReview(r) && !committed && !pendingGM && e.status !== 'Escalated';
  const canApprove = result?.verdict === "FEASIBLE" && !checking && !committed && !pendingGM && !feas.isError && !hasLocalEdits && typeSaved && e.status !== 'Escalated';
  const workflowStage = review.data?.status === 'CLIENT_CONFIRMED' || e.status === 'Client confirmed' ? 4
    : committed ? 3 : pendingGM ? 2 : result?.verdict === 'FEASIBLE' ? 1 : 0;
  const steps = ['Staff review','Feasibility checked','Awaiting GM','Venue reserved','Client confirmation recorded'];

  return (
    <div className="space-y-6">
      <Link to="/staff/inbox" search={{ enquiryId }} className="text-sm text-muted-foreground hover:text-foreground">← Inbox</Link>

      {/* A — overview */}
      <header className="panel grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
        <div className="min-w-0">
          <p className="eyebrow">{e.id} · Assigned to {e.assignee}</p>
          <h1 className="mt-1 text-3xl font-light">{e.subject}</h1>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <div><dt className="inline">Dates: </dt><dd className="inline text-foreground">{r.startDate ? (isDayEvent(r) ? `${fmtDate(r.startDate)} (day event)` : `${fmtDate(r.startDate)} – ${fmtDate(addDays(r.startDate, r.nights ?? 1))}`) : "Missing"}</dd></div>
            <div><dt className="inline">Guests: </dt><dd className="inline text-foreground">{r.guests ?? "—"}</dd></div>
            <div><dt className="inline">Rooms: </dt><dd className="inline text-foreground">{r.rooms ?? "Not reviewed"}</dd></div>
          </dl>
        </div>
        <StatusChip tone={committed ? "success" : "neutral"} dot>{workflowStage===4 ? "Client confirmation recorded" : committed ? "Reservation committed" : pendingGM ? "Pending GM review" : e.status}</StatusChip>
      </header>
      <nav aria-label="Event approval progress" className="flex flex-wrap gap-2 text-xs">
        {steps.map((label,index)=><span key={label} aria-current={index===workflowStage?'step':undefined} className={cn('rounded-full border px-3 py-1.5',index<=workflowStage?'border-primary/30 bg-primary/5 text-foreground':'border-border text-muted-foreground')}>{index<workflowStage?'✓ ':index===workflowStage?'• ':''}{label}</span>)}
      </nav>

      {e.gmReview && <section className="panel space-y-2 p-4" aria-label="GM escalation decision">
        <StatusChip tone={e.gmReview.decision==='RESOLUTION_APPROVED'?'success':'warning'}>{e.gmReview.decision==='RESOLUTION_APPROVED'?'GM resolution approved':'GM requested further staff action'}</StatusChip>
        <p className="whitespace-pre-wrap text-sm">{e.gmReview.note}</p>
        <p className="text-xs text-muted-foreground">This review concerns the complaint only; it is not GM booking authorization.</p>
      </section>}
      <section className="panel space-y-4 p-5">
        <h2 className="text-lg font-medium">Staff review of event requirements</h2>
        <p className="text-xs text-muted-foreground">Dates and quantities must be confirmed by staff. Evaluation creates or updates an unreserved event proposal in PostgreSQL; no AI action can commit it.</p>
        <p className="text-xs text-muted-foreground">Event type and venue are preselected from the form or enquiry text. These are proposals for staff verification, not a statement of availability.</p>
        <label className="block max-w-sm text-xs text-muted-foreground">Enquiry / event type
          <select aria-label="Reviewed event type" disabled={committed||pendingGM||e.status==='Escalated'} value={r.eventType??'Unspecified'} onChange={event=>{setReq({...r,eventType:event.target.value as NonNullable<EventRequirements['eventType']>});feas.reset();setApproval(null);}} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="Wedding">Wedding</option>
            <option value="Corporate offsite">Corporate offsite</option>
            <option value="Celebration">Other events / private celebration</option>
            <option value="Unspecified">Unknown / clarify event type</option>
          </select>
        </label>
        <p className="text-xs text-muted-foreground">The event category and venue are independent: a birthday or offsite may request the lawn. Availability is checked for the actual selected venue.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="quiet" disabled={committed||pendingGM||e.status==='Escalated'} onClick={()=>{setReq({...r,rooms:0,nights:0});feas.reset();setApproval(null);}}>No overnight accommodation (0 rooms / 0 nights)</Button>
          <Button size="sm" variant="quiet" disabled={committed||pendingGM||e.status==='Escalated'} onClick={()=>{setReq({...r,diningCovers:0});feas.reset();setApproval(null);}}>No catering required</Button>
          <Button size="sm" variant="quiet" disabled={committed||pendingGM||e.status==='Escalated'} onClick={()=>{setReq({...r,parking:0});feas.reset();setApproval(null);}}>No parking required</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([['startDate','Event date'],['nights','Stay nights'],['guests','Guests'],['rooms','Rooms'],['diningCovers','Dining covers'],['parking','Parking spaces'],['eventStaff','Event staff']] as const).map(([key,label])=><label key={key} className="text-xs text-muted-foreground">{label}<input type={key==='startDate'?'date':'number'} min={key==='startDate'?undefined:0} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" disabled={committed||pendingGM||e.status==='Escalated'} value={r[key]??''} onChange={e=>{const value=key==='startDate'?e.target.value:(e.target.value===''?null:Number(e.target.value));setReq({...r,[key]:value});feas.reset();setApproval(null);}} /></label>)}
        </div>
        <label className="block max-w-sm text-xs text-muted-foreground">Requested / reviewed venue
          <select aria-label="Requested event venue" disabled={committed||pendingGM||e.status==='Escalated'} value={r.venuePreference ?? (r.needsLawn ? "LAWN" : "UNCONFIRMED")} onChange={e=>{const venue=e.target.value as NonNullable<EventRequirements["venuePreference"]>;setReq({...r,venuePreference:venue,needsLawn:venue==="LAWN"});feas.reset();setApproval(null);}} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="LAWN">Wedding lawn (configured and capacity-checked)</option>
            <option value="CONFERENCE_HALL">Conference / meeting hall (unconfigured — manual verification)</option>
            <option value="PLANTATION_PAVILION">Plantation pavilion / celebration venue (unconfigured — manual verification)</option>
            <option value="UNCONFIRMED">Venue undecided — clarify with guest</option>
          </select>
        </label>
        {(hasLocalEdits || !typeSaved) && !committed && !pendingGM && <p className="text-xs text-muted-foreground" role="status">Unsaved staff review. Saving updates the enquiry category and reviewed requirements; it does not reserve any resources.</p>}
        {r.venuePreference && !['LAWN','UNCONFIRMED'].includes(r.venuePreference) && <Notice title="Venue capacity not yet configured">You can save and evaluate this venue. GM booking authorization remains blocked until its real capacity is configured in PostgreSQL; the system will not replace it with the lawn.</Notice>}
        {incomplete.length>0 && <Notice tone="warning" title="Complete before feasibility">{incomplete.join(' · ')}. For a day-only event, choose “No overnight accommodation.” Enter zero for services not requested instead of leaving them unknown.</Notice>}
        {pendingGM && <Notice tone="info" title="Requirements locked for GM review">The submitted proposal cannot be edited until the GM decides.</Notice>}
        <div className="flex flex-wrap gap-2"><Button variant="quiet" disabled={saveCorrection.isPending||committed||pendingGM||e.status==='Escalated'||!reviewedCategory(r)} onClick={()=>saveCorrection.mutate(r)}>Save staff corrections</Button><Button disabled={feas.isPending||!readyToEvaluate} onClick={()=>feas.mutate(r)}>Create/recheck proposal</Button></div>
        {saveCorrection.isError&&<Notice tone="danger" title="Correction not saved">{(saveCorrection.error as Error).message}</Notice>}
        {feas.isError&&<Notice tone="danger" title="Feasibility not completed">{(feas.error as Error).message}</Notice>}
      </section>
      {/* B — verdict */}
      {checking ? (
        <div className="panel flex items-center gap-3 p-6 text-sm" role="status"><Loader2 className="size-5 animate-spin text-primary" /> Checking PostgreSQL room nights and day-level lawn, catering, parking and staff slots…</div>
      ) : result ? (<Verdict result={result} />) : <Notice title="Awaiting staff review">Confirm requirements and click Create/recheck proposal. No reservation exists yet.</Notice>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {/* C — readiness */}
          <section className="panel p-5 md:p-6">
            <h2 className="mb-4 text-lg font-medium">Resource readiness</h2>
            {checking ? <div className="space-y-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}</div>
              : !result || result.resources.length === 0 ? <div className="space-y-3 text-sm text-muted-foreground"><p>Review details above, then create or recheck a proposal. No capacity has been reserved.</p>{incomplete.length ? <ul className="list-inside list-disc space-y-1">{incomplete.map(item=><li key={item}>{item}</li>)}</ul> : <p>All input fields are reviewed. Run feasibility to check live availability.</p>}</div>
              : <ul className="space-y-4">{result.resources.map((res) => <ResourceRow key={res.key} r={res} />)}</ul>}
          </section>

          {/* D — bottleneck */}
          {result && result.bottlenecks.length > 0 && (
            <Notice tone="warning" title="Bottleneck">{result.bottlenecks.map((b) => <p key={b}>{b}</p>)}</Notice>
          )}

          {/* E — graph */}
          {result && result.resources.length > 0 && <Graph resources={result.resources} />}
          <section className="panel space-y-3 p-5" aria-label="Separate complaint escalation">
            <h2 className="text-base font-medium">Complaint escalation (separate from booking)</h2>
            <p className="text-xs text-muted-foreground">Use only if the guest raised a complaint. Escalation creates an audit record and blocks booking approval until GM review.</p>
            {e.status !== 'Escalated' ? <Button variant="outline" disabled={escalateComplaint.isPending||committed} onClick={()=>{const reason=window.prompt('Describe the customer complaint for GM review (Cancel to keep the enquiry unchanged):');if(reason?.trim())escalateComplaint.mutate(reason.trim());}}> <AlertTriangle className="size-4"/> Escalate complaint to GM</Button> : <StatusChip tone="danger">Complaint escalated to GM</StatusChip>}
            {escalateComplaint.isError && <Notice tone="danger" title="Complaint escalation failed">{(escalateComplaint.error as Error).message}</Notice>}
          </section>
        </div>

        <div className="space-y-6">
          {/* F — alternatives */}
          {result?.verdict === "NOT_FEASIBLE" && (
            <section className="panel p-5">
              <h2 className="text-lg font-medium">Verified alternatives</h2>
              <p className="mb-4 text-xs text-muted-foreground">Each option is verified against PostgreSQL availability and must be revalidated during approval.</p>
              {alts.length === 0 ? (
                <p className="rounded-xl bg-muted p-4 text-sm">No verified alternatives within 14 days. Consider splitting the event or reducing guest count with the client.</p>
              ) : (
                <ul className="space-y-2">
                  {alts.map((a: Alternative) => (
                    <li key={a.id}>
                      <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm", selectedAlt === a.id ? "border-primary bg-accent" : "border-border")}>
                        <input type="radio" name="alt" className="mt-1 accent-primary" checked={selectedAlt === a.id} onChange={() => setSelectedAlt(a.id)} />
                        <span className="flex-1"><span className="font-medium">{fmtDate(a.startDate, { weekday: "short", day: "numeric", month: "short" })} – {fmtDate(a.endDate)}</span><span className="block text-xs text-muted-foreground">{a.changes}</span></span>
                        <StatusChip tone="success">Feasible</StatusChip>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {alts.length > 0 && (
                <Button className="mt-3 w-full" variant="quiet" disabled={!selectedAlt||altSelect.isPending} onClick={()=>selectedAlt&&altSelect.mutate(selectedAlt)}>Select verified alternative (no reservation)</Button>
              )}
            </section>
          )}

          {(result?.verdict === 'NOT_FEASIBLE' || result?.verdict === 'NEEDS_REVIEW') && !committed && !pendingGM && <ClientAlternativesPanel enquiry={e} blockers={result.bottlenecks} />}

          {/* G — approval */}
          <section className="panel space-y-3 p-5">
            <h2 className="text-lg font-medium">Staff approval, GM escalation & confirmation</h2>
            {committed ? (
              <Notice tone="success" title="Reservation committed">{approval?.status === "committed" ? `Bundle ${approval.holdReference} atomically reserved in PostgreSQL.` : "This bundle was already approved."}</Notice>
            ) : pendingGM ? (
              <Notice tone="info" title="Awaiting General Manager approval">No resources have been reserved. The GM must recheck availability and authorize the bundle.</Notice>
            ) : approval?.status === "conflict" ? (
              <Notice tone="danger" title="Conflict on approval">{approval.message}</Notice>
            ) : (
              <p className="text-sm text-muted-foreground">{canApprove ? "Proposed bundle — clicking approval sends the request to the GM. The database will reserve resources only after GM authorization." : "Approval is disabled until the bundle is feasible and complete."}</p>
            )}

            <div className="grid gap-2">
              <Button onClick={() => approve.mutate()} disabled={!canApprove || approve.isPending}>{approve.isPending ? "Submitting…" : "Submit feasible proposal to GM"}</Button>
              <p className="text-xs text-muted-foreground">Staff review submits a feasible proposal for GM authorization; no capacity is reserved until GM approval.</p>
              {review.data?.status==='GM_APPROVED' && <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-sm font-medium">GM-approved reservation — client confirmation</p>
                <p className="text-xs text-muted-foreground">Use an external email or WhatsApp composer to actually send the message; then record the action below. Opening a composer is not delivery.</p>
                <div className="flex flex-wrap gap-2">
                  {e.email&&<Button variant="quiet" asChild><a href={`mailto:${e.email}?subject=${encodeURIComponent('EstateFlow event reservation confirmation')}&body=${encodeURIComponent(`Hello ${e.from},\n\nYour event resource reservation has been approved for ${r.startDate}. Please contact our team for final arrangements.\n\nEstateFlow Reservations`)}`}>Open confirmation email</a></Button>}
                  {e.phone&&<Button variant="quiet" asChild><a target="_blank" rel="noreferrer" href={`https://wa.me/${e.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hello ${e.from}, your EstateFlow event reservation for ${r.startDate} has been approved. Our team will follow up with the details.`)}`}>Open WhatsApp</a></Button>}
                </div>
                <label className="text-xs text-muted-foreground">How was the confirmation actually sent?
                 <select aria-label="Confirmation channel" value={confirmationChannel} onChange={ev=>setConfirmationChannel(ev.target.value as typeof confirmationChannel)} className="mt-1 w-full rounded-lg border bg-background p-2 text-sm"><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="manual">Other manual channel</option></select>
                </label>
                <Button variant="outline" disabled={confirmClient.isPending||review.data?.status!=='GM_APPROVED'} onClick={()=>{if(window.confirm('Have you actually sent the confirmation to the guest using this channel?'))confirmClient.mutate();}}>Booking approved — record client confirmation</Button>
                {confirmClient.isError&&<Notice tone="danger" title="Unable to record confirmation">{(confirmClient.error as Error).message}</Notice>}
              </div>}
              {review.data?.status==='CLIENT_CONFIRMED'&&<Notice tone="success" title="Client confirmation recorded">Staff attested delivery via {review.data.client_channel}. The API does not verify external message delivery.</Notice>}
              <Button variant="quiet" onClick={() => req && feas.mutate(req)} disabled={feas.isPending||!readyToEvaluate}><RefreshCw /> Re-evaluate</Button>
              <Button asChild variant="ghost"><Link to="/staff/inbox" search={{ enquiryId }}>Edit draft and request clarification</Link></Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Verdict({ result }: { result: FeasibilityResult }) {
  const v = VERDICT[result.verdict];
  return (
    <section aria-live="polite" className={cn("fade-up flex items-start gap-4 rounded-2xl border p-5 md:p-6", v.cls)}>
      <v.icon className="size-8 shrink-0" />
      <div>
        <p className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{v.label.toUpperCase()}</p>
        <p className="mt-1 text-sm text-foreground/80">{v.body}</p>
        {result.missing.length > 0 && <p className="mt-1 text-sm text-foreground/80">Missing: {result.missing.join(", ")}.</p>}
      </div>
    </section>
  );
}

function ResourceRow({ r }: { r: ResourceCheck }) {
  const skip = r.required === 0;
  const pct = skip ? 0 : Math.min(100, (r.required / Math.max(r.available, 1)) * 100);
  return (
    <li>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium">{r.label}</span>
        <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
          {skip ? "Not required" : `${r.required} needed · ${r.available} available ${r.unit}`}
          {!skip && (r.ok ? <StatusChip tone="success">Ready</StatusChip> : <StatusChip tone="danger">Short {r.required - r.available}</StatusChip>)}
        </span>
      </div>
      {!skip && <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden><div className={cn("h-full rounded-full", r.ok ? "bg-primary" : "bg-destructive")} style={{ width: `${pct}%` }} /></div>}
    </li>
  );
}

function Graph({ resources }: { resources: ResourceCheck[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const nodes = resources.filter((r) => r.required > 0);
  const cx = 300, cy = 150, R = 115;
  return (
    <section className="panel p-5 md:p-6">
      <h2 className="mb-2 text-lg font-medium">Requirement graph</h2>
      <p className="mb-2 text-xs text-muted-foreground">Supplementary view — the readiness list above is the source of truth.</p>
      <svg viewBox="0 0 600 300" className="w-full" role="img" aria-label="Event resource dependency graph">
        {nodes.map((n, i) => {
          const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(a) * R * 1.9, y = cy + Math.sin(a) * R;
          const dim = hover && hover !== n.key;
          return (
            <g key={n.key} onMouseEnter={() => setHover(n.key)} onMouseLeave={() => setHover(null)} className="transition-opacity" opacity={dim ? 0.35 : 1}>
              <line x1={cx} y1={cy} x2={x} y2={y} className={n.ok ? "stroke-sage" : "stroke-destructive"} strokeWidth={n.ok ? 1.5 : 2.5} strokeDasharray={n.ok ? "" : "6 4"} />
              <rect x={x - 62} y={y - 22} width={124} height={44} rx={22} className={n.ok ? "fill-card stroke-border" : "fill-danger-soft stroke-destructive"} />
              <text x={x} y={y - 2} textAnchor="middle" className="fill-foreground text-[12px] font-medium">{n.label}</text>
              <text x={x} y={y + 13} textAnchor="middle" className={cn("text-[10px]", n.ok ? "fill-muted-foreground" : "fill-destructive")}>{n.required}/{n.available} {n.unit}</text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={40} className="fill-primary" />
        <text x={cx} y={cy + 4} textAnchor="middle" className="fill-primary-foreground text-[12px] font-medium">Event</text>
      </svg>
      {nodes.some((n) => !n.ok) && <p className="flex items-center gap-2 text-xs text-destructive"><AlertTriangle className="size-3.5" /> Dashed red links are conflicts.</p>}
    </section>
  );
}
