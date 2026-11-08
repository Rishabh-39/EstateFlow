import { addDays } from "./pricing";
import type {
  Alternative,
  DayCapacity,
  EventRequirements,
  FeasibilityResult,
  ResourceCheck,
} from "./types";

export const LAWN_CAPACITY = 400;

const FIELD_LABELS: Partial<Record<keyof EventRequirements, string>> = {
  startDate: "Event date",
  nights: "Number of nights",
  guests: "Guest count",
  rooms: "Rooms required",
  diningCovers: "Dining covers",
  parking: "Parking spaces",
  eventStaff: "Event staff",
};

export function missingFields(req: EventRequirements): string[] {
  return (Object.keys(FIELD_LABELS) as (keyof EventRequirements)[])
    .filter((k) => req[k] === null || req[k] === undefined)
    .map((k) => FIELD_LABELS[k]!);
}

/**
 * Pure feasibility check: every resource must have enough capacity on every night
 * of the event. Capacity for a multi-night window is the minimum across nights.
 */
export function evaluate(
  req: EventRequirements,
  capacityFor: (iso: string) => DayCapacity,
): FeasibilityResult {
  const missing = missingFields(req);
  if (missing.length || !req.startDate || !req.nights) {
    return { verdict: "NEEDS_REVIEW", resources: [], bottlenecks: [], missing };
  }
  const days = Array.from({ length: req.nights }, (_, i) => capacityFor(addDays(req.startDate!, i)));
  const min = (f: (d: DayCapacity) => number) => Math.min(...days.map(f));

  const resources: ResourceCheck[] = ([
    { key: "rooms", label: "Accommodation", unit: "rooms", required: req.rooms!, available: min((d) => d.roomsFree), ok: true },
    {
      key: "lawn",
      label: "Wedding lawn",
      unit: "guests",
      required: req.needsLawn ? req.guests! : 0,
      available: req.needsLawn ? min((d) => (d.lawnFree ? LAWN_CAPACITY : 0)) : 0,
      ok: true,
    },
    { key: "dining", label: "Dining", unit: "covers", required: req.diningCovers!, available: min((d) => d.diningCovers), ok: true },
    { key: "parking", label: "Parking", unit: "spaces", required: req.parking!, available: min((d) => d.parking), ok: true },
    { key: "staff", label: "Event staffing", unit: "staff", required: req.eventStaff!, available: min((d) => d.eventStaff), ok: true },
  ] satisfies ResourceCheck[]).map((r) => ({ ...r, ok: r.available >= r.required }));

  const bottlenecks = resources
    .filter((r) => !r.ok)
    .map((r) =>
      r.key === "lawn" && r.available === 0
        ? "The wedding lawn is already booked on at least one of these dates."
        : `${r.label} capacity is insufficient by ${r.required - r.available} ${r.unit}.`,
    );

  return {
    verdict: bottlenecks.length ? "NOT_FEASIBLE" : "FEASIBLE",
    resources,
    bottlenecks,
    missing: [],
  };
}

/** Only returns alternatives that the same engine verifies as FEASIBLE. */
export function findAlternatives(
  req: EventRequirements,
  capacityFor: (iso: string) => DayCapacity,
  windowDays = 21,
  limit = 3,
): Alternative[] {
  if (!req.startDate || !req.nights) return [];
  const offsets = Array.from({ length: windowDays * 2 }, (_, i) =>
    i % 2 === 0 ? i / 2 + 1 : -((i + 1) / 2),
  );
  const out: Alternative[] = [];
  for (const off of offsets) {
    const start = addDays(req.startDate, off);
    const result = evaluate({ ...req, startDate: start }, capacityFor);
    if (result.verdict === "FEASIBLE") {
      out.push({
        id: start,
        startDate: start,
        endDate: addDays(start, req.nights),
        changes: `Shift event ${off > 0 ? "later" : "earlier"} by ${Math.abs(off)} day${Math.abs(off) > 1 ? "s" : ""}`,
        result,
      });
      if (out.length >= limit) break;
    }
  }
  return out.sort((a, b) => a.startDate.localeCompare(b.startDate));
}
