import type { EventRequirements } from "./types";

export const STAFF_ROLES = [
  { key: "reception", label: "Guest reception" },
  { key: "waiters", label: "Waitstaff" },
  { key: "chefs", label: "Chefs" },
  { key: "decor", label: "Decor artists" },
  { key: "roomService", label: "Room service" },
  { key: "laundry", label: "Laundry" },
  { key: "valet", label: "Valet parking" },
  { key: "assistant", label: "Personal assistant" },
] as const;

export type StaffRoleKey = (typeof STAFF_ROLES)[number]["key"];
export type StaffCounts = Record<StaffRoleKey, number>;
export type AllocationStatus = "Draft" | "Pending GM" | "Changes requested" | "Approved" | "Sent to client";

export interface StaffAllocation {
  enquiryId: string;
  counts: StaffCounts;
  notes: string;
  status: AllocationStatus;
  gmNote: string;
  updatedAt: string;
}

export const totalStaff = (c: StaffCounts) => Object.values(c).reduce((a, b) => a + b, 0);

/** Starting suggestion from the event size; staff can edit every number. */
export function suggestCounts(r: EventRequirements | null): StaffCounts {
  const g = r?.guests ?? 0;
  const rooms = r?.rooms ?? 0;
  const suggestion: StaffCounts = {
    reception: g ? Math.max(2, Math.ceil(g / 100)) : 0,
    waiters: Math.ceil(g / 15),
    chefs: Math.ceil(g / 50),
    decor: r?.needsLawn ? Math.max(2, Math.ceil(g / 100)) : g ? 1 : 0,
    roomService: Math.ceil(rooms / 8),
    laundry: Math.ceil(rooms / 15),
    valet: Math.ceil((r?.parking ?? 0) / 20),
    assistant: 0,
  };
  // If feasibility has a reviewed event-staff total, distribute by largest
  // remainder so the proposed role sum matches that exact count.
  const wanted=r?.eventStaff;
  if(wanted===null||wanted===undefined||!Number.isInteger(wanted)||wanted<0)return suggestion;
  if(wanted===0)return Object.fromEntries(STAFF_ROLES.map(role=>[role.key,0])) as unknown as StaffCounts;
  const original=STAFF_ROLES.map(role=>suggestion[role.key]);
  if(original.every(v=>v===0))original[0]=1;
  const base=original.reduce((a,b)=>a+b,0);
  const scaled=original.map(v=>v*wanted/base);
  const out=scaled.map(Math.floor);
  const order=scaled.map((v,i)=>({i,fraction:v-out[i]})).sort((a,b)=>b.fraction-a.fraction||a.i-b.i);
  for(let i=0;i<wanted-out.reduce((a,b)=>a+b,0);i++)out[order[i].i]++;
  return Object.fromEntries(STAFF_ROLES.map((role,i)=>[role.key,out[i]])) as unknown as StaffCounts;
}

/** Which status moves are allowed and who may make them. */
const FLOW: Record<AllocationStatus, { to: AllocationStatus; by: "staff" | "gm" }[]> = {
  Draft: [{ to: "Pending GM", by: "staff" }],
  "Changes requested": [{ to: "Pending GM", by: "staff" }],
  "Pending GM": [{ to: "Approved", by: "gm" }, { to: "Changes requested", by: "gm" }],
  Approved: [{ to: "Sent to client", by: "staff" }],
  "Sent to client": [],
};

export const canMove = (from: AllocationStatus, to: AllocationStatus, by: "staff" | "gm") =>
  FLOW[from].some((f) => f.to === to && f.by === by);
