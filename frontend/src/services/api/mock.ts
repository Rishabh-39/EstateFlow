/**
 * MOCK API — simulated responses for the design prototype.
 * Payments, AI extraction and resource allocation here are NOT real integrations.
 */
import { evaluate, findAlternatives, missingFields } from "@/lib/estate/feasibility";
import { addDays, nightsBetween, nightlyRate, quote } from "@/lib/estate/pricing";
import type { Enquiry } from "@/lib/estate/types";
import { canMove, suggestCounts, type StaffAllocation } from "@/lib/estate/staffing";
import { CONFLICT_ON_COMMIT, ENQUIRIES, ROOMS, SOLD_OUT, capacityFor } from "../mock/data";
import type { Booking, DayRate, EstateApi, Promo } from "./types";

const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms + Math.random() * 250));

let enquiries: Enquiry[] = structuredClone(ENQUIRIES);
const bookings = new Map<string, Booking>();
const rateOverrides = new Map<string, DayRate>();
let promos: Promo[] = [
  { code: "ESTATE10", discount: 10, active: true, roomTypeId: null },
  { code: "MONSOON15", discount: 15, active: true, roomTypeId: null },
  { code: "DIWALI20", discount: 20, active: false, roomTypeId: null },
];

function loadBookings() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem("ef-bookings");
    if (raw) for (const b of JSON.parse(raw) as Booking[]) bookings.set(b.reference, b);
  } catch {
    /* ignore */
  }
}
function persistBookings() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("ef-bookings", JSON.stringify([...bookings.values()]));
}

const allocations = new Map<string, StaffAllocation>();
function allocFor(id: string): StaffAllocation {
  let a = allocations.get(id);
  if (!a) {
    const e = enquiries.find((x) => x.id === id);
    if (!e) throw new Error("NOT_FOUND");
    a = { enquiryId: id, counts: suggestCounts(e.requirements), notes: "", status: "Draft", gmNote: "", updatedAt: new Date().toISOString() };
    allocations.set(id, a);
  }
  return a;
}
allocations.set("ENQ-2041", {
  enquiryId: "ENQ-2041",
  counts: { ...suggestCounts(ENQUIRIES[0].requirements), assistant: 1 },
  notes: "Bride requests a dedicated personal assistant for 3 days.",
  status: "Pending GM",
  gmNote: "",
  updatedAt: "2026-11-04T09:00:00Z",
});

const ref = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

export const mockApi: EstateApi = {
  async listRooms() {
    await delay(350);
    return ROOMS;
  },
  async getRoom(id) {
    await delay(250);
    return ROOMS.find((r) => r.id === id) ?? null;
  },
  async checkAvailability(roomId, checkIn, checkOut) {
    await delay(400);
    const nights = nightsBetween(checkIn, checkOut);
    const soldOutNights = nights.filter(
      (n) => SOLD_OUT[roomId]?.includes(n) || rateOverrides.get(`${roomId}:${n}`)?.blackout,
    );
    return { roomId, available: soldOutNights.length === 0, soldOutNights };
  },
  async createBooking(input, payment) {
    await delay(900);
    if (payment === "network") throw new Error("NETWORK");
    if (payment === "declined") throw new Error("DECLINED");
    const room = ROOMS.find((r) => r.id === input.roomId)!;
    const plan = room.ratePlans.find((p) => p.id === input.ratePlanId)!;
    const q = quote(room, input.checkIn, input.checkOut, plan.modifier, input.promo);
    if (q.total !== input.expectedTotal) throw new Error("RATE_CHANGED");
    const booking: Booking = {
      reference: ref("EF"),
      roomId: room.id,
      roomName: room.name,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      guestName: input.guest.name,
      quote: q,
      createdAt: new Date().toISOString(),
    };
    loadBookings();
    bookings.set(booking.reference, booking);
    persistBookings();
    return booking;
  },
  async getBooking(reference) {
    await delay(200);
    loadBookings();
    return bookings.get(reference) ?? null;
  },
  async listBookings() {
    await delay(300);
    loadBookings();
    return [...bookings.values()];
  },
  async submitEventEnquiry() {
    await delay(900);
    return { reference: ref("EVT") };
  },

  async signIn(email, password, role = "staff") {
    await delay(600);
    const accounts = { staff: { email: "staff@estateflow.in", name: "Meera Hegde" }, gm: { email: "gm@estateflow.in", name: "Vikram Nair" } };
    const acc = accounts[role];
    if (email.trim().toLowerCase() !== acc.email || password !== "estate2026") throw new Error("INVALID_CREDENTIALS");
    return { name: acc.name, email: acc.email, role };
  },
  async getAllocation(id) {
    await delay(250);
    return structuredClone(allocFor(id));
  },
  async listAllocations() {
    await delay(300);
    return structuredClone([...allocations.values()]);
  },
  async saveAllocation(id, counts, notes) {
    await delay(400);
    const a = allocFor(id);
    if (a.status === "Pending GM" || a.status === "Sent to client") throw new Error("LOCKED");
    const next = { ...a, counts, notes, status: a.status === "Approved" ? "Draft" as const : a.status, updatedAt: new Date().toISOString() };
    allocations.set(id, next);
    return structuredClone(next);
  },
  async moveAllocation(id, to, by, gmNote) {
    await delay(400);
    const a = allocFor(id);
    if (!canMove(a.status, to, by)) throw new Error("NOT_ALLOWED");
    const next = { ...a, status: to, gmNote: gmNote ?? a.gmNote, updatedAt: new Date().toISOString() };
    allocations.set(id, next);
    return structuredClone(next);
  },
  async listEnquiries() {
    await delay(500);
    return enquiries;
  },
  async getEnquiry(id) {
    await delay(250);
    return enquiries.find((e) => e.id === id) ?? null;
  },
  async updateEnquiry(id, patch) {
    await delay(300);
    enquiries = enquiries.map((e) => (e.id === id ? { ...e, ...patch, confidence: patch.category ? 1 : e.confidence } : e));
    return enquiries.find((e) => e.id === id)!;
  },
  async saveDraftReply(id, body) {
    await delay(300);
    enquiries = enquiries.map((e) => (e.id === id ? { ...e, draftReply: body } : e));
    return { savedAt: new Date().toISOString() };
  },
  async evaluateFeasibility(req) {
    await delay(1100);
    const result = evaluate(req, capacityFor);
    const alternatives = result.verdict === "NOT_FEASIBLE" ? findAlternatives(req, capacityFor) : [];
    return { result, alternatives };
  },
  async approveReservation(enquiryId, req) {
    await delay(1000);
    if (missingFields(req).length || evaluate(req, capacityFor).verdict !== "FEASIBLE") {
      return { status: "conflict", message: "Requirements are no longer feasible. Re-evaluate before approving." };
    }
    if (req.startDate && CONFLICT_ON_COMMIT.has(req.startDate)) {
      return {
        status: "conflict",
        message: "6 rooms on these dates were booked through another channel while you were reviewing. Re-evaluate to see current capacity.",
      };
    }
    enquiries = enquiries.map((e) => (e.id === enquiryId ? { ...e, status: "Approved", requirements: req } : e));
    return { status: "committed", holdReference: ref("HOLD") };
  },

  async listRates(from, days) {
    await delay(500);
    const out: DayRate[] = [];
    for (const room of ROOMS) {
      for (let i = 0; i < days; i++) {
        const date = addDays(from, i);
        const key = `${room.id}:${date}`;
        out.push(
          rateOverrides.get(key) ?? {
            date,
            roomId: room.id,
            rate: nightlyRate(room, date),
            allotment: SOLD_OUT[room.id]?.includes(date) ? 0 : Math.ceil(room.units * 0.6),
            blackout: false,
          },
        );
      }
    }
    return out;
  },
  async saveRates(rates) {
    await delay(700);
    for (const r of rates) rateOverrides.set(`${r.roomId}:${r.date}`, r);
  },
  async listPromos() {
    await delay(300);
    return promos;
  },
  async savePromos(next) {
    await delay(500);
    promos = next;
  },
};
