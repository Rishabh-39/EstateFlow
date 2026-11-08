import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/estate/states";
import { bookingExport, bookingPreview, type BookingKind } from "@/services/api";
export const Route=createFileRoute("/staff/export")({component:ExportPage});
function ExportPage(){
 const [date,setDate]=useState(()=>new Date().toISOString().slice(0,10));
 const [mode,setMode]=useState<'stay'|'created'>('stay');
 const [kind,setKind]=useState<BookingKind>('all');
 const [pending,setPending]=useState(false),[error,setError]=useState('');
 const preview=useQuery({queryKey:['booking-export-preview',date,mode,kind],queryFn:()=>bookingPreview(date,mode,kind),enabled:Boolean(date)});
 const exportCsv=async()=>{
  setPending(true);setError('');
  try{const csv=await bookingExport(date,mode,kind);const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'});
   const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`estateflow-${mode}-${kind}-bookings-${date}.csv`;a.click();URL.revokeObjectURL(url);
  }catch(e){setError((e as Error).message);}finally{setPending(false);}
 };
 return <div className="space-y-6">
  <h1 className="text-3xl font-light">Booking export</h1>
  <p className="text-sm text-muted-foreground">Preview GM-committed event reservations and accommodation bookings from PostgreSQL, then export exactly the same date and type as Excel-compatible CSV. Event prices are blank unless verified.</p>
  <div className="flex flex-wrap items-end gap-3">
   <label className="block max-w-sm text-sm">Selected date<Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label className="block text-sm">View by
    <select aria-label="Booking date filter" className="mt-1 block h-9 rounded-xl border bg-background px-3" value={mode} onChange={e=>setMode(e.target.value as 'stay'|'created')}>
     <option value="stay">Stays active / events held on date</option><option value="created">Bookings created on date</option>
    </select>
   </label>
   <label className="block text-sm">Booking type
     <select aria-label="Booking type filter" className="mt-1 block h-9 rounded-xl border bg-background px-3" value={kind} onChange={e=>setKind(e.target.value as BookingKind)}>
       <option value="all">All bookings</option><option value="room">Estate Rooms</option><option value="villa">Plantation Villas</option><option value="event">Events (GM approved)</option>
     </select>
   </label>
  </div>
  {preview.isLoading?<p className="text-sm text-muted-foreground">Loading booking records…</p>:
   preview.isError?<Notice tone="danger" title="Could not load booking preview">{(preview.error as Error).message}</Notice>:
   preview.data?<section className="panel space-y-4 p-5">
    <div className="flex flex-wrap gap-5 text-sm"><span><strong>{preview.data.total}</strong> bookings</span><span><strong>{preview.data.rooms}</strong> Estate Room bookings</span><span><strong>{preview.data.villas}</strong> Villa bookings</span><span><strong>{preview.data.events}</strong> GM-committed event bookings</span></div>
    <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs"><thead><tr className="border-b">{['Reference','Guest / Host','Booking type','Room / Event','Unit / Venue','Check-in / Event','Check-out','Guests','Total ₹','Status'].map(h=><th key={h} className="whitespace-nowrap px-2 py-3 font-medium">{h}</th>)}</tr></thead>
     <tbody>{preview.data.rows.map(b=><tr key={b.reference} className="border-b"><td className="px-2 py-2 font-mono">{b.reference}</td><td className="px-2 py-2">{b.guest_name}</td><td className="px-2 py-2">{b.booking_type}</td><td className="px-2 py-2">{b.room_type}</td><td className="px-2 py-2">{b.unit_code}</td><td className="px-2 py-2">{b.check_in}</td><td className="px-2 py-2">{b.check_out}</td><td className="px-2 py-2">{b.guests}</td><td className="px-2 py-2">{b.total_paise===null?'Not priced':(Number(b.total_paise)/100).toLocaleString('en-IN')}</td><td className="px-2 py-2">{b.status}</td></tr>)}</tbody></table>
     {!preview.data.rows.length&&<p className="py-5 text-center text-sm text-muted-foreground">No bookings for this date and filter.</p>}
    </div>
   </section>:null}
  {error&&<Notice tone="danger" title="Export failed">{error}</Notice>}
  <Button onClick={exportCsv} disabled={pending||preview.isLoading||preview.isError}><Download/>{pending?'Generating…':'Download Excel-compatible CSV'}</Button>
  <p className="text-xs text-muted-foreground">CSV opens in Excel. Selected date, booking type and date mode match the downloaded CSV. Events have no invented prices; unapproved enquiries are excluded.</p>
 </div>;
}
