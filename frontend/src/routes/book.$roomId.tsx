import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Clock, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { PriceSummary } from "@/components/estate/price-summary";
import { Logo } from "@/components/estate/site-chrome";
import { ErrorState, Notice } from "@/components/estate/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/estate/pricing";
import { cn } from "@/lib/utils";
import { api, createHold, holdStatus, confirmMockPayment, liveQuote, eligiblePromotions, registerGuest, loginAccount, currentUser, type BookingInput, type PaymentOutcome } from "@/services/api";
import { idempotency } from "@/services/api/http";

type Search = {checkIn:string;checkOut:string;guests:number;plan:string};
export const Route = createFileRoute("/book/$roomId")({
 validateSearch: (s:Record<string,unknown>):Search=>({checkIn:String(s.checkIn??""),checkOut:String(s.checkOut??""),guests:Number(s.guests??2),plan:String(s.plan??"standard")}),
 head:()=>({meta:[{title:"Secure demo checkout — EstateFlow"},{name:"robots",content:"noindex"}]}),component:Book,
});
type Hold={id:string;expires_at:string;total_paise:number};
function Book(){
 const {roomId}=Route.useParams(),s=Route.useSearch(),navigate=useNavigate();
 const room=useQuery({queryKey:["room",roomId],queryFn:()=>api.getRoom(roomId)});
 const [step,setStep]=useState(0),[form,setForm]=useState({name:"",email:"",phone:"",requests:"",password:""});
 const [register,setRegister]=useState(false),[promoInput,setPromoInput]=useState(""),[promo,setPromo]=useState<string|null>(null);
 const [payment,setPayment]=useState<PaymentOutcome>("success"),[hold,setHold]=useState<Hold|null>(null),[error,setError]=useState<string|null>(null),[now,setNow]=useState(Date.now()),[paymentKey,setPaymentKey]=useState("");
 useEffect(()=>{const t=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(t);},[]);
 const q=useQuery({queryKey:["live-quote",roomId,s.checkIn,s.checkOut,s.guests,promo],enabled:!!room.data&&s.checkOut>s.checkIn,queryFn:()=>liveQuote(roomId,s.checkIn,s.checkOut,s.guests,promo)});
 const eligible=useQuery({queryKey:['eligible-promotions',roomId,s.checkIn,s.checkOut],
  enabled:!!room.data&&s.checkOut>s.checkIn,
  queryFn:()=>eligiblePromotions(roomId,s.checkIn,s.checkOut)});
 const status=useQuery({queryKey:["hold",hold?.id],enabled:!!hold,queryFn:()=>holdStatus(hold!.id),refetchInterval:10000});
 const seconds=hold?Math.max(0,Math.min(status.data?.remainingSeconds??600,Math.floor((Date.parse(hold.expires_at)-now)/1000))):0;
 const expired=!!hold && (seconds===0 || status.data?.status==="EXPIRED" || status.data?.status==="CANCELLED");
 const begin=useMutation({mutationFn:async()=>{
  if(form.name.trim().length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)||form.phone.trim().length<8)throw Error('Enter a valid name, email and phone number.');
  if(!form.password)throw Error('Enter your guest account password.');
  if(register)await registerGuest({name:form.name,email:form.email,password:form.password});
  const me=await currentUser().catch(()=>null);
  if(!me||me.email.toLowerCase()!==form.email.toLowerCase()){
   const user=await loginAccount(form.email,form.password);
   if(user.role!=="GUEST")throw Error('Please use a guest account for this booking.');
  }else if(me.role!=="GUEST")throw Error('Staff accounts cannot book through guest checkout.');
  const input:BookingInput={roomId,ratePlanId:"standard",checkIn:s.checkIn,checkOut:s.checkOut,guests:s.guests,promo,guest:{name:form.name,email:form.email,phone:form.phone,requests:form.requests},expectedTotal:q.data?.total??0};
  const liveHold=await createHold(input);
  setPaymentKey(idempotency());setHold(liveHold);setStep(1);setNow(Date.now());
 },onError:(e:Error)=>setError(e.message)});
 const pay=useMutation({mutationFn:async()=>{
  if(!hold||expired)throw Error('Your 10-minute room hold expired. Select your dates again.');
  const result=await confirmMockPayment(hold.id,payment,{name:form.name,email:form.email,phone:form.phone,requests:form.requests},paymentKey);
  if(result.status==='DECLINED')throw Error('Test payment declined — no charge was made. Your hold is still active.');
  if(!result.reference)throw Error('Booking reference was not returned. Verify the payment state before retrying.');
  return result.reference;
 },onSuccess:(reference)=>navigate({to:"/booking/$reference",params:{reference}}),onError:(e:Error)=>setError(e.message)});
 const applyPromo=async(selected?:string)=>{const code=(selected??promoInput).trim().toUpperCase();if(!code)return;try{await liveQuote(roomId,s.checkIn,s.checkOut,s.guests,code);setPromo(code);setPromoInput(code);setError(null);}catch(e){setError((e as Error).message);}};
 if(room.isPending)return <div className="mx-auto max-w-5xl p-8"><Skeleton className="h-96 rounded-3xl" /></div>;
 if(room.isError||!room.data||s.checkOut<=s.checkIn)return <div className="mx-auto max-w-xl p-8"><ErrorState title="Invalid booking details" body="Select your dates again."/><Button asChild className="mt-4"><Link to="/stays">Browse stays</Link></Button></div>;
 const r=room.data;
 return <div className="min-h-screen">
  <header className="border-b border-border"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Logo/><p className="text-sm text-muted-foreground">{step===0?'1. Guest account & details':'2. Test payment'} → Confirmation</p></div></header>
  <main className="mx-auto grid max-w-6xl gap-10 px-5 py-10 md:px-8 lg:grid-cols-[1fr_360px]">
   <section className="space-y-5">
    {error&&<Notice tone="danger" title="Please review">{error}</Notice>}
    {q.isError&&<Notice tone="danger" title="The backend could not calculate the rate">{(q.error as Error).message}</Notice>}
    {step===0?<form className="panel space-y-5 p-6" onSubmit={e=>{e.preventDefault();setError(null);begin.mutate();}}>
     <h1 className="text-3xl font-light">Guest details</h1>
     <p className="text-sm text-muted-foreground">Sign in with your guest account or create one to reserve inventory. Prices and GST come from PostgreSQL.</p>
     <div className="flex gap-3"><Button type="button" variant={!register?'default':'quiet'} onClick={()=>setRegister(false)}>Existing guest</Button><Button type="button" variant={register?'default':'quiet'} onClick={()=>setRegister(true)}>New guest</Button></div>
     {([['name','Guest name','text'],['email','Email','email'],['phone','Phone','tel'],['password','Account password','password']] as const).map(([k,label,type])=><div key={k} className="space-y-1"><Label htmlFor={k}>{label}</Label><Input required id={k} type={type} minLength={k==='password'&&register?10:undefined} autoComplete={k==='password'?(register?'new-password':'current-password'):undefined} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>)}
     <div className="space-y-1"><Label htmlFor="requests">Special requests (optional)</Label><Textarea id="requests" value={form.requests} onChange={e=>setForm({...form,requests:e.target.value})} maxLength={1000}/></div>
     <Button type="submit" disabled={!q.data||begin.isPending}><Lock/>{begin.isPending?'Creating 10-minute hold…':'Continue with live room hold'}</Button>
    </form>:<div className="panel space-y-5 p-6">
      <h1 className="text-3xl font-light">Test payment</h1>
      <p className={cn('flex items-center gap-2 text-sm',expired?'text-destructive':'text-muted-foreground')}><Clock className="size-4"/>{expired?'Hold expired':`Room held: ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} remaining`}</p>
      <Notice tone="info" title="Simulation only — no money is collected">The backend will confirm or decline a mock transaction and issue a real database booking reference only on success.</Notice>
      <fieldset className="space-y-2"><legend className="sr-only">Simulated payment outcome</legend>{([['success','Test payment approved'],['declined','Simulate declined payment'],['network','Simulate connection failure']] as const).map(([v,label])=><label key={v} className="flex items-center gap-3 rounded-xl border p-3"><input type="radio" checked={payment===v} onChange={()=>setPayment(v)} /><span>{label}</span></label>)}</fieldset>
      {expired?<Button asChild><Link to="/stays/$roomId" params={{roomId}} search={{checkIn:s.checkIn,checkOut:s.checkOut,guests:s.guests}}>Check availability again</Link></Button>:<Button disabled={pay.isPending||!q.data} onClick={()=>{setError(null);pay.mutate();}}><Check/>{pay.isPending?'Confirming…':`Confirm simulated ₹${q.data?.total.toLocaleString('en-IN')??'—'}`}</Button>}
    </div>}
   </section>
   <aside className="lg:sticky lg:top-8 lg:self-start"><div className="panel overflow-hidden"><img src={r.image} alt={`Illustrative image for ${r.name}`} className="aspect-video w-full object-cover"/><div className="space-y-5 p-6"><h2 className="text-xl">{r.name}</h2><p className="text-sm text-muted-foreground">{fmtDate(s.checkIn)} – {fmtDate(s.checkOut)} · {s.guests} guests</p><div className="flex gap-2"><Input aria-label="Promo code" placeholder="Valid promo code" value={promoInput} onChange={e=>setPromoInput(e.target.value)} disabled={step>0}/><Button type="button" variant="quiet" onClick={()=>{void applyPromo();}} disabled={step>0}>Apply</Button></div>
     <div className="space-y-2" aria-label="Available promo codes">
       <p className="text-xs font-medium">Available offers for this stay</p>
       {eligible.isPending?<p className="text-xs text-muted-foreground">Checking current offers…</p>:
       eligible.isError?<p className="text-xs text-muted-foreground">Offers could not be loaded; you can still enter a code.</p>:
       eligible.data?.length?eligible.data.map(p=><button key={p.code} type="button" disabled={step>0}
        className={cn('flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs',promo===p.code?'border-primary bg-primary/5':'border-border')}
        onClick={()=>{void applyPromo(p.code);}}>
         <span className="font-mono font-medium">{p.code}</span><span>{p.discountPercent}% off · {promo===p.code?'Applied':'Apply offer'}</span>
        </button>):<p className="text-xs text-muted-foreground">No eligible offers for these dates and this accommodation.</p>}
       {promo&&<button type="button" className="text-xs underline" disabled={step>0} onClick={()=>{setPromo(null);setPromoInput('');}}>Remove applied code</button>}
     </div>{q.isPending?<Skeleton className="h-36"/>:q.data?<PriceSummary q={q.data}/>:null}<p className="text-xs text-muted-foreground">Mock checkout. Pricing and tax rates are set in the backend rate tables, not calculated in the browser.</p></div></div></aside>
  </main>
 </div>;
}
