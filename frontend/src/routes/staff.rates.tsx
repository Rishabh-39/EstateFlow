import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/estate/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { addDays, fmtDate } from "@/lib/estate/pricing";
import { cn } from "@/lib/utils";
import { api, type DayRate, type Promo } from "@/services/api";


export const Route = createFileRoute("/staff/rates")({ component: Rates });
const DAYS = 14;

function Rates() {
  const qc = useQueryClient();
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const rooms=useQuery({queryKey:["rooms"],queryFn:()=>api.listRooms()});
  const [roomId, setRoomId] = useState("");
  useEffect(()=>{if(!roomId&&rooms.data?.[0])setRoomId(rooms.data[0].id);},[rooms.data,roomId]);
  const rates = useQuery({ queryKey: ["rates", from], queryFn: () => api.listRates(from, DAYS) });
  const [edits, setEdits] = useState<Record<string, DayRate>>({});
  const save = useMutation({ mutationFn: () => api.saveRates(Object.values(edits)), onSuccess: () => { setEdits({}); toast.success("Rates saved in PostgreSQL"); qc.invalidateQueries({ queryKey: ["rates"] }); qc.invalidateQueries({ queryKey: ["avail"] }); } });

  const rows = (rates.data ?? []).filter((r) => r.roomId === roomId).map((r) => edits[`${r.roomId}:${r.date}`] ?? r);
  const edit = (r: DayRate, patch: Partial<DayRate>) => setEdits({ ...edits, [`${r.roomId}:${r.date}`]: { ...r, ...patch } });
  const dirty = Object.keys(edits).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-light">Rates & inventory</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="quiet" size="sm" onClick={() => setFrom(addDays(from, -DAYS))}>← Prev</Button>
          <Button variant="quiet" size="sm" onClick={() => setFrom(addDays(from, DAYS))}>Next →</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {(rooms.data??[]).map((r) => <button key={r.id} onClick={() => setRoomId(r.id)} aria-pressed={roomId === r.id} className={cn("rounded-full border px-3.5 py-1.5 text-sm", roomId === r.id ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{r.name}</button>)}
      </div>

      {rates.isPending || rooms.isPending ? <Skeleton className="h-72 rounded-2xl" /> : rates.isError ? <ErrorState onRetry={() => rates.refetch()} /> : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {rows.map((r) => (
            <div key={r.date} className={cn("panel space-y-2 p-3", r.blackout && "bg-muted opacity-70", edits[`${r.roomId}:${r.date}`] && "ring-2 ring-coffee/50")}>
              <p className="text-xs font-medium">{fmtDate(r.date, { weekday: "short", day: "numeric", month: "short" })}</p>
              <label className="block text-[0.7rem] text-muted-foreground">Rate ₹<Input type="number" value={r.rate} onChange={(e) => edit(r, { rate: Number(e.target.value) })} className="mt-0.5 h-8 rounded-md text-sm" /></label>
              <label className="block text-[0.7rem] text-muted-foreground">Allotment<Input type="number" min={0} value={r.allotment} onChange={(e) => edit(r, { allotment: Number(e.target.value) })} className="mt-0.5 h-8 rounded-md text-sm" /></label>
              <label className="flex items-center justify-between text-[0.7rem] text-muted-foreground">Blackout<Switch checked={r.blackout} onCheckedChange={(v) => edit(r, { blackout: v })} /></label>
            </div>
          ))}
        </div>
      )}
      <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-3">
        {dirty > 0 && <span className="text-sm text-muted-foreground">{dirty} unsaved change{dirty > 1 && "s"}</span>}
        <Button variant="quiet" disabled={!dirty} onClick={() => setEdits({})}>Cancel</Button>
        <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save changes"}</Button>
      </div>
      <Promos rooms={rooms.data??[]} currentRoomId={roomId} />
    </div>
  );
}

function Promos({rooms,currentRoomId}:{rooms:{id:string;name:string}[];currentRoomId:string}) {
  const q = useQuery({ queryKey: ["promos"], queryFn: () => api.listPromos() });
  const [list, setList] = useState<Promo[]>([]);
  const [code, setCode] = useState("");
  const [pct, setPct] = useState(10);
  const [newScope,setNewScope]=useState<string>(currentRoomId);
  useEffect(()=>{if(currentRoomId)setNewScope(currentRoomId);},[currentRoomId]);
  useEffect(() => { if (q.data) setList(q.data); }, [q.data]);
  const save = useMutation({ mutationFn: () => api.savePromos(list), onSuccess: () => {toast.success("Promo codes updated"); q.refetch();} });
  return (
    <section className="panel space-y-4 p-5 md:p-6">
      <h2 className="text-lg font-medium">Promo codes</h2>
      <p className="text-xs text-muted-foreground">Viewing codes for {rooms.find(r=>r.id===currentRoomId)?.name||'selected accommodation'}. Codes scoped to Both apply to rooms and villas. Eligibility is checked again at checkout.</p>
      <ul className="divide-y divide-border">
        {list.filter(p=>p.roomTypeId===null||p.roomTypeId===currentRoomId).map((p) => (
          <li key={p.code} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="font-mono">{p.code}</span><label className="flex items-center gap-2 text-muted-foreground">{p.discount}% off
            <select aria-label={`Applies to ${p.code}`} value={p.roomTypeId??''} onChange={e=>setList(list.map(x=>x.code===p.code?{...x,roomTypeId:e.target.value||null}:x))}
              className="rounded-lg border bg-background px-2 py-1 text-xs">
              <option value="">Both</option>{rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
            <Input aria-label={`Discount for ${p.code}`} type="number" min={1} max={100} value={p.discount} onChange={e=>setList(list.map(x=>x.code===p.code?{...x,discount:Number(e.target.value)}:x))} className="h-8 w-16 text-xs" />
          </label>
            <Switch aria-label={`Toggle ${p.code}`} checked={p.active} onCheckedChange={(v) => setList(list.map((x) => (x.code === p.code ? { ...x, active: v } : x)))} />
          </li>
        ))}
      </ul>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const c = code.trim().toUpperCase(); if (!c || list.some((x) => x.code === c)) return; setList([...list, { code: c, discount: pct, active: true, roomTypeId:newScope||null }]); setCode(""); }}>
        <Input aria-label="New code" placeholder="NEWCODE" value={code} onChange={(e) => setCode(e.target.value)} className="h-9 w-40 rounded-full uppercase" />
        <Input aria-label="Discount percent" type="number" min={1} max={50} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="h-9 w-20 rounded-full" />
        <select aria-label="New code applies to" value={newScope} onChange={e=>setNewScope(e.target.value)} className="h-9 rounded-full border bg-background px-3 text-sm">
          <option value="">Both accommodation types</option>{rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}
        </select>
        <Button type="submit" variant="quiet" size="sm">Add</Button>
        <Button type="button" size="sm" className="ml-auto" onClick={() => save.mutate()} disabled={save.isPending}>Save promos</Button>
      </form>
      <p className="text-xs text-muted-foreground">Promotional codes are created and activated in PostgreSQL. Changes are validated by the backend. Existing codes are not deleted.</p>
    </section>
  );
}
