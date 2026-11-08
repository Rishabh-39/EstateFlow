/** Staff-only manual communication for a failed feasibility check.
 * Opens external communication apps; never sends or attests delivery on click. */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Mail, MessageCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Notice } from '@/components/estate/states';
import { listClientFollowups, recordClientFollowup, escalateUnresolvedFeasibility } from '@/services/api';
import type { Enquiry } from '@/lib/estate/types';

type Channel = 'email' | 'phone' | 'whatsapp';
export function ClientAlternativesPanel({ enquiry, blockers }: { enquiry: Enquiry; blockers: string[] }) {
  const qc = useQueryClient();
  const [channel, setChannel] = useState<Channel>('email');
  const [summary, setSummary] = useState('');
  const [attested, setAttested] = useState(false);
  const [reason, setReason] = useState('');
  const phone = String(enquiry.phone || '').replace(/\D/g, '');
  const canPhone = phone.length >= 10 && phone.length <= 15;
  const email = enquiry.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enquiry.email) ? enquiry.email : null;
  const message = `Hello ${enquiry.from}, we have reviewed your EstateFlow event enquiry (${enquiry.subject}) and cannot confirm the requested arrangements yet. Could you share alternative dates or revised guest, room, catering, parking or staffing requirements? Our team will recheck feasibility before offering any confirmed reservation.`;
  const followups = useQuery({ queryKey: ['client-followups', enquiry.id], queryFn: () => listClientFollowups(enquiry.id) });
  const saved = useMutation({ mutationFn: () => recordClientFollowup(enquiry.id, channel, summary.trim()), onSuccess: () => {
    toast.success('Actual client discussion recorded (not automatically delivered)');
    setAttested(false); setSummary('');
    void qc.invalidateQueries({ queryKey: ['client-followups', enquiry.id] });
  }, onError: e => toast.error((e as Error).message) });
  const escalate = useMutation({ mutationFn: () => escalateUnresolvedFeasibility(enquiry.id, reason.trim()), onSuccess: () => {
    toast.success('Unresolved proposal escalated to GM for a decision; no booking made');
    void qc.invalidateQueries({ queryKey: ['enquiry', enquiry.id] });
    void qc.invalidateQueries({ queryKey: ['enquiries-paged'] });
  }, onError: e => toast.error((e as Error).message) });
  const contacted = (followups.data?.length ?? 0) > 0;

  return <section className="panel space-y-4 p-5" aria-label="Client alternatives and GM escalation">
    <div><h2 className="text-lg font-medium">Ask client for alternatives</h2>
      <p className="text-xs text-muted-foreground">This proposal is not feasible. Contact the guest, record the actual response, update the editable event requirements above, and re-evaluate before requesting booking approval.</p></div>
    {blockers.length > 0 && <div className="rounded-xl bg-muted p-3 text-xs"><p className="font-medium">Verified blockers</p><ul className="mt-1 list-inside list-disc space-y-1">{blockers.map((b,i)=><li key={i}>{b}</li>)}</ul></div>}
    <div className="flex flex-wrap gap-2">
      {email ? <Button variant="outline" asChild><a href={`mailto:${email}?subject=${encodeURIComponent('EstateFlow enquiry — alternative arrangements')}&body=${encodeURIComponent(message)}`}><Mail className="size-4"/> Email client</a></Button> : <Button disabled variant="outline"><Mail className="size-4"/> Email unavailable</Button>}
      {canPhone ? <Button variant="outline" asChild><a href={`tel:+${phone}`}><Phone className="size-4"/> Call client</a></Button> : <Button disabled variant="outline"><Phone className="size-4"/> Phone unavailable</Button>}
      {canPhone ? <Button variant="outline" asChild><a href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4"/> WhatsApp client</a></Button> : <Button disabled variant="outline"><MessageCircle className="size-4"/> WhatsApp unavailable</Button>}
    </div>
    {!email&&!canPhone && <Notice tone="warning" title="No client contact details">Ask the client to supply verified email or phone details. The system will not fabricate contact information.</Notice>}
    <p className="text-xs text-muted-foreground">These buttons open an external app; they do not send anything and cannot prove a message was delivered.</p>
    <div className="space-y-2 rounded-xl border p-3">
      <h3 className="text-sm font-medium">Record actual client response</h3>
      <label className="block text-xs">Contact channel
        <select value={channel} onChange={e=>setChannel(e.target.value as Channel)} className="mt-1 block w-full rounded-lg border bg-background p-2 text-sm" aria-label="Actual client contact channel"><option value="email">Email</option><option value="phone">Phone call</option><option value="whatsapp">WhatsApp</option></select>
      </label>
      <Textarea aria-label="Actual client response and changes" rows={3} maxLength={2000} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Record factual client reply and any proposed changes: alternative dates, guests, rooms, venue, staffing, dining..."/>
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={attested} onChange={e=>setAttested(e.target.checked)}/> I actually contacted the guest using this channel and accurately recorded the conversation.</label>
      <Button variant="quiet" disabled={saved.isPending||!attested||summary.trim().length<10||!(channel==='email'?email:canPhone)} onClick={()=>saved.mutate()}>Save client response</Button>
      {followups.isError && <p className="text-xs text-destructive">Could not load contact history.</p>}
      {followups.data?.map(f=><div key={f.id} className="rounded-lg bg-muted p-2 text-xs"><strong>{f.channel.toUpperCase()} · {new Date(f.contactedAt).toLocaleString('en-IN')}</strong><p className="mt-1 whitespace-pre-wrap">{f.summary}</p></div>)}
    </div>
    <div className="space-y-2 rounded-xl border p-3">
      <h3 className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="size-4"/> Still unresolved? Escalate to GM</h3>
      <p className="text-xs text-muted-foreground">First save the client discussion. If revised terms can work, edit the requirements above and recheck feasibility instead. Escalation is an operational decision, not a complaint or booking confirmation.</p>
      <Textarea aria-label="Unresolved feasibility escalation reason" rows={2} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain what remains infeasible after consulting the guest, and what decision is needed from the GM."/>
      <Button variant="outline" disabled={!contacted||reason.trim().length<10||escalate.isPending||enquiry.status==='Escalated'} onClick={()=>{if(window.confirm('Escalate this unresolved feasibility issue to the GM? No resources will be reserved.'))escalate.mutate();}}>Escalate unresolved proposal to GM</Button>
      {enquiry.status==='Escalated'&&<p className="text-xs text-muted-foreground">Already awaiting GM review.</p>}
    </div>
  </section>;
}
