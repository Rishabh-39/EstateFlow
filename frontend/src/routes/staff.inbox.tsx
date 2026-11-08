import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, MessageCircle, ArrowRight, Search } from "lucide-react";
import conciergeImg from "@/assets/ai-concierge.png";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState, Notice } from "@/components/estate/states";
import { StatusChip } from "@/components/estate/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { missingFields } from "@/lib/estate/feasibility";
import { fmtDate } from "@/lib/estate/pricing";
import type { Enquiry, EnquiryCategory } from "@/lib/estate/types";
import { cn } from "@/lib/utils";
import { api, listEnquiriesPaged, listEventProposals, recordClientConfirmation, escalateEnquiryComplaint, acknowledgeGmDecision } from "@/services/api";
import { http, json } from "@/services/api/http";

export const Route = createFileRoute("/staff/inbox")({
  validateSearch: (search: Record<string, unknown>) => ({
    enquiryId: typeof search.enquiryId === "string" ? search.enquiryId.slice(0, 100) : undefined,
  }),
  component: InboxPage,
});

const CATS: (EnquiryCategory | "All" | "Confirmed events")[] = ["All", "Wedding", "Offsite", "Other events", "Room", "Complaint", "Unsorted", "Confirmed events"];
const catTone = (c: EnquiryCategory): "danger" | "warning" | "coffee" | "brand" =>
  c === "Complaint" ? "danger" : c === "Unsorted" ? "warning" : c === "Wedding" ? "coffee" : "brand";

function InboxPage() {
  const [term, setTerm] = useState("");
  const [search,setSearch]=useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [requestedPage,setRequestedPage] = useState(1);
  const bookingStatus: "all" | "confirmed" = cat === "Confirmed events" ? "confirmed" : "all";
  // Keep selected enquiry in the URL. Server resolves its actual server page on return.
  const { enquiryId } = Route.useSearch();
  const navigate = useNavigate();
  useEffect(()=>{const t=window.setTimeout(()=>{setSearch(term.trim());setRequestedPage(1);},300);return()=>window.clearTimeout(t);},[term]);
  const codeByCategory:Record<string,string>={Wedding:'WEDDING',Offsite:'CORPORATE_OFFSITE','Other events':'OTHER_EVENT',Room:'ROOM_BOOKING',Complaint:'COMPLAINT',Unsorted:'UNKNOWN'};
  const q=useQuery({queryKey:['enquiries-paged',requestedPage,cat,search,enquiryId,bookingStatus],queryFn:()=>listEnquiriesPaged(requestedPage,cat==='All'||cat==='Confirmed events'?null:codeByCategory[cat],search,enquiryId,bookingStatus),refetchInterval:3000});
  const selectedItemRef = useRef<HTMLLIElement | null>(null);
  const listScrollRef = useRef<HTMLUListElement | null>(null);
  // Keep the selected enquiry visible INSIDE the left list without scrolling the
  // entire page when returning from the feasibility workbench.
  useEffect(() => {
    const panel = listScrollRef.current;
    const item = selectedItemRef.current;
    if (!enquiryId || !q.isSuccess || !panel || !item) return;
    const viewport = panel.getBoundingClientRect();
    const selected = item.getBoundingClientRect();
    if (selected.top < viewport.top) panel.scrollTop += selected.top - viewport.top;
    else if (selected.bottom > viewport.bottom) panel.scrollTop += selected.bottom - viewport.bottom;
  }, [enquiryId, q.isSuccess, q.data?.page]);
  useEffect(() => { listScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' }); }, [requestedPage, cat, search, bookingStatus]);
  const selectEnquiry = (id: string) => {
    void navigate({ to: "/staff/inbox", search: { enquiryId: id }, replace: true });
  };

  const list=q.data?.items??[];
  const current=list.find(e=>e.id===enquiryId)??list[0];
  const page=q.data?.page??requestedPage;
  const pages=q.data?.pages??1;
  const movePage=(next:number)=>{
    setRequestedPage(next);
    void navigate({to:'/staff/inbox',search:{enquiryId:undefined},replace:true});
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light">Enquiry inbox</h1>
      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-6 lg:h-[min(760px,calc(100dvh-3rem))] lg:min-h-0 lg:self-start" aria-label="Enquiry list and filters">
          <div className="relative shrink-0"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search enquiries" placeholder="Search" value={term} onChange={(e) => setTerm(e.target.value)} className="h-10 rounded-full pl-9" /></div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {CATS.map((c) => <button key={c} type="button" title={c==='Confirmed events'?'Confirmed event bookings':undefined} aria-label={c==='Confirmed events'?'Confirmed event bookings':undefined} onClick={() => {setCat(c);setRequestedPage(1);void navigate({to:"/staff/inbox",search:{enquiryId:undefined},replace:true});}} aria-pressed={cat === c} className={cn("rounded-full border px-3 py-1 text-xs", cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{c==='Confirmed events'?`Confirmed events (${q.data?.confirmedCount??'…'})`:c}</button>)}
          </div>
          {q.isPending ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            : q.isError ? <ErrorState onRetry={() => q.refetch()} />
            : list.length === 0 ? <EmptyState title="No enquiries match" body="Try another filter." />
            : (
              <ul ref={listScrollRef} aria-label="Enquiries, scroll independently" className="panel min-h-0 max-h-[55dvh] divide-y divide-border overflow-y-auto overscroll-contain lg:max-h-none lg:flex-1">
                {list.map((e) => (
                  <li key={e.id} ref={current?.id === e.id ? selectedItemRef : undefined}>
                    <button onClick={() => selectEnquiry(e.id)} aria-current={current?.id === e.id} className={cn("w-full space-y-1 p-4 text-left transition-colors hover:bg-muted", current?.id === e.id && "bg-accent")}>
                      <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{e.from}</span><span className="shrink-0 text-xs text-muted-foreground">{e.channel}</span></div>
                      <p className="truncate text-sm text-muted-foreground">{e.subject}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusChip tone={catTone(e.category)}>{e.category}</StatusChip>
                        {e.confidence < 0.7 && <StatusChip tone="warning">Uncertain</StatusChip>}
                        {e.priority === "High" && <StatusChip tone="danger" dot>High</StatusChip>}
                        <StatusChip>{e.status}</StatusChip>
                        {e.gmReview&&!e.gmReview.acknowledgedAt&&<StatusChip tone="warning">GM reply</StatusChip>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          {!q.isPending&&!q.isError&&<div className="flex shrink-0 items-center justify-between gap-2 px-1 text-sm" aria-label="Enquiry pagination">
            <Button variant="quiet" size="sm" disabled={page<=1} onClick={()=>movePage(page-1)}>← Prev</Button>
            <span className="text-xs text-muted-foreground">Page {page} of {pages} · {q.data?.total??0} enquiries · {q.data?.pageSize??10} per page</span>
            <Button variant="quiet" size="sm" disabled={page>=pages} onClick={()=>movePage(page+1)}>Next →</Button>
          </div>}
        </div>
        {current ? (
          <div key={current.id} tabIndex={0} role="region" aria-label="Selected enquiry details, scroll independently" className="min-w-0 lg:sticky lg:top-6 lg:max-h-[min(760px,calc(100dvh-3rem))] lg:overflow-y-auto lg:overscroll-contain lg:rounded-2xl">
            <Detail e={current} />
          </div>
        ) : !q.isPending && <EmptyState title="Select an enquiry" />}
      </div>
    </div>
  );
}

/** Opens WhatsApp with the draft; uses the guest's number when the enquiry came from one. */
function waLink(from: string, text: string) {
  const digits = from.replace(/\D/g, "");
  return `https://wa.me/${digits.length >= 10 && !from.includes("•") ? digits : ""}?text=${encodeURIComponent(text)}`;
}

function Detail({ e }: { e: Enquiry }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(e.draftReply);
  const [sent, setSent] = useState(false);
  const [confirmationChannel,setConfirmationChannel]=useState<'email'|'whatsapp'|'manual'>('email');
  const approvalEvent=useQuery({queryKey:['confirmation-event',e.id],queryFn:async()=>{const data=await listEventProposals();return data.items.find(x=>x.enquiry_id===e.id)??null;},enabled:e.status==='Approved'});
  const recordConfirmation=useMutation({mutationFn:async()=>{if(!approvalEvent.data)throw Error('This enquiry has no GM-approved event proposal');return recordClientConfirmation(approvalEvent.data.id,confirmationChannel);},onSuccess:()=>{toast.success('Client confirmation recorded');qc.invalidateQueries({queryKey:['enquiries-paged']});qc.invalidateQueries({queryKey:['enquiries']});},onError:error=>toast.error((error as Error).message)});
  const acknowledge=useMutation({mutationFn:()=>acknowledgeGmDecision(e.id,e.gmReview!.id),onSuccess:()=>{toast.success('GM instructions acknowledged');qc.invalidateQueries({queryKey:['enquiries-paged']});qc.invalidateQueries({queryKey:['enquiries']});},onError:err=>toast.error((err as Error).message)});
  const complaint=useMutation({mutationFn:()=>escalateEnquiryComplaint(e.id,'Reservations staff escalated the complaint to GM'),onSuccess:()=>{toast.success('Complaint escalated to GM');qc.invalidateQueries({queryKey:['enquiries-paged']});qc.invalidateQueries({queryKey:['enquiries']});},onError:error=>toast.error((error as Error).message)});
  useEffect(() => setDraft(e.draftReply), [e.draftReply]);
  const update = useMutation({
    mutationFn: (patch: Parameters<typeof api.updateEnquiry>[1]) => api.updateEnquiry(e.id, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["enquiries"] }); qc.invalidateQueries({ queryKey: ["enquiries-paged"] }); },
  });
  const save = useMutation({ mutationFn: () => api.saveDraftReply(e.id, draft), onSuccess: () => { toast.success("Draft saved"); qc.invalidateQueries({ queryKey: ["enquiries"] }); } });
  const regenerate = useMutation({mutationFn:()=>http(`/staff/enquiries/${e.id}/ai-process`,{...json({}),auth:true}),onSuccess:()=>{toast.success('AI reprocessed. Any human-edited draft is preserved.');qc.invalidateQueries({queryKey:['enquiries']});qc.invalidateQueries({queryKey:['enquiries-paged']});},onError:(error)=>toast.error((error as Error).message)});
  const send=useMutation({mutationFn:async()=>{const drafts=await http<{id:string;status:string}[]>(`/staff/enquiries/${e.id}/drafts`,{auth:true});const pending=drafts.find(d=>d.status==='DRAFT');if(!pending)throw Error('No draft pending review');await api.saveDraftReply(e.id,draft);return http(`/staff/drafts/${pending.id}/send-simulated`,{...json({}),auth:true});},onSuccess:()=>{setSent(true);toast.success('Simulated send recorded. No real message was sent.');qc.invalidateQueries({queryKey:['enquiries']});qc.invalidateQueries({queryKey:['enquiries-paged']});}});
  const missing = e.requirements ? missingFields(e.requirements) : [];

  return (
    <div className="panel fade-up h-fit min-w-0 self-start space-y-6 p-5 md:p-7">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0"><p className="eyebrow">{e.id} · {e.channel} · {new Date(e.receivedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p><h2 className="mt-1 text-2xl font-light">{e.subject}</h2><p className="text-sm text-muted-foreground">{e.from}{e.email && ` · ${e.email}`}</p></div>
        <span className="text-xs text-muted-foreground">Assigned: {e.assignee}</span>
      </div>
      <blockquote className="rounded-xl bg-muted p-4 text-sm leading-relaxed">{e.message}</blockquote>
      {e.gmReview&&<section className="space-y-3 rounded-xl border border-border p-4" aria-label="GM decision notification">
        <div className="flex flex-wrap items-center gap-2"><StatusChip tone={e.gmReview.decision==='RESOLUTION_APPROVED'?'success':'warning'}>{e.gmReview.decision==='RESOLUTION_APPROVED'?'GM approved resolution':'GM requested staff action'}</StatusChip>{!e.gmReview.acknowledgedAt&&<StatusChip tone="warning">New GM instructions</StatusChip>}</div>
        <p className="whitespace-pre-wrap text-sm">{e.gmReview.note}</p>
        <p className="text-xs text-muted-foreground">GM reviewed: {new Date(e.gmReview.decidedAt).toLocaleString('en-IN')}. This decision is separate from event booking approval.</p>
        {!e.gmReview.acknowledgedAt?<Button variant="quiet" disabled={acknowledge.isPending} onClick={()=>acknowledge.mutate()}>Mark GM instructions read</Button>:<p className="text-xs text-muted-foreground">Acknowledged by staff</p>}
      </section>}

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium"><img src={conciergeImg} alt="" aria-hidden="true" className="size-5 shrink-0 rounded-full object-cover ring-1 ring-border" /> Local AI extraction <span className="text-xs font-normal text-muted-foreground">(human review required)</span></h3>
        {e.confidence < 0.7 && (
          <Notice title={`Classification uncertain (${Math.round(e.confidence * 100)}% confidence)`}>Confirm the category below before acting.</Notice>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Category:</span>
          {(["Wedding", "Offsite", "Other events", "Room", "Complaint"] as const).map((c) => (
            <button key={c} onClick={() => update.mutate({ category: c })} aria-pressed={e.category === c} className={cn("rounded-full border px-3 py-1 text-xs", e.category === c ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40")}>{c}</button>
          ))}
        </div>
        {e.requirements && (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {([["Date", e.requirements.startDate ? fmtDate(e.requirements.startDate) : null], ["Nights", e.requirements.nights], ["Guests", e.requirements.guests], ["Rooms", e.requirements.rooms], ["Lawn", e.requirements.needsLawn ? "Yes" : "No"], ["Dining", e.requirements.diningCovers], ["Parking", e.requirements.parking], ["Staff", e.requirements.eventStaff]] as const).map(([k, v]) => (
              <div key={k} className={cn("rounded-lg border p-2.5", v === null ? "border-warning/40 bg-warning-soft" : "border-border")}><dt className="eyebrow">{k}</dt><dd className="mt-0.5">{v ?? "Missing"}</dd></div>
            ))}
          </dl>
        )}
        {missing.length > 0 && <p className="text-sm text-warning">Missing: {missing.join(", ")}. Ask the guest before checking feasibility.</p>}
        {(e.aiReviewNotes?.length ?? 0) > 0 && <p className="text-sm text-warning">Needs staff confirmation: {e.aiReviewNotes?.join("; ")}. Do not treat approximate values as confirmed.</p>}
        {e.requirements && (
          <Button asChild variant="quiet"><Link to="/staff/workbench/$enquiryId" params={{ enquiryId: e.id }}>Open feasibility workbench <ArrowRight /></Link></Button>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">Reply draft</h3><StatusChip tone={e.draftStatus==="SENT_SIMULATED"?"success":"warning"}>{e.draftStatus==="SENT_SIMULATED"?"Simulated send recorded":"Draft — not sent"}</StatusChip></div>
        <Textarea aria-label="Reply draft" rows={7} value={draft} onChange={(ev) => setDraft(ev.target.value)} className="rounded-xl" />
        {sent && <Notice tone="success" title="Marked as sent by staff">In this prototype nothing is actually emailed.</Notice>}
        <div className="flex flex-wrap gap-2">
          <Button variant="quiet" onClick={() => save.mutate()} disabled={save.isPending || draft === e.draftReply}>Save draft</Button>
          <Button variant="quiet" onClick={()=>{if(draft!==e.draftReply&&!window.confirm("Unsaved changes in this text box will be lost. Saved human edits are preserved. Regenerate AI draft?"))return;regenerate.mutate();}} disabled={regenerate.isPending}><img src={conciergeImg} alt="" aria-hidden="true" className="size-4 shrink-0 rounded-full object-cover ring-1 ring-border"/> Regenerate AI draft</Button>
  
          <Button onClick={()=>send.mutate()} disabled={sent||e.draftStatus==="SENT_SIMULATED"||send.isPending}>Mark reviewed & simulate send</Button>
          <Button variant="quiet" asChild>
            <a href={waLink(e.phone||e.from, draft)} target="_blank" rel="noopener noreferrer"
              onClick={ev=>{if(!window.confirm('Review the draft before opening WhatsApp. This will open WhatsApp for YOU to choose/send the message; EstateFlow does not send it or mark it delivered. Continue?'))ev.preventDefault();}}>
              <MessageCircle className="size-4"/> WhatsApp
            </a>
          </Button>
          {e.status !== "Escalated" ? <Button variant="ghost" disabled={complaint.isPending} onClick={()=>{if(window.confirm('Raise a separate complaint escalation to the GM?'))complaint.mutate();}}><AlertTriangle/> Escalate complaint to GM</Button> : <StatusChip tone="danger" dot>Complaint escalated to GM</StatusChip>}
        </div>
      {e.status === 'Pending GM'&&<Notice title="Pending GM approval">This enquiry has been submitted for GM authorization. No venue has been reserved yet.</Notice>}
      {e.status === 'Approved'&&<section className="space-y-3 rounded-xl border border-border p-4">
        <StatusChip tone="success">Booking approved by GM</StatusChip>
        <p className="text-sm text-muted-foreground">The reservation is committed. Open the confirmation message, send it manually, then record the channel. Opening WhatsApp/email alone does not confirm delivery.</p>
        <div className="flex flex-wrap gap-2">
          {e.email&&<Button variant="quiet" asChild><a href={`mailto:${e.email}?subject=${encodeURIComponent('EstateFlow reservation approved')}&body=${encodeURIComponent(`Hello ${e.from},\n\nYour event reservation has been approved. Please contact our reservations team for final details.\n\nEstateFlow`)}`}>Open confirmation email</a></Button>}
          {e.phone&&<Button variant="quiet" asChild><a target="_blank" rel="noreferrer" href={waLink(e.phone,`Hello ${e.from}, your EstateFlow event reservation has been approved. Please contact reservations for details.`)}>Open confirmation WhatsApp</a></Button>}
        </div>
        <label className="block text-xs text-muted-foreground">Confirmation delivery channel
          <select value={confirmationChannel} onChange={ev=>setConfirmationChannel(ev.target.value as typeof confirmationChannel)} className="mt-1 block rounded-lg border bg-background px-3 py-2"><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="manual">Other manually verified channel</option></select>
        </label>
        <Button disabled={recordConfirmation.isPending||!approvalEvent.data} onClick={()=>{if(window.confirm('Did you actually send the client confirmation through this channel?'))recordConfirmation.mutate();}}>Record client confirmation sent</Button>
        <Button variant="quiet" asChild><Link to="/staff/workbench/$enquiryId" params={{enquiryId:e.id}}>Open approved booking</Link></Button>
      </section>}
      {e.status === 'Client confirmed'&&<Notice tone="success" title="Booking confirmed — client notified">GM-approved reservation and staff-attested confirmation are recorded. External delivery is not automatically verified.</Notice>}
      <p className="text-xs text-muted-foreground">WhatsApp opens a manual handoff only. It does not send messages automatically or confirm delivery.</p>
      {update.isError&&<Notice tone="danger" title="Update failed">{(update.error as Error).message}</Notice>}
      {regenerate.isError&&<Notice tone="danger" title="AI regeneration failed">{(regenerate.error as Error).message}</Notice>}
      {save.isError&&<Notice tone="danger" title="Draft not saved">{(save.error as Error).message}</Notice>}
      {send.isError&&<Notice tone="danger" title="Simulated send failed">{(send.error as Error).message}</Notice>}
      </section>
    </div>
  );
}
